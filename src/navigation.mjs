import {worldGeometry,bodySpeeds,integrate,wheelTargets,slewWheels,arcClear,segmentClear,rayRectangle,clamp,wrap} from './geometry.mjs';
const EPS=1e-9;
const fail=message=>{throw new Error(message);};
const pointDistance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function bounded(value,min,max,name,integer=false){if(!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))fail(`${name} must be ${integer?'an integer ':''}from ${min} to ${max}.`);return value;}
export function gridIndex(dimensions,x,y){return (dimensions.height-1-Math.floor(y))*dimensions.width+Math.floor(x);}
export function gridPoint(dimensions,index){return [index%dimensions.width+.5,dimensions.height-Math.floor(index/dimensions.width)-.5];}
export function validateConfig(input){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Configuration must be an object.');
 const allowed=['world','start','goal','heading','radius','trackWidth','maxSpeed','maxYaw','acceleration','dt','steps','beams','sensorRange'];
 if(Object.keys(input).some(key=>!allowed.includes(key)))fail('Unknown configuration field.');
 const rows=input.world;
 if(!Array.isArray(rows)||rows.length<5||rows.length>40||typeof rows[0]!=='string'||rows[0].length<5||rows[0].length>40||rows.some(row=>typeof row!=='string'||row.length!==rows[0].length||!/^[.#]+$/.test(row)))fail('World must be a 5–40 cell rectangle of . and #.');
 const config={world:[...rows],heading:bounded(input.heading??0,-Math.PI,Math.PI,'heading'),radius:bounded(input.radius??.35,.1,.45,'radius'),trackWidth:bounded(input.trackWidth??.32,.2,.8,'trackWidth'),maxSpeed:bounded(input.maxSpeed??.6,.1,1,'maxSpeed'),maxYaw:bounded(input.maxYaw??1.4,.2,2,'maxYaw'),acceleration:bounded(input.acceleration??.5,.1,2,'acceleration'),dt:bounded(input.dt??.1,.02,.2,'dt'),steps:bounded(input.steps??2000,1,3000,'steps',true),beams:bounded(input.beams??24,8,64,'beams',true),sensorRange:bounded(input.sensorRange??4,1,8,'sensorRange')};
 if(config.trackWidth>2*config.radius)fail('Track width must fit within the modeled body diameter.');
 const cells=rows.length*rows[0].length;
 if(cells*config.steps>5000000||cells*config.steps*config.beams>80000000||config.steps*config.beams>150000)fail('Configuration exceeds the bounded simulation work limit.');
 const world=worldGeometry(rows);
 for(const name of ['start','goal']){
  const point=input[name];if(!Array.isArray(point)||point.length!==2||point.some(value=>!Number.isFinite(value)||value%1!==.5)||!segmentClear(world,point,point,config.radius))fail(`${name==='start'?'Start':'Goal'} must be a free cell centre with full body clearance.`);config[name]=[...point];
 }
 return config;
}
export function planGrid(dimensions,known,start,goal){
 const {width,height}=dimensions,first=gridIndex(dimensions,...start),last=gridIndex(dimensions,...goal);
 if(first<0||last<0||first>=width*height||last>=width*height||known[first]===2||known[last]===2)return null;
 const parent=new Int32Array(width*height).fill(-1),queue=[first];parent[first]=first;
 for(let cursor=0;cursor<queue.length;cursor++){
  const index=queue[cursor];if(index===last)break;const x=index%width,row=Math.floor(index/width);
  for(const[dx,dy]of [[1,0],[0,-1],[0,1],[-1,0]]){const nx=x+dx,ny=row+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;const next=ny*width+nx;if(parent[next]===-1&&known[next]!==2){parent[next]=index;queue.push(next);}}
 }
 if(parent[last]===-1)return null;
 const path=[last];while(path.at(-1)!==first)path.push(parent[path.at(-1)]);return path.reverse().map(index=>gridPoint(dimensions,index));
}
function scan(world,pose,known,config){
 const ranges=[],changes=[];
 const set=(x,y,value)=>{
  if(x<0||y<0||x>=world.width||y>=world.height)return;
  const index=gridIndex(world,x,y);if(known[index]!==value&&known[index]!==2){known[index]=value;changes.push([index,value]);}
 };
 for(let beam=0;beam<config.beams;beam++){
  const angle=pose.heading+beam*2*Math.PI/config.beams,direction={x:Math.cos(angle),y:Math.sin(angle)};
  let range=config.sensorRange,hit=false;
  for(const axis of ['x','y']){const delta=direction[axis];if(Math.abs(delta)>EPS){const edge=delta>0?(axis==='x'?world.width:world.height):0;range=Math.min(range,(edge-pose[axis])/delta);}}
  for(const rectangle of world.obstacles){const distance=rayRectangle(pose,direction,rectangle,range);if(distance!==null&&distance<=range){range=distance;hit=true;}}
  range=Math.max(0,range);ranges.push(range);
  const samples=Math.max(1,Math.ceil(range/.12));for(let sample=0;sample<samples;sample++){const d=range*sample/samples;set(pose.x+direction.x*d,pose.y+direction.y*d,1);}
  if(hit)set(pose.x+direction.x*(range+1e-5),pose.y+direction.y*(range+1e-5),2);
 }
 return {ranges,changes};
}
function command(pose,target,goal,config){
 const distance=pointDistance([pose.x,pose.y],target),goalDistance=pointDistance([pose.x,pose.y],goal);
 if(goalDistance<=.12)return [0,0];
 const error=wrap(Math.atan2(target[1]-pose.y,target[0]-pose.x)-pose.heading);
 const angular=clamp(error*2.5,-config.maxYaw,config.maxYaw);
 const brakingSpeed=Math.sqrt(2*config.acceleration*Math.max(0,distance-.03));
 const linear=Math.abs(error)>.5?0:Math.min(config.maxSpeed,brakingSpeed,config.maxSpeed*distance/.4)*Math.max(0,Math.cos(error));
 return wheelTargets(linear,angular,config);
}
export function simulate(input){
 const config=validateConfig(input),world=worldGeometry(config.world),dimensions={width:world.width,height:world.height},known=new Uint8Array(world.width*world.height);
 let pose={x:config.start[0],y:config.start[1],heading:config.heading},wheels=[0,0],path=null,outcome='budget',steps=0,replans=0,distanceM=0,rejectedMotions=0,maxSpeedObserved=0,maxYawObserved=0,maxAccelerationObserved=0;
 const frames=[];
 function record(scanResult){const speed=bodySpeeds(...wheels,config.trackWidth);frames.push({step:steps,time:steps*config.dt,pose:{...pose},wheels:[...wheels],linear:speed.linear,angular:speed.angular,ranges:scanResult.ranges,newCells:scanResult.changes,goalDistance:pointDistance([pose.x,pose.y],config.goal)});}
 record(scan(world,pose,known,config));
 for(let tick=0;tick<config.steps;tick++){
  const position=[pose.x,pose.y];
  if(pointDistance(position,config.goal)<=.12&&Math.max(...wheels.map(Math.abs))<EPS){outcome='arrived';break;}
  if(path===null||path.some(point=>known[gridIndex(dimensions,...point)]===2)){
   replans++;path=planGrid(dimensions,known,position,config.goal);if(path===null){outcome='unreachable';break;}
  }
  while(path.length&&pointDistance(position,path[0])<=.05)path.shift();
  const target=path[0]??config.goal,desired=command(pose,target,config.goal,config),next=slewWheels(wheels,desired,config.acceleration*config.dt);
  if(!arcClear(world,pose,...next,config.dt,config.trackWidth,config.radius)){outcome='safety_stop';rejectedMotions++;break;}
  for(let side=0;side<2;side++)maxAccelerationObserved=Math.max(maxAccelerationObserved,Math.abs(next[side]-wheels[side])/config.dt);
  wheels=next;const speed=bodySpeeds(...wheels,config.trackWidth);maxSpeedObserved=Math.max(maxSpeedObserved,...wheels.map(Math.abs));maxYawObserved=Math.max(maxYawObserved,Math.abs(speed.angular));distanceM+=Math.abs(speed.linear)*config.dt;
  pose=integrate(pose,...wheels,config.dt,config.trackWidth);steps++;record(scan(world,pose,known,config));
 }
 const finalGoalDistance=pointDistance([pose.x,pose.y],config.goal);
 if(outcome==='budget'&&finalGoalDistance<=.12&&Math.max(...wheels.map(Math.abs))<EPS)outcome='arrived';
 const metrics={success:outcome==='arrived',outcome,steps,timeSeconds:steps*config.dt,distanceM,replans,finalGoalDistance,observedCells:known.filter(value=>value!==0).length,mappedFreeCells:known.filter(value=>value===1).length,maxSpeedObserved,maxYawObserved,maxAccelerationObserved,rejectedMotions,acceptedCollisions:0};
 const report={schemaVersion:1,config,frames,metrics};
 if(frames.length>3001||new TextEncoder().encode(JSON.stringify(report)).byteLength>4*1024*1024)fail('Replay exceeds its bounded output limit.');return report;
}
