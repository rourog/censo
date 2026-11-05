import assert from 'node:assert/strict';
import {createChristmasSky,getChristmasSkyState} from '../modules/themes/effects/christmasSky.js';
for(const hour of [0,3,6,9,12,15,18,21,23.9]){
  const a=getChristmasSkyState(hour),b=getChristmasSkyState(hour+12);
  assert.notEqual(a.body,b.body);
  assert.ok(Math.abs(a.progress-b.progress)<1e-12,'Twelve hours exchanges bodies at exactly the same arc position');
  assert.deepEqual(getChristmasSkyState(hour+24),a);
}
assert.equal(getChristmasSkyState(6).body,'sun');assert.equal(getChristmasSkyState(18).body,'moon');
assert.equal(getChristmasSkyState(12).altitude,1);assert.equal(getChristmasSkyState(0).altitude,1);
assert.notEqual(getChristmasSkyState(12).top,getChristmasSkyState(0).top);
assert.equal(getChristmasSkyState(-3).hour,21);
let clock=0,tableBottom=400,next=0;
const intervals=new Map(),winEvents={},docEvents={};
globalThis.performance={now:()=>clock};globalThis.innerWidth=1300;globalThis.innerHeight=900;
globalThis.window={setInterval(fn,ms){assert.equal(ms,1000);intervals.set(++next,fn);return next;},
  addEventListener(k,fn){winEvents[k]=fn;},removeEventListener(k){delete winEvents[k];}};
globalThis.clearInterval=n=>intervals.delete(n);
function element(){return {style:{setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}},children:[],events:{},
  setAttribute(k,v){this[k]=v;},addEventListener(k,fn){this.events[k]=fn;},removeEventListener(k){delete this.events[k];},
  append(...nodes){this.children.push(...nodes);nodes.forEach(n=>n.parent=this);},remove(){this.parent.children=this.parent.children.filter(n=>n!==this);},
  getClientRects:()=>[1],getBoundingClientRect:()=>({top:0,bottom:900,left:0,right:1300})};}
const app=element(),table={getClientRects:()=>[1],getBoundingClientRect:()=>({bottom:tableBottom})};
const header={getClientRects:()=>[1],getBoundingClientRect:()=>({bottom:80})};
const bar={getClientRects:()=>[1],getBoundingClientRect:()=>({top:800})};
app.classList={contains:()=>true};app.querySelector=s=>s==='.header'?header:bar;app.querySelectorAll=()=>[];
globalThis.document={hidden:false,createElement:element,getElementById:id=>id==='scrollTableWrapper'?table:bar,
  addEventListener(k,fn){docEvents[k]=fn;},removeEventListener(k){delete docEvents[k];}};
const sky=createChristmasSky(app),root=app.children[0],[sun,moon]=root.children;
const tick=()=>[...intervals.values()].forEach(fn=>fn());
assert.equal(sky.getStatus().hour,9);assert.equal(sky.getStatus().cycleMs,1440000);
assert.equal(sun.hidden,false);assert.equal(moon.hidden,true);
const position=sun.style.transform,dayColor=app.style['--christmas-sky-top'];
sun.events.click();assert.equal(sky.getStatus().hour,21);assert.equal(moon.style.transform,position);
assert.equal(sun.hidden,true);assert.equal(moon.hidden,false);assert.equal(sun.disabled,true);
assert.notEqual(app.style['--christmas-sky-top'],dayColor);
sun.events.click();assert.equal(sky.getStatus().hour,21,'Hidden sun cannot skip again');
clock=60000;tick();assert.equal(sky.getStatus().hour,22,'One minute advances exactly one hour');
clock=1440000;tick();assert.equal(sky.getStatus().hour,21,'A full cycle lasts 24 minutes');
document.hidden=true;docEvents.visibilitychange();assert.equal(root.hidden,true);
clock+=60000;document.hidden=false;docEvents.visibilitychange();assert.equal(sky.getStatus().hour,22,'Clock continues in a background tab');
tableBottom=780;tick();assert.equal(root.hidden,true,'Celestial buttons cannot cover clinical rows');
tableBottom=400;innerWidth=500;winEvents.resize();assert.equal(root.hidden,true);
innerWidth=1300;winEvents.resize();assert.equal(root.hidden,false);
sky.dispose();sky.dispose();assert.equal(app.children.length,0);assert.equal(intervals.size,0);
assert.equal(Object.keys(sun.events).length,0);assert.equal(Object.keys(winEvents).length,0);assert.equal(Object.keys(docEvents).length,0);
assert.equal(app.style['--christmas-sky-top'],undefined);assert.equal(app.style['--christmas-sky-horizon'],undefined);
console.log('OK: 24-minute cycle, continuous sky palette, sun/moon arc, +12h click, hidden-tab time, safe layout and cleanup.');
