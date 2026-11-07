/* One temporary group of five interns; shared vehicle lane prevents crossing collisions. */
const SHEET=new URL('../../../assets/themes/christmas/scene/interns-white.webp',import.meta.url);
const SCALE=.65*50/58,SPEED=32,GAP=1.5,DOOR=.6,WAIT=2,WALK=[0,1,2,1];
function route(geometry){
  const main=geometry.hospitalLeft+geometry.hospitalWidth*394/720;
  const urgent=geometry.hospitalLeft+geometry.hospitalWidth*224/720;
  return [[main,geometry.bottom+geometry.hospitalWidth*26/720],[main,geometry.bottom+8],[urgent,geometry.bottom+8],[urgent,-80]];
}
function length(points){return points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0);}
function position(points,distance){
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],size=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(distance<=size||i===points.length-1){const t=Math.min(1,distance/size);return {x:a[0]+(b[0]-a[0])*t,ground:a[1]+(b[1]-a[1])*t,row:b[0]<a[0]?1:b[0]>a[0]?2:b[1]<a[1]?0:3,segment:i};}distance-=size;
  }
}
function choose(){const ids=[0,1,2,3,4,5];for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}return ids.slice(0,5);}
export function createChristmasInterns(controls,{getGeometry,isVisible,requestLane,releaseLane,ownsLane}){
  const trigger=document.createElement('button');trigger.type='button';trigger.className='christmas-hospital-trigger';trigger.title='Salida de médicos internos';trigger.setAttribute('aria-label','Llamar a un grupo de cinco internos');
  const nodes=Array.from({length:5},()=>{const node=document.createElement('span');node.className='christmas-ambulance christmas-intern';node.setAttribute('aria-hidden','true');node.hidden=true;node.style.backgroundImage='url("'+SHEET.href+'")';return node;});
  controls.append(trigger,...nodes);
  let group=null,queued=false,disposed=false,frame=0,last=0;
  function cancel(){const active=!!group;if(frame)cancelAnimationFrame(frame);frame=0;last=0;group=null;queued=false;trigger.disabled=false;nodes.forEach(node=>{node.hidden=true;});if(active)releaseLane();}
  function paint(){
    if(!group)return;
    const points=route(getGeometry()),walk=length(points)/SPEED,out=DOOR+walk,returnAt=out+4*GAP+WAIT;
    group.returnAt=returnAt;group.duration=returnAt+4*GAP+walk+DOOR;
    group.phase=group.time<returnAt?'outbound':'returning';
    group.members=nodes.map((node,index)=>{
      const identity=group.ids[index],outTime=group.time-index*GAP,backTime=group.time-returnAt-index*GAP;
      let phase='waiting',pose={x:points[0][0],ground:points[0][1],row:0},opacity=1,shrink=1,visible=false;
      if(outTime>=0&&outTime<DOOR){phase='exiting';visible=true;opacity=outTime/DOOR;shrink=.8+.2*opacity;}
      else if(outTime>=DOOR&&outTime<out){pose=position(points,(outTime-DOOR)*SPEED);phase=pose.segment<3?'walking-left':'crossing';visible=true;}
      else if(outTime>=out)phase='away';
      if(backTime>=0&&backTime<walk){pose=position([...points].reverse(),backTime*SPEED);phase=pose.segment===1?'returning-crossing':'walking-right';visible=true;}
      else if(backTime>=walk&&backTime<walk+DOOR){pose={x:points[0][0],ground:points[0][1],row:3};phase='entering';visible=true;opacity=1-(backTime-walk)/DOOR;shrink=.8+.2*opacity;}
      else if(backTime>=walk+DOOR){phase='inside';visible=false;}
      node.hidden=!visible;node.setAttribute('data-intern',String(identity));node.setAttribute('data-state',phase);
      const column=phase==='exiting'||phase==='entering'?1:WALK[Math.floor((backTime>=0?backTime:outTime)*7)%4]||0;
      node.style.width=78*SCALE+'px';node.style.height=108*SCALE+'px';node.style.left=(pose.x-39*SCALE)+'px';node.style.bottom=(pose.ground-6*SCALE)+'px';
      node.style.backgroundSize=234*SCALE+'px '+2592*SCALE+'px';node.style.backgroundPosition=(-column*78*SCALE)+'px '+(-(identity*4+pose.row)*108*SCALE)+'px';
      node.style.transformOrigin='50% 100%';node.style.transform='scale('+shrink+')';node.style.opacity=String(opacity);
      // Lower feet are closer to the viewer. Keep the same ordering at both corners.
      node.style.zIndex=String(200-Math.round(pose.ground));
      return {identity,phase,visible,x:pose.x,ground:pose.ground,row:pose.row};
    });
    if(group.time>=group.duration)cancel();
  }
  function animate(now){frame=0;if(disposed||!isVisible()||document.hidden||!ownsLane()){cancel();return;}if(last)group.time+=Math.max(0,Math.min(.1,(now-last)/1000));last=now;paint();if(group)frame=requestAnimationFrame(animate);}
  function launch(){
    if(disposed||queued||group||!isVisible()||document.hidden)return;
    queued=true;trigger.disabled=true;requestLane(()=>{
      queued=false;if(disposed||!isVisible()||document.hidden){trigger.disabled=false;releaseLane();return;}
      group={ids:choose(),time:0,members:[],phase:'outbound'};last=performance.now();paint();frame=requestAnimationFrame(animate);
    });
  }
  trigger.addEventListener('click',launch);
  return {cancel,layout(){const g=getGeometry();trigger.style.left=(g.hospitalLeft+g.hospitalWidth*371/720)+'px';trigger.style.bottom=(g.bottom+g.hospitalWidth*26/720)+'px';trigger.style.width=g.hospitalWidth*46/720+'px';trigger.style.height=g.hospitalWidth*30/720+'px';if(group)paint();},
    getStatus:()=>({internGroup:queued?'queued':group?.phase||'idle',internCount:group?5:0,internSpacingMs:GAP*1000,internMembers:group?.members||[]}),
    dispose(){disposed=true;cancel();trigger.removeEventListener('click',launch);trigger.remove();nodes.forEach(node=>node.remove());}};
}
