import assert from 'node:assert/strict';
import {PERSON_CAST,EYE_HEIGHT,PEOPLE_PORTALS,createPeopleTraffic} from '../modules/themes/effects/christmasPeople.js';
import {getChristmasStageLayout} from '../modules/themes/effects/christmasStageLayout.js';
assert.equal(PERSON_CAST.find(c=>c.file==='gnomea_mv.png').scale,1,'Small elf never receives adult eye-line normalization');
for(const cast of PERSON_CAST.filter(c=>c.file!=='gnomea_mv.png'))assert.ok(Math.abs(cast.scale*cast.eyeHeight-EYE_HEIGHT)<1e-9,'All eyes align regardless of hat or hairstyle');
assert.ok(PERSON_CAST.find(c=>c.file==='doctor-navy.webp').scale<PERSON_CAST[0].scale,'Doctors shrink relative to the hat-wearing reference');
let viewport=1300,seed=42;
const random=(min,max)=>min+(((seed=(seed*1664525+1013904223)>>>0)/4294967296))*(max-min);
const stage=()=>({...getChristmasStageLayout(viewport),width:viewport,scale:.65,hospitalVisible:true});
const actor={cast:PERSON_CAST[0],x:50,speed:30,direction:-1,rest:0,state:'walking',point:'left',stateTime:0};
const traffic=createPeopleTraffic([actor],{random,stage});
const w=actor.cast.width*.65*actor.cast.scale;
// A normal left exit continues at walking speed until the entire sprite has left.
while(actor.state==='walking'){
 const before=actor.x;traffic.update(actor,.05);
 assert.ok(Math.abs(actor.x-before)<=1.50001,'No fast pull toward the hospital');
 if(actor.state==='inside')assert.ok(actor.x+w<=0,'Never disappear while still visible at an edge');
}
actor.state='walking';actor.x=viewport+1;actor.point='principal';traffic.update(actor,.05);
assert.equal(actor.state,'inside','Already offscreen: disappear at that edge instead of teleporting to a door');
const seen=new Set();let previous=actor.x;
for(let n=0;n<50000;n++){
 const beforeState=actor.state;previous=actor.x;traffic.update(actor,.05);
 if(actor.state!=='inside')seen.add(actor.point);
 if(beforeState==='walking'&&actor.state!=='inside')assert.ok(Math.abs(actor.x-previous)<=1.50001,'Normal routes never exceed walking speed');
 if(['entering','exiting'].includes(actor.state)){
  assert.ok(actor.shrink>=.8&&actor.shrink<=1);assert.ok(actor.opacity>=0&&actor.opacity<=1);
  assert.equal(actor.depth,0,'No vertical yank into the facade');
 }
}
assert.deepEqual([...seen].sort(),[...PEOPLE_PORTALS].sort(),'Use left, right and both hospital doors');
console.log('OK: common eye line, modest doorway reduction, four routes, full offscreen exits and no edge-to-door pull.');
