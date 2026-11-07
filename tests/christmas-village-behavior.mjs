import assert from 'node:assert/strict';
import {createSidewalkTraffic} from '../modules/themes/effects/christmasSidewalkTraffic.js';
import {createSnowMountains} from '../modules/themes/effects/snowMountains.js';
import {createChristmasVillage} from '../modules/themes/effects/christmasVillage.js';
let width=1363,tableBottom=400,id=0;
const intervals=new Map(),events={},documentEvents={},frames=new Map();let now=0;
globalThis.performance={now:()=>now};
globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
function tick(time){now=time;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));const sprites=app.children[0]?.children;if(sprites?.length>=4)assert.ok(sprites[1].hidden||sprites[3].hidden,'Vehicles never render together on the shared route');}
globalThis.innerWidth=width;
globalThis.window={setInterval(fn){intervals.set(++id,fn);return id;},addEventListener(k,fn){events[k]=fn;},removeEventListener(k){delete events[k];}};
globalThis.clearInterval=id=>intervals.delete(id);
function element(){const node={style:{},children:[],attributes:{},hidden:false,
  addEventListener(k,fn){(this.events??={})[k]=fn;},removeEventListener(k){delete this.events[k];},setAttribute(k,v){this.attributes[k]=v;},cloneNode(){return element();},
  append(...nodes){this.children.push(...nodes);nodes.forEach(child=>child.parentElement=this);},
  remove(){this.parentElement.children=this.parentElement.children.filter(child=>child!==this);},
  getClientRects(){return this.hidden?[]:[1];},getBoundingClientRect:()=>({width,height:270,top:530,bottom:800,left:0,right:width})};
  node.classList={add(name){node.className=(node.className||'')+' '+name;},contains:()=>true};return node;}
