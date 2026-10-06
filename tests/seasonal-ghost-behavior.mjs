import assert from 'node:assert/strict';
import {createSeasonalAmbient} from '../modules/seasonalAmbient.js';
import {SEASONAL_PROFILES} from '../modules/seasonalTheme.js';
let raf,layer,ground,tableBottom=250,preference='mixed';
const created=[];
function element(){return {style:{},addEventListener(){},children:[],appendChild(child){this.children.push(child);child.parentElement=this;},setAttribute(key,value){this[key]=value;},remove(){this.removed=true;}};}
const app={classList:{contains:()=>true},getClientRects:()=>[1],querySelector:()=>({getBoundingClientRect:()=>({bottom:80})}),appendChild(el){if(el.className==='seasonal-bats')layer=el;else ground=el;}};
globalThis.document={hidden:false,body:{style:{setProperty(){},removeProperty(){}}},createElement(){const el=element();created.push(el);return el;},getElementById(id){return id==='mainAppContainer'?app:id==='censoNewsBar'?{getClientRects:()=>[1],getBoundingClientRect:()=>({top:700})}:id==='scrollTableWrapper'?{getClientRects:()=>[1],getBoundingClientRect:()=>({bottom:tableBottom})}:null;},addEventListener(){},removeEventListener(){}};
globalThis.localStorage={getItem:()=>preference};globalThis.window={CensoBuild:{version:'test'}};
globalThis.innerWidth=1000;globalThis.innerHeight=800;globalThis.matchMedia=()=>({matches:false,addEventListener(){}});
globalThis.requestAnimationFrame=fn=>{raf=fn;return 1;};globalThis.cancelAnimationFrame=()=>{};
const random=Math.random;Math.random=()=>.5;
const hits=[];
const ambient=createSeasonalAmbient({onHit:kind=>hits.push(kind)}),profile={ambient:{...SEASONAL_PROFILES.halloween.ambient,count:33}};
ambient.sync(profile,'effect-halloween');let now=1000;raf(now);
const ghosts=layer.children.filter(b=>b.className.includes('seasonal-ghost'));
assert.equal(ghosts.length,3);assert.equal(layer.children.length-ghosts.length,30);
assert.equal(layer.children.filter(b=>b['aria-label'].includes('ojos rojos')).length,1);
for(const ghost of ghosts){const y=Number(ghost.style.transform.match(/,([^p]+)px/)[1]);assert.ok(y>=tableBottom+8);assert.ok(y+parseFloat(ghost.style.height)<=680);assert.match(ghost.children[0].style.backgroundImage,/ghost.png/);}
const ghost=ghosts[0];const startingY=ghost.style.transform;ghost.onclick();ghost.onclick();assert.equal(ghost.disabled,true);assert.deepEqual(hits,['ghosts']);assert.equal(ground.children.at(-1).textContent,'+1');
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
// Kill every live creature, including ghosts. Every respawn can use either edge.
for (const sample of [.25, .75]) {
 Math.random=()=>sample; ambient.sync(profile,'effect-halloween'); raf(now+=50);
 const originals=[...layer.children]; for(const creature of originals)creature.onclick();
 const baseline=created.length; let checkedBat=false,checkedGhost=false;
 for(let step=0;step<180;step++){
  raf(now+=50);
  for(const replacement of created.slice(baseline).filter(el=>['seasonal-bat','seasonal-bat seasonal-ghost'].includes(el.className)&&el.style.transform&&!el.checkedEntry)){
   replacement.checkedEntry=true;
   const x=Number(replacement.style.transform.match(/translate\(([^p]+)px/)[1]);
   if(sample<.5){assert.ok(x>innerWidth,'A respawn enters from the right');assert.match(replacement.children[0].style.transform,/scale\(-/);}
   else {assert.ok(x<0,'A respawn enters from the left');assert.doesNotMatch(replacement.children[0].style.transform,/scale\(-/);}
   if(replacement.className.includes('seasonal-ghost'))checkedGhost=true;else checkedBat=true;
  }
 }
 assert.ok(checkedBat&&checkedGhost,'Both species respawn after clearing all creatures');
}
// Leaving the screen must choose a fresh edge, rather than inherit the last direction.
Math.random=()=>.25;ambient.sync(SEASONAL_PROFILES.halloween,'effect-halloween');raf(now+=50);
const exitBaseline=created.length;Math.random=()=>.75;let newEntry;
for(let step=0;step<350&&!newEntry;step++){
 raf(now+=50);newEntry=created.slice(exitBaseline).find(el=>el.className==='seasonal-bat'&&el.style.transform);
}
assert.ok(newEntry);assert.ok(Number(newEntry.style.transform.match(/translate\(([^p]+)px/)[1])<0,'A left-facing creature can next enter from the left');
const old=layer;ambient.sync(profile,'effect-none');assert.equal(old.removed,true);Math.random=random;
console.log('OK: 1 ghost per 10 bat appearances, pink/blue preference, free-space limits, dissolve-in-place, full cleanup and disabled effects.');
