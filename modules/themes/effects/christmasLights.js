/* Christmas lights, one bulb per patient (up to visible header capacity).
 * Read-only snapshots: no Firebase access, clinical writes or layout changes.
 */
const AREA_COLORS=Object.freeze({
  'SALA DE CHOQUE':['#ef4444','#f97316','#fbbf24'],
  'OBSERVACION':['#f472b6','#fb7185','#fda4af'],
  'TRAUMA MENOR':['#22c55e','#4ade80','#86efac'],
  'PEDIATRIA':['#38bdf8','#67e8f9','#93c5fd'],
  'EXTRAS':['#fbbf24','#fde047','#f59e0b'],
  'SIN AREA':['#f8fafc','#e2e8f0','#cbd5e1']
});
const normalizeArea=value=>String(value||'').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const colorFor=(area,index)=>{
  const tones=AREA_COLORS[normalizeArea(area)]||AREA_COLORS['SIN AREA'];
  return tones[index%tones.length];
};

export function createChristmasLights(header){
  const root=document.createElement('div');
  root.className='christmas-lights';
  root.setAttribute('aria-label','Luces navideñas interactivas');
  header.prepend(root);
  const cable=document.createElement('span');
  cable.className='christmas-light-cable';cable.setAttribute('aria-hidden','true');
  root.appendChild(cable);
  let patients=[],layoutKey='',timers=new Set(),disposed=false;
  const later=(fn,ms)=>{
    const id=setTimeout(()=>{timers.delete(id);if(!disposed)fn();},ms);
    timers.add(id);return id;
  };
  function slots(){
    const left=header.querySelector('.header-left');
    const right=header.querySelector('.header-right');
    const h=header.getBoundingClientRect();
    if(h.width<440)return [];
    const boundaries=el=>el?Array.from(el.querySelectorAll('button,[role="button"]'))
      .filter(node=>node.getClientRects().length&&getComputedStyle(node).display!=='none')
      .map(node=>node.getBoundingClientRect()):[];
    const L=boundaries(left),R=boundaries(right);
    const leftEdge=L.length?Math.max(...L.map(r=>r.right))-h.left+14:20;
    const rightEdge=R.length?Math.min(...R.map(r=>r.left))-h.left-14:h.width-20;
    // Deliberately ignore the title: bulbs are an overlay *behind* it.
    // Reserve only areas occupied by actual action buttons.
    const positions=[];
    for(let x=leftEdge+8;x+14<rightEdge;x+=31)positions.push(Math.round(x));
    return positions.slice(0,48);
  }
  function draw(){
    if(disposed)return;
    const coordinates=slots();
    const size=Math.min(patients.length,coordinates.length);
    const key=coordinates.join(',')+'|'+patients.map(p=>normalizeArea(p?.area)).join(',');
    if(key===layoutKey)return;
    layoutKey=key;
    root.replaceChildren(cable);
    for(let i=0;i<size;i++){
      const x=coordinates[i],color=colorFor(patients[i]?.area,i);
      const pine=document.createElement('span');
      pine.className='christmas-pine';pine.style.left=(x-10)+'px';
      const light=document.createElement('button');
      light.className='christmas-bulb';light.type='button';
      light.style.left=x+'px';
      light.style.top=(14+Math.sin(i*.85)*6)+'px';
      light.style.animationDelay=(-((i*0.73)%4.7))+'s';
      light.style.animationDuration=(3.8+(i%5)*.61)+'s';
      light.style.setProperty('--bulb-color',color);
      light.style.setProperty('--bulb-glow',color+'77');
      light.dataset.color=color;
      light.setAttribute('aria-label','Apagar luz navideña');
      root.append(pine,light);
    }
  }
  function extinguish(light){
    if(light.classList.contains('is-off'))return;
    light.classList.add('is-off');
    light.setAttribute('aria-label','Luz apagada');
    const x=light.offsetLeft+7,y=light.offsetTop+8;
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
      for(let i=0;i<10;i++){
        const piece=document.createElement('span');
        piece.className='christmas-spark';
        piece.style.left=x+'px';piece.style.top=y+'px';
        piece.style.background=light.dataset.color;
        const angle=i*Math.PI/5;
        piece.style.setProperty('--dx',Math.cos(angle)*(17+Math.random()*20)+'px');
        piece.style.setProperty('--dy',Math.sin(angle)*(14+Math.random()*24)+'px');
        root.appendChild(piece);later(()=>piece.remove(),750);
      }
    }
    later(()=>{
      if(light.isConnected){
        light.classList.remove('is-off');
        light.setAttribute('aria-label','Apagar luz navideña');
      }
    },2000);
  }
  const onClick=event=>{
    const light=event.target.closest('.christmas-bulb');
    if(light&&root.contains(light))extinguish(light);
  };
  root.addEventListener('click',onClick);
  const observer=new ResizeObserver(draw);
  observer.observe(header);
  const title=header.querySelector('.main-title');
  if(title)observer.observe(title);
  document.fonts?.ready?.then(()=>{if(!disposed){layoutKey='';draw();}}).catch(()=>{});
  draw();
  return {
    syncPatients(list){
      patients=Array.isArray(list)?list:[];
      draw();
    },
    getStatus:()=>({patients:patients.length,visibleBulbs:root.querySelectorAll('.christmas-bulb').length,
      availableSlots:slots().length}),
    dispose(){
      if(disposed)return;
      disposed=true;
      for(const id of timers)clearTimeout(id);
      timers.clear();
      observer.disconnect();
      root.removeEventListener('click',onClick);
      root.remove();
    }
  };
}
