/* Clickable Christmas bulbs, confined to unused header space. */
export function createChristmasLights(header){
  const root=document.createElement('div');
  root.className='christmas-lights';
  root.setAttribute('aria-label','Luces navideñas interactivas');
  header.prepend(root);
  const colors=['#ffc96b','#e95c63','#69d6a1','#aadfff','#f6eff7'];
  let timers=new Set(),width=0,disposed=false;
  const later=(fn,ms)=>{
    const id=setTimeout(()=>{timers.delete(id);if(!disposed)fn();},ms);
    timers.add(id);
  };
  function slots(){
    const title=header.querySelector('.main-title');
    const left=header.querySelector('.header-left');
    const right=header.querySelector('.header-right');
    if(!title||!left||!right)return [];
    const h=header.getBoundingClientRect(),t=title.getBoundingClientRect();
    if(h.width<570)return [];
    const bounds=el=>Array.from(el.querySelectorAll('button,[role="button"]'))
      .filter(n=>n.getClientRects().length).map(n=>n.getBoundingClientRect());
    const l=bounds(left),r=bounds(right);
    const a=l.length?Math.max(...l.map(b=>b.right))-h.left:14;
    const b=r.length?Math.min(...r.map(b=>b.left))-h.left:h.width-14;
    const ranges=[[a+19,t.left-h.left-16],[t.right-h.left+16,b-19]],out=[];
    for(const [start,end] of ranges)
      for(let x=start+12;x<end-14;x+=34)out.push(Math.round(x));
    return out.slice(0,22);
  }
  function draw(){
    if(disposed)return;
    const positions=slots(),w=Math.round(header.getBoundingClientRect().width);
    if(w===width&&root.querySelectorAll('button').length===positions.length)return;
    width=w;root.replaceChildren();
    for(let i=0;i<positions.length;i++){
      const x=positions[i],color=colors[i%colors.length];
      const pine=document.createElement('span');
      pine.className='christmas-pine';pine.style.left=(x-10)+'px';
      const light=document.createElement('button');
      light.type='button';light.className='christmas-bulb';
      light.style.left=x+'px';light.style.animationDelay=(-i*.41)+'s';
      light.style.setProperty('--bulb-color',color);
      light.style.setProperty('--bulb-glow',color+'88');
      light.dataset.color=color;
      light.setAttribute('aria-label','Apagar luz navideña');
      root.append(pine,light);
    }
  }
  function extinguish(light){
    if(light.classList.contains('is-off'))return;
    light.classList.add('is-off');light.setAttribute('aria-label','Luz apagada');
    const x=light.offsetLeft+6,y=light.offsetTop+8;
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
      for(let i=0;i<10;i++){
        const piece=document.createElement('span');
        piece.className='christmas-spark';piece.style.left=x+'px';piece.style.top=y+'px';
        piece.style.background=light.dataset.color;
        const a=i*Math.PI/5;
        piece.style.setProperty('--dx',Math.cos(a)*(18+Math.random()*20)+'px');
        piece.style.setProperty('--dy',Math.sin(a)*(15+Math.random()*22)+'px');
        root.appendChild(piece);later(()=>piece.remove(),730);
      }
    }
    later(()=>{if(light.isConnected){light.classList.remove('is-off');light.setAttribute('aria-label','Apagar luz navideña');}},2000);
  }
  const onClick=e=>{const light=e.target.closest('.christmas-bulb');if(light&&root.contains(light))extinguish(light);};
  root.addEventListener('click',onClick);
  const observer=new ResizeObserver(draw);observer.observe(header);
  draw();
  document.fonts?.ready?.then(()=>{if(!disposed)draw();}).catch(()=>{});
  return {getStatus:()=>({bulbs:root.querySelectorAll('button').length}),dispose(){
    disposed=true;for(const timer of timers)clearTimeout(timer);timers.clear();
    observer.disconnect();root.removeEventListener('click',onClick);root.remove();
  }};
}
