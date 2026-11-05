/* Decorative Christmas stage. Reads layout only; never reads or writes patient records. */
const ASSETS=new URL('../../../assets/themes/christmas/scene/',import.meta.url);
const PEOPLE=['xmas_santa_3.png','xmas_misses_3.png','gnomea_mv.png','gnomeb_mv.png','xmas_jesus_3.png'];
const DEER=['rudolph_adult_3.png','reindeer_3.png','reindeerb_3.png','reindeer_child_3.png','rudolph_adultb_3.png','rudolph_child_3.png'];
const CAST=[...PEOPLE,...DEER].map(file=>({file,width:PEOPLE.includes(file)?78:156,height:PEOPLE.includes(file)?108:159,
  sheetWidth:PEOPLE.includes(file)?234:468,sheetHeight:PEOPLE.includes(file)?432:636,deer:!PEOPLE.includes(file)}));
const WALK=[0,1,2,1];
export function createChristmasScene(app){
  if(!app)return {getStatus:()=>({characters:0,visible:false}),dispose(){}};
  const root=document.createElement('div');root.className='christmas-scene';root.setAttribute('aria-hidden','true');
  app.append(root);
  const sprite=(file)=>{const node=document.createElement('span');node.className='christmas-scene-sprite';
    node.style.backgroundImage='url("'+new URL(file,ASSETS).href+'")';root.append(node);return node;};
  const tree=sprite('christmastiles_3.png');tree.classList.add('christmas-scene-tree');
  const gifts=Array.from({length:6},()=>{const node=sprite('christmastiles_3.png');node.classList.add('christmas-scene-gift');return node;});
  let width=0,scale=.65,visible=false,disposed=false,frame=0,last=0,time=0,nextCast=4;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const random=(min,max)=>min+Math.random()*(max-min);
  const actors=Array.from({length:5},(_,i)=>({node:sprite(CAST[[0,1,2,3,5][i]].file),cast:CAST[[0,1,2,3,5][i]],
    x:0,direction:i%2?-1:1,speed:random(24,42),lane:i%2,rest:0,nextRest:random(6,15),phase:i*.37}));
  const size=(node,w,h,sw,sh,s)=>{node.style.width=w*s+'px';node.style.height=h*s+'px';node.style.backgroundSize=sw*s+'px '+sh*s+'px';};
  function drawActor(actor){
    const s=scale*(actor.cast.deer ? .72 : 1),{width:w,height:h,sheetWidth:sw,sheetHeight:sh}=actor.cast;
    size(actor.node,w,h,sw,sh,s);
    const resting=reduced.matches||actor.rest>0;
    const column=resting?1:WALK[Math.floor((time+actor.phase)*7)%WALK.length];
    const row=resting?0:actor.direction<0?1:2;
    actor.node.style.backgroundPosition=(-column*w*s)+'px '+(-row*h*s)+'px';
    actor.node.style.bottom=(actor.lane?0:8)+'px';actor.node.style.zIndex=actor.lane?'5':'2';
    actor.node.style.transform='translateX('+actor.x.toFixed(2)+'px)';
  }
  function stopFrame(){cancelAnimationFrame(frame);frame=0;last=0;}
  function tick(now){
    frame=0;if(disposed||!visible||document.hidden||reduced.matches){last=0;return;}
    if(last&&now-last<33){frame=requestAnimationFrame(tick);return;}
    const dt=last?Math.min(.06,(now-last)/1000):0;last=now;time+=dt;
    for(const actor of actors){
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
    frame=requestAnimationFrame(tick);
  }
  const rect=node=>node?.getClientRects?.().length?node.getBoundingClientRect():null;
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
    const height=Math.min(180,Math.max(0,floor-top-14));
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
    if(!visible||document.hidden||reduced.matches)stopFrame();else if(!frame)frame=requestAnimationFrame(tick);
  }
  function onVisibility(){if(document.hidden)stopFrame();else layout();}
  function onMotion(){stopFrame();actors.forEach(drawActor);layout();}
  const timer=window.setInterval(layout,500);
  window.addEventListener('resize',layout);document.addEventListener('visibilitychange',onVisibility);
  reduced.addEventListener?.('change',onMotion);layout();
  return {
    getStatus:()=>({visible,characters:actors.length,cast:CAST.length,gifts:gifts.length,tree:'center',animated:visible&&!document.hidden&&!reduced.matches}),
    dispose(){if(disposed)return;disposed=true;stopFrame();clearInterval(timer);
      window.removeEventListener('resize',layout);document.removeEventListener('visibilitychange',onVisibility);
      reduced.removeEventListener?.('change',onMotion);root.remove();document.body.style.removeProperty('--christmas-floor-offset');}
  };
}
