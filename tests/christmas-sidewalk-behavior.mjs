import assert from 'node:assert/strict';
import {createSidewalkTraffic,GUIDE_GAP} from '../modules/themes/effects/christmasSidewalkTraffic.js';
const actor=(x,direction=1)=>({x,direction,cast:{width:78,scale:1,animal:false},state:'walking',opacity:1});
const a=actor(0),b=actor(90,-1),traffic=createSidewalkTraffic();
traffic.attach([a,b],()=>({scale:.65,pedestrianBottom:38}));
// Parked vehicles close both guides; lane changes cannot bypass their occupied bay.
traffic.setVehicle('car',{left:70,right:130});
for(let i=0;i<100;i++){traffic.beginFrame(.05);a.x=traffic.move(a,a.x+1.6,.05);}
assert.ok(a.x+78*.65/2+78*.65*.27+5<=70.01);assert.equal(a.trafficBlocked,true);const stopped=a.x;
traffic.setVehicle('car',null);traffic.beginFrame(.05);a.x=traffic.move(a,a.x+1.6,.05);assert.ok(a.x>stopped,'Resume as soon as vehicle returns to street');
// Two opposing walkers on the same guide reserve the other guide, move vertically, then pass.
a.x=0;b.x=100;a.guide=b.guide=0;a.guideOffset=b.guideOffset=0;a.guideCooldown=b.guideCooldown=0;
let changed=false,passed=false;
for(let i=0;i<200;i++){
 traffic.beginFrame(.05);a.x=traffic.move(a,a.x+1.6,.05);b.x=traffic.move(b,b.x-1.6,.05);
 changed ||= a.guide!==b.guide;
 if(Math.abs(a.guideOffset-b.guideOffset)<GUIDE_GAP-1)assert.ok(Math.abs(a.x-b.x)>30,'Never occupy overlapping bodies in one guide');
 if(a.x>b.x+40){passed=true;break;}
}
assert.ok(changed&&passed,'Both walkers pass without deadlock');
// A busy alternative guide means wait, rather than a jump or overlap.
a.x=0;b.x=32;a.guide=0;a.guideOffset=0;b.guide=0;b.guideOffset=0;a.guideCooldown=0;
traffic.setGuests('interns',[{x:25.35+30,lane:1,halfWidth:12,ground:60}]);traffic.beginFrame(.05);
assert.equal(traffic.move(a,1.6,.05),0);assert.equal(a.guide,0);
traffic.setGuests('interns',[]);traffic.beginFrame(.05);assert.equal(traffic.move(a,1.6,.05),0);assert.equal(a.guide,1);
assert.equal(a.guideOffset,0,'Lane change is reserved before vertical travel');traffic.beginFrame(.05);assert.ok(a.guideOffset>0&&a.guideOffset<GUIDE_GAP,'Guide transitions are smooth');
// New bay reservations let a pedestrian already inside leave instead of trapping them.
a.x=80;b.state='inside';traffic.setVehicle('car',{left:70,right:130});traffic.beginFrame(.05);const escape=traffic.move(a,a.x+1.6,.05);assert.notEqual(escape,a.x);
traffic.setVehicle('car',null);a.x=0;a.guide=0;a.guideOffset=0;
assert.equal(traffic.canGuestsMove([{x:25.35,ground:44}]),false);a.guide=1;a.guideOffset=GUIDE_GAP;
assert.equal(traffic.canGuestsMove([{x:25.35,ground:44}]),true,'Interns can pass a pedestrian in the second guide');
traffic.dispose();assert.equal(traffic.getStatus().vehicles,0);
console.log('OK: parked bay blocking and release, smooth reserved guide changes, opposing walkers pass, occupied second guide waits, bay evacuation and intern priority.');
