import assert from 'node:assert/strict';
import {createChristmasLights} from '../modules/themes/effects/christmasLights.js';

// Exercise the controller with deterministic timers and a small DOM adapter.
let nextId=0, reduced=false, observer;
const timeouts=new Map(), intervals=new Map();
globalThis.setTimeout=(fn,ms)=>{const id=++nextId;timeouts.set(id,{fn,ms});return id;};
globalThis.clearTimeout=id=>{timeouts.delete(id);intervals.delete(id);};
globalThis.window={setInterval:(fn,ms)=>{const id=++nextId;intervals.set(id,{fn,ms});return id;}};
globalThis.matchMedia=()=>({matches:reduced});
globalThis.ResizeObserver=class{constructor(fn){this.fn=fn;observer=this;}observe(){}disconnect(){this.disconnected=true;}};
class Element {
  constructor(){
    this.children=[];this.events={};this.dataset={};this.attributes={};
    this.style={setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}};
    this.className='';
    this.classList={contains:c=>this.className.split(' ').includes(c),
      add:c=>{if(!this.classList.contains(c))this.className+=' '+c;},
      remove:c=>{this.className=this.className.split(' ').filter(x=>x!==c).join(' ');},
      toggle:(c,on)=>on?this.classList.add(c):this.classList.remove(c)};
  }
  append(...nodes){nodes.forEach(n=>{n.parent=this;this.children.push(n);});}
  prepend(n){n.parent=this;this.children.unshift(n);}
  replaceChildren(){this.children.forEach(n=>n.parent=null);this.children=[];}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
  contains(n){return n===this||this.children.some(c=>c.contains(n));}
  get isConnected(){return !!this.parent;}
  setAttribute(k,v){this.attributes[k]=v;}
  matches(s){return s===':focus-visible';}
  closest(s){return this.classList.contains(s.slice(1))?this:null;}
  querySelectorAll(s){const classes=s.slice(1).split('.');return this.children.filter(n=>classes.every(c=>n.classList.contains(c)));}
  addEventListener(k,fn){this.events[k]=fn;}
  removeEventListener(k){delete this.events[k];}
  getBoundingClientRect(){return {left:parseFloat(this.style.left)||0,top:14,width:13,height:17};}
}
const title={getBoundingClientRect:()=>({left:550,right:750})};
const header=new Element();
header.getBoundingClientRect=()=>({left:0,width:1300});
header.querySelector=()=>title;
header.querySelectorAll=()=>[];
globalThis.document={createElement:()=>new Element(),createElementNS:()=>new Element(),hidden:false};
const lights=createChristmasLights(header), root=header.children[0];
const bulbs=()=>root.querySelectorAll('.christmas-bulb');
const patients=Array.from({length:12},(_,i)=>({fila:i,area:'OBSERVACION'}));
lights.syncPatients(patients);
assert.equal(lights.getStatus().totalBulbs,30);
assert.equal(lights.getStatus().litBulbs,12);
assert.ok(new Set(bulbs().filter(n=>n.classList.contains('is-lit')).map(n=>n.dataset.color)).size>=4,'Patients from one area still have multicolor lights');
const garland=root.querySelectorAll('.christmas-garland')[0];
assert.equal(garland.children.length,6,'Two continuous garlands, each with three textured strokes');
assert.equal((garland.children[0].attributes.d.match(/ Q /g)||[]).length,3,'Three connected U-shaped swags per side');
assert.ok(new Set(bulbs().map(n=>n.style.top)).size>2,'Bulbs hang along the garland curve');
const positions=bulbs().map(n=>n.style.left), originals=bulbs();
const idle=bulbs().find(n=>n.classList.contains('is-idle'));
assert.ok(!idle.disabled);
root.events.pointerover({target:idle});
assert.ok(idle.classList.contains('is-hovered'));
assert.equal(lights.getStatus().litBulbs,12,'Hover does not invent patients');
root.events.pointerout({target:idle,relatedTarget:null});
assert.ok(!idle.classList.contains('is-hovered'));
root.events.focusin({target:idle});assert.ok(idle.classList.contains('is-focused'));
root.events.focusout({target:idle});assert.ok(!idle.classList.contains('is-focused'));
root.events.click({target:idle});root.events.click({target:idle});
assert.equal(root.querySelectorAll('.christmas-glass-shard').length,8,'Repeated clicks during repair do not duplicate fragments');
assert.equal(root.querySelectorAll('.christmas-electric-spark').length,5);
const rotate=[...intervals.values()][0];assert.equal(rotate.ms,20000);
const before=bulbs().map(n=>n.classList.contains('is-lit'));
rotate.fn();
assert.equal(lights.getStatus().litBulbs,12);
assert.notDeepEqual(bulbs().map(n=>n.classList.contains('is-lit')),before);
assert.deepEqual(bulbs().map(n=>n.style.left),positions);
assert.deepEqual(bulbs(),originals,'Rotation preserves DOM and focus');
assert.ok(idle.classList.contains('is-off'),'Rotation must not interrupt repair');
for(const [id,timer] of [...timeouts]){timeouts.delete(id);timer.fn();}
assert.ok(!idle.classList.contains('is-off'));
assert.equal(root.querySelectorAll('.christmas-glass-shard').length,0);
lights.syncPatients([]);assert.equal(lights.getStatus().litBulbs,0);
lights.syncPatients([...patients,...Array.from({length:23},(_,i)=>({fila:100+i}))]);
assert.equal(lights.getStatus().litBulbs,30,'Existing 30-slot limit remains');
reduced=true;root.events.click({target:bulbs()[0]});
assert.equal(root.querySelectorAll('.christmas-glass-shard').length,0);
const step=lights.getStatus().shuffleStep;document.hidden=true;rotate.fn();
assert.equal(lights.getStatus().shuffleStep,step);
lights.dispose();lights.dispose();
assert.equal(timeouts.size,0);assert.equal(intervals.size,0);
assert.equal(Object.keys(root.events).length,0);assert.ok(observer.disconnected);
console.log('OK: patient counts, hover/focus, glass break/repair, fixed-slot shuffle and cleanup.');
