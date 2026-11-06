import {PERSON_CAST,createPeopleTraffic} from './christmasPeople.js';
import {CHARACTER_SCALE,TREE_SCALE,getChristmasStageLayout} from './christmasStageLayout.js';
/* Interactive Christmas stage. Reads layout only; never reads or writes patient records. */
const ASSETS=new URL('../../../assets/themes/christmas/scene/',import.meta.url);
const DEER=['rudolph_adult_3.png','reindeer_3.png','reindeerb_3.png','reindeer_child_3.png','rudolph_adultb_3.png','rudolph_child_3.png'];
const PETS=['tuxedo-cat.png','husky-gray.png','husky-black.png'];
const CAST=[...PERSON_CAST,...DEER.map(file=>({file,width:156,height:159,sheetWidth:468,sheetHeight:636,scale:.72,animal:true})),
  ...PETS.map((file,i)=>({file,width:96,height:96,sheetWidth:288,sheetHeight:384,scale:i===0?.62:.9,animal:true}))];
// Pets get three chances per deer turn, without duplicating an active animal.
const ANIMAL_ROTATION=DEER.flatMap(file=>[...PETS,file]).map(file=>CAST.find(c=>c.file===file));
const WALK=[0,1,2,1];
const GIVERS=Object.freeze({'xmas_santa_3.png':'Santa','xmas_misses_3.png':'la señora Claus','xmas_jesus_3.png':'Jesús'});
const INITIAL_CAST=[...PERSON_CAST.slice(0,2),...PERSON_CAST.slice(4,5),...PETS.map(file=>CAST.find(c=>c.file===file))];
const STATIC_COLUMNS=[0,1,2,3,4,1];
const GIFT_LIMIT=20;
const GIFT_LIFETIME=30000;
const GIFT_OPEN_TIME=5000;
const SNOWMAN_WAIT=10000;
const SNOWMAN_FRAME_MS=140;
// Solid box edges in the 48px sprite cells; exclude transparent padding and bows.
const GIFT_BOXES=[[3,3,42,45],[3,12,42,45],[6,6,39,45],[0,15,45,45],[9,21,36,45]];
export function createChristmasScene(app,{audio}={}){
  if(!app)return {getStatus:()=>({characters:0,visible:false}),dispose(){}};
  const root=document.createElement('div');root.className='christmas-scene';root.setAttribute('aria-label','Escenario navideño interactivo');
  app.append(root);
  const sprite=(file,interactive=false)=>{const node=document.createElement(interactive?'button':'span');node.className='christmas-scene-sprite';
    if(interactive)node.type='button';else node.setAttribute('aria-hidden','true');
    node.style.backgroundImage='url("'+new URL(file,ASSETS).href+'")';root.append(node);return node;};
  const tree=sprite('christmas-tree.png',true);tree.classList.add('christmas-scene-tree');
  tree.setAttribute('aria-label','Lanzar un regalo desde el pino');tree.title='¡Un regalo del pino!';
  const giftStates=new Map();
  const gifts=Array.from({length:6},(_,i)=>{const node=sprite('christmastiles_3.png',true);
    node.classList.add('christmas-scene-gift','christmas-gift-openable');
    giftStates.set(node,{node,kind:'gift',column:STATIC_COLUMNS[i],opened:false,flying:false,lootScale:.65});
    node.setAttribute('aria-label','Abrir regalo');node.title='Abrir regalo';node.onclick=()=>openGift(node);return node;});
  const thrown=[];
  let treeShake=null;
  let width=0,stageHeight=180,scale=.65,visible=false,disposed=false,frame=0,last=0,time=0,nextAnimal=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const random=(min,max)=>min+Math.random()*(max-min);
  const actors=INITIAL_CAST.map((cast,i)=>({node:sprite(cast.file,true),cast,
    x:0,direction:i%2?-1:1,speed:random(24,42),lane:i%2,rest:0,nextRest:random(6,15),phase:i*.37,interactive:null}));
  const peopleTraffic=createPeopleTraffic(actors,{random,stage:()=>({...getChristmasStageLayout(width),width,scale,hospitalVisible:stageHeight>=getChristmasStageLayout(width).hospitalHeight})});
  const snowman=sprite('snowman-melt.png',true);snowman.classList.add('christmas-scene-snowman');
  let snowmanFrame=0,snowmanState='ready',snowmanTimer=0;
  function paintSnowman(){
    const s=scale*1.4;
    size(snowman,96,96,384,288,s);
    snowman.style.backgroundPosition=(-(snowmanFrame%4)*96*s)+'px '+(-Math.floor(snowmanFrame/4)*96*s)+'px';
    snowman.disabled=snowmanState!=='ready';
    const label=snowmanState==='ready'?'Derretir muñeco de nieve':snowmanState==='waiting'?'Muñeco derretido':snowmanState==='melting'?'Muñeco derritiéndose':'Muñeco reconstruyéndose';
    snowman.setAttribute('aria-label',label);snowman.title=label;
  }
  function stepSnowman(direction){
    if(disposed)return;
    snowmanFrame=reduced.matches?(direction>0?11:0):clamp(snowmanFrame+direction,0,11);
    paintSnowman();
    if(direction>0&&snowmanFrame===11){
      snowmanState='waiting';paintSnowman();
      snowmanTimer=setTimeout(()=>{snowmanState='rebuilding';stepSnowman(-1);},SNOWMAN_WAIT);
    }else if(direction<0&&snowmanFrame===0){snowmanState='ready';snowmanTimer=0;paintSnowman();}
    else snowmanTimer=setTimeout(()=>stepSnowman(direction),SNOWMAN_FRAME_MS);
  }
  const onSnowmanClick=()=>{
    if(disposed||!visible||document.hidden||snowmanState!=='ready')return;
    snowmanState='melting';paintSnowman();
    if(reduced.matches)stepSnowman(1);
    else snowmanTimer=setTimeout(()=>stepSnowman(1),SNOWMAN_FRAME_MS);
  };
  snowman.addEventListener('click',onSnowmanClick);
  const size=(node,w,h,sw,sh,s)=>{node.style.width=w*s+'px';node.style.height=h*s+'px';node.style.backgroundSize=sw*s+'px '+sh*s+'px';};
  function drawActor(actor){
    const s=scale*actor.cast.scale,{width:w,height:h,sheetWidth:sw,sheetHeight:sh}=actor.cast;
    size(actor.node,w,h,sw,sh,s);
    actor.node.setAttribute('data-character',actor.cast.file);
    actor.node.style.backgroundImage='url("'+new URL(actor.cast.file+(actor.cast.imageVersion?'?v=walk-'+actor.cast.imageVersion:''),ASSETS).href+'")';
    actor.node.setAttribute('data-state',actor.state||'walking');
    actor.node.setAttribute('data-person',String(!actor.cast.animal));
    actor.node.setAttribute('data-holiday',String(!!actor.cast.holiday));
    actor.node.hidden=actor.state==='inside'||(!actor.cast.animal&&stageHeight<getChristmasStageLayout(width).hospitalHeight);
    const giver=GIVERS[actor.cast.file];
    if(actor.interactive!==giver){
      actor.interactive=giver;actor.node.classList.toggle('is-giver',!!giver);actor.node.disabled=!giver;
      if(giver){actor.node.removeAttribute('aria-hidden');actor.node.setAttribute('aria-label','Llamar a '+giver);actor.node.title='¡Llama su atención!';}
      else{actor.node.setAttribute('aria-hidden','true');actor.node.removeAttribute('aria-label');actor.node.title='';}
    }
    const resting=reduced.matches||actor.rest>0;
    const column=resting?1:WALK[Math.floor((time+actor.phase)*7)%WALK.length];
    const row=actor.state==='entering'?3:actor.state==='exiting'?0:resting?0:actor.direction<0?1:2;
    const atlas=actor.cast.frames?.[row*3+column];
    actor.node.style.backgroundPosition=atlas?(-atlas[0]*s)+'px '+(-atlas[1]*s)+'px':(-column*w*s)+'px '+(-row*h*s)+'px';
    actor.node.style.bottom=(actor.cast.animal?(actor.lane?0:8):0)+'px';
    actor.node.style.zIndex=actor.cast.animal?(actor.lane?'5':'2'):'2';
    actor.node.style.transformOrigin='50% 100%';
    actor.node.style.transform=actor.cast.animal?'translateX('+actor.x.toFixed(2)+'px)':
      'translateX('+actor.x.toFixed(2)+'px) translateY('+(-(actor.depth||0)).toFixed(2)+'px) scale('+(actor.shrink??1).toFixed(4)+')';
    actor.node.style.clipPath='none';
    actor.node.style.opacity=String(actor.opacity??1);
  }
  function stopFrame(){cancelAnimationFrame(frame);frame=0;last=0;}
  function pickCast(actor){
    if(!actor.cast.animal)return actor.cast;
    for(let i=0;i<ANIMAL_ROTATION.length;i++){
      const candidate=ANIMAL_ROTATION[nextAnimal++%ANIMAL_ROTATION.length];
      if(!actors.some(other=>other.cast.file===candidate.file))return candidate;
    }
    return actor.cast;
  }
  function tick(now){
    frame=0;if(disposed||!visible||document.hidden||(reduced.matches&&!thrown.some(g=>g.flying))){last=0;return;}
    if(last&&now-last<33){frame=requestAnimationFrame(tick);return;}
    const dt=last?Math.min(.06,(now-last)/1000):0;last=now;time+=dt;
    if(!reduced.matches)for(const actor of actors){
      if(!actor.cast.animal){peopleTraffic.update(actor,dt);drawActor(actor);continue;}
      if(actor.rest>0)actor.rest=Math.max(0,actor.rest-dt);
      else{
        actor.x+=actor.direction*actor.speed*dt;
        if(time>actor.nextRest){actor.rest=random(.8,2.4);actor.nextRest=time+random(8,18);}
        const actorWidth=actor.cast.width*scale*actor.cast.scale;
        if(actor.x>width+actorWidth||actor.x<-actorWidth*2){
          actor.direction=actor.x<0?1:-1;
          actor.cast=pickCast(actor);actor.node.style.backgroundImage='url("'+new URL(actor.cast.file+(actor.cast.imageVersion?'?v=walk-'+actor.cast.imageVersion:''),ASSETS).href+'")';
          actor.x=actor.direction>0?-actor.cast.width*scale*actor.cast.scale:width;actor.speed=random(24,42);
        }
      }
      drawActor(actor);
    }
    drawGifts(dt);
    if(!reduced.matches||thrown.some(g=>g.flying))frame=requestAnimationFrame(tick);
  }
  const rect=node=>node?.getClientRects?.().length?node.getBoundingClientRect():null;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function stackGifts(){
    const box=(state,x,bottom)=>{
      const [left,top,right,base]=state.kind==='gift'?GIFT_BOXES[state.column]:[0,0,48,48];
      const s=state.lootScale,size=48*s;
      return {left:x-size/2+left*s,right:x-size/2+right*s,top:bottom+(48-top)*s,base:bottom+(48-base)*s};
    };
    const supports=gifts.map(node=>box(giftStates.get(node),
      parseFloat(node.style.left)+parseFloat(node.style.width)/2,parseFloat(node.style.bottom)));
    for(const gift of thrown){
      const s=scale*.8;
      gift.lootScale=s;gift.size=48*s;
      size(gift.node,48,48,gift.kind==='wreath'?192:240,gift.kind==='wreath'?144:336,s);
      if(gift.kind==='gift')paintGift(gift);
      else gift.node.style.backgroundPosition=(-gift.column*48*s)+'px '+(-96*s)+'px';
      const maxBottom=Math.max(0,stageHeight-gift.size-38);
      const offsets=[0,...Array.from({length:Math.ceil(width/(gift.size*.9))},(_,i)=>i+1).flatMap(i=>[i,-i])];
      for(const offset of offsets){
        const x=clamp(gift.desiredX+offset*gift.size*.9,gift.size/2,width-gift.size/2);
        const bounds=box(gift,x,0);
        const overlaps=supports.filter(other=>Math.min(other.right,bounds.right)-Math.max(other.left,bounds.left)>.1);
        const bottom=Math.max(0,...overlaps.map(other=>other.top))-bounds.base;
        if(bottom<=maxBottom){gift.x=x;gift.bottom=bottom;break;}
      }
      supports.push(box(gift,gift.x,gift.bottom));
    }
  }
  function removeGift(gift){
    const index=thrown.indexOf(gift);if(index<0)return;
    clearTimeout(gift.timer);clearTimeout(gift.closeTimer);gift.node.onclick=null;giftStates.delete(gift.node);
    thrown.splice(index,1);gift.node.remove();stackGifts();
  }
  function drawGifts(dt=0){
    const now=performance.now();
    for(const gift of [...thrown]){
      if(now>=gift.expires){removeGift(gift);continue;}
      const endY=stageHeight-gift.size-gift.bottom;
      if(gift.flying){
        const progress=clamp((now-gift.started)/gift.duration,0,1);
        gift.drawX=gift.fromX+(gift.x-gift.size/2-gift.fromX)*progress;
        gift.y=Math.max(0,gift.fromY+(endY-gift.fromY)*progress-Math.sin(progress*Math.PI)*gift.arc);
        gift.rotation=gift.spin*(1-progress);
        if(progress===1){gift.flying=false;readyGift(gift);}
      }else{gift.drawX=gift.x-gift.size/2;gift.y=reduced.matches?endY:gift.y+Math.sign(endY-gift.y)*Math.min(Math.abs(endY-gift.y),dt*180);}
      gift.node.style.transform='translate('+gift.drawX.toFixed(2)+'px,'+gift.y.toFixed(2)+'px) rotate('+gift.rotation.toFixed(2)+'deg)';
    }
  }
  function paintGift(state){
    state.node.style.backgroundPosition=(-state.column*48*state.lootScale)+'px '+(-(state.opened?288:240)*state.lootScale)+'px';
  }
  function readyGift(state){
    if(state.kind!=='gift')return;
    state.node.disabled=state.flying||state.opened;
    if(state.flying){state.node.setAttribute('aria-hidden','true');state.node.tabIndex=-1;}
    else{state.node.removeAttribute('aria-hidden');state.node.tabIndex=state.opened?-1:0;
      state.node.setAttribute('aria-label',state.opened?'Regalo abierto':'Abrir regalo');state.node.title=state.opened?'Regalo abierto':'Abrir regalo';}
  }
  function openGift(node){
    const state=giftStates.get(node);
    if(disposed||!visible||document.hidden||!state||state.flying||state.opened)return;
    audio?.play('gift');
    state.opened=true;node.classList.add('is-open');paintGift(state);readyGift(state);
    state.closeTimer=setTimeout(()=>{
      state.closeTimer=0;if(disposed||!giftStates.has(node))return;
      state.opened=false;node.classList.remove('is-open');paintGift(state);readyGift(state);
    },GIFT_OPEN_TIME);
  }
  function tossGift(node,fromTree=false,owner=node){
    if(disposed||!visible||document.hidden)return;
    if(thrown.length>=GIFT_LIMIT||(!fromTree&&thrown.some(gift=>gift.owner===owner)))return;
    const bounds=root.getBoundingClientRect(),origin=node.getBoundingClientRect();
    const center=origin.left+origin.width/2-bounds.left;
    const giftScale=scale*.8,giftSize=48*giftScale;
    const direction=Math.random()<.5?-1:1;
    const target=clamp(center+direction*random(fromTree?55:25,fromTree?145:85),giftSize/2,width-giftSize/2);
    const kind=!fromTree&&Math.random()<.5?'wreath':'gift';
    const column=Math.floor(random(0,kind==='wreath'?3:5));
    const present=sprite(kind==='wreath'?'christmastiles_more_3.png':'christmastiles_3.png',kind==='gift');
    present.classList.add('christmas-tossed-gift');present.setAttribute('data-kind',kind);
    size(present,48,48,kind==='wreath'?192:240,kind==='wreath'?144:336,giftScale);
    present.style.backgroundPosition=(-column*48*giftScale)+'px '+(-(kind==='wreath'?96:240)*giftScale)+'px';
    const now=performance.now();
    const gift={node:present,owner:fromTree?null:owner,kind,column,opened:false,lootScale:giftScale,size:giftSize,x:target,desiredX:target,bottom:0,started:now,expires:now+GIFT_LIFETIME,
      duration:reduced.matches?0:random(650,950),arc:random(24,48),spin:direction*random(80,170),
      fromX:center-giftSize/2,fromY:clamp(origin.top-bounds.top+origin.height*(fromTree ? .4 : .48),0,stageHeight-giftSize),
      drawX:0,y:0,rotation:0,flying:!reduced.matches,timer:0};
    if(kind==='gift'){giftStates.set(present,gift);present.classList.add('christmas-gift-openable');present.onclick=()=>openGift(present);readyGift(gift);}
    thrown.push(gift);stackGifts();gift.y=stageHeight-giftSize-gift.bottom;
    gift.timer=setTimeout(()=>removeGift(gift),GIFT_LIFETIME);
    drawGifts();if(!reduced.matches&&!frame)frame=requestAnimationFrame(tick);
  }
  const onTreeClick=()=>{
    if(disposed||!visible||tree.hidden||document.hidden)return;
    audio?.play('tree');
    if(!reduced.matches){
      treeShake?.cancel();
      const animation=tree.animate([
        {transform:'rotate(0deg)'},{transform:'rotate(-1.4deg)'},
        {transform:'rotate(1.1deg)'},{transform:'rotate(-.6deg)'},{transform:'rotate(0deg)'}
      ],{duration:420,easing:'ease-in-out'});
      treeShake=animation;animation.onfinish=()=>{if(treeShake===animation)treeShake=null;};
    }
    tossGift(tree,true);
  };tree.addEventListener('click',onTreeClick);
  for(const actor of actors){
    actor.onClick=()=>{
      if(!GIVERS[actor.cast.file]||disposed||!visible||document.hidden||(actor.state&&actor.state!=='walking'))return;
      actor.rest=Math.max(actor.rest,1.2);drawActor(actor);
      if(actor.attentionTimer)return;
      const identity=actor.cast.file;
      actor.attentionTimer=setTimeout(()=>{actor.attentionTimer=0;
        if(!disposed&&actor.cast.file===identity&&(!actor.state||actor.state==='walking'))tossGift(actor.node,false,identity);},220);
    };
    actor.node.addEventListener('click',actor.onClick);
  }
  function layout(){
    if(disposed)return;
    const appRect=rect(app),previousWidth=width;width=innerWidth;
    const news=rect(document.getElementById('censoNewsBar')),footer=rect(app.querySelector('.footer'));
    const bars=[news?.top,footer?.top].filter(value=>Number.isFinite(value)&&value>0&&value<=innerHeight);
    const floor=Math.min(innerHeight,...bars);
    document.body.style.setProperty('--christmas-floor-offset',(innerHeight-floor)+'px');
    let top=rect(app.querySelector('.header'))?.bottom||80;
    const table=rect(document.getElementById('scrollTableWrapper'));
    if(app.classList.contains('table-is-active')&&table)top=Math.max(top,table.bottom);
    else for(const section of app.querySelectorAll('#content > .section')){
      const box=rect(section);if(box&&box.right>0&&box.left<width)top=Math.max(top,box.bottom);
    }
    const height=Math.min(180,Math.max(0,floor-top-14));stageHeight=height;
    visible=!!appRect&&width>=768&&height>=95;
    root.hidden=!visible;root.style.height=height+'px';root.style.bottom=(innerHeight-floor+6)+'px';
    const previousScale=scale;scale=CHARACTER_SCALE;
    const treeScale=TREE_SCALE;
    const stage=getChristmasStageLayout(width);
    const treeCenter=stage.treeCenter;
    tree.hidden=height<192*treeScale;
    size(tree,136,192,136,192,treeScale);tree.style.left=(treeCenter-68*treeScale)+'px';tree.style.bottom=(-14*treeScale)+'px';
    tree.style.backgroundPosition='0px 0px';
    paintSnowman();snowman.style.left=stage.snowmanLeft+'px';snowman.style.bottom='0px';
    const offsets=[-180,-128,-77,77,128,180];
    gifts.forEach((gift,i)=>{gift.hidden=tree.hidden;size(gift,48,48,240,336,scale);gift.style.left=(treeCenter+(offsets[i]-24)*scale)+'px';
      gift.style.bottom=((i%2?3:0)-4)*scale+'px';
      const state=giftStates.get(gift);state.lootScale=scale;paintGift(state);});
    actors.forEach((actor,i)=>{
      if(!actor.initialized){actor.x=width*(i+.3)/actors.length;actor.initialized=true;}
      if(previousWidth!==width){actor.x=Math.max(-actor.cast.width*scale,Math.min(width,actor.x));if(!actor.cast.animal)peopleTraffic.resize(actor);}
      if(previousScale!==scale||!frame)drawActor(actor);
    });
    stackGifts();drawGifts();
    if(!visible||document.hidden||reduced.matches)stopFrame();else if(!frame)frame=requestAnimationFrame(tick);
  }
  function onVisibility(){if(document.hidden)stopFrame();else layout();}
  function onMotion(){stopFrame();if(reduced.matches){treeShake?.cancel();treeShake=null;}if(reduced.matches)for(const gift of thrown){gift.flying=false;readyGift(gift);}actors.forEach(drawActor);layout();}
  const timer=window.setInterval(layout,500);
  window.addEventListener('resize',layout);document.addEventListener('visibilitychange',onVisibility);
  reduced.addEventListener?.('change',onMotion);layout();
  return {
    getStatus:()=>({visible,characters:actors.filter(a=>a.state!=='inside').length,people:actors.filter(a=>!a.cast.animal&&a.state!=='inside').length,peopleLimit:4,reservedDriverSlots:1,holidayPeople:actors.filter(a=>a.cast.holiday&&a.state!=='inside').length,holidayLimit:2,personStates:actors.filter(a=>!a.cast.animal).map(a=>({file:a.cast.file,state:a.state||'walking',point:a.point||'pending'})),animals:actors.filter(actor=>actor.cast.animal).length,animalLimit:3,cast:CAST.length,gifts:gifts.length,tree:'left',snowman:snowmanState,snowmanFrame,snowmanWaitMs:SNOWMAN_WAIT,spawnedGifts:thrown.length,wreaths:thrown.filter(g=>g.kind==='wreath').length,openedGifts:[...giftStates.values()].filter(g=>g.opened).length,giftLimit:GIFT_LIMIT,giftLifetimeMs:GIFT_LIFETIME,giftOpenMs:GIFT_OPEN_TIME,animated:visible&&!document.hidden&&!reduced.matches}),
    dispose(){if(disposed)return;disposed=true;stopFrame();clearInterval(timer);treeShake?.cancel();treeShake=null;
      window.removeEventListener('resize',layout);document.removeEventListener('visibilitychange',onVisibility);
      reduced.removeEventListener?.('change',onMotion);tree.removeEventListener('click',onTreeClick);
      clearTimeout(snowmanTimer);snowman.removeEventListener('click',onSnowmanClick);
      actors.forEach(actor=>{actor.node.removeEventListener('click',actor.onClick);clearTimeout(actor.attentionTimer);});
      for(const gift of thrown)clearTimeout(gift.timer);
      for(const [node,state] of giftStates){clearTimeout(state.closeTimer);node.onclick=null;}giftStates.clear();thrown.length=0;root.remove();document.body.style.removeProperty('--christmas-floor-offset');}
  };
}
