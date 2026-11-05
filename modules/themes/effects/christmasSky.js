/* Accelerated beta sky: one real minute = one simulated hour. Visual state only. */
const HOUR_MS=60000;
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
  const moon=document.createElement('span');moon.className='christmas-celestial christmas-moon';moon.setAttribute('aria-hidden','true');
  sun.style.backgroundImage='url("'+new URL('../../../assets/themes/christmas/scene/sun.png',import.meta.url).href+'")';
  moon.style.backgroundImage='url("'+new URL('../../../assets/themes/christmas/scene/moon.png',import.meta.url).href+'")';
  root.append(sun,moon);app.append(root);
  const started=performance.now();let offset=0,disposed=false,visible=false,state;
  const rect=node=>node?.getClientRects?.().length?node.getBoundingClientRect():null;
  function update(){
    if(disposed)return;
    state=getChristmasSkyState(9+(performance.now()-started)/HOUR_MS+offset);
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
    const x=(innerWidth-size)*(.06+.88*state.progress);
    const y=Math.max(0,height-size-12-state.altitude*Math.max(0,height-size-24));
    for(const node of [sun,moon]){
      node.style.width=size+'px';node.style.height=size+'px';node.style.transform='translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px)';
    }
    sun.hidden=state.body!=='sun';moon.hidden=state.body!=='moon';sun.disabled=!visible||sun.hidden;
  }
  function onSunClick(){
    if(disposed||document.hidden||!visible||sun.disabled)return;
    // Check the current clock as well as the rendered frame at a day/night boundary.
    if(getChristmasSkyState(9+(performance.now()-started)/HOUR_MS+offset).body!=='sun'){update();return;}
    offset+=12;update();
  }
  sun.addEventListener('click',onSunClick);
  window.addEventListener('resize',update);document.addEventListener('visibilitychange',update);
  const timer=window.setInterval(update,1000);update();
  return {
    getStatus:()=>({enabled:true,visible,hour:state.hour,body:state.body,cycleMs:24*HOUR_MS,hourMs:HOUR_MS}),
    dispose(){if(disposed)return;disposed=true;clearInterval(timer);sun.removeEventListener('click',onSunClick);
      window.removeEventListener('resize',update);document.removeEventListener('visibilitychange',update);root.remove();
      app.style.removeProperty('--christmas-sky-top');app.style.removeProperty('--christmas-sky-horizon');}
  };
}
