import assert from 'node:assert/strict';
import {createSnowMountains} from '../modules/themes/effects/snowMountains.js';
import {createChristmasVillage} from '../modules/themes/effects/christmasVillage.js';
let width=1363,tableBottom=400,id=0;
const intervals=new Map(),events={};
globalThis.innerWidth=width;
globalThis.window={setInterval(fn){intervals.set(++id,fn);return id;},addEventListener(k,fn){events[k]=fn;},removeEventListener(k){delete events[k];}};
globalThis.clearInterval=id=>intervals.delete(id);
function element(){const node={style:{},children:[],attributes:{},hidden:false,
  setAttribute(k,v){this.attributes[k]=v;},cloneNode(){return element();},
  append(...nodes){this.children.push(...nodes);nodes.forEach(child=>child.parentElement=this);},
  remove(){this.parentElement.children=this.parentElement.children.filter(child=>child!==this);},
  getClientRects(){return this.hidden?[]:[1];},getBoundingClientRect:()=>({width,height:270,top:530,bottom:800,left:0,right:width})};
  node.classList={add(name){node.className=(node.className||'')+' '+name;},contains:()=>true};return node;}
const app=element(),host=element();
const header={getClientRects:()=>[1],getBoundingClientRect:()=>({bottom:80})};
const table={getClientRects:()=>[1],getBoundingClientRect:()=>({bottom:tableBottom})};
app.querySelector=()=>header;app.querySelectorAll=()=>[];
globalThis.document={createElement:element,createElementNS:element,getElementById:()=>table};
const mountains=createSnowMountains(host),wrapper=host.children[0];
assert.equal(wrapper.children[0].children.length,2,'Two snow layers are behind the village');
assert.equal(wrapper.children[1],mountains.villageHost);
assert.equal(wrapper.children[2].children.length,1,'Only the closest snow layer covers the buildings');
const village=createChristmasVillage(mountains.villageHost,app),[hospital,...houses]=mountains.villageHost.children;
assert.equal(village.getStatus().buildings,4);assert.equal(houses.length,3);
function checkLayout(){
  assert.equal(village.getStatus().visible,true);
  assert.ok(parseFloat(hospital.style.left)>=0);
  assert.ok(parseFloat(hospital.style.left)+parseFloat(hospital.style.width)<=width/2-100+.01,'Hospital leaves the pine corridor clear');
  const boxes=houses.map(node=>({left:parseFloat(node.style.left),size:parseFloat(node.style.width)}));
  assert.ok(boxes[0].left>=width/2+100,'Houses start outside the pine corridor');
  boxes.forEach((box,i)=>{
    assert.ok(box.left+box.size<=width);
    if(i)assert.ok(box.left>=boxes[i-1].left+boxes[i-1].size,'Houses cannot overlap');
    assert.ok(800-parseFloat(houses[i].style.bottom)-box.size>=tableBottom+14-.01,'Houses stay below clinical content');
  });
  assert.ok(800-parseFloat(hospital.style.bottom)-parseFloat(hospital.style.width)/(512/106)>=tableBottom+14-.01);
}
checkLayout();
for(width of [768,1000,1920,2560]){innerWidth=width;events.resize();checkLayout();}
tableBottom=750;events.resize();assert.equal(mountains.villageHost.hidden,true,'Hide when no safe room remains');
tableBottom=400;events.resize();checkLayout();
width=500;innerWidth=width;events.resize();assert.equal(mountains.villageHost.hidden,true);
width=1363;innerWidth=width;events.resize();checkLayout();
village.dispose();village.dispose();assert.equal(mountains.villageHost.children.length,0);assert.equal(intervals.size,0);assert.equal(Object.keys(events).length,0);
mountains.dispose();assert.equal(host.children.length,0);
console.log('OK: hospital left, three houses right, central pine corridor, snow layer order, responsive safe area, recovery and cleanup.');
