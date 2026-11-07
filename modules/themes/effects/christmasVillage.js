import {createChristmasPickup} from './christmasPickup.js?v=3.70.0';
/* Decorative village and local ambulance interaction; no clinical state. */
import {AMBULANCE_DURATION_MS} from './christmasAudio.js';
const ASSETS=new URL('../../../assets/themes/christmas/scene/',import.meta.url);
import {HOSPITAL_RATIO,getChristmasStageLayout,getVehicleParkingPose} from './christmasStageLayout.js?v=3.70.0';
const ARRIVE_MS=3000,STOP_MS=3000,LEAVE_MS=3000;
// Door bounds in the 720 × 115 hospital sprite (excluding pillars and pavement).
const BAY={left:97/720,bottom:26/115,width:37/720,height:30/115};
export function createChristmasVillage(host,app,{audio}={}){
  if(!host||!app)return {getStatus:()=>({visible:false,buildings:0}),dispose(){}};
  const hospital=document.createElement('img');hospital.className='christmas-village-hospital';
  hospital.src=new URL('hospital-delicias-final-snow.png',ASSETS).href;hospital.alt='';hospital.draggable=false;
  const road=document.createElement('div');road.className='christmas-village-road';road.setAttribute('aria-hidden','true');
  road.style.backgroundImage='url("'+new URL('snowy-road.webp',ASSETS).href+'")';
  host.append(hospital,road);
  // The decorative snow is aria-hidden and behind the app. Put the control in its safe empty area.
  const controls=document.createElement('div');controls.className='christmas-village-controls';
  const trigger=document.createElement('button');trigger.type='button';trigger.className='christmas-hospital-trigger';
  trigger.setAttribute('aria-label','Llamar una ambulancia a urgencias');trigger.title='Acceso de ambulancias';
  const ambulance=document.createElement('span');ambulance.className='christmas-ambulance';
  ambulance.setAttribute('aria-hidden','true');ambulance.hidden=true;
  ambulance.style.backgroundImage='url("'+new URL('ambulance-red-cross.png',ASSETS).href+'")';
  controls.append(trigger,ambulance);app.append(controls);
  let disposed=false,visible=false,trip=null,frame=0,geometry=null,ambulanceQueued=false,laneOwner=null;
  const vehicleQueue=[];
  function requestVehicle(kind,start){
    if(laneOwner===kind||vehicleQueue.some(item=>item.kind===kind))return;
    if(laneOwner){vehicleQueue.push({kind,start});return;}laneOwner=kind;start();
  }
  function releaseVehicle(kind){
    if(laneOwner!==kind)return;laneOwner=null;
    const next=vehicleQueue.shift();
    if(next&&visible&&!disposed&&!document.hidden){laneOwner=next.kind;next.start();}
  }
  function cancelVehicles(){vehicleQueue.length=0;laneOwner=null;cancelTrip();pickup.cancel();}
  const pickup=createChristmasPickup(controls,{getGeometry:()=>geometry,isVisible:()=>visible,requestLane:start=>requestVehicle('pickup',start),releaseLane:()=>releaseVehicle('pickup'),ownsLane:()=>laneOwner==='pickup'&&!trip,audio});
  const rect=node=>node?.getClientRects?.().length?node.getBoundingClientRect():null;
  function cancelTrip(){const active=!!trip;ambulanceQueued=false;if(frame)cancelAnimationFrame(frame);frame=0;trip?.sound?.stop();trip=null;ambulance.hidden=true;trigger.disabled=false;if(active)releaseVehicle('ambulance');}
  function animate(now){
    frame=0;if(disposed||!visible||!trip||document.hidden||laneOwner!=='ambulance'){cancelTrip();return;}
    if(trip.sound?.pending){
      if(now-trip.started<2000){frame=requestAnimationFrame(animate);return;}
      trip.sound.stop();trip.sound=null;trip.started=now;
    }
    const audioTime=trip.sound?.elapsedMs;
    const elapsed=audioTime!=null?audioTime:now-trip.started;
    if(audioTime!=null)trip.started=now-audioTime;
    const stopMs=STOP_MS;
    const {width,hospitalWidth,hospitalLeft,bottom}=geometry;
    const size=Math.min(132,hospitalWidth/HOSPITAL_RATIO*1.1),height=size*.75;
    // The far-left entrance between the two blue pillars is the ambulance bay.
    const target=hospitalLeft+hospitalWidth*.16-size/2;
    const start=trip.direction===1?-size:width,end=trip.direction===1?width:-size;
    let x,row,phase;
    if(elapsed<ARRIVE_MS){const t=elapsed/ARRIVE_MS;x=start+(target-start)*(1-(1-t)**2);row=trip.direction===1?0:1;phase='arriving';}
    else if(elapsed<ARRIVE_MS+stopMs){x=target;row=2;phase='parked';}
    else if(elapsed<ARRIVE_MS+stopMs+LEAVE_MS){const t=(elapsed-ARRIVE_MS-stopMs)/LEAVE_MS;x=target+(end-target)*t*t;row=trip.direction===1?0:1;phase='leaving';}
    else {cancelTrip();return;}
    trip.phase=phase;
    const pose=getVehicleParkingPose(elapsed,elapsed>=ARRIVE_MS+stopMs?elapsed-ARRIVE_MS-stopMs:null,geometry);
    ambulance.style.transformOrigin='50% 100%';ambulance.style.transform='translateY(-'+pose.lift+'px) scale('+pose.scale+')';
    ambulance.style.width=size+'px';ambulance.style.height=height+'px';
    ambulance.style.left=x+'px';ambulance.style.bottom=(geometry.vehicleBottom)+'px';
    ambulance.style.backgroundSize=(size*4)+'px '+(height*3)+'px';
    ambulance.style.backgroundPosition=(-Math.floor(elapsed/85)%4*size)+'px '+(-row*height)+'px';
    ambulance.hidden=false;frame=requestAnimationFrame(animate);
  }
  function launch(){
    if(disposed||!visible||trip||ambulanceQueued||document.hidden)return;
    ambulanceQueued=true;trigger.disabled=true;
    requestVehicle('ambulance',()=>{
      ambulanceQueued=false;
      trip={started:performance.now(),direction:Math.random()<.5?1:-1,phase:'arriving',sound:audio?.play('ambulance')||null};
      frame=requestAnimationFrame(animate);
    });
  }
  function onVisibility(){if(document.hidden)cancelVehicles();}
  trigger.addEventListener('click',launch);document.addEventListener('visibilitychange',onVisibility);
  function layout(){
    if(disposed)return;
    const bounds=rect(host.parentElement),appBounds=rect(app);
    let top=rect(app.querySelector('.header'))?.bottom||80;
    const table=rect(document.getElementById('scrollTableWrapper'));
    if(app.classList.contains('table-is-active')&&table)top=Math.max(top,table.bottom);
    else for(const section of app.querySelectorAll('#content > .section')){
      const box=rect(section);if(box&&box.right>0&&box.left<innerWidth)top=Math.max(top,box.bottom);
    }
    const width=bounds?.width||0,height=bounds?.height||0;
    const stage=getChristmasStageLayout(width);
    // The curb sits above the street; retain fixed sizes and hide when room runs out.
    const bottom=stage.hospitalBottom,available=(bounds?.bottom||0)-top-bottom-14;
    visible=!!appBounds&&width>=768&&available>=stage.hospitalHeight;
    host.hidden=!visible;controls.hidden=!visible;if(!visible){cancelVehicles();return;}
    const {hospitalWidth}=stage;
    road.style.left='0px';road.style.width=width+'px';road.style.bottom='0px';road.style.height=stage.roadHeight+'px';
    road.style.backgroundSize='auto '+stage.roadHeight+'px';
    hospital.style.width=hospitalWidth+'px';hospital.style.height='auto';
    hospital.style.left=((width-hospitalWidth)/2)+'px';hospital.style.bottom=bottom+'px';
    geometry={width,hospitalWidth,hospitalLeft:(width-hospitalWidth)/2,bottom,vehicleBottom:stage.vehicleBottom,parkingBottom:stage.parkingBottom};
    controls.style.left=(bounds?.left||0)+'px';controls.style.top=(bounds?.top||0)+'px';
    controls.style.width=width+'px';controls.style.height=height+'px';
    const hospitalHeight=hospitalWidth/HOSPITAL_RATIO;
    trigger.style.left=(geometry.hospitalLeft+hospitalWidth*BAY.left)+'px';
    trigger.style.bottom=(bottom+hospitalHeight*BAY.bottom)+'px';
    trigger.style.width=(hospitalWidth*BAY.width)+'px';trigger.style.height=(hospitalHeight*BAY.height)+'px';
    pickup.layout();
  }
  const timer=window.setInterval(layout,500);window.addEventListener('resize',layout);layout();
  return {getStatus:()=>({...pickup.getStatus(),visible,buildings:1,hospital:'center',houses:'hidden',snowPlane:'in-front-of-snow',roadWidth:geometry?.width||0,roadHeight:getChristmasStageLayout(innerWidth).roadHeight,hospitalBottom:geometry?.bottom||0,vehicleBottom:geometry?.vehicleBottom||0,ambulance:ambulanceQueued?'queued':trip?.phase||'idle',ambulanceDurationMs:AMBULANCE_DURATION_MS,ambulanceArrivalMs:ARRIVE_MS,ambulanceStopMs:STOP_MS,ambulanceExitMs:LEAVE_MS}),
    dispose(){if(disposed)return;disposed=true;clearInterval(timer);window.removeEventListener('resize',layout);
      cancelVehicles();trigger.removeEventListener('click',launch);document.removeEventListener('visibilitychange',onVisibility);
      pickup.dispose();controls.remove();hospital.remove();road.remove();host.hidden=false;}};
}
