/* Interactive Christmas stage. Reads layout only; never reads or writes patient records. */
const ASSETS=new URL('../../../assets/themes/christmas/scene/',import.meta.url);
const PEOPLE=['xmas_santa_3.png','xmas_misses_3.png','gnomea_mv.png','gnomeb_mv.png','xmas_jesus_3.png'];
const DEER=['rudolph_adult_3.png','reindeer_3.png','reindeerb_3.png','reindeer_child_3.png','rudolph_adultb_3.png','rudolph_child_3.png'];
const CAST=[...PEOPLE,...DEER].map(file=>({file,width:PEOPLE.includes(file)?78:156,height:PEOPLE.includes(file)?108:159,
  sheetWidth:PEOPLE.includes(file)?234:468,sheetHeight:PEOPLE.includes(file)?432:636,deer:!PEOPLE.includes(file)}));
const WALK=[0,1,2,1];
const GIFT_LIMIT=20;
const GIFT_LIFETIME=30000;
export function createChristmasScene(app){
  if(!app)return {getStatus:()=>({characters:0,visible:false}),dispose(){}};
  const root=document.createElement('div');root.className='christmas-scene';root.setAttribute('aria-label','Escenario navideño interactivo');
  app.append(root);
  const sprite=(file,interactive=false)=>{const node=document.createElement(interactive?'button':'span');node.className='christmas-scene-sprite';
    if(interactive)node.type='button';else node.setAttribute('aria-hidden','true');
    node.style.backgroundImage='url("'+new URL(file,ASSETS).href+'")';root.append(node);return node;};
  const tree=sprite('christmastiles_3.png',true);tree.classList.add('christmas-scene-tree');
  tree.setAttribute('aria-label','Lanzar un regalo desde el pino');tree.title='¡Un regalo del pino!';
  const gifts=Array.from({length:6},()=>{const node=sprite('christmastiles_3.png');node.classList.add('christmas-scene-gift');return node;});
  const thrown=[];
  let width=0,stageHeight=180,scale=.65,visible=false,disposed=false,frame=0,last=0,time=0,nextCast=4;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const random=(min,max)=>min+Math.random()*(max-min);
  const actors=Array.from({length:5},(_,i)=>({node:sprite(CAST[[0,1,2,3,5][i]].file,true),cast:CAST[[0,1,2,3,5][i]],
    x:0,direction:i%2?-1:1,speed:random(24,42),lane:i%2,rest:0,nextRest:random(6,15),phase:i*.37}));
  const size=(node,w,h,sw,sh,s)=>{node.style.width=w*s+'px';node.style.height=h*s+'px';node.style.backgroundSize=sw*s+'px '+sh*s+'px';};
  function drawActor(actor){
    const s=scale*(actor.cast.deer ? .72 : 1),{width:w,height:h,sheetWidth:sw,sheetHeight:sh}=actor.cast;
    size(actor.node,w,h,sw,sh,s);
    const santa=actor.cast.file==='xmas_santa_3.png';
    if(actor.interactive!==santa){
      actor.interactive=santa;actor.node.classList.toggle('is-santa',santa);actor.node.disabled=!santa;
      if(santa){actor.node.removeAttribute('aria-hidden');actor.node.setAttribute('aria-label','Pedir un regalo a Santa');actor.node.title='¡Un regalo de Santa!';}
      else{actor.node.setAttribute('aria-hidden','true');actor.node.removeAttribute('aria-label');actor.node.title='';}
    }
    const resting=reduced.matches||actor.rest>0;
    const column=resting?1:WALK[Math.floor((time+actor.phase)*7)%WALK.length];
    const row=resting?0:actor.direction<0?1:2;
    actor.node.style.backgroundPosition=(-column*w*s)+'px '+(-row*h*s)+'px';
    actor.node.style.bottom=(actor.lane?0:8)+'px';actor.node.style.zIndex=actor.lane?'5':'2';
    actor.node.style.transform='translateX('+actor.x.toFixed(2)+'px)';
  }
  function stopFrame(){cancelAnimationFrame(frame);frame=0;last=0;}
  function tick(now){
    frame=0;if(disposed||!visible||document.hidden||(reduced.matches&&!thrown.some(g=>g.flying))){last=0;return;}
    if(last&&now-last<33){frame=requestAnimationFrame(tick);return;}
    const dt=last?Math.min(.06,(now-last)/1000):0;last=now;time+=dt;
    if(!reduced.matches)for(const actor of actors){
      if(actor.rest>0)actor.rest=Math.max(0,actor.rest-dt);
      else{
        actor.x+=actor.direction*actor.speed*dt;
        if(time>actor.nextRest){actor.rest=random(.8,2.4);actor.nextRest=time+random(8,18);}
        const actorWidth=actor.cast.width*scale*(actor.cast.deer ? .72 : 1);
        if(actor.x>width+actorWidth||actor.x<-actorWidth*2){
          actor.direction=actor.x<0?1:-1;
          actor.cast=CAST[nextCast++%CAST.length];actor.node.style.backgroundImage='url("'+new URL(actor.cast.file,ASSETS).href+'")';
          actor.x=actor.direction>0?-actor.cast.width*scale:width;actor.speed=random(24,42);
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
    const supports=gifts.map(node=>({x:parseFloat(node.style.left)+parseFloat(node.style.width)/2,
      size:parseFloat(node.style.width),bottom:0}));
    for(const gift of thrown){
      const maxBottom=Math.max(0,stageHeight-gift.size-38);
      const offsets=[0,...Array.from({length:6},(_,i)=>i+1).flatMap(i=>[i,-i])];
      for(const offset of offsets){
        const x=clamp(gift.desiredX+offset*gift.size*.9,gift.size/2,width-gift.size/2);
        const overlaps=supports.filter(other=>Math.abs(other.x-x)<(other.size+gift.size)*.3);
        const bottom=Math.max(0,...overlaps.map(other=>other.bottom+other.size*.78));
        if(bottom<=maxBottom){gift.x=x;gift.bottom=bottom;break;}
      }
      supports.push(gift);
    }
  }
  function removeGift(gift){
    const index=thrown.indexOf(gift);if(index<0)return;
    clearTimeout(gift.timer);thrown.splice(index,1);gift.node.remove();stackGifts();
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
        if(progress===1)gift.flying=false;
      }else{gift.drawX=gift.x-gift.size/2;gift.y=reduced.matches?endY:gift.y+Math.sign(endY-gift.y)*Math.min(Math.abs(endY-gift.y),dt*180);}
      gift.node.style.transform='translate('+gift.drawX.toFixed(2)+'px,'+gift.y.toFixed(2)+'px) rotate('+gift.rotation.toFixed(2)+'deg)';
    }
  }
  function tossGift(node,fromTree=false){
    if(disposed||!visible||document.hidden)return;
    if(thrown.length>=GIFT_LIMIT)return;
    const bounds=root.getBoundingClientRect(),origin=node.getBoundingClientRect();
    const center=origin.left+origin.width/2-bounds.left;
    const giftScale=scale*.8,giftSize=48*giftScale;
    const direction=Math.random()<.5?-1:1;
    const target=clamp(center+direction*random(fromTree?55:25,fromTree?145:85),giftSize/2,width-giftSize/2);
    const present=sprite('christmastiles_3.png');present.classList.add('christmas-tossed-gift');
    size(present,48,48,240,336,giftScale);
    present.style.backgroundPosition=(-Math.floor(random(0,5))*48*giftScale)+'px '+(-240*giftScale)+'px';
    const now=performance.now();
    const gift={node:present,size:giftSize,x:target,desiredX:target,bottom:0,started:now,expires:now+GIFT_LIFETIME,
      duration:reduced.matches?0:random(650,950),arc:random(24,48),spin:direction*random(80,170),
      fromX:center-giftSize/2,fromY:clamp(origin.top-bounds.top+origin.height*(fromTree ? .4 : .48),0,stageHeight-giftSize),
      drawX:0,y:0,rotation:0,flying:!reduced.matches,timer:0};
    thrown.push(gift);stackGifts();gift.y=stageHeight-giftSize-gift.bottom;
    gift.timer=setTimeout(()=>removeGift(gift),GIFT_LIFETIME);
    drawGifts();if(!reduced.matches&&!frame)frame=requestAnimationFrame(tick);
  }
  const onTreeClick=()=>tossGift(tree,true);tree.addEventListener('click',onTreeClick);
  for(const actor of actors){
    actor.onClick=()=>{if(actor.cast.file==='xmas_santa_3.png'){actor.rest=Math.max(actor.rest,.8);tossGift(actor.node);}};
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
    const previousScale=scale;scale=Math.max(.3,Math.min(.65,(height-8)/240));
    const treeScale=Math.max(.3,Math.min(.8,(height-8)/192));
    size(tree,120,192,240,336,treeScale);tree.style.left=(width/2-60*treeScale)+'px';tree.style.bottom=(-9*treeScale)+'px';
    tree.style.backgroundPosition='0px 0px';
    const offsets=[-180,-128,-77,77,128,180],columns=[0,1,2,3,4,1];
    gifts.forEach((gift,i)=>{size(gift,48,48,240,336,scale);gift.style.left=(width/2+(offsets[i]-24)*scale)+'px';
      gift.style.bottom=((i%2?3:0)-4)*scale+'px';gift.style.backgroundPosition=(-columns[i]*48*scale)+'px '+(-240*scale)+'px';});
    actors.forEach((actor,i)=>{
      if(!actor.initialized){actor.x=width*(i+.3)/actors.length;actor.initialized=true;}
      if(previousWidth!==width)actor.x=Math.max(-actor.cast.width*scale,Math.min(width,actor.x));
      if(previousScale!==scale||!frame)drawActor(actor);
    });
    stackGifts();drawGifts();
    if(!visible||document.hidden||reduced.matches)stopFrame();else if(!frame)frame=requestAnimationFrame(tick);
  }
  function onVisibility(){if(document.hidden)stopFrame();else layout();}
  function onMotion(){stopFrame();if(reduced.matches)for(const gift of thrown)gift.flying=false;actors.forEach(drawActor);layout();}
  const timer=window.setInterval(layout,500);
  window.addEventListener('resize',layout);document.addEventListener('visibilitychange',onVisibility);
  reduced.addEventListener?.('change',onMotion);layout();
  return {
    getStatus:()=>({visible,characters:actors.length,cast:CAST.length,gifts:gifts.length,tree:'center',spawnedGifts:thrown.length,giftLimit:GIFT_LIMIT,giftLifetimeMs:GIFT_LIFETIME,animated:visible&&!document.hidden&&!reduced.matches}),
    dispose(){if(disposed)return;disposed=true;stopFrame();clearInterval(timer);
      window.removeEventListener('resize',layout);document.removeEventListener('visibilitychange',onVisibility);
      reduced.removeEventListener?.('change',onMotion);tree.removeEventListener('click',onTreeClick);
      actors.forEach(actor=>actor.node.removeEventListener('click',actor.onClick));
      for(const gift of thrown)clearTimeout(gift.timer);thrown.length=0;root.remove();document.body.style.removeProperty('--christmas-floor-offset');}
  };
}
