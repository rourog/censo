import assert from 'node:assert/strict';
import {createSeasonalAmbient} from '../modules/seasonalAmbient.js';
import {SEASONAL_PROFILES} from '../modules/seasonalTheme.js';
let raf,layer,ground,tableBottom=250,preference='mixed';
const created=[];
function element(){return {style:{},children:[],appendChild(child){this.children.push(child);child.parentElement=this;},setAttribute(key,value){this[key]=value;},remove(){this.removed=true;}};}
const app={classList:{contains:()=>true},getClientRects:()=>[1],querySelector:()=>({getBoundingClientRect:()=>({bottom:80})}),appendChild(el){if(el.className==='seasonal-bats')layer=el;else ground=el;}};
globalThis.document={hidden:false,body:{style:{setProperty(){},removeProperty(){}}},createElement(){const el=element();created.push(el);return el;},getElementById(id){return id==='mainAppContainer'?app:id==='censoNewsBar'?{getClientRects:()=>[1],getBoundingClientRect:()=>({top:700})}:id==='scrollTableWrapper'?{getClientRects:()=>[1],getBoundingClientRect:()=>({bottom:tableBottom})}:null;},addEventListener(){},removeEventListener(){}};
globalThis.localStorage={getItem:()=>preference};globalThis.window={CensoBuild:{version:'test'}};
globalThis.innerWidth=1000;globalThis.innerHeight=800;globalThis.matchMedia=()=>({matches:false,addEventListener(){}});
globalThis.requestAnimationFrame=fn=>{raf=fn;return 1;};globalThis.cancelAnimationFrame=()=>{};
const random=Math.random;Math.random=()=>.5;
const ambient=createSeasonalAmbient(),profile={ambient:{...SEASONAL_PROFILES.halloween.ambient,count:33}};
ambient.sync(profile,'effect-halloween');let now=1000;raf(now);
const ghosts=layer.children.filter(b=>b.className.includes('seasonal-ghost'));
assert.equal(ghosts.length,3);assert.equal(layer.children.length-ghosts.length,30);
assert.equal(layer.children.filter(b=>b['aria-label'].includes('ojos rojos')).length,1);
for(const ghost of ghosts){const y=Number(ghost.style.transform.match(/,([^p]+)px/)[1]);assert.ok(y>=tableBottom+8);assert.ok(y+parseFloat(ghost.style.height)<=680);assert.match(ghost.children[0].style.backgroundImage,/ghost.png/);}
const ghost=ghosts[0];const startingY=ghost.style.transform;ghost.onclick();assert.equal(ghost.disabled,true);
for(let i=0;i<8;i++){now+=50;raf(now);assert.equal(ghost.style.transform,startingY,'Ghost dissolves in place');}
assert.notEqual(ghost.children[0].style.backgroundPosition,'-64px -48px');
for(let i=0;i<16;i++){now+=50;raf(now);}assert.equal(ghost.removed,true);
for(const color of ['cyan','pink']){preference=color;ambient.sync(profile,'effect-halloween');raf(now+=50);const items=layer.children.filter(b=>b.className.includes('seasonal-ghost'));assert.equal(items.length,3);for(const g of items)assert.match(g['aria-label'],color==='pink'?/rosa/:/azul/);}
tableBottom=690;raf(now+=50);for(const g of layer.children)assert.equal(g.style.visibility,'hidden');
tableBottom=250;raf(now+=50);for(const g of layer.children)assert.equal(g.style.visibility,'');
// Deterministic left-facing flight verifies mirroring during flight and dissolve.
Math.random=()=>.25;ambient.sync(profile,'effect-halloween');raf(now+=50);
const leftGhost=layer.children.find(item=>item.className.includes('seasonal-ghost'));
assert.match(leftGhost.children[0].style.transform,/scale\(-[0-9.]+,[0-9.]+\)/);
const position=leftGhost.style.transform;leftGhost.onclick();raf(now+=50);
assert.match(leftGhost.children[0].style.transform,/scale\(-[0-9.]+,[0-9.]+\)/);
assert.equal(leftGhost.style.transform,position,'Mirroring keeps the hit box stationary during dissolution');
Math.random=()=>.5;
const before=created.length;ambient.sync(SEASONAL_PROFILES.halloween,'effect-halloween');
for(let i=0;i<500;i++)raf(now+=50);
assert.ok(created.slice(before).some(item=>item.className==='seasonal-bat seasonal-ghost'),'Six live slots eventually introduce a rare ghost on re-entry');
const old=layer;ambient.sync(profile,'effect-none');assert.equal(old.removed,true);Math.random=random;
console.log('OK: 1 ghost per 10 bat appearances, pink/blue preference, free-space limits, dissolve-in-place, full cleanup and disabled effects.');
