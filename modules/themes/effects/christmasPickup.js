import {getVehicleParkingPose} from './christmasStageLayout.js?v=3.70.0';
import {createRamDriver,ramVisitTiming} from './christmasRamDriver.js?v=3.70.0';
/* One decorative pickup: independent from ambulance dispatch and clinical state. */
const ASSETS=new URL('../../../assets/themes/christmas/scene/',import.meta.url);
const ARRIVAL_MS=3000,STOP_MS=3000,EXIT_MS=3000;
// Opaque artwork bounds, excluding empty cell margins. Every view shares one visible height.
const FRAMES={"ram-2500":[[15,115,334,166],[377,115,334,166],[739,115,334,166],[1100,115,335,166],[13,477,337,167],[375,477,336,167],[738,477,336,167],[1099,477,336,167],[50,793,261,229],[413,793,260,229],[775,793,260,229],[1138,793,260,229]],"silverado":[[14,113,335,169],[375,113,336,169],[737,114,336,168],[1099,113,336,169],[14,476,336,169],[375,476,336,169],[737,476,336,169],[1099,476,336,169],[48,795,266,228],[410,795,266,228],[772,795,266,228],[1134,795,266,228]],"civic":[[14,126,335,135],[376,126,334,135],[738,126,335,135],[1100,126,334,135],[14,367,335,135],[376,367,334,136],[738,367,335,135],[1100,367,334,136],[55,601,253,186],[416,601,254,186],[778,601,254,186],[1140,601,254,186],[56,870,250,187],[418,870,250,187],[780,870,250,187],[1142,870,250,187]],"jimny":[[44,122,288,150],[405,122,289,150],[767,122,289,150],[1129,122,289,150],[32,272,292,255],[394,272,293,255],[756,272,292,255],[1118,272,292,255],[66,584,230,209],[428,584,230,209],[790,584,230,209],[1152,584,230,209],[62,856,237,209],[424,856,237,209],[786,856,238,209],[1148,856,237,209]]};
const VEHICLES=['ram-2500','silverado','civic','jimny'];
const STARTS={'ram-2500':['vehicleStart',4920],silverado:['silveradoStart',9000],civic:['civicStart',3945],jimny:['vehicleStart',4920]};
const HEIGHT={"ram-2500":1,silverado:1,civic:.70,jimny:.86};
const SHEETS={"ram-2500":[1448,1086],"silverado":[1448,1086],"civic":[1448,1086],"jimny":[1448,1086]};
export function createChristmasPickup(controls,{getGeometry,isVisible,requestLane,releaseLane,ownsLane,audio}){
  const trigger=document.createElement('button');trigger.type='button';trigger.className='christmas-hospital-trigger';
  trigger.setAttribute('aria-label','Llamar un vehículo desde urgencias');trigger.title='Acceso peatonal de urgencias';
  const sprite=document.createElement('span');sprite.className='christmas-ambulance christmas-pickup';sprite.setAttribute('aria-hidden','true');sprite.hidden=true;
  controls.append(trigger,sprite);
  const driver=createRamDriver(controls);
  let trip=null,frame=0,disposed=false,queued=false,nextModel=0;
  function cancel(){const active=!!trip;if(frame)cancelAnimationFrame(frame);frame=0;trip?.sound?.stop();trip?.startSound?.stop();trip=null;driver.hide();queued=false;sprite.hidden=true;trigger.disabled=false;if(active)releaseLane();}
  function start(now){
    const model=VEHICLES[nextModel++%VEHICLES.length];
    trip={model,direction:Math.random()<.5?1:-1,started:now,phase:'arriving',driverTiming:model==='ram-2500'?ramVisitTiming(getGeometry()):null,sound:audio?.play(model==='ram-2500'?'ramArrival':model==='jimny'?'jimnyDrive':'')};
    sprite.style.backgroundImage='url("'+new URL(model+'.webp',ASSETS).href+'")';trigger.disabled=true;
  }
  function paint(now){
    if(!trip)return;
    if(!ownsLane()){sprite.hidden=true;driver.hide();return;}
    const {width,hospitalWidth,hospitalLeft,bottom}=getGeometry();
    const elapsed=Math.max(0,now-trip.started);
    const stopMs=trip.driverTiming?.stopMs||STOP_MS;
    const parkEnd=ARRIVAL_MS+stopMs;
    if(elapsed>=ARRIVAL_MS&&!trip.arrivalStopped){trip.sound?.stop();trip.arrivalStopped=true;}
    if(elapsed>=parkEnd&&trip.startingAt==null){
      driver.hide();trip.startingAt=now;trip.startSound=audio?.play(STARTS[trip.model][0]);
    }
    if(trip.startingAt!=null&&trip.departedAt==null){
      const waited=now-trip.startingAt,duration=STARTS[trip.model][1];
      const done=!trip.startSound||trip.startSound.finished||trip.startSound.elapsedMs==null;
      // Allow delayed media completion, with a bounded fallback for stalled playback.
      if(waited>=duration&&(done||waited>=duration+2000)){
        trip.startSound?.stop();trip.departedAt=now;
        trip.sound=audio?.play(trip.model==='ram-2500'?'ramExit':trip.model==='jimny'?'jimnyDrive':'');
      }
    }
    const baseSize=Math.min(108,hospitalWidth*115/720*.95);
    const parked=elapsed>=ARRIVAL_MS&&trip.departedAt==null;
    const visibleHeight=229*baseSize/362*HEIGHT[trip.model];
    let row=parked?2:trip.direction===1?0:1,column=parked?0:Math.floor(elapsed/120)%4;
    const [sourceX,sourceY,sourceWidth,sourceHeight]=FRAMES[trip.model][row*4+column];
    const factor=visibleHeight/sourceHeight,size=sourceWidth*factor,height=visibleHeight;
    const center=hospitalLeft+hospitalWidth*55/720,target=center-size/2;
    let x=target;
    if(elapsed<ARRIVAL_MS){
      const t=elapsed/ARRIVAL_MS,start=trip.direction===1?-size:width;
      x=start+(target-start)*(1-(1-t)**2);row=trip.direction===1?0:1;column=Math.floor(elapsed/120)%4;trip.phase='arriving';
    }else if(parked){trip.phase=elapsed<parkEnd?'parked':'starting';if(trip.driverTiming&&elapsed<parkEnd)driver.paint(elapsed-ARRIVAL_MS,getGeometry(),trip.driverTiming);}
    else if(now-trip.departedAt<EXIT_MS){
      driver.hide();
      const t=(now-trip.departedAt)/EXIT_MS,end=trip.direction===1?width:-size;
      x=target+(end-target)*t*t;row=trip.direction===1?0:1;column=Math.floor(elapsed/120)%4;trip.phase='leaving';
    }else {cancel();return;}
    const pose=getVehicleParkingPose(elapsed,trip.departedAt==null?null:now-trip.departedAt,getGeometry());
    sprite.style.transformOrigin='50% 100%';sprite.style.transform='translateY(-'+pose.lift+'px) scale('+pose.scale+')';
    sprite.style.width=size+'px';sprite.style.height=height+'px';sprite.style.left=x+'px';sprite.style.bottom=(getGeometry().vehicleBottom)+'px';
    sprite.style.backgroundSize=(SHEETS[trip.model][0]*factor)+'px '+(SHEETS[trip.model][1]*factor)+'px';sprite.style.backgroundPosition=(-sourceX*factor)+'px '+(-sourceY*factor)+'px';sprite.hidden=false;
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
    if(trip?.phase==='parked'||trip?.phase==='starting')paint(performance.now());
  }
  return {layout,cancel,getStatus:()=>({...driver.getStatus(),pickupStartMs:trip?STARTS[trip.model][1]:0,pickupStopMs:trip?.driverTiming?.stopMs||STOP_MS,pickup:queued?'queued':trip?.phase||'idle',pickupModel:trip?.model||null,pickupLimit:1,pickupParking:'three-left-windows',vehicleOrder:VEHICLES,nextVehicle:VEHICLES[nextModel%VEHICLES.length]}),
    dispose(){disposed=true;cancel();trigger.removeEventListener('click',launch);trigger.remove();sprite.remove();driver.dispose();}};
}
