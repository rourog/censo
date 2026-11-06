/* One decorative pickup: independent from ambulance dispatch and clinical state. */
const ASSETS=new URL('../../../assets/themes/christmas/scene/',import.meta.url);
const ARRIVAL_MS=3000,STOP_MS=3000,EXIT_MS=3000;
// Opaque artwork bounds, excluding empty cell margins. Every view shares one visible height.
const FRAMES={"ram-2500":[[15,115,334,166],[377,115,334,166],[739,115,334,166],[1100,115,335,166],[13,477,337,167],[375,477,336,167],[738,477,336,167],[1099,477,336,167],[50,793,261,229],[413,793,260,229],[775,793,260,229],[1138,793,260,229]],"silverado":[[14,113,335,169],[375,113,336,169],[737,114,336,168],[1099,113,336,169],[14,476,336,169],[375,476,336,169],[737,476,336,169],[1099,476,336,169],[48,795,266,228],[410,795,266,228],[772,795,266,228],[1134,795,266,228]]};
export function createChristmasPickup(controls,{getGeometry,isVisible,requestLane,releaseLane,ownsLane}){
  const trigger=document.createElement('button');trigger.type='button';trigger.className='christmas-hospital-trigger';
  trigger.setAttribute('aria-label','Llamar una camioneta desde urgencias');trigger.title='Acceso peatonal de urgencias';
  const sprite=document.createElement('span');sprite.className='christmas-ambulance christmas-pickup';sprite.setAttribute('aria-hidden','true');sprite.hidden=true;
  controls.append(trigger,sprite);
  let trip=null,frame=0,disposed=false,queued=false;
  function cancel(){const active=!!trip;if(frame)cancelAnimationFrame(frame);frame=0;trip=null;queued=false;sprite.hidden=true;trigger.disabled=false;if(active)releaseLane();}
  function start(now){
    const model=Math.random()<.5?'ram-2500':'silverado';
    trip={model,direction:Math.random()<.5?1:-1,started:now,phase:'arriving'};
    sprite.style.backgroundImage='url("'+new URL(model+'.webp',ASSETS).href+'")';trigger.disabled=true;
  }
  function paint(now){
    if(!trip)return;
    if(!ownsLane()){sprite.hidden=true;return;}
    const {width,hospitalWidth,hospitalLeft,bottom}=getGeometry();
    const elapsed=Math.max(0,now-trip.started);
    const baseSize=Math.min(108,hospitalWidth*115/720*.95);
    const parked=elapsed>=ARRIVAL_MS&&elapsed<ARRIVAL_MS+STOP_MS;
    const visibleHeight=FRAMES[trip.model][8][3]*baseSize/362;
    let row=parked?2:trip.direction===1?0:1,column=parked?0:Math.floor(elapsed/120)%4;
    const [sourceX,sourceY,sourceWidth,sourceHeight]=FRAMES[trip.model][row*4+column];
    const factor=visibleHeight/sourceHeight,size=sourceWidth*factor,height=visibleHeight;
    const center=hospitalLeft+hospitalWidth*55/720,target=center-size/2;
    let x=target;
    if(elapsed<ARRIVAL_MS){
      const t=elapsed/ARRIVAL_MS,start=trip.direction===1?-size:width;
      x=start+(target-start)*(1-(1-t)**2);row=trip.direction===1?0:1;column=Math.floor(elapsed/120)%4;trip.phase='arriving';
    }else if(parked){trip.phase='parked';}
    else if(elapsed<ARRIVAL_MS+STOP_MS+EXIT_MS){
      const t=(elapsed-ARRIVAL_MS-STOP_MS)/EXIT_MS,end=trip.direction===1?width:-size;
      x=target+(end-target)*t*t;row=trip.direction===1?0:1;column=Math.floor(elapsed/120)%4;trip.phase='leaving';
    }else {cancel();return;}
    sprite.style.width=size+'px';sprite.style.height=height+'px';sprite.style.left=x+'px';sprite.style.bottom=(bottom-3)+'px';
    sprite.style.backgroundSize=(1448*factor)+'px '+(1086*factor)+'px';sprite.style.backgroundPosition=(-sourceX*factor)+'px '+(-sourceY*factor)+'px';sprite.hidden=false;
  }
  function animate(now){
    frame=0;if(disposed||!isVisible()||document.hidden){cancel();return;}
    paint(now);if(trip)frame=requestAnimationFrame(animate);
  }
  function launch(){
    if(disposed||!isVisible()||document.hidden||trip||queued)return;
    queued=true;trigger.disabled=true;
    requestLane(()=>{
      queued=false;
      if(disposed||!isVisible()||document.hidden){trigger.disabled=false;releaseLane();return;}
      start(performance.now());frame=requestAnimationFrame(animate);
    });
  }
  trigger.addEventListener('click',launch);
  function layout(){
    const {hospitalWidth,hospitalLeft,bottom}=getGeometry();
    // Only the pedestrian urgent-care door, not the sign, wall or ambulance bay.
    trigger.style.left=(hospitalLeft+hospitalWidth*205/720)+'px';trigger.style.width=(hospitalWidth*38/720)+'px';
    trigger.style.bottom=(bottom+hospitalWidth*26/720)+'px';trigger.style.height=(hospitalWidth*30/720)+'px';
    if(trip?.phase==='parked')paint(performance.now());
  }
  return {layout,cancel,getStatus:()=>({pickup:queued?'queued':trip?.phase||'idle',pickupModel:trip?.model||null,pickupLimit:1,pickupParking:'three-left-windows'}),
    dispose(){disposed=true;cancel();trigger.removeEventListener('click',launch);trigger.remove();sprite.remove();}};
}
