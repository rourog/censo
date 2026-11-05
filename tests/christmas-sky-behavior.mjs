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
const intervals=new Map(),frames=new Map(),winEvents={},docEvents={};
let motion;const reduced={matches:false,addEventListener(k,fn){motion=fn;},removeEventListener(){motion=null;}};
globalThis.matchMedia=()=>reduced;
globalThis.requestAnimationFrame=fn=>{frames.set(++next,fn);return next;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
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
const art=app.children[1];
assert.equal(art['aria-hidden'],'true');assert.ok(art.className.includes('christmas-sky-art'));
assert.equal(sun.style.backgroundImage,undefined,'The interactive layer has no visible artwork');
assert.ok(art.children[0].style.backgroundImage.includes('sun.png'));
const dawn=getChristmasSkyState(6),dusk=getChristmasSkyState(18);
assert.equal(dawn.horizon,'rgb(255,204,90)','Golden dawn horizon');
assert.equal(dusk.horizon,'rgb(255,160,67)','Orange dusk horizon');
assert.equal(dusk.top,'rgb(94,49,153)','Violet dusk sky');
assert.notEqual(dawn.middle,dawn.top,'Separate middle sky band preserves vivid twilight colors');
const tick=()=>[...intervals.values()].forEach(fn=>fn());
assert.equal(sky.getStatus().hour,9);assert.equal(sky.getStatus().cycleMs,1440000);
assert.equal(sun.hidden,false);assert.equal(moon.hidden,true);
const position=sun.style.transform,dayColor=app.style['--christmas-sky-top'];
const advance=now=>{clock=now;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));tick();};
sun.events.click();assert.equal(sky.getStatus().hour,9,'The turn starts at the current hour');
assert.equal(sky.getStatus().turning,true);assert.equal(sun.disabled,true);assert.equal(moon.disabled,true);
assert.equal(sun.style.transform,position);
sun.events.click();moon.events.click();
advance(1200);assert.ok(Math.abs(sky.getStatus().hour-15.02)<1e-9,'Halfway through the forward half-turn');
assert.notEqual(sun.style.transform,position,'The sun visibly travels along the orbit');
assert.equal(art.children[0].style.transform,sun.style.transform,'Background art and transparent hit target travel together');
assert.equal(art.children[0].hidden,sun.hidden);
advance(1800);assert.notEqual(app.style['--christmas-sky-top'],dayColor,'Palette follows the intermediate time');
advance(2400);assert.ok(Math.abs(sky.getStatus().hour-21.04)<1e-9);assert.equal(sky.getStatus().turning,false);
assert.equal(sun.hidden,true);assert.equal(moon.hidden,false);assert.equal(moon.disabled,false);
assert.ok(Number(moon.style.opacity)<1&&Number(sun.style.opacity)<1,'Atmospheric transparency on both bodies');
moon.events.click();assert.equal(sky.getStatus().turning,true);
advance(3600);assert.ok(Math.abs(sky.getStatus().hour-15.06)<1e-9,'Moon turns the cycle in the reverse direction');
advance(4800);assert.ok(Math.abs(sky.getStatus().hour-9.08)<1e-9);assert.equal(sun.disabled,false);
clock=60000;tick();assert.equal(sky.getStatus().hour,10,'One minute advances exactly one hour');
clock=1440000;tick();assert.equal(sky.getStatus().hour,9,'A full cycle lasts 24 minutes');
document.hidden=true;docEvents.visibilitychange();assert.equal(root.hidden,true);
clock+=60000;document.hidden=false;docEvents.visibilitychange();assert.equal(sky.getStatus().hour,10,'Clock continues in a background tab');
reduced.matches=true;motion();sun.events.click();assert.equal(sky.getStatus().hour,22);assert.equal(frames.size,0,'Reduced motion skips without orbit animation');
moon.events.click();assert.equal(sky.getStatus().hour,10);
reduced.matches=false;motion();sun.events.click();
document.hidden=true;docEvents.visibilitychange();assert.equal(frames.size,0,'Hidden tabs suspend orbital rendering');
clock+=3000;document.hidden=false;docEvents.visibilitychange();assert.equal(sky.getStatus().turning,false,'A completed hidden transition resolves on return');
assert.ok(Math.abs(sky.getStatus().hour-22.05)<1e-9);
moon.events.click();reduced.matches=true;motion();assert.equal(sky.getStatus().turning,false,'Changing motion preference finishes the turn');
assert.ok(Math.abs(sky.getStatus().hour-10.05)<1e-9);
tableBottom=780;tick();assert.equal(root.hidden,true,'Celestial buttons cannot cover clinical rows');
tableBottom=400;innerWidth=500;winEvents.resize();assert.equal(root.hidden,true);
innerWidth=1300;winEvents.resize();assert.equal(root.hidden,false);
reduced.matches=false;motion();sun.events.click();assert.ok(frames.size);
sky.dispose();sky.dispose();assert.equal(frames.size,0);assert.equal(motion,null);assert.equal(Object.keys(moon.events).length,0);assert.equal(app.children.length,0);assert.equal(intervals.size,0);
assert.equal(Object.keys(sun.events).length,0);assert.equal(Object.keys(winEvents).length,0);assert.equal(Object.keys(docEvents).length,0);
assert.equal(app.style['--christmas-sky-middle'],undefined);assert.equal(app.style['--christmas-sky-top'],undefined);assert.equal(app.style['--christmas-sky-horizon'],undefined);
console.log('OK: 24-minute cycle, continuous sky palette, sun/moon arc, forward/reverse 180-degree turns, atmospheric transparency, reduced motion, hidden-tab time, safe layout and cleanup.');
