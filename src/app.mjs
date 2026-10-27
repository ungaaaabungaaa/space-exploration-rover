import {SCENARIOS,scenarioConfig} from './scenarios.mjs';import {measuredRuns} from './results.mjs';import {encodeCommand} from './protocol.mjs';
const $=selector=>document.querySelector(selector),form=$('#mission-form'),canvas=$('#map'),context=canvas.getContext('2d');
let report=null,index=0,known=new Map(),worker=null,token=0,playing=false,last=0,animation=null;
function node(tag,text){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;return element;}
function enable(value){for(const name of ['play','step','scrub','export'])$(`#${name}`).disabled=!value;}
function stop(){playing=false;cancelAnimationFrame(animation);$('#play').textContent='▶';$('#play').setAttribute('aria-label','Play replay');}
function error(text){$('#error').textContent=text;$('#error').hidden=false;}
function run(event){
 event?.preventDefault();if(!form.reportValidity())return;stop();worker?.terminate();const request=++token,values=new FormData(form),scenario=values.get('scenario');
 let config;try{config=scenarioConfig(scenario);}catch(problem){error(problem.message);return;}
 for(const key of ['maxSpeed','steps','sensorRange','beams','dt'])config[key]=Number(values.get(key));
 $('#run').disabled=true;$('#cancel').hidden=false;$('#busy').hidden=false;$('#error').hidden=true;$('#run-status').textContent='Computing';enable(false);
 try{worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
 worker.addEventListener('message',event=>{
  if(request!==token)return;worker.terminate();worker=null;$('#run').disabled=false;$('#cancel').hidden=true;$('#busy').hidden=true;
  if(!event.data.ok){error(event.data.error);$('#run-status').textContent='Input rejected';enable(Boolean(report));return;}
  report=event.data.report;report.scenario=scenario;known=new Map();index=-1;$('#mission-title').textContent=SCENARIOS[scenario].name;$('#scrub').max=String(report.frames.length-1);enable(true);frame(0);$('#run-status').textContent=report.metrics.outcome;
  const result=report.metrics;$('#outcome').textContent=`Full run: ${result.outcome}. ${result.timeSeconds.toFixed(1)} simulated seconds, ${result.distanceM.toFixed(2)} m accepted path, ${result.replans} plans, ${result.rejectedMotions} rejected unsafe proposals. Final goal distance: ${result.finalGoalDistance.toFixed(3)} m. ${result.outcome==='safety_stop'?'Simulation ended at its last accepted state; physical braking is not modeled.':'No physical rover test is implied.'}`;
 });
 worker.addEventListener('error',()=>{if(request!==token)return;worker?.terminate();worker=null;$('#run').disabled=false;$('#cancel').hidden=true;$('#busy').hidden=true;$('#run-status').textContent='Failed';enable(Boolean(report));error('The worker could not run. Serve this app through HTTP(S), not as a file.');});worker.postMessage(config);
 }catch(problem){$('#run').disabled=false;$('#cancel').hidden=true;$('#busy').hidden=true;enable(Boolean(report));error(problem.message);}
}
function frame(next){
 if(!report)return;next=Math.max(0,Math.min(report.frames.length-1,next));if(next<index){known=new Map();index=-1;}
 for(let i=index+1;i<=next;i++)for(const[cell,value]of report.frames[i].newCells)known.set(cell,value);index=next;
 const state=report.frames[index];$('#scrub').value=String(index);$('#tick').textContent=`${index} / ${report.frames.length-1}`;$('#time').textContent=`${state.time.toFixed(1)} s`;$('#distance').textContent=`${state.goalDistance.toFixed(2)} m`;$('#velocity').textContent=`${state.linear.toFixed(2)} m/s / ${state.angular.toFixed(2)} rad/s`;$('#pose').textContent=`${state.pose.x.toFixed(3)}, ${state.pose.y.toFixed(3)}`;$('#heading').textContent=(state.pose.heading*180/Math.PI).toFixed(1);$('#left').textContent=state.wheels[0].toFixed(3);$('#right').textContent=state.wheels[1].toFixed(3);draw();
}
function draw(){
 const bounds=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(bounds.width*dpr));canvas.height=Math.max(1,Math.round(bounds.height*dpr));context.setTransform(dpr,0,0,dpr,0,0);
 const rows=report?.config.world??SCENARIOS.rocks.world,width=rows[0].length,height=rows.length,pad=12,scale=Math.min((bounds.width-pad*2)/width,(bounds.height-pad*2)/height),left=(bounds.width-width*scale)/2,top=(bounds.height-height*scale)/2;
 const screen=(x,y)=>[left+x*scale,top+(height-y)*scale];context.fillStyle='#edf0e9';context.fillRect(0,0,bounds.width,bounds.height);
 for(let row=0;row<height;row++)for(let x=0;x<width;x++){const cell=row*width+x,value=known.get(cell),full=$('#truth').checked;context.fillStyle=full?(rows[row][x]==='#'?'#3f4942':'#fff'):value===2?'#3f4942':value===1?'#fff':'#dfe4dd';context.fillRect(left+x*scale+.4,top+row*scale+.4,scale-.8,scale-.8);}
 if(!report)return;
 context.strokeStyle='#ad522c';context.lineWidth=1.8;context.beginPath();for(let i=0;i<=index;i++){const point=screen(report.frames[i].pose.x,report.frames[i].pose.y);if(i===0)context.moveTo(...point);else context.lineTo(...point);}context.stroke();
 const state=report.frames[index],pose=state.pose,[px,py]=screen(pose.x,pose.y);
 if($('#rays').checked){context.strokeStyle='#ba7a4c';context.globalAlpha=.28;context.lineWidth=1;state.ranges.forEach((range,i)=>{const angle=pose.heading+i*2*Math.PI/report.config.beams,target=screen(pose.x+Math.cos(angle)*range,pose.y+Math.sin(angle)*range);context.beginPath();context.moveTo(px,py);context.lineTo(...target);context.stroke();});context.globalAlpha=1;}
 const goal=screen(...report.config.goal);context.fillStyle='#355845';context.beginPath();context.arc(goal[0],goal[1],Math.max(4,scale*.18),0,Math.PI*2);context.fill();context.font='11px Arial';context.textAlign='center';context.fillText('G',goal[0],goal[1]-8);
 context.save();context.translate(px,py);context.rotate(-pose.heading);context.strokeStyle='#ad522c';context.lineWidth=1;context.beginPath();context.arc(0,0,report.config.radius*scale,0,Math.PI*2);context.stroke();context.fillStyle='#26352f';context.fillRect(-.22*scale,-.13*scale,.44*scale,.26*scale);for(const x of [-.16,0,.16])for(const y of [-.19,.19])context.fillRect((x-.055)*scale,(y-.035)*scale,.11*scale,.07*scale);context.fillStyle='#f3b56c';context.fillRect(.13*scale,-.08*scale,.075*scale,.16*scale);context.restore();
}
function animate(now){if(!playing)return;const period=1000/Number($('#speed').value);if(now-last>=period){const count=Math.max(1,Math.floor((now-last)/period));last=now;frame(index+count);if(index===report.frames.length-1){stop();return;}}animation=requestAnimationFrame(animate);}
$('#play').addEventListener('click',()=>{if(playing){stop();return;}if(index===report.frames.length-1)frame(0);playing=true;last=performance.now();$('#play').textContent='Ⅱ';$('#play').setAttribute('aria-label','Pause replay');animation=requestAnimationFrame(animate);});
$('#step').addEventListener('click',()=>{stop();frame(index+1);});$('#scrub').addEventListener('input',event=>{stop();frame(Number(event.target.value));});$('#truth').addEventListener('change',draw);$('#rays').addEventListener('change',draw);
$('#cancel').addEventListener('click',()=>{++token;worker?.terminate();worker=null;$('#run').disabled=false;$('#cancel').hidden=true;$('#busy').hidden=true;$('#run-status').textContent='Cancelled';enable(Boolean(report));});
$('#export').addEventListener('click',()=>{if(!report)return;const data=JSON.stringify(report)+'\n';if(new TextEncoder().encode(data).byteLength>4*1024*1024){error('Replay exceeds the export limit.');return;}const url=URL.createObjectURL(new Blob([data],{type:'application/json'})),link=node('a');link.href=url;link.download=`rover-${report.scenario}-${report.config.maxSpeed}mps.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
form.addEventListener('submit',run);form.elements.scenario.addEventListener('change',()=>{$('#scenario-note').textContent=SCENARIOS[form.elements.scenario.value].description;});$('#scenario-note').textContent=SCENARIOS.rocks.description;
for(const result of measuredRuns){const row=node('tr');for(const value of [SCENARIOS[result.scenario].name,`${result.maxSpeed.toFixed(1)} m/s`,result.outcome,`${result.timeSeconds.toFixed(1)} s`,`${result.distanceM.toFixed(2)} m`,String(result.replans)])row.append(node('td',value));$('#result-rows').append(row);}
$('#packet-form').addEventListener('submit',event=>{event.preventDefault();const data=new FormData(event.currentTarget);try{const fields={command:data.get('command')};for(const key of ['sequence','left','right','lease'])fields[key]=Number(data.get(key));$('#packet').textContent=encodeCommand(fields);$('#packet-error').hidden=true;}catch(problem){$('#packet').textContent='No frame generated. Correct the fields.';$('#packet-error').textContent=problem.message;$('#packet-error').hidden=false;}});
$('#packet-form').addEventListener('input',()=>{$('#packet').textContent='Generate a frame for this setup.';$('#packet-error').hidden=true;});
new ResizeObserver(draw).observe(canvas);run();
