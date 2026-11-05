import assert from 'node:assert/strict';
import {createChristmasScene} from '../modules/themes/effects/christmasScene.js';
let id=0,tableBottom=400,newsTop=800,footerTop=840,motion;
const frames=new Map(),timers=new Map(),events={},docEvents={},timeouts=new Map();
let clock=0;
globalThis.performance={now:()=>clock};
globalThis.setTimeout=(fn,ms)=>{const n=++id;timeouts.set(n,{fn,expires:clock+ms});return n;};
globalThis.clearTimeout=n=>timeouts.delete(n);
globalThis.innerWidth=1300;globalThis.innerHeight=900;
globalThis.requestAnimationFrame=fn=>{const n=++id;frames.set(n,fn);return n;};
globalThis.cancelAnimationFrame=n=>frames.delete(n);
globalThis.clearInterval=n=>timers.delete(n);
globalThis.window={setInterval(fn){const n=++id;timers.set(n,fn);return n;},addEventListener(k,fn){events[k]=fn;},removeEventListener(k){delete events[k];}};
const reduced={matches:false,addEventListener(k,fn){motion=fn;},removeEventListener(){motion=null;}};
globalThis.matchMedia=()=>reduced;
function element(){return {children:[],style:{setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}},
  className:'',attributes:{},events:{},classList:{contains:c=>c==='table-is-active',add(){},toggle(){}},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},
  addEventListener(k,fn){this.events[k]=fn;},removeEventListener(k){delete this.events[k];},
  append(n){this.children.push(n);n.parent=this;},remove(){this.parent.children=this.parent.children.filter(n=>n!==this);},
  getClientRects:()=>[1],getBoundingClientRect(){const width=parseFloat(this.style.width)||1300,height=parseFloat(this.style.height)||900;return {left:0,right:width,top:0,bottom:height,width,height};}};}
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
const advance=now=>{clock=now;for(const [key,timer] of [...timeouts])if(clock>=timer.expires){timeouts.delete(key);timer.fn();}const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));};
advance(100);advance(150);
assert.ok(actors.every(n=>n.style.backgroundPosition),'All walkers have sprite frames');
const tree=root.children[0];
assert.equal(tree.attributes['aria-label'],'Lanzar un regalo desde el pino');
// Static presents open once and survive layout recalculation.
const stationary=root.children[1];
assert.equal(stationary.attributes['aria-label'],'Abrir regalo');
stationary.onclick();assert.equal(stationary.attributes['aria-label'],'Regalo abierto');
assert.ok(Math.abs(parseFloat(stationary.style.backgroundPosition.split(' ')[1])+288*.65)<.001,'Static gift uses the open-box sprite row');
const openPosition=stationary.style.backgroundPosition;
[...timers.values()].forEach(fn=>fn());assert.equal(stationary.style.backgroundPosition,openPosition);
stationary.onclick();assert.equal(scene.getStatus().openedGifts,1,'Opening twice has no additional effect');
tree.events.click();assert.equal(scene.getStatus().spawnedGifts,1,'Tree throws a gift');
const treeGift=root.children.at(-1);
assert.equal(treeGift.attributes['data-kind'],'gift');
treeGift.onclick();assert.equal(scene.getStatus().openedGifts,1,'Airborne gifts cannot open');
// Attention comes first; each of the three givers faces forward before throwing.
Math.random=()=>.1;
actors[0].events.click();assert.equal(scene.getStatus().spawnedGifts,1,'Santa does not throw before attention delay');
assert.ok(actors[0].style.backgroundPosition.endsWith(' 0px'),'Santa faces the user');
advance(369);assert.equal(scene.getStatus().spawnedGifts,1);
advance(370);assert.equal(scene.getStatus().spawnedGifts,2);
assert.equal(root.children.at(-1).attributes['data-kind'],'wreath','Santa can throw a wreath');
Math.random=()=>.8;actors[1].events.click();advance(600);
assert.equal(root.children.at(-1).attributes['data-kind'],'gift','Mrs. Claus can throw a gift');
Math.random=()=>.1;actors[2].events.click();advance(830);
assert.equal(root.children.at(-1).attributes['data-kind'],'wreath','Jesus can throw a wreath');
assert.equal(scene.getStatus().spawnedGifts,4);
actors[3].events.click();assert.equal(scene.getStatus().spawnedGifts,4,'Other characters do not throw');
Math.random=()=>.5;
for(let i=0;i<30;i++)tree.events.click();
assert.equal(scene.getStatus().spawnedGifts,20,'Gift and wreath cap is shared');
assert.equal(timeouts.size,20,'The cap creates no extra timers');
assert.equal(scene.getStatus().gifts,6);
advance(1000);advance(2000);
const grounded=root.children.slice(12);
assert.equal(grounded.length,20);
assert.equal(new Set(grounded.map(n=>n.style.transform)).size,20);
assert.ok(grounded.every(n=>n.style.transform&&!n.style.transform.includes('NaN')));
assert.equal(treeGift.disabled,false,'Landed gifts become actionable');
const expiryBefore=[...timeouts.values()].map(timer=>timer.expires).sort();
treeGift.onclick();assert.equal(treeGift.attributes['aria-label'],'Regalo abierto');
assert.equal(scene.getStatus().openedGifts,2);
assert.deepEqual([...timeouts.values()].map(timer=>timer.expires).sort(),expiryBefore,'Opening does not reset expiry');
assert.ok(grounded.filter(n=>n.attributes['data-kind']==='wreath').every(n=>!n.onclick),'Wreaths do not open');
advance(30149);assert.equal(scene.getStatus().spawnedGifts,20);
advance(30830);assert.equal(scene.getStatus().spawnedGifts,0,'Temporary gifts and wreaths expire');
assert.equal(scene.getStatus().openedGifts,1,'Static open gift remains after temporary loot expires');
assert.equal(timeouts.size,0);
const positions=actors.map(n=>n.style.transform);
for(let t=30900;t<=130000;t+=50){advance(t);if(t%500===0)[...timers.values()].forEach(fn=>fn());}
assert.notDeepEqual(actors.map(n=>n.style.transform),positions,'Walkers actually travel');
assert.ok(actors.some((n,i)=>n.style.backgroundImage!==initial[i]),'Leaving an edge rotates the cast despite layout polling');
newsTop=0;[...timers.values()].forEach(fn=>fn());
assert.equal(root.style.bottom,'66px','Footer becomes the floor when news is hidden');
tableBottom=820;[...timers.values()].forEach(fn=>fn());
assert.equal(scene.getStatus().visible,false,'No room: scenery must not cover rows');assert.equal(frames.size,0);
tableBottom=400;innerWidth=500;events.resize();assert.equal(scene.getStatus().visible,false,'Narrow screens hide the scene');
innerWidth=1300;events.resize();assert.equal(scene.getStatus().visible,true);
reduced.matches=true;motion();assert.equal(frames.size,0);assert.equal(scene.getStatus().animated,false);
tree.events.click();assert.equal(scene.getStatus().spawnedGifts,1,'Reduced motion still permits gifts without flight');assert.equal(frames.size,0);
reduced.matches=false;motion();assert.ok(frames.size);
document.hidden=true;docEvents.visibilitychange();assert.equal(frames.size,0);
scene.dispose();scene.dispose();Math.random=originalRandom;
assert.equal(app.children.length,0);assert.equal(timeouts.size,0);
assert.equal(Object.keys(tree.events).length,0);assert.equal(stationary.onclick,null);assert.ok(actors.every(a=>Object.keys(a.events).length===0));assert.equal(timers.size,0);assert.equal(frames.size,0);
assert.equal(Object.keys(events).length,0);assert.equal(Object.keys(docEvents).length,0);assert.equal(motion,null);
assert.equal(document.body.style['--christmas-floor-offset'],undefined);
console.log('OK: stage positioning, visible space, cast rotation, giver attention, random gifts/wreaths, gift opening, shared cap/expiry, reduced motion and disposal.');