const app=element(),host=element();
const header={getClientRects:()=>[1],getBoundingClientRect:()=>({bottom:80})};
const table={getClientRects:()=>[1],getBoundingClientRect:()=>({bottom:tableBottom})};
app.querySelector=()=>header;app.querySelectorAll=()=>[];
globalThis.document={createElement:element,createElementNS:element,getElementById:()=>table,addEventListener(k,fn){documentEvents[k]=fn;},removeEventListener(k){delete documentEvents[k];}};
const mountains=createSnowMountains(host),wrapper=host.children[0];
assert.equal(wrapper.children[0].children.length,2,'Two snow layers are behind the village');
assert.equal(wrapper.children[1],mountains.villageHost);
assert.equal(wrapper.children[2].children.length,1,'Closest snow band remains independent');assert.equal(wrapper.children[2].attributes.viewBox,'0 0 1200 24');assert.equal(wrapper.children[2].style.bottom,'37px','Snow follows the upper street edge');assert.equal(wrapper.children[2].style.height,'14px','Foreground snow has a fixed shallow road-edge height');
const traffic=createSidewalkTraffic();const sounds=[];const village=createChristmasVillage(mountains.villageHost,app,{traffic,audio:{play(kind){sounds.push(kind);return {stop(){}};}}}),[hospital,road,...houses]=mountains.villageHost.children;
assert.ok(hospital.src.endsWith('/hospital-delicias-final-snow.png'));
assert.equal(parseFloat(hospital.style.bottom),44,'Curb rests at the upper road edge');assert.equal(road.className,'christmas-village-road');assert.equal(parseFloat(road.style.width),width);assert.equal(parseFloat(road.style.height),44);assert.ok(road.style.backgroundImage.includes('snowy-road.webp'));
assert.equal(village.getStatus().snowPlane,'in-front-of-snow');
assert.equal(village.getStatus().buildings,1);assert.equal(houses.length,0,'Houses are absent from the DOM');assert.equal(village.getStatus().houses,'hidden');
function checkLayout(){
  assert.equal(village.getStatus().visible,true);
  assert.ok(parseFloat(hospital.style.left)>=0);
  assert.ok(Math.abs(parseFloat(hospital.style.left)+parseFloat(hospital.style.width)/2-width/2)<.01,'Hospital is exactly centered');
  const treeLeft=width*.24-48,treeRight=width*.24+48;
  assert.ok(treeRight<parseFloat(hospital.style.left),'Tree remains clear of the hospital');
  assert.ok(800-parseFloat(hospital.style.bottom)-parseFloat(hospital.style.width)/(720/115)>=tableBottom+14-.01);
}
checkLayout();
for(width of [768,1000,1920,2560]){innerWidth=width;events.resize();checkLayout();}
width=1363;innerWidth=width;events.resize();
const stableWidth=hospital.style.width;
tableBottom=630;events.resize();checkLayout();assert.equal(hospital.style.width,stableWidth,'Census growth never shrinks the hospital');
tableBottom=720;events.resize();assert.equal(village.getStatus().visible,false,'Hide instead of shrinking when the fixed hospital no longer fits');
tableBottom=750;events.resize();assert.equal(mountains.villageHost.hidden,true,'Hide when no safe room remains');
tableBottom=400;events.resize();checkLayout();
width=500;innerWidth=width;events.resize();assert.equal(mountains.villageHost.hidden,true);
width=1363;innerWidth=width;events.resize();checkLayout();
const controls=app.children[0],[trigger,ambulance]=controls.children;
// Hitbox follows only the ambulance door, never the facade or pavement.
const doorLeft=parseFloat(trigger.style.left)-parseFloat(hospital.style.left);
const hospitalWidth=parseFloat(hospital.style.width),hospitalHeight=hospitalWidth/(720/115);
assert.ok(Math.abs(doorLeft/hospitalWidth-97/720)<.00001);
assert.ok(Math.abs(parseFloat(trigger.style.width)/hospitalWidth-37/720)<.00001);
assert.ok(Math.abs(parseFloat(trigger.style.height)/hospitalHeight-30/115)<.00001);
assert.ok(Math.abs((parseFloat(trigger.style.bottom)-44)/hospitalHeight-26/115)<.00001);
assert.equal(hospital.events?.click,undefined,'Facade has no click handler');
assert.equal(village.getStatus().ambulanceArrivalMs,3000);
assert.equal(village.getStatus().ambulanceStopMs,3000);
assert.equal(village.getStatus().ambulanceExitMs,3000);
for(const direction of [.1,.9]){
 Math.random=()=>direction;now=0;trigger.events.click();trigger.events.click();
 assert.equal(frames.size,1,'Repeated clicks cannot duplicate the ambulance');
 tick(0);assert.equal(village.getStatus().ambulance,'arriving');
 assert.equal(ambulance.style.backgroundPosition.split(' ')[1],(direction<.5?0:-parseFloat(ambulance.style.height))+'px');
 tick(2300);assert.equal(ambulance.style.transform,'translateY(-0px) scale(1)','Lateral arrival stays at street depth');
 tick(2700);assert.equal(ambulance.style.backgroundPosition.split(' ')[1],(-2*parseFloat(ambulance.style.height))+'px','Only frontal view reverses toward the curb');assert.ok(/scale\(0\.9/.test(ambulance.style.transform),'Ambulance eases toward the sidewalk before parking');
 tick(3000);assert.equal(traffic.getStatus().vehicles,1,'Parked ambulance reserves sidewalk');assert.equal(ambulance.style.transform,'translateY(-32px) scale(0.88)');assert.equal(village.getStatus().ambulance,'parked');assert.equal(parseFloat(ambulance.style.bottom),4,'Ambulance drives below the pedestrian curb');
 const parkedX=ambulance.style.left;
 assert.ok(Math.abs(parseFloat(parkedX)+parseFloat(ambulance.style.width)/2-(parseFloat(hospital.style.left)+parseFloat(hospital.style.width)*.16))<.01,'Ambulance centers on expanded bay');
 tick(5999);assert.equal(village.getStatus().ambulance,'parked');assert.equal(ambulance.style.left,parkedX,'Stopped for exactly three seconds');
 tick(6000);assert.equal(village.getStatus().ambulance,'leaving');assert.equal(ambulance.style.backgroundPosition.split(' ')[1],(-2*parseFloat(ambulance.style.height))+'px','Stay frontal while pulling out');assert.equal(ambulance.style.left,parkedX);
 tick(6650);assert.equal(traffic.getStatus().vehicles,0,'Clear sidewalk when frontal pullout ends');assert.equal(ambulance.style.transform,'translateY(-0px) scale(1)','Departure returns to full street size');
 tick(9000);assert.equal(village.getStatus().ambulance,'idle');assert.equal(ambulance.hidden,true);assert.equal(trigger.disabled,false);assert.equal(frames.size,0);
}
const [,,pickupTrigger,pickupSprite,driverSprite]=controls.children;
assert.equal(controls.children.length,11,'Vehicle controls, RAM driver and five intern slots with a main-door trigger');
assert.ok(parseFloat(pickupTrigger.style.left)>parseFloat(trigger.style.left)+parseFloat(trigger.style.width));
const order=['ram-2500','silverado','civic','jimny'],sequence=[],heights={},driverStates=new Set();
let next=0,clock=30000;
for(let i=0;i<12;i++){
 now=clock;const start=now;pickupTrigger.events.click();pickupTrigger.events.click();
 tick(start+1500);const sideHeight=parseFloat(pickupSprite.style.height),model=village.getStatus().pickupModel;
 assert.equal(model,order[next++%4]);sequence.push(model);
 const stop=village.getStatus().pickupStopMs,startMs=village.getStatus().pickupStartMs,end=start+3000+stop+startMs+3002;
 tick(start+2700);assert.ok(pickupSprite.style.backgroundPosition.split(' ')[1].startsWith('-'),'Parking uses a frontal atlas frame');const parkingCenter=parseFloat(pickupSprite.style.left)+parseFloat(pickupSprite.style.width)/2;
 tick(start+3000);assert.ok(Math.abs(parseFloat(pickupSprite.style.left)+parseFloat(pickupSprite.style.width)/2-parkingCenter)<.001,'Frontal parking has no lateral travel');assert.equal(pickupSprite.style.transform,'translateY(-32px) scale(0.88)','Every model uses the same parking depth');assert.equal(parseFloat(pickupSprite.style.bottom),4,'All civilian vehicles share the street plane');heights[model]=parseFloat(pickupSprite.style.height);assert.ok(Math.abs(heights[model]-sideHeight)<.001);
 if(model==='ram-2500'){
   assert.ok(stop>8000,'RAM waits for the whole walk, greeting and return');
   assert.equal(driverSprite.hidden,false);
   trigger.events.click();trigger.events.click();assert.equal(village.getStatus().ambulance,'queued');
   let lastState='';let outX,doorX;
   for(let t=start+3050;t<start+3000+stop;t+=100){
     tick(t);const state=village.getStatus().ramDriver;driverStates.add(state);
     if(state==='walking-to-door')outX=parseFloat(driverSprite.style.left);
     if(state==='waving'){assert.equal(parseFloat(driverSprite.style.bottom),48,'RAM driver reaches the pedestrian plane');doorX=parseFloat(driverSprite.style.left);assert.ok(doorX>parseFloat(pickupSprite.style.left)+parseFloat(pickupSprite.style.width)/2);}
     if(state==='returning'&&lastState==='waving')assert.ok(parseFloat(driverSprite.style.left)<=doorX+.1);
     lastState=state;assert.equal(ambulance.hidden,true,'Ambulance stays offscreen throughout the visit');
   }
   assert.ok(outX>parseFloat(pickupSprite.style.left));
 }else assert.equal(driverSprite.hidden,true,'Driver belongs only to RAM');
 tick(start+3000+stop+1);assert.equal(village.getStatus().pickup,'starting');
 const parkedLeft=pickupSprite.style.left;tick(start+3000+stop+startMs);assert.equal(village.getStatus().pickup,'starting');assert.equal(pickupSprite.style.left,parkedLeft,'Stay still until starter finishes');
 tick(start+3000+stop+startMs+2);assert.equal(village.getStatus().pickup,'leaving');assert.equal(driverSprite.hidden,true,'Driver back inside before vehicle moves');
 tick(start+3000+stop+startMs+652);assert.equal(pickupSprite.style.transform,'translateY(-0px) scale(1)');
 tick(end+1);assert.equal(village.getStatus().pickup,'idle');assert.equal(pickupSprite.hidden,true);assert.equal(driverSprite.hidden,true);
 if(model==='ram-2500'){assert.equal(village.getStatus().ambulance,'arriving');tick(end+9002);assert.equal(village.getStatus().ambulance,'idle');clock=end+10000;}
 else clock=end+1000;
 assert.equal(frames.size,0);
}
assert.ok(heights.civic<heights.jimny&&heights.jimny<heights.silverado&&heights.jimny<heights['ram-2500']);
for(let i=0;i<sequence.length;i+=4)assert.equal(new Set(sequence.slice(i,i+4)).size,4);
for(const state of ['getting-out','walking-to-door','waving','returning','getting-in'])assert.ok(driverStates.has(state),'Exercise '+state);
assert.equal(sounds.filter(k=>k==='ramArrival').length,3);assert.equal(sounds.filter(k=>k==='ramExit').length,3);
assert.equal(sounds.filter(k=>k==='silveradoStart').length,3);assert.equal(sounds.filter(k=>k==='civicStart').length,3);assert.equal(sounds.filter(k=>k==='vehicleStart').length,6);assert.equal(sounds.filter(k=>k==='jimnyDrive').length,6,'Jimny music plays only on arrival and departure');
// Main door: one shuffled group, delayed single-file departures, same route on return.
const mainDoor=controls.children[5],internNodes=controls.children.slice(6);
assert.ok(parseFloat(mainDoor.style.left)>parseFloat(pickupTrigger.style.left));
now=clock;const internStart=clock;mainDoor.events.click();mainDoor.events.click();
assert.equal(village.getStatus().internCount,5);assert.equal(mainDoor.disabled,true);
const identities=village.getStatus().internMembers.map(m=>m.identity);assert.equal(new Set(identities).size,5,'No duplicate intern appearance within one group');
trigger.events.click();assert.equal(village.getStatus().ambulance,'queued','Vehicles wait for the crossing group');
const exits=new Map(),returns=new Set(),internPhases=new Set();let groupEnd=clock;
for(let t=clock+50;t<internStart+60000;t+=50){
 tick(t);const state=village.getStatus();groupEnd=t;
 if(state.internGroup==='idle')break;
 assert.equal(ambulance.hidden,true,'No moving vehicle intersects the pedestrian crossing');
 state.internMembers.forEach((member,index)=>{
  internPhases.add(member.phase);
  if(member.phase==='exiting'&&!exits.has(index))exits.set(index,t);
  if(member.phase==='returning-crossing')returns.add(member.identity);
  if(member.phase==='crossing'||member.phase==='returning-crossing'){
   const expected=parseFloat(hospital.style.left)+parseFloat(hospital.style.width)*224/720;
   assert.ok(Math.abs(member.x-expected)<.01,'Cross only at urgent-care doorway');assert.equal(member.row,member.phase==='crossing'?0:3);
  }
  if(member.phase==='walking-left'&&member.row===1)assert.ok(member.x<=parseFloat(mainDoor.style.left)+parseFloat(mainDoor.style.width));
 });
}
assert.equal(village.getStatus().internGroup,'idle');assert.equal(exits.size,5);assert.equal(returns.size,5,'Every departing intern comes back');
for(let i=1;i<5;i++)assert.ok(Math.abs(exits.get(i)-exits.get(i-1)-1500)<=50,'Interns leave one by one at fixed spacing');
for(const phase of ['exiting','walking-left','crossing','away','returning-crossing','walking-right','entering','inside'])assert.ok(internPhases.has(phase),'Exercise intern phase '+phase);
assert.ok(internNodes.every(n=>n.hidden));assert.equal(mainDoor.disabled,false);
assert.equal(village.getStatus().ambulance,'arriving','Queued vehicle starts after every intern has returned');tick(groupEnd+9001);clock=groupEnd+10000;
// Start another RAM visit then hide the stage: both vehicle and visitor must cancel.
now=clock;pickupTrigger.events.click();tick(clock+4000);assert.equal(driverSprite.hidden,false);
width=500;events.resize();assert.equal(driverSprite.hidden,true);assert.equal(frames.size,0);width=1363;events.resize();
mainDoor.events.click();tick(now+100);assert.equal(village.getStatus().internCount,5);
trigger.events.click();document.hidden=true;documentEvents.visibilitychange();assert.equal(village.getStatus().internGroup,'idle');assert.ok(internNodes.every(n=>n.hidden));assert.equal(frames.size,0,'Hiding a group cancels its queued vehicles too');document.hidden=false;
trigger.events.click();width=500;events.resize();assert.equal(frames.size,0,'Hiding the village cancels the trip');
width=1363;events.resize();trigger.events.click();document.hidden=true;documentEvents.visibilitychange();assert.equal(frames.size,0);document.hidden=false;
trigger.events.click();village.dispose();village.dispose();assert.equal(frames.size,0);assert.equal(app.children.length,0);assert.equal(Object.keys(documentEvents).length,0);assert.equal(mountains.villageHost.children.length,0);assert.equal(intervals.size,0);assert.equal(Object.keys(events).length,0);
const sound={pending:true,elapsedMs:0,durationMs:9000,stop(){this.stopped=true;}};
const synced=createChristmasVillage(mountains.villageHost,app,{audio:{play:()=>sound}});
now=0;const [syncTrigger,syncSprite]=app.children[0].children;syncTrigger.events.click();tick(500);assert.equal(syncSprite.hidden,true,'Wait offscreen while audio starts');
sound.pending=false;tick(600);assert.equal(synced.getStatus().ambulance,'arriving');
sound.elapsedMs=3000;tick(8000);assert.equal(synced.getStatus().ambulance,'parked','Use audio clock even if animation wall time advances');
sound.elapsedMs=6000;tick(9000);assert.equal(synced.getStatus().ambulance,'leaving');
sound.elapsedMs=9000;tick(9500);assert.equal(synced.getStatus().ambulance,'idle');assert.equal(sound.stopped,true);synced.dispose();assert.equal(frames.size,0);
mountains.dispose();assert.equal(host.children.length,0);
console.log('OK: separate door hitboxes, four-model rotation, ordered relative heights, parking under left windows, matched lateral scale, RAM doctor walk/wave/return and engine cues, five unique interns in a staggered round trip, crossing/vehicle serialization, extended RAM stop, serialized vehicle requests without overlap, visibility and disposal.');
