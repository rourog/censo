import assert from 'node:assert/strict';
import {createSidewalkTraffic} from '../modules/themes/effects/christmasSidewalkTraffic.js';
import {createChristmasScene} from '../modules/themes/effects/christmasScene.js';
import {getChristmasStageLayout} from '../modules/themes/effects/christmasStageLayout.js';
let id=0,tableBottom=400,newsTop=800,footerTop=840,motion;
const frames=new Map(),timers=new Map(),events={},docEvents={},timeouts=new Map(),animations=[];
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
  className:'',attributes:{},events:{},classList:{contains:c=>c==='table-is-active',add(){},remove(){},toggle(){}},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},
  addEventListener(k,fn){this.events[k]=fn;},removeEventListener(k){delete this.events[k];},
  animate(keyframes,options){const animation={keyframes,options,cancelled:false,cancel(){this.cancelled=true;}};animations.push(animation);return animation;},
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
const played=[];const scene=createChristmasScene(app,{traffic:createSidewalkTraffic(),audio:{play:kind=>played.push(kind)}}),root=app.children[0];
assert.equal(scene.getStatus().characters,6);assert.equal(scene.getStatus().people,3);assert.equal(scene.getStatus().reservedDriverSlots,1,'Fourth person slot is reserved for the RAM visitor');assert.equal(scene.getStatus().cast,18);assert.equal(scene.getStatus().gifts,6);
assert.equal(root.style.bottom,'106px','Stage stands above the highest visible bottom bar');
assert.equal(document.body.style['--christmas-floor-offset'],'100px');
const actors=root.children.slice(7,13),initial=actors.map(n=>n.style.backgroundImage);
const advance=now=>{clock=now;for(const [key,timer] of [...timeouts])if(clock>=timer.expires){timeouts.delete(key);timer.fn();}const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));};
advance(100);advance(150);
assert.ok(actors.every(n=>n.style.backgroundPosition),'All walkers have sprite frames');
const activeFiles=()=>actors.map(n=>n.attributes['data-character']);
assert.equal(new Set(activeFiles()).size,actors.length,'Every initial character has a unique identity');
assert.deepEqual(activeFiles().slice(3),['tuxedo-cat.png','husky-gray.png','husky-black.png']);
assert.ok(parseFloat(actors[3].style.width)<parseFloat(actors[4].style.width)*.7,'Cat is at most 70% of husky scale');
assert.ok(actors.every(n=>parseFloat(n.style.bottom)>=getChristmasStageLayout(innerWidth).pedestrianBottom),'Walkers remain above the road');
assert.equal(actors[4].style.width,actors[5].style.width,'Both huskies use the same proportions');
assert.ok(Math.abs(parseFloat(actors[3].style.backgroundPosition.split(' ')[1])+96*.65*.62)<.001,'Cat uses the left-walk row');
assert.ok(Math.abs(parseFloat(actors[4].style.backgroundPosition.split(' ')[1])+192*.65*.9)<.001,'Husky uses the right-walk row');
const tree=root.children[0];
assert.equal(tree.attributes['aria-label'],'Lanzar un regalo desde el pino');
assert.ok(tree.style.backgroundImage.includes('/christmas-tree.png'),'Tree uses its complete standalone sprite');
assert.equal(tree.style.backgroundSize,tree.style.width+' '+tree.style.height,'Standalone tree is not clipped by a tileset crop');
assert.equal(scene.getStatus().tree,'left');
assert.ok(Math.abs(parseFloat(tree.style.left)+parseFloat(tree.style.width)/2-getChristmasStageLayout(innerWidth).treeCenter)<.01,'Tree is anchored to the left quarter');
const giftCenters=root.children.slice(1,7).map(node=>parseFloat(node.style.left)+parseFloat(node.style.width)/2);
assert.ok(Math.abs(giftCenters.reduce((a,b)=>a+b,0)/6-getChristmasStageLayout(innerWidth).treeCenter)<.01,'Stationary presents follow the tree');
// Static presents open once and survive layout recalculation.
const stationary=root.children[1];
assert.equal(stationary.attributes['aria-label'],'Abrir regalo');
stationary.onclick();assert.equal(played.at(-1),'gift','Opening a gift requests the selected reveal sound');assert.equal(stationary.attributes['aria-label'],'Regalo abierto');
assert.ok(Math.abs(parseFloat(stationary.style.backgroundPosition.split(' ')[1])+288*.65)<.001,'Static gift uses the open-box sprite row');
const openPosition=stationary.style.backgroundPosition;
[...timers.values()].forEach(fn=>fn());assert.equal(stationary.style.backgroundPosition,openPosition);
stationary.onclick();assert.equal(scene.getStatus().openedGifts,1,'Opening twice has no additional effect');
tree.events.click();assert.equal(scene.getStatus().spawnedGifts,1,'Tree throws a gift');
assert.equal(animations.length,1,'Tree gives click feedback');
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
actors[2].events.click();actors[4].events.click();
assert.equal(scene.getStatus().spawnedGifts,3,'Doctors and animals do not throw');
// Each holiday giver owns at most one object, including wreaths and airborne gifts.
for(let round=0;round<3;round++)for(const actor of actors.slice(0,2))actor.events.click();
advance(1060);
assert.equal(scene.getStatus().spawnedGifts,3,'Repeated clicks never add a second object per giver');
Math.random=()=>.5;
for(let i=0;i<30;i++)tree.events.click();
assert.equal(scene.getStatus().spawnedGifts,20,'Gift and wreath cap is shared');
assert.equal([...timeouts.values()].filter(t=>t.expires>clock+5000).length,20,'The cap creates no extra expiry timers');
assert.ok(animations.slice(0,-1).every(a=>a.cancelled),'Repeated clicks restart rather than accumulate tree shakes');
assert.equal(scene.getStatus().gifts,6);
advance(1100);advance(2000);
const grounded=root.children.slice(14);
assert.equal(grounded.length,20);
assert.equal(new Set(grounded.map(n=>n.style.transform)).size,20);
assert.ok(grounded.every(n=>n.style.transform&&!n.style.transform.includes('NaN')));
// Compare the rendered solid box edges, rather than the padded sprite cells.
const boxEdges=[[3,3,42,45],[3,12,42,45],[6,6,39,45],[0,15,45,45],[9,21,36,45]];
const stageHeight=parseFloat(root.style.height);
const supportRects=root.children.slice(1,7).map(node=>{
  const scale=parseFloat(node.style.width)/48;
  const column=Math.round(-parseFloat(node.style.backgroundPosition)/(48*scale));
  const [l,t,r,b]=boxEdges[column],left=parseFloat(node.style.left),top=stageHeight-parseFloat(node.style.bottom)-48*scale;
  return {left:left+l*scale,right:left+r*scale,top:top+t*scale,bottom:top+b*scale};
});
let stacked=0;
for(const node of grounded){
  const scale=parseFloat(node.style.width)/48;
  const column=Math.round(-parseFloat(node.style.backgroundPosition)/(48*scale));
  const [l,t,r,b]=node.attributes['data-kind']==='wreath'?[0,0,48,48]:boxEdges[column];
  const position=node.style.transform.match(/translate\(([-.\d]+)px,([-.\d]+)px\)/);
  const left=Number(position[1]),top=Number(position[2]);
  const bounds={left:left+l*scale,right:left+r*scale,top:top+t*scale,bottom:top+b*scale};
  const overlaps=supportRects.filter(other=>Math.min(other.right,bounds.right)-Math.max(other.left,bounds.left)>.1);
  const surface=Math.min(stageHeight-getChristmasStageLayout(innerWidth).pedestrianBottom,...overlaps.map(other=>other.top));
  assert.ok(Math.abs(bounds.bottom-surface)<.02,'Visible gift base touches the ground or the highest overlapping box');
  if(surface<stageHeight-.02)stacked++;
  supportRects.push(bounds);
}
assert.ok(stacked>0,'This fixture exercises an actual pile');
assert.equal(treeGift.disabled,false,'Landed gifts become actionable');
const expiryBefore=[...timeouts.values()].filter(t=>t.expires>10000).map(timer=>timer.expires).sort();
treeGift.onclick();assert.equal(treeGift.attributes['aria-label'],'Regalo abierto');
assert.equal(scene.getStatus().openedGifts,2);
assert.deepEqual([...timeouts.values()].filter(t=>t.expires>10000).map(timer=>timer.expires).sort(),expiryBefore,'Opening does not reset expiry');
assert.ok(grounded.filter(n=>n.attributes['data-kind']==='wreath').every(n=>!n.onclick),'Wreaths do not open');
advance(5149);assert.equal(stationary.attributes['aria-label'],'Regalo abierto');
advance(5150);assert.equal(stationary.attributes['aria-label'],'Abrir regalo','Static gift closes after five seconds');
assert.equal(stationary.disabled,false);
advance(6999);assert.equal(treeGift.attributes['aria-label'],'Regalo abierto');
advance(7000);assert.equal(treeGift.attributes['aria-label'],'Abrir regalo','Thrown gift also closes');
stationary.onclick();assert.equal(stationary.attributes['aria-label'],'Regalo abierto','Closed gifts can be reopened');
advance(12000);assert.equal(stationary.attributes['aria-label'],'Abrir regalo');
advance(30149);assert.equal(scene.getStatus().spawnedGifts,20);
treeGift.onclick();assert.equal(treeGift.attributes['aria-label'],'Regalo abierto');
advance(31060);assert.ok(![...timeouts.values()].some(t=>t.expires===35149),'Expiry cancels the pending close timer');
assert.equal(scene.getStatus().spawnedGifts,0,'Temporary gifts and wreaths expire');
assert.equal(scene.getStatus().openedGifts,0,'Gifts have closed before temporary loot expires');
assert.equal(timeouts.size,0);
for(const actor of actors.slice(0,2))actor.events.click();advance(31290);
assert.equal(scene.getStatus().spawnedGifts,2,'Expiry lets each giver throw again');
advance(61290);assert.equal(scene.getStatus().spawnedGifts,0);
const positions=actors.map(n=>n.style.transform);
const pets=new Set(['tuxedo-cat.png','husky-gray.png','husky-black.png']);
const seenPeople=new Set(),states=new Set(),doors=new Set();
let petSamples=0,deerSamples=0,changes=0;
let seed=42;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
for(let t=61300;t<=400000;t+=50){
  const before=actors.map(node=>({file:node.attributes['data-character'],x:Number(node.style.transform.match(/translateX\(([-.\d]+)px\)/)[1]),width:parseFloat(node.style.width)}));
  advance(t);
  const active=activeFiles();
  assert.equal(new Set(active).size,actors.length,'Rotation must never duplicate a reserved or active character');
  const status=scene.getStatus();
  assert.ok(status.people<=3,'Regular walkers leave one slot free for the RAM driver');assert.equal(status.peopleLimit,4);
  assert.ok(status.holidayPeople<=2);assert.equal(status.holidayLimit,2);
  for(const [index,person] of status.personStates.entries()){
    seenPeople.add(person.file);states.add(person.state);
    if(person.state==='inside')assert.equal(actors[index].hidden,true,'Indoor people are hidden');
    if(person.state==='entering'||person.state==='exiting'){
      doors.add(person.point);
      const x=Number(actors[index].style.transform.match(/translateX\(([-.\d]+)px\)/)[1]);
      const stage=getChristmasStageLayout(innerWidth),center=x+parseFloat(actors[index].style.width)/2;
      const expected=stage.hospitalLeft+stage.hospitalWidth*(person.point==='urgencias'?224:394)/720;
      assert.ok(Math.abs(center-expected)<.01,'Door transition stays centered on the pedestrian doorway');
      assert.ok(Number(actors[index].style.transform.match(/scale\(([-.\d]+)\)/)[1])>=.8,'Door transition uses only a modest reduction');
    }
  }
  assert.equal(status.animals,3);assert.equal(status.animalLimit,3);
  active.slice(3).forEach((file,i)=>{
    if(pets.has(file))petSamples++;else deerSamples++;
    if(file!==before[i+3].file){changes++;assert.ok(before[i+3].x>=innerWidth||before[i+3].x+before[i+3].width<=0,'Animals rotate only fully offscreen');}
  });
  if(t%500===0)[...timers.values()].forEach(fn=>fn());
}
assert.equal(seenPeople.size,9,'All five clinicians and four holiday guests take turns');
for(const state of ['walking','entering','inside','exiting','arriving'])assert.ok(states.has(state),'Exercise '+state);
assert.equal(doors.size,2,'Both pedestrian entrances are used');
assert.ok(changes>0&&deerSamples>0);assert.ok(petSamples>deerSamples);
assert.notDeepEqual(actors.map(n=>n.style.transform),positions,'Walkers actually travel');
// The snowman melts once, waits ten full seconds, then reverses every frame.
const snowman=root.children[13];
assert.equal(scene.getStatus().snowman,'ready');
snowman.events.click();snowman.events.click();
assert.equal(scene.getStatus().snowman,'melting');assert.equal(snowman.disabled,true);
for(let i=1;i<=11;i++){advance(400000+i*140);assert.equal(scene.getStatus().snowmanFrame,i);}
assert.equal(scene.getStatus().snowman,'waiting');
const meltedPosition=snowman.style.backgroundPosition;
[...timers.values()].forEach(fn=>fn());assert.equal(snowman.style.backgroundPosition,meltedPosition);
advance(411539);assert.equal(scene.getStatus().snowmanFrame,11,'Full ten seconds as a puddle');
advance(411540);assert.equal(scene.getStatus().snowman,'rebuilding');assert.equal(scene.getStatus().snowmanFrame,10);
for(let i=1;i<=10;i++){advance(411540+i*140);assert.equal(scene.getStatus().snowmanFrame,10-i);}
assert.equal(scene.getStatus().snowman,'ready');assert.equal(snowman.disabled,false);
newsTop=0;[...timers.values()].forEach(fn=>fn());
assert.equal(root.style.bottom,'66px','Footer becomes the floor when news is hidden');
tableBottom=820;[...timers.values()].forEach(fn=>fn());
assert.equal(scene.getStatus().visible,false,'No room: scenery must not cover rows');assert.equal(frames.size,0);
tableBottom=400;innerWidth=500;events.resize();assert.equal(scene.getStatus().visible,false,'Narrow screens hide the scene');
innerWidth=1300;events.resize();assert.equal(scene.getStatus().visible,true);
const fixedTreeWidth=tree.style.width,fixedSnowmanWidth=snowman.style.width,fixedActorWidth=actors[0].style.width;
for(const viewport of [768,1000,1363,1920,2560]){
 innerWidth=viewport;tableBottom=400;events.resize();const geometry=getChristmasStageLayout(viewport);
 assert.ok(parseFloat(tree.style.left)+parseFloat(tree.style.width)+19.9<=geometry.hospitalLeft,'Tree stays left of hospital with a gap');
 assert.ok(parseFloat(snowman.style.left)>=geometry.hospitalRight+19.9,'Snowman stays right of hospital with a gap');
 assert.equal(tree.style.width,fixedTreeWidth);assert.equal(snowman.style.width,fixedSnowmanWidth);
}
innerWidth=1300;tableBottom=630;events.resize();
assert.equal(tree.hidden,true,'Hide pine rather than shrinking it');assert.equal(scene.getStatus().visible,true,'Smaller characters still fit');
assert.equal(tree.style.width,fixedTreeWidth);assert.equal(snowman.style.width,fixedSnowmanWidth);assert.equal(actors[0].style.width,fixedActorWidth);
assert.ok(root.children.slice(1,7).every(g=>g.hidden),'Tree gifts hide with the pine');
tableBottom=400;events.resize();assert.equal(tree.hidden,false);assert.ok(root.children.slice(1,7).every(g=>!g.hidden));
reduced.matches=true;motion();assert.equal(frames.size,0);assert.equal(scene.getStatus().animated,false);
snowman.events.click();assert.equal(scene.getStatus().snowmanFrame,11,'Reduced motion jumps to melted frame');
advance(clock+10000);assert.equal(scene.getStatus().snowman,'ready','Reduced motion rebuilds after ten seconds');
const shakesBefore=animations.length;tree.events.click();assert.equal(played.at(-1),'tree','Pine shake requests its selected sound');assert.equal(animations.length,shakesBefore,'Reduced motion suppresses tree shake');assert.equal(scene.getStatus().spawnedGifts,1,'Reduced motion still permits gifts without flight');
stationary.onclick();assert.equal(frames.size,0);
reduced.matches=false;motion();assert.ok(frames.size);
document.hidden=true;docEvents.visibilitychange();assert.equal(frames.size,0);
snowman.events.click();assert.ok(timeouts.size,'Active melt has a pending timer');
scene.dispose();scene.dispose();Math.random=originalRandom;
assert.equal(Object.keys(snowman.events).length,0);
assert.equal(app.children.length,0);assert.equal(timeouts.size,0);
assert.equal(Object.keys(tree.events).length,0);assert.equal(stationary.onclick,null);assert.ok(actors.every(a=>Object.keys(a.events).length===0));assert.equal(timers.size,0);assert.equal(frames.size,0);
assert.equal(Object.keys(events).length,0);assert.equal(Object.keys(docEvents).length,0);assert.equal(motion,null);
assert.equal(document.body.style['--christmas-floor-offset'],undefined);
// Cat interaction: anchored jump, no re-entry, brief sprint, then ordinary walking.
document.hidden=false;reduced.matches=false;
const catScene=createChristmasScene(app),catRoot=app.children[0];
const cat=catRoot.children.find(n=>n.attributes['data-character']==='tuxedo-cat.png');
assert.equal(cat.disabled,false);assert.equal(cat.attributes['aria-label'],'Asustar al gato');
const catX=()=>Number(cat.style.transform.match(/translateX\(([-.\d]+)px\)/)[1]);
const catStart=catX(),catClock=clock;
cat.events.click();assert.equal(catScene.getStatus().catReaction,'jumping');assert.equal(cat.disabled,true);
assert.ok(cat.style.backgroundImage.includes('tuxedo-cat-startle.png'));
for(let n=1;n<=15;n++){advance(catClock+n*50);cat.events.click();assert.equal(catX(),catStart,'Jump never slides along the ground');}
for(let n=16;n<=19;n++)advance(catClock+n*50);
assert.equal(catScene.getStatus().catReaction,'running','Repeated clicks cannot restart jump');
assert.ok(cat.style.backgroundImage.includes('tuxedo-cat.png'),'Sprint restores original walking atlas');
const sprintX=catX();advance(clock+50);const sprintDistance=Math.abs(catX()-sprintX);
for(let n=0;n<42;n++)advance(clock+50);
assert.equal(catScene.getStatus().catReaction,'idle');assert.equal(cat.disabled,false);
const walkX=catX();advance(clock+50);assert.ok(sprintDistance>Math.abs(catX()-walkX)*2.5,'Sprint is faster than normal walking');
cat.events.click();assert.equal(catScene.getStatus().catReaction,'jumping');
document.hidden=true;docEvents.visibilitychange();assert.equal(catScene.getStatus().catReaction,'idle');assert.equal(frames.size,0);
document.hidden=false;docEvents.visibilitychange();reduced.matches=true;motion();cat.events.click();assert.equal(catScene.getStatus().catReaction,'idle','Reduced motion suppresses startle');
catScene.dispose();assert.equal(frames.size,0);assert.equal(timeouts.size,0);assert.equal(timers.size,0);
console.log('OK: four people/two holiday limits, nine unique rotating people, four portals, modest door fade, three prioritized animals, gift cap/expiry, layout, reduced motion and disposal.');
