/* Accelerated beta sky: one real minute = one simulated hour. Visual state only. */
const HOUR_MS=60000;
const TURN_MS=2400;
const wrap=hour=>((hour%24)+24)%24;
const COLORS=[
  [0,[9,22,48],[29,50,79]],
  [5,[26,49,82],[76,106,137]],
  [7,[62,115,159],[133,174,200]],
  [12,[72,136,181],[153,192,212]],
  [17,[64,112,157],[125,161,187]],
  [19,[26,48,83],[63,88,122]],
  [24,[9,22,48],[29,50,79]]
];
export function getChristmasSkyState(hour){
  hour=wrap(hour);
  const phase=wrap(hour-6),day=phase<12,progress=(day?phase:phase-12)/12;
  const index=COLORS.findIndex((point,i)=>i<COLORS.length-1&&hour>=point[0]&&hour<COLORS[i+1][0]);
  const a=COLORS[index],b=COLORS[index+1],blend=(hour-a[0])/(b[0]-a[0]);
  const color=slot=>'rgb('+a[slot].map((v,i)=>Math.round(v+(b[slot][i]-v)*blend)).join(',')+')';
  return {hour,body:day?'sun':'moon',progress,altitude:Math.sin(progress*Math.PI),top:color(1),horizon:color(2)};
}
export function createChristmasSky(app){
  if(!app)return {dispose(){},getStatus:()=>({enabled:false})};
  const root=document.createElement('div');root.className='christmas-sky-track';
  const sun=document.createElement('button');sun.type='button';sun.className='christmas-celestial christmas-sun';
  sun.setAttribute('aria-label','Adelantar 12 horas el ciclo de día y noche');sun.title='Adelantar 12 horas';
  const moon=document.createElement('button');moon.type='button';moon.className='christmas-celestial christmas-moon';
  moon.setAttribute('aria-label','Retroceder 12 horas el ciclo de día y noche');moon.title='Retroceder 12 horas';
  sun.style.backgroundImage='url("'+new URL('../../../assets/themes/christmas/scene/sun.png',import.meta.url).href+'")';
  moon.style.backgroundImage='url("'+new URL('../../../assets/themes/christmas/scene/moon.png',import.meta.url).href+'")';
  root.append(sun,moon);app.append(root);
  const started=performance.now();let offset=0,disposed=false,visible=false,state,turn=null,frame=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const rect=node=>node?.getClientRects?.().length?node.getBoundingClientRect():null;
  function update(){
    if(disposed)return;
    const now=performance.now();let turnHours=0;
    if(turn){
      const progress=Math.min(1,Math.max(0,(now-turn.started)/TURN_MS));
      if(progress===1){offset+=turn.hours;turn=null;}
      else turnHours=turn.hours*(progress*progress*(3-2*progress));
    }
    state=getChristmasSkyState(9+(now-started)/HOUR_MS+offset+turnHours);
    root.setAttribute('data-turning',String(!!turn));
    app.style.setProperty('--christmas-sky-top',state.top);app.style.setProperty('--christmas-sky-horizon',state.horizon);
    const floor=Math.min(innerHeight,...[rect(document.getElementById('censoNewsBar'))?.top,rect(app.querySelector('.footer'))?.top]
      .filter(y=>Number.isFinite(y)&&y>0&&y<=innerHeight));
    let top=rect(app.querySelector('.header'))?.bottom||80;
    const table=rect(document.getElementById('scrollTableWrapper'));
    if(app.classList.contains('table-is-active')&&table)top=Math.max(top,table.bottom);
    else for(const section of app.querySelectorAll('#content > .section')){
      const bounds=rect(section);if(bounds&&bounds.right>0&&bounds.left<innerWidth)top=Math.max(top,bounds.bottom);
    }
    top+=10;const height=Math.max(0,floor-top-12);
    visible=!!rect(app)&&innerWidth>=768&&height>=96&&!document.hidden;
    root.hidden=!visible;root.style.top=top+'px';root.style.height=height+'px';
    const size=Math.min(72,Math.max(40,height*.32));
    const angle=(state.hour-6)*Math.PI/12;
    for(const [node,shift] of [[sun,0],[moon,Math.PI]]){
      const theta=angle+shift,altitude=Math.sin(theta);
      const x=innerWidth/2-innerWidth*.43*Math.cos(theta)-size/2;
      const y=height-(height-12)*altitude;
      node.style.width=size+'px';node.style.height=size+'px';node.style.transform='translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px)';
      node.style.opacity=String((node===sun ? .8 : .7)+Math.max(0,altitude)*.12);
      node.hidden=state.body!==(node===sun?'sun':'moon');node.disabled=!visible||node.hidden||!!turn;
    }
    if(turn&&visible&&!frame)frame=requestAnimationFrame(()=>{frame=0;update();});
    else if(!turn||!visible){cancelAnimationFrame(frame);frame=0;}
  }
  function skip(hours,body,node){
    if(disposed||document.hidden||!visible||turn||node.disabled)return;
    if(getChristmasSkyState(9+(performance.now()-started)/HOUR_MS+offset).body!==body){update();return;}
    if(reduced.matches)offset+=hours;
    else turn={started:performance.now(),hours};
    update();
  }
  const onSunClick=()=>skip(12,'sun',sun),onMoonClick=()=>skip(-12,'moon',moon);
  function onMotion(){if(reduced.matches&&turn){offset+=turn.hours;turn=null;}update();}
  sun.addEventListener('click',onSunClick);
  moon.addEventListener('click',onMoonClick);reduced.addEventListener?.('change',onMotion);
  window.addEventListener('resize',update);document.addEventListener('visibilitychange',update);
  const timer=window.setInterval(update,1000);update();
  return {
    getStatus:()=>({enabled:true,visible,hour:state.hour,body:state.body,turning:!!turn,turnMs:TURN_MS,cycleMs:24*HOUR_MS,hourMs:HOUR_MS}),
    dispose(){if(disposed)return;disposed=true;clearInterval(timer);cancelAnimationFrame(frame);frame=0;turn=null;
      sun.removeEventListener('click',onSunClick);moon.removeEventListener('click',onMoonClick);reduced.removeEventListener?.('change',onMotion);
      window.removeEventListener('resize',update);document.removeEventListener('visibilitychange',update);root.remove();
      app.style.removeProperty('--christmas-sky-top');app.style.removeProperty('--christmas-sky-horizon');}
  };
}
