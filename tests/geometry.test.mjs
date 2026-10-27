import test from 'node:test';import assert from 'node:assert/strict';
import {integrate,bodySpeeds,wheelTargets,slewWheels,segmentClear,arcClear,worldGeometry} from '../src/geometry.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('differential-drive integration has correct units, straight motion and positive left turns',()=>{
 const pose={x:2,y:2,heading:0};const straight=integrate(pose,.5,.5,2,.4);close(straight.x,3);close(straight.y,2);
 const turn=integrate(pose,-.2,.2,Math.PI/2,.4);close(turn.x,2);close(turn.y,2);close(turn.heading,Math.PI/2);
 const arc=integrate(pose,0,.4,Math.PI/2,.4);close(arc.x,2.2);close(arc.y,2.2);
 assert.deepEqual(bodySpeeds(.2,.6,.4),{linear:.4,angular:.9999999999999999});
});
test('side targets and coupled slew preserve speed, yaw and acceleration bounds',()=>{
 const limits={maxSpeed:.6,maxYaw:1.4,trackWidth:.32,acceleration:.5,dt:.1};
 let wheels=[0,0];for(const target of [[10,10],[-10,5],[0,-10],[0,0]])for(let i=0;i<50;i++){
 const desired=wheelTargets(target[0],target[1],limits);const next=slewWheels(wheels,desired,limits.acceleration*limits.dt);
 for(let j=0;j<2;j++){assert.ok(Math.abs(next[j])<=.6+1e-9);assert.ok(Math.abs(next[j]-wheels[j])<=.05+1e-9);}assert.ok(Math.abs(bodySpeeds(...next,.32).angular)<=1.4+1e-9);wheels=next;
 }
});
test('whole swept paths catch thin obstacles and curved-path collisions missed by endpoints',()=>{
 const world={width:10,height:10,obstacles:[{x0:3.99,y0:1,x1:4.01,y1:5}]};
 assert.equal(segmentClear(world,[2,2],[6,2],.2),false);assert.equal(segmentClear(world,[2,6],[6,6],.2),true);assert.equal(segmentClear(world,[.1,2],[2,2],.2),false);
 const curved={width:10,height:10,obstacles:[{x0:2.7,y0:2.25,x1:2.8,y1:2.35}]};
 const pose={x:2,y:2,heading:0};
 assert.equal(arcClear(curved,pose,.75,1.25,Math.PI,.5,.1),false);
 assert.equal(arcClear({width:10,height:10,obstacles:[]},pose,.75,1.25,Math.PI,.5,.1),true);
});
test('world coordinates convert north-first map rows to y-up rectangles',()=>{
 const world=worldGeometry(['.....','..#..','.....','.....','.....']);
 assert.deepEqual(world.obstacles,[{x0:2,y0:3,x1:3,y1:4}]);
});
