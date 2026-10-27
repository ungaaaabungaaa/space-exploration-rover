const EPS=1e-9;
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const wrap=angle=>Math.atan2(Math.sin(angle),Math.cos(angle));
export function worldGeometry(rows){
 const height=rows.length,width=rows[0].length,obstacles=[];
 for(let row=0;row<height;row++)for(let x=0;x<width;x++)if(rows[row][x]==='#'){const y=height-1-row;obstacles.push({x0:x,y0:y,x1:x+1,y1:y+1});}
 return {width,height,obstacles};
}
export function bodySpeeds(left,right,track){
 if(![left,right,track].every(Number.isFinite)||track<=0)throw Error('Side speeds must be finite and track width positive.');
 const linear=(left+right)/2,angular=(right-left)/track;
 if(!Number.isFinite(linear)||!Number.isFinite(angular))throw Error('Motion exceeds numeric bounds.');return {linear,angular};
}
export function integrate(pose,left,right,dt,track){
 if(![pose.x,pose.y,pose.heading,dt].every(Number.isFinite)||dt<0)throw Error('Pose and nonnegative time must be finite.');
 const {linear:v,angular:w}=bodySpeeds(left,right,track);let x,y;
 if(Math.abs(w)<1e-10){x=pose.x+v*dt*Math.cos(pose.heading);y=pose.y+v*dt*Math.sin(pose.heading);}
 else{x=pose.x+v/w*(Math.sin(pose.heading+w*dt)-Math.sin(pose.heading));y=pose.y-v/w*(Math.cos(pose.heading+w*dt)-Math.cos(pose.heading));}
 return {x,y,heading:wrap(pose.heading+w*dt)};
}
export function wheelTargets(linear,angular,limits){
 angular=clamp(angular,-limits.maxYaw,limits.maxYaw);
 let left=linear-angular*limits.trackWidth/2,right=linear+angular*limits.trackWidth/2;
 const scale=Math.max(1,Math.abs(left)/limits.maxSpeed,Math.abs(right)/limits.maxSpeed);return [left/scale,right/scale];
}
export function slewWheels(current,target,maxDelta){
 const change=Math.max(Math.abs(target[0]-current[0]),Math.abs(target[1]-current[1]));const alpha=change===0?1:Math.min(1,maxDelta/change);
 return current.map((value,i)=>value+(target[i]-value)*alpha);
}
export function rayRectangle(origin,direction,rectangle,maxRange){
 let low=0,high=maxRange;
 for(const axis of ['x','y']){
  const start=origin[axis],delta=direction[axis],min=rectangle[`${axis}0`],max=rectangle[`${axis}1`];
  if(Math.abs(delta)<EPS){if(start<min-EPS||start>max+EPS)return null;}
  else{let a=(min-start)/delta,b=(max-start)/delta;if(a>b)[a,b]=[b,a];low=Math.max(low,a);high=Math.min(high,b);if(low>high+EPS)return null;}
 }
 return low<=maxRange?Math.max(0,low):null;
}
export function segmentClear(world,a,b,radius){
 if(![...a,...b,radius].every(Number.isFinite)||radius<=0)return false;
 for(const point of [a,b])if(point[0]<=radius+EPS||point[1]<=radius+EPS||point[0]>=world.width-radius-EPS||point[1]>=world.height-radius-EPS)return false;
 const direction={x:b[0]-a[0],y:b[1]-a[1]};
 for(const rectangle of world.obstacles){const expanded={x0:rectangle.x0-radius,y0:rectangle.y0-radius,x1:rectangle.x1+radius,y1:rectangle.y1+radius};if(rayRectangle({x:a[0],y:a[1]},direction,expanded,1)!==null)return false;}
 return true;
}
export function arcClear(world,pose,left,right,dt,track,radius){
 const {linear:v,angular:w}=bodySpeeds(left,right,track);
 if(!Number.isFinite(dt)||dt<0||!Number.isFinite(radius)||radius<=0)throw Error('Invalid swept-path parameters.');
 const pieces=Math.max(1,Math.ceil(Math.abs(v*dt)/.05),Math.ceil(Math.abs(w*dt)/.1));
 if(pieces>512)throw Error('Swept path exceeds its 512-segment limit.');
 const step=dt/pieces,arcRadius=Math.abs(w)<1e-10?0:Math.abs(v/w),sagitta=arcRadius*(1-Math.cos(Math.abs(w*step)/2));
 let previous=pose;
 for(let i=1;i<=pieces;i++){const next=integrate(pose,left,right,step*i,track);if(!segmentClear(world,[previous.x,previous.y],[next.x,next.y],radius+sagitta))return false;previous=next;}
 return true;
}
