/* Decorative village and local ambulance interaction; no clinical state. */
import {AMBULANCE_DURATION_MS} from './christmasAudio.js';
const ASSETS=new URL('../../../assets/themes/christmas/scene/',import.meta.url);
import {HOSPITAL_RATIO,getChristmasStageLayout} from './christmasStageLayout.js';
const ARRIVE_MS=3000,STOP_MS=3000,LEAVE_MS=3000;
// Door bounds in the 720 × 115 hospital sprite (excluding pillars and pavement).
const BAY={left:97/720,bottom:26/115,width:37/720,height:30/115};
export function createChristmasVillage(host,app,{audio}={}){
  if(!host||!app)return {getStatus:()=>({visible:false,buildings:0}),dispose(){}};
  const hospital=document.createElement('img');hospital.className='christmas-village-hospital';
  hospital.src=new URL('hospital-delicias-final-snow.png',ASSETS).href;hospital.alt='';hospital.draggable=false;
  host.append(hospital);
  // The decorative snow is aria-hidden and behind the app. Put the control in its safe empty area.
  const controls=document.createElement('div');controls.className='christmas-village-controls';
  const trigger=document.createElement('button');trigger.type='button';trigger.className='christmas-hospital-trigger';
  trigger.setAttribute('aria-label','Llamar una ambulancia a urgencias');trigger.title='Acceso de ambulancias';
  const ambulance=document.createElement('span');ambulance.className='christmas-ambulance';
  ambulance.setAttribute('aria-hidden','true');ambulance.hidden=true;
  ambulance.style.backgroundImage='url("'+new URL('ambulance-red-cross.png',ASSETS).href+'")';
  controls.append(trigger,ambulance);app.append(controls);
  let disposed=false,visible=false,trip=null,frame=0,geometry=null;
  const rect=node=>node?.getClientRects?.().length?node.getBoundingClientRect():null;
  function cancelTrip(){if(frame)cancelAnimationFrame(frame);frame=0;trip?.sound?.stop();trip=null;ambulance.hidden=true;trigger.disabled=false;}
  function animate(now){
    frame=0;if(disposed||!visible||!trip||document.hidden){cancelTrip();return;}
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
    ambulance.style.width=size+'px';ambulance.style.height=height+'px';
    ambulance.style.left=x+'px';ambulance.style.bottom=(bottom-3)+'px';
    ambulance.style.backgroundSize=(size*4)+'px '+(height*3)+'px';
    ambulance.style.backgroundPosition=(-Math.floor(elapsed/85)%4*size)+'px '+(-row*height)+'px';
    ambulance.hidden=false;frame=requestAnimationFrame(animate);
  }
  function launch(){
    if(disposed||!visible||trip||document.hidden)return;
    trip={started:performance.now(),direction:Math.random()<.5?1:-1,phase:'arriving',sound:audio?.play('ambulance')||null};
    trigger.disabled=true;frame=requestAnimationFrame(animate);
  }
  function onVisibility(){if(document.hidden)cancelTrip();}
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
    // Anchor the curb to the scene floor, retaining usable space as patient rows grow.
    const bottom=0,available=(bounds?.bottom||0)-top-bottom-14;
    const stage=getChristmasStageLayout(width);
    visible=!!appBounds&&width>=768&&available>=stage.hospitalHeight;
    host.hidden=!visible;controls.hidden=!visible;if(!visible){cancelTrip();return;}
    const {hospitalWidth}=stage;
    hospital.style.width=hospitalWidth+'px';hospital.style.height='auto';
    hospital.style.left=((width-hospitalWidth)/2)+'px';hospital.style.bottom=bottom+'px';
    geometry={width,hospitalWidth,hospitalLeft:(width-hospitalWidth)/2,bottom};
    controls.style.left=(bounds?.left||0)+'px';controls.style.top=(bounds?.top||0)+'px';
    controls.style.width=width+'px';controls.style.height=height+'px';
    const hospitalHeight=hospitalWidth/HOSPITAL_RATIO;
    trigger.style.left=(geometry.hospitalLeft+hospitalWidth*BAY.left)+'px';
    trigger.style.bottom=(bottom+hospitalHeight*BAY.bottom)+'px';
    trigger.style.width=(hospitalWidth*BAY.width)+'px';trigger.style.height=(hospitalHeight*BAY.height)+'px';
  }
  const timer=window.setInterval(layout,500);window.addEventListener('resize',layout);layout();
  return {getStatus:()=>({visible,buildings:1,hospital:'center',houses:'hidden',snowPlane:'in-front-of-snow',ambulance:trip?.phase||'idle',ambulanceDurationMs:AMBULANCE_DURATION_MS,ambulanceArrivalMs:ARRIVE_MS,ambulanceStopMs:STOP_MS,ambulanceExitMs:LEAVE_MS}),
    dispose(){if(disposed)return;disposed=true;clearInterval(timer);window.removeEventListener('resize',layout);
      cancelTrip();trigger.removeEventListener('click',launch);document.removeEventListener('visibilitychange',onVisibility);
      controls.remove();hospital.remove();host.hidden=false;}};
}
