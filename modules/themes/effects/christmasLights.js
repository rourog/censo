/* Seasonal Engine 2.0: 30 fixed bulbs (15 per side).
 * Active bulbs represent patients. No Firestore access or clinical writes.
 */
const PER_SIDE = 15;
const TOTAL_BULBS = PER_SIDE * 2;
const GROUP_COLORS = Object.freeze({
  'SALA DE CHOQUE':'#ffd6d6',
  'OBSERVACION':'#dc2626',
  'TRAUMA MENOR':'#16a34a',
  'PEDIATRIA':'#e9f7ff',
  'EXTRAS':'#f87171',
  'SIN AREA':'#f8fafc'
});
const normalizeArea = value => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const patientColor = patient => GROUP_COLORS[normalizeArea(patient?.area)] || GROUP_COLORS['SIN AREA'];
const patientId = (p,index) => String(p?.fila ?? p?.id ?? (p?.cama || '') + ':' + (p?.nombre || '') + ':' + index);
function hash(value){
  let result=2166136261;
  for(const char of value){result^=char.charCodeAt(0);result=Math.imul(result,16777619);}
  return result>>>0;
}
function shuffledSlots(seed){
  let value=hash(seed)||1;
  const random=()=>{
    value^=value<<13;value^=value>>>17;value^=value<<5;
    return (value>>>0)/4294967296;
  };
  const entries=Array.from({length:TOTAL_BULBS},(_,i)=>i);
  for(let i=entries.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [entries[i],entries[j]]=[entries[j],entries[i]];
  }
  return entries;
}
export function createChristmasLights(header){
  const root=document.createElement('div');
  root.className='christmas-lights';
  root.setAttribute('aria-label','Luces navideñas interactivas');
  header.prepend(root);
  let patients=[],renderKey='',disposed=false;
  const timers=new Set();
  const later=(fn,ms)=>{
    const id=setTimeout(()=>{timers.delete(id);if(!disposed)fn();},ms);
    timers.add(id);
  };
  function geometry(){
    const title=header.querySelector('.main-title');
    const h=header.getBoundingClientRect();
    const t=title?.getBoundingClientRect();
    if(!t||h.width<440)return null;
    const bounds=selector=>Array.from(header.querySelectorAll(selector))
      .filter(node=>node.getClientRects().length && getComputedStyle(node).display!=='none')
      .map(node=>node.getBoundingClientRect());
    const controls=[...bounds('.header-left button'),...bounds('.header-right button')];
    const leftControl=controls.filter(b=>b.right<=t.left);
    const rightControl=controls.filter(b=>b.left>=t.right);
    const leftEdge=Math.max(12,...leftControl.map(b=>b.right-h.left+10));
    const rightEdge=Math.min(h.width-12,...rightControl.map(b=>b.left-h.left-10));
    const centerLeft=t.left-h.left-21,centerRight=t.right-h.left+21;
    const lStart=leftEdge+5,lEnd=centerLeft-7;
    const rStart=centerRight+7,rEnd=rightEdge-5;
    // Fit every bulb in its own side; never move or resize the title.
    const available=Math.min(lEnd-lStart,rEnd-rStart);
    if(available<90)return null;
    const bulbSize=Math.min(13,Math.max(6.5,(available/(PER_SIDE-1))*.76));
    const left=Array.from({length:PER_SIDE},(_,i)=>lStart+(lEnd-lStart)*i/(PER_SIDE-1));
    const right=Array.from({length:PER_SIDE},(_,i)=>rStart+(rEnd-rStart)*i/(PER_SIDE-1));
    return {left,right,bulbSize};
  }
  function draw(){
    if(disposed)return;
    const layout=geometry();
    const sorted=patients.map((patient,index)=>({
      id:patientId(patient,index),color:patientColor(patient)
    })).sort((a,b)=>a.id.localeCompare(b.id));
    const signature=sorted.map(entry=>entry.id+'='+entry.color).join('|');
    const key=JSON.stringify(layout)+'|'+signature;
    if(key===renderKey)return;
    renderKey=key;
    root.replaceChildren();
    if(!layout)return;
    const positions=[];
    for(let i=0;i<PER_SIDE;i++){
      positions.push(layout.left[i],layout.right[i]);
    }
    const seed=sorted.map(entry=>entry.id).join('|')||'sin-pacientes';
    const selected=shuffledSlots(seed);
    const illuminated=new Map();
    for(let i=0;i<Math.min(sorted.length,TOTAL_BULBS);i++){
      illuminated.set(selected[i],sorted[i].color);
    }
    positions.forEach((position,index)=>{
      const color=illuminated.get(index);
      const pine=document.createElement('span');
      pine.className='christmas-pine';
      pine.style.left=(position-7)+'px';
      const bulb=document.createElement('button');
      bulb.type='button';
      bulb.className='christmas-bulb '+(color?'is-lit':'is-idle');
      bulb.style.left=position+'px';
      bulb.style.top=(14+Math.sin(index*.55)*5)+'px';
      bulb.style.setProperty('--bulb-size',layout.bulbSize+'px');
      bulb.style.animationDelay=(-((index*.53)%5.1))+'s';
      bulb.style.animationDuration=(4.0+(index%6)*.48)+'s';
      bulb.dataset.color=color||'#ffffff';
      if(color){
        bulb.style.setProperty('--bulb-color',color);
        bulb.style.setProperty('--bulb-glow',color+'88');
      }
      bulb.setAttribute('aria-label',color?'Apagar luz navideña':'Luz navideña sin encender');
      bulb.disabled=!color;
      root.append(pine,bulb);
    });
  }
  function extinguish(bulb){
    if(!bulb.classList.contains('is-lit')||bulb.classList.contains('is-off'))return;
    bulb.classList.add('is-off');
    bulb.setAttribute('aria-label','Luz apagada');
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const x=bulb.offsetLeft+bulb.offsetWidth/2;
      const y=bulb.offsetTop+bulb.offsetHeight/2;
      for(let i=0;i<10;i++){
        const spark=document.createElement('span');
        spark.className='christmas-spark';
        spark.style.left=x+'px';spark.style.top=y+'px';
        spark.style.background=bulb.dataset.color;
        const a=i*Math.PI/5;
        spark.style.setProperty('--dx',Math.cos(a)*(14+Math.random()*15)+'px');
        spark.style.setProperty('--dy',Math.sin(a)*(12+Math.random()*17)+'px');
        root.append(spark);
        later(()=>spark.remove(),750);
      }
    }
    later(()=>{
      if(bulb.isConnected){
        bulb.classList.remove('is-off');
        bulb.setAttribute('aria-label','Apagar luz navideña');
      }
    },2000);
  }
  const onClick=event=>{
    const bulb=event.target.closest('.christmas-bulb');
    if(bulb&&root.contains(bulb))extinguish(bulb);
  };
  root.addEventListener('click',onClick);
  const observer=new ResizeObserver(draw);
  observer.observe(header);
  const title=header.querySelector('.main-title');
  if(title)observer.observe(title);
  document.fonts?.ready?.then(()=>{if(!disposed){renderKey='';draw();}}).catch(()=>{});
  draw();
  return {
    syncPatients(list){patients=Array.isArray(list)?list:[];draw();},
    getStatus:()=>({patients:patients.length,totalBulbs:root.querySelectorAll('.christmas-bulb').length,
      litBulbs:root.querySelectorAll('.christmas-bulb.is-lit').length,perSide:PER_SIDE}),
    dispose(){
      if(disposed)return;
      disposed=true;for(const id of timers)clearTimeout(id);timers.clear();
      observer.disconnect();root.removeEventListener('click',onClick);root.remove();
    }
  };
}
