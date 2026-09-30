import assert from 'node:assert/strict';
const timers=new Map();let timerId=0,raf,layer,fireworkOptions;
const ctx={scale(){},clearRect(){},drawImage(){},globalAlpha:1};
function element(tag){return {style:{setProperty(){}},children:[],setAttribute(){},appendChild(child){this.children.push(child);if(tag==='div'&&child.onload){child.contentWindow={labFireworks:{start(opt){fireworkOptions=opt;}}};queueMicrotask(child.onload);}},remove(){this.removed=true;},getContext(){return ctx;},animate(frames,opt){assert.equal(opt.duration,5000);assert.equal(frames.at(-1).opacity,0);return {cancel(){}};}};}
globalThis.document={hidden:false,body:{appendChild(el){layer=el;}},createElement:element,addEventListener(){}};
globalThis.window={CensoBuild:{version:'test'},addEventListener(){}};
globalThis.localStorage={getItem:()=>null};
globalThis.matchMedia=()=>({matches:false});
globalThis.innerWidth=1000;globalThis.innerHeight=800;globalThis.devicePixelRatio=1;
globalThis.Image=class{complete=true;naturalWidth=80;};
globalThis.requestAnimationFrame=fn=>{raf=fn;return 1;};globalThis.cancelAnimationFrame=()=>{};
globalThis.setTimeout=(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;};globalThis.clearTimeout=id=>timers.delete(id);
const {launchCelebration,stopCelebration}=await import('../modules/celebrationEffects.js');
await launchCelebration('bats');assert.ok([...timers.values()].some(t=>t.delay===3000));
const start=performance.now();raf(start+2900);assert.ok(ctx.globalAlpha<.2,'Bats fade before removal');stopCelebration();assert.ok(layer.removed);
await launchCelebration('balloons');assert.ok([...timers.values()].some(t=>t.delay===5000));stopCelebration();
await launchCelebration('fireworks');assert.equal(fireworkOptions.shell,'crossette');assert.equal(fireworkOptions.duration,5);stopCelebration();
const previous=layer;document.hidden=true;await launchCelebration('bats');assert.equal(layer,previous);
console.log('OK: 3-second bats fade; 5-second balloons and Crossette; cancellation and hidden-screen suppression.');
