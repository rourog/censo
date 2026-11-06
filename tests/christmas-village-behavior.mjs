import assert from 'node:assert/strict';
import {createSnowMountains} from '../modules/themes/effects/snowMountains.js';
import {createChristmasVillage} from '../modules/themes/effects/christmasVillage.js';
let width=1363,tableBottom=400,id=0;
const intervals=new Map(),events={},documentEvents={},frames=new Map();let now=0;
globalThis.performance={now:()=>now};
globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
function tick(time){now=time;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));}
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
assert.equal(wrapper.children[2].children.length,1,'Only the closest snow layer covers the buildings');
const village=createChristmasVillage(mountains.villageHost,app),[hospital,...houses]=mountains.villageHost.children;
assert.ok(hospital.src.endsWith('/hospital-delicias-expanded-snow.png'));
assert.equal(village.getStatus().buildings,1);assert.equal(houses.length,0,'Houses are absent from the DOM');assert.equal(village.getStatus().houses,'hidden');
function checkLayout(){
  assert.equal(village.getStatus().visible,true);
  assert.ok(parseFloat(hospital.style.left)>=0);
  assert.ok(Math.abs(parseFloat(hospital.style.left)+parseFloat(hospital.style.width)/2-width/2)<.01,'Hospital is exactly centered');
  const treeLeft=width*.24-48,treeRight=width*.24+48;
  assert.ok(treeRight<parseFloat(hospital.style.left),'Tree remains clear of the hospital');
  assert.ok(800-parseFloat(hospital.style.bottom)-parseFloat(hospital.style.width)/(720/125)>=tableBottom+14-.01);
}
checkLayout();
for(width of [768,1000,1920,2560]){innerWidth=width;events.resize();checkLayout();}
tableBottom=750;events.resize();assert.equal(mountains.villageHost.hidden,true,'Hide when no safe room remains');
tableBottom=400;events.resize();checkLayout();
width=500;innerWidth=width;events.resize();assert.equal(mountains.villageHost.hidden,true);
width=1363;innerWidth=width;events.resize();checkLayout();
const controls=app.children[0],[trigger,ambulance]=controls.children;
for(const direction of [.1,.9]){
 Math.random=()=>direction;now=0;trigger.events.click();trigger.events.click();
 assert.equal(frames.size,1,'Repeated clicks cannot duplicate the ambulance');
 tick(0);assert.equal(village.getStatus().ambulance,'arriving');
 assert.equal(ambulance.style.backgroundPosition.split(' ')[1],(direction<.5?0:-parseFloat(ambulance.style.height))+'px');
 tick(1100);assert.equal(village.getStatus().ambulance,'parked');
 const parkedX=ambulance.style.left;
 tick(4099);assert.equal(village.getStatus().ambulance,'parked');assert.equal(ambulance.style.left,parkedX,'Stopped for the entire three seconds');
 tick(4100);assert.equal(village.getStatus().ambulance,'leaving');
 tick(4950);assert.equal(village.getStatus().ambulance,'idle');assert.equal(ambulance.hidden,true);assert.equal(trigger.disabled,false);assert.equal(frames.size,0);
}
trigger.events.click();width=500;events.resize();assert.equal(frames.size,0,'Hiding the village cancels the trip');
width=1363;events.resize();trigger.events.click();document.hidden=true;documentEvents.visibilitychange();assert.equal(frames.size,0);document.hidden=false;
trigger.events.click();village.dispose();village.dispose();assert.equal(frames.size,0);assert.equal(app.children.length,0);assert.equal(Object.keys(documentEvents).length,0);assert.equal(mountains.villageHost.children.length,0);assert.equal(intervals.size,0);assert.equal(Object.keys(events).length,0);
mountains.dispose();assert.equal(host.children.length,0);
console.log('OK: centered hospital, safe area, snow order, ambulance from both sides, exact three-second stop, single active trip, exit, visibility cancellation and disposal.');
