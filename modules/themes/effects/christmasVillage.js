/* Decorative village and local ambulance interaction; no clinical state. */
const ASSETS=new URL('../../../assets/themes/christmas/scene/',import.meta.url);
const HOSPITAL_RATIO=720/125;
const ARRIVE_MS=1100,STOP_MS=3000,LEAVE_MS=850;
export function createChristmasVillage(host,app){
  if(!host||!app)return {getStatus:()=>({visible:false,buildings:0}),dispose(){}};
  const hospital=document.createElement('img');hospital.className='christmas-village-hospital';
  hospital.src=new URL('hospital-delicias-expanded-snow.png',ASSETS).href;hospital.alt='';hospital.draggable=false;
  host.append(hospital);
  // The decorative snow is aria-hidden and behind the app. Put the control in its safe empty area.
  const controls=document.createElement('div');controls.className='christmas-village-controls';
  const trigger=document.createElement('button');trigger.type='button';trigger.className='christmas-hospital-trigger';
  trigger.setAttribute('aria-label','Llamar una ambulancia a urgencias');trigger.title='Llamar una ambulancia';
  const ambulance=document.createElement('span');ambulance.className='christmas-ambulance';
  ambulance.setAttribute('aria-hidden','true');ambulance.hidden=true;
  ambulance.style.backgroundImage='url("'+new URL('ambulance-red-cross.png',ASSETS).href+'")';
  controls.append(trigger,ambulance);app.append(controls);
  let disposed=false,visible=false,trip=null,frame=0,geometry=null;
  const rect=node=>node?.getClientRects?.().length?node.getBoundingClientRect():null;
  function cancelTrip(){if(frame)cancelAnimationFrame(frame);frame=0;trip=null;ambulance.hidden=true;trigger.disabled=false;}
  function animate(now){
    frame=0;if(disposed||!visible||!trip||document.hidden){cancelTrip();return;}
    const elapsed=now-trip.started,{width,hospitalWidth,hospitalLeft,bottom}=geometry;
    const size=Math.min(132,hospitalWidth/HOSPITAL_RATIO*1.1),height=size*.75;
    // The far-left entrance between the two blue pillars is the ambulance bay.
    const target=hospitalLeft+hospitalWidth*.18-size/2;
    const start=trip.direction===1?-size:width,end=trip.direction===1?width:-size;
    let x,row,phase;
    if(elapsed<ARRIVE_MS){const t=elapsed/ARRIVE_MS;x=start+(target-start)*(1-(1-t)**2);row=trip.direction===1?0:1;phase='arriving';}
    else if(elapsed<ARRIVE_MS+STOP_MS){x=target;row=2;phase='parked';}
    else if(elapsed<ARRIVE_MS+STOP_MS+LEAVE_MS){const t=(elapsed-ARRIVE_MS-STOP_MS)/LEAVE_MS;x=target+(end-target)*t*t;row=trip.direction===1?0:1;phase='leaving';}
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
    trip={started:performance.now(),direction:Math.random()<.5?1:-1,phase:'arriving'};
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
    const bottom=Math.max(8,height*.14),available=(bounds?.bottom||0)-top-bottom-14;
    visible=!!appBounds&&width>=768&&available>=45;
    host.hidden=!visible;controls.hidden=!visible;if(!visible){cancelTrip();return;}
    const hospitalWidth=Math.min(720,width*.48,width*.52-108,available*HOSPITAL_RATIO);
    hospital.style.width=hospitalWidth+'px';hospital.style.height='auto';
    hospital.style.left=((width-hospitalWidth)/2)+'px';hospital.style.bottom=bottom+'px';
    geometry={width,hospitalWidth,hospitalLeft:(width-hospitalWidth)/2,bottom};
    controls.style.left=(bounds?.left||0)+'px';controls.style.top=(bounds?.top||0)+'px';
    controls.style.width=width+'px';controls.style.height=height+'px';
    trigger.style.left=hospital.style.left;trigger.style.bottom=bottom+'px';
    trigger.style.width=hospitalWidth+'px';trigger.style.height=(hospitalWidth/HOSPITAL_RATIO)+'px';
  }
  const timer=window.setInterval(layout,500);window.addEventListener('resize',layout);layout();
  return {getStatus:()=>({visible,buildings:1,hospital:'center',houses:'hidden',snowPlane:'before-foreground',ambulance:trip?.phase||'idle'}),
    dispose(){if(disposed)return;disposed=true;clearInterval(timer);window.removeEventListener('resize',layout);
      cancelTrip();trigger.removeEventListener('click',launch);document.removeEventListener('visibilitychange',onVisibility);
      controls.remove();hospital.remove();host.hidden=false;}};
}
