/* Seasonal Engine 2.0: 30 fixed bulbs (15 per side).
 * Active bulbs represent patients. No Firestore access or clinical writes.
 */
const PER_SIDE = 15;
const TOTAL_BULBS = PER_SIDE * 2;
const DECORATIVE_COLORS = ['#ff4455','#dc2626','#fb7185','#f43f5e'];
const GROUP_COLORS = Object.freeze({
  'SALA DE CHOQUE':'#ff4455',
  'OBSERVACION':'#dc2626',
  'TRAUMA MENOR':'#be123c',
  'PEDIATRIA':'#fb7185',
  'EXTRAS':'#f43f5e',
  'SIN AREA':'#e11d48'
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
  let patients=[],renderKey='',disposed=false,shuffleStep=0;
  let patientSignature='';
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
    const key=JSON.stringify(layout);
    patientSignature=signature;
    if(key===renderKey)return;
    renderKey=key;
    root.replaceChildren();
    if(!layout)return;
    const positions=[];
    for(let i=0;i<PER_SIDE;i++){
      positions.push(layout.left[i],layout.right[i]);
    }
    const seed=sorted.map(entry=>entry.id).join('|')||'sin-pacientes';
    const selected=shuffledSlots(seed+'|'+shuffleStep);
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
      bulb.style.setProperty('--sway-delay',(-((index*.61)%5.7))+'s');
      bulb.style.setProperty('--glow-delay',(-((index*.79)%1.6))+'s');
      bulb.style.setProperty('--pulse-delay',(-((index*1.37)%1.25))+'s');
      setBulbColor(bulb,color||DECORATIVE_COLORS[index%DECORATIVE_COLORS.length]);
      labelBulb(bulb);
      root.append(pine,bulb);
    });
    updateIllumination();
  }
  function setBulbColor(bulb,color){
    bulb.dataset.color=color;
    bulb.style.setProperty('--bulb-color',color);
    bulb.style.setProperty('--bulb-glow',color+'88');
  }
  function labelBulb(bulb){
    bulb.setAttribute('aria-label',bulb.classList.contains('is-off')
      ?'Foco roto; se repondrá en un momento'
      :bulb.classList.contains('is-lit')
        ?'Foco encendido por paciente. Romper foco'
        :'Encender foco al pasar el cursor o enfocar. Romper con clic');
  }
  function updateIllumination(){
    if(disposed)return;
    const sorted=patients.map((patient,index)=>({id:patientId(patient,index),color:patientColor(patient)}))
      .sort((a,b)=>a.id.localeCompare(b.id));
    const seed=sorted.map(item=>item.id).join('|')||'sin-pacientes';
    const shuffled=shuffledSlots(seed+'|'+shuffleStep);
    const lit=new Map();
    sorted.slice(0,TOTAL_BULBS).forEach((item,i)=>lit.set(shuffled[i],item.color));
    root.querySelectorAll('.christmas-bulb').forEach((bulb,index)=>{
      const color=lit.get(index);
      bulb.classList.toggle('is-lit',!!color);
      bulb.classList.toggle('is-idle',!color);
      // Patient assignments change without resetting a break or pointer/focus state.
      setBulbColor(bulb,color||DECORATIVE_COLORS[index%DECORATIVE_COLORS.length]);
      labelBulb(bulb);
    });
  }
  function extinguish(bulb){
    if(bulb.classList.contains('is-off'))return;
    bulb.classList.add('is-off');
    labelBulb(bulb);
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
      // Use visual bounds so fragments originate at the swaying glass itself.
      const glass=bulb.getBoundingClientRect(), bounds=root.getBoundingClientRect();
      const x=glass.left+glass.width/2-bounds.left;
      const y=glass.top+glass.height/2-bounds.top;
      const fragment=(kind)=>{
        const node=document.createElement('span');
        node.className=kind;
        node.setAttribute('aria-hidden','true');
        node.style.left=x+'px';node.style.top=y+'px';
        node.style.setProperty('--fragment-color',bulb.dataset.color);
        root.append(node);later(()=>node.remove(),900);
        return node;
      };
      fragment('christmas-break-flash');
      for(let i=0;i<8;i++){
        const shard=fragment('christmas-glass-shard');
        const angle=(i/8)*Math.PI*2;
        const distance=12+Math.random()*20;
        shard.style.setProperty('--dx',Math.cos(angle)*distance+'px');
        shard.style.setProperty('--dy',Math.sin(angle)*distance*.6+'px');
        shard.style.setProperty('--fall',(25+Math.random()*25)+'px');
        shard.style.setProperty('--spin',((i%2?-1:1)*(100+Math.random()*240))+'deg');
        shard.style.setProperty('--shard-width',(2+Math.random()*3)+'px');
        shard.style.setProperty('--shard-height',(4+Math.random()*4)+'px');
      }
      for(let i=0;i<5;i++){
        const spark=fragment('christmas-electric-spark');
        spark.style.setProperty('--angle',(i*72+Math.random()*25)+'deg');
        spark.style.setProperty('--reach',(10+Math.random()*12)+'px');
      }
    }
    later(()=>{
      if(bulb.isConnected){
        bulb.classList.remove('is-off');
        labelBulb(bulb);
      }
    },2000);
  }
  const targetBulb=event=>{
    const bulb=event.target.closest?.('.christmas-bulb');
    return bulb&&root.contains(bulb)?bulb:null;
  };
  const onClick=event=>{const bulb=targetBulb(event);if(bulb)extinguish(bulb);};
  const onOver=event=>{
    if(event.pointerType!=='touch')targetBulb(event)?.classList.add('is-hovered');
  };
  const onOut=event=>{
    const bulb=targetBulb(event);
    if(bulb&&!bulb.contains(event.relatedTarget))bulb.classList.remove('is-hovered');
  };
  const onFocus=event=>{
    const bulb=targetBulb(event);
    if(bulb?.matches(':focus-visible'))bulb.classList.add('is-focused');
  };
  const onBlur=event=>targetBulb(event)?.classList.remove('is-focused');
  const handlers={click:onClick,pointerover:onOver,pointerout:onOut,focusin:onFocus,focusout:onBlur};
  for(const [type,handler] of Object.entries(handlers))root.addEventListener(type,handler);
  // Switch illumination only. DOM nodes and coordinates remain fixed.
  const shuffleTimer=window.setInterval(()=>{
    if(disposed||document.hidden)return;
    shuffleStep=(shuffleStep+1)%100000;
    updateIllumination();
  },20000);
  timers.add(shuffleTimer);
  const observer=new ResizeObserver(draw);
  observer.observe(header);
  const title=header.querySelector('.main-title');
  if(title)observer.observe(title);
  document.fonts?.ready?.then(()=>{if(!disposed){renderKey='';draw();}}).catch(()=>{});
  draw();
  return {
    syncPatients(list){
      patients=Array.isArray(list)?list:[];
      const signature=patients.map((p,i)=>patientId(p,i)+'='+patientColor(p)).sort().join('|');
      if(signature!==patientSignature){
        patientSignature=signature;
        draw();
        updateIllumination();
      }
    },
    getStatus:()=>({patients:patients.length,totalBulbs:root.querySelectorAll('.christmas-bulb').length,
      litBulbs:root.querySelectorAll('.christmas-bulb.is-lit').length,perSide:PER_SIDE,shuffleStep}),
    dispose(){
      if(disposed)return;
      disposed=true;for(const id of timers)clearTimeout(id);timers.clear();
      observer.disconnect();
      for(const [type,handler] of Object.entries(handlers))root.removeEventListener(type,handler);
      root.remove();
    }
  };
}
