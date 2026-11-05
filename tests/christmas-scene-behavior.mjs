import assert from 'node:assert/strict';
import {createChristmasScene} from '../modules/themes/effects/christmasScene.js';
let id=0,tableBottom=400,newsTop=800,footerTop=840,motion;
const frames=new Map(),timers=new Map(),events={},docEvents={};
globalThis.innerWidth=1300;globalThis.innerHeight=900;
globalThis.requestAnimationFrame=fn=>{const n=++id;frames.set(n,fn);return n;};
globalThis.cancelAnimationFrame=n=>frames.delete(n);
globalThis.clearInterval=n=>timers.delete(n);
globalThis.window={setInterval(fn){const n=++id;timers.set(n,fn);return n;},addEventListener(k,fn){events[k]=fn;},removeEventListener(k){delete events[k];}};
const reduced={matches:false,addEventListener(k,fn){motion=fn;},removeEventListener(){motion=null;}};
globalThis.matchMedia=()=>reduced;
function element(){return {children:[],style:{setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}},
  className:'',classList:{contains:c=>c==='table-is-active',add(){}},setAttribute(){},
  append(n){this.children.push(n);n.parent=this;},remove(){this.parent.children=this.parent.children.filter(n=>n!==this);},
  getClientRects:()=>[1],getBoundingClientRect:()=>({left:0,right:1300,top:0,bottom:900})};}
const app=element(),header={getClientRects:()=>[1],getBoundingClientRect:()=>({bottom:80})};
const footer={getClientRects:()=>[1],getBoundingClientRect:()=>({top:footerTop})};
const news={getClientRects:()=>newsTop?[1]:[],getBoundingClientRect:()=>({top:newsTop})};
const table={getClientRects:()=>[1],getBoundingClientRect:()=>({bottom:tableBottom})};
app.querySelector=s=>s==='.footer'?footer:header;app.querySelectorAll=()=>[];
globalThis.document={hidden:false,body:element(),createElement:element,
  getElementById:s=>s==='censoNewsBar'?news:table,
  addEventListener(k,fn){docEvents[k]=fn;},removeEventListener(k){delete docEvents[k];}};
const originalRandom=Math.random;Math.random=()=>.5;
const scene=createChristmasScene(app),root=app.children[0];
assert.equal(scene.getStatus().characters,5);assert.equal(scene.getStatus().cast,11);assert.equal(scene.getStatus().gifts,6);
assert.equal(root.style.bottom,'106px','Stage stands above the highest visible bottom bar');
assert.equal(document.body.style['--christmas-floor-offset'],'100px');
const actors=root.children.slice(7),initial=actors.map(n=>n.style.backgroundImage);
const advance=now=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));};
advance(100);advance(150);
assert.ok(actors.every(n=>n.style.backgroundPosition),'All walkers have sprite frames');
const positions=actors.map(n=>n.style.transform);
for(let t=200;t<=100000;t+=50){advance(t);if(t%500===0)[...timers.values()].forEach(fn=>fn());}
assert.notDeepEqual(actors.map(n=>n.style.transform),positions,'Walkers actually travel');
assert.ok(actors.some((n,i)=>n.style.backgroundImage!==initial[i]),'Leaving an edge rotates the cast despite layout polling');
newsTop=0;[...timers.values()].forEach(fn=>fn());
assert.equal(root.style.bottom,'66px','Footer becomes the floor when news is hidden');
tableBottom=820;[...timers.values()].forEach(fn=>fn());
assert.equal(scene.getStatus().visible,false,'No room: scenery must not cover rows');assert.equal(frames.size,0);
tableBottom=400;innerWidth=500;events.resize();assert.equal(scene.getStatus().visible,false,'Narrow screens hide the scene');
innerWidth=1300;events.resize();assert.equal(scene.getStatus().visible,true);
reduced.matches=true;motion();assert.equal(frames.size,0);assert.equal(scene.getStatus().animated,false);
reduced.matches=false;motion();assert.ok(frames.size);
document.hidden=true;docEvents.visibilitychange();assert.equal(frames.size,0);
scene.dispose();scene.dispose();Math.random=originalRandom;
assert.equal(app.children.length,0);assert.equal(timers.size,0);assert.equal(frames.size,0);
assert.equal(Object.keys(events).length,0);assert.equal(Object.keys(docEvents).length,0);assert.equal(motion,null);
assert.equal(document.body.style['--christmas-floor-offset'],undefined);
console.log('OK: stage positioning, visible space, cast rotation, movement, reduced motion and disposal.');
