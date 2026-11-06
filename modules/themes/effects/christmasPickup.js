/* One decorative pickup: independent from ambulance dispatch and clinical state. */
const ASSETS=new URL('../../../assets/themes/christmas/scene/',import.meta.url);
const ARRIVAL_MS=3000,EXIT_MS=3000;
const FRAMES={"ram-2500":[[1.0,9.5],[363.0,9.5],[725.0,9.5],[1086.5,9.5],[0.5,372.5],[362.0,372.5],[725.0,372.5],[1086.0,372.5],[-0.5,750.5],[362.0,750.5],[724.0,750.5],[1087.0,750.5]],"silverado":[[0.5,10.5],[362.0,10.5],[724.0,10.5],[1086.0,10.5],[1.0,373.5],[362.0,373.5],[724.0,373.5],[1086.0,373.5],[0.0,751.5],[362.0,751.5],[724.0,751.5],[1086.0,751.5]]};
export function createChristmasPickup(controls,{getGeometry,isVisible}){
  const trigger=document.createElement('button');trigger.type='button';trigger.className='christmas-hospital-trigger';
  trigger.setAttribute('aria-label','Llamar una camioneta desde urgencias');trigger.title='Acceso peatonal de urgencias';
  const sprite=document.createElement('span');sprite.className='christmas-ambulance christmas-pickup';sprite.setAttribute('aria-hidden','true');sprite.hidden=true;
  controls.append(trigger,sprite);
  let trip=null,frame=0,disposed=false;
  function cancel(){if(frame)cancelAnimationFrame(frame);frame=0;trip=null;sprite.hidden=true;trigger.disabled=false;}
  function start(now){
    const model=Math.random()<.5?'ram-2500':'silverado';
    trip={model,direction:Math.random()<.5?1:-1,started:now,phase:'arriving'};
    sprite.style.backgroundImage='url("'+new URL(model+'.webp',ASSETS).href+'")';trigger.disabled=true;
  }
  function paint(now){
    if(!trip)return;
    const {width,hospitalWidth,hospitalLeft,bottom}=getGeometry();
    const size=Math.min(108,hospitalWidth*115/720*.95),height=size*.75;
    const target=hospitalLeft+hospitalWidth*55/720-size/2;
    const elapsed=Math.max(0,now-trip.started);
    let x=target,row=2,column=0;
    if(trip.phase==='arriving'){
      const t=Math.min(1,elapsed/ARRIVAL_MS),start=trip.direction===1?-size:width;
      x=start+(target-start)*(1-(1-t)**2);row=trip.direction===1?0:1;column=Math.floor(elapsed/120)%4;
      if(t===1){trip.phase='parked';row=2;column=0;trigger.disabled=false;}
    }else if(trip.phase==='leaving'){
      const t=Math.min(1,elapsed/EXIT_MS),end=trip.direction===1?width:-size;
      x=target+(end-target)*t*t;row=trip.direction===1?0:1;column=Math.floor(elapsed/120)%4;
      if(t===1){start(now);paint(now);return;}
    }
    const factor=size/362,[sourceX,sourceY]=FRAMES[trip.model][row*4+column];
    sprite.style.width=size+'px';sprite.style.height=height+'px';sprite.style.left=x+'px';sprite.style.bottom=(bottom-3)+'px';
    sprite.style.backgroundSize=(1448*factor)+'px '+(1086*factor)+'px';sprite.style.backgroundPosition=(-sourceX*factor)+'px '+(-sourceY*factor)+'px';sprite.hidden=false;
  }
  function animate(now){
    frame=0;if(disposed||!isVisible()||document.hidden){cancel();return;}
    paint(now);if(trip?.phase!=='parked')frame=requestAnimationFrame(animate);
  }
  function launch(){
    if(disposed||!isVisible()||document.hidden||trip&&trip.phase!=='parked')return;
    if(trip){trip.phase='leaving';trip.started=performance.now();trigger.disabled=true;}
    else start(performance.now());
    frame=requestAnimationFrame(animate);
  }
  trigger.addEventListener('click',launch);
  function layout(){
    const {hospitalWidth,hospitalLeft,bottom}=getGeometry();
    // Only the pedestrian urgent-care door, not the sign, wall or ambulance bay.
    trigger.style.left=(hospitalLeft+hospitalWidth*205/720)+'px';trigger.style.width=(hospitalWidth*38/720)+'px';
    trigger.style.bottom=(bottom+hospitalWidth*26/720)+'px';trigger.style.height=(hospitalWidth*30/720)+'px';
    if(trip?.phase==='parked')paint(performance.now());
  }
  return {layout,cancel,getStatus:()=>({pickup:trip?.phase||'idle',pickupModel:trip?.model||null,pickupLimit:1,pickupParking:'three-left-windows'}),
    dispose(){disposed=true;cancel();trigger.removeEventListener('click',launch);trigger.remove();sprite.remove();}};
}
