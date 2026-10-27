import test from 'node:test';import assert from 'node:assert/strict';
import {validateConfig,simulate,planGrid} from '../src/navigation.mjs';
const open=['..........','..........','..........','..........','..........','..........','..........'];
test('configuration rejects blocked goals, unsafe starts, invalid units and product limits',()=>{
 const base={world:open,start:[1.5,1.5],goal:[8.5,5.5]};
 for(const change of [{dt:0},{steps:0},{maxSpeed:NaN},{radius:.49},{trackWidth:1},{beams:100},{sensorRange:Infinity},{heading:10},{start:[.1,.5]},{goal:[30,3]},{unknown:true}])assert.throws(()=>validateConfig({...base,...change}));
 assert.throws(()=>validateConfig({...base,world:['..........','........#.','..........','..........','..........','..........','..........']}));
 assert.throws(()=>validateConfig({world:Array(40).fill('.'.repeat(40)),start:[1.5,1.5],goal:[38.5,38.5],steps:3000,beams:64}));
});
test('private-map planner returns cardinal routes and reports fully blocked separators',()=>{
 const dims={width:5,height:5},known=new Uint8Array(25);
 let route=planGrid(dims,known,[.5,.5],[4.5,4.5]);assert.equal(route.length,9);
 for(let row=0;row<5;row++)known[row*5+2]=2;
 assert.equal(planGrid(dims,known,[.5,.5],[4.5,4.5]),null);
});
test('open-space mission arrives deterministically and accepted controls obey limits',()=>{
 const config={world:open,start:[1.5,1.5],goal:[8.5,5.5],steps:2000};const a=simulate(config),b=simulate(config);assert.deepEqual(a,b);
 assert.equal(a.metrics.outcome,'arrived');assert.ok(a.metrics.finalGoalDistance<=.12);assert.equal(a.metrics.acceptedCollisions,0);assert.equal(a.metrics.steps,a.frames.length-1);
 for(let i=1;i<a.frames.length;i++){const prev=a.frames[i-1],frame=a.frames[i];for(let side=0;side<2;side++){assert.ok(Math.abs(frame.wheels[side])<=a.config.maxSpeed+1e-9);assert.ok(Math.abs(frame.wheels[side]-prev.wheels[side])/a.config.dt<=a.config.acceleration+1e-8);}assert.ok(Math.abs(frame.angular)<=a.config.maxYaw+1e-9);}
});
test('blocked route ends with an honest non-success outcome',()=>{
 const world=['.....#....','.....#....','.....#....','.....#....','.....#....','.....#....','.....#....'];
 const result=simulate({world,start:[1.5,1.5],goal:[8.5,5.5],steps:2000,sensorRange:4});
 assert.equal(result.metrics.success,false);assert.equal(result.metrics.outcome,'unreachable');assert.equal(result.metrics.acceptedCollisions,0);
});
test('a short budget is reported instead of a fabricated arrival',()=>{
 const run=simulate({world:open,start:[1.5,1.5],goal:[8.5,5.5],steps:1});assert.equal(run.metrics.outcome,'budget');assert.equal(run.metrics.success,false);assert.equal(run.metrics.steps,1);
});
test('higher allowed speed slows before waypoints instead of overshooting the world boundary',async()=>{
 const {scenarioConfig}=await import('../src/scenarios.mjs');const run=simulate({...scenarioConfig('rocks'),maxSpeed:.9});assert.equal(run.metrics.outcome,'arrived');assert.equal(run.metrics.rejectedMotions,0);
});
test('a rejected high-speed motion is a failure at the last accepted state, not an arrival',async()=>{
 const {scenarioConfig}=await import('../src/scenarios.mjs');const result=simulate({...scenarioConfig('detour'),maxSpeed:.9});assert.equal(result.metrics.success,false);assert.equal(result.metrics.outcome,'safety_stop');assert.equal(result.metrics.rejectedMotions,1);assert.equal(result.frames.length,result.metrics.steps+1);assert.equal(result.frames.at(-1).time,result.metrics.timeSeconds);
});
