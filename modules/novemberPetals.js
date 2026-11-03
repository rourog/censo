/* Noviembre 2026: viento lateral de pétalos cempasúchil.
   Únicamente visual. Sin Firebase ni acceso al censo clínico. */
export function createNovemberPetalField() {
  const parent = document.querySelector('.desktop-waves-bg');
  if (!parent || !window.matchMedia('(min-width:768px)').matches) return { dispose(){} };
  const canvas = document.createElement('canvas');
  canvas.className = 'november-petal-field';
  canvas.setAttribute('aria-hidden','true');
  parent.appendChild(canvas);
  const ctx = canvas.getContext('2d',{alpha:true});
  if (!ctx) {canvas.remove();return {dispose(){}};}
  let width=1,height=1,dpr=1,raf=0,last=0,petals=[],running=true;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const shades=['#facc15','#f59e0b','#fde047','#ffb52b','#fbbf24','#ffd66b'];
  function makePetal(fromEdge=true) {
    const direction=Math.random()<.5?1:-1;
    const size=7+Math.random()*9;
    return {
      x:fromEdge?(direction===1?-size:width+size):Math.random()*width,
      y:Math.random()*height, direction,size,
      speed:22+Math.random()*37,
      amplitude:8+Math.random()*17,
      frequency:.65+Math.random()*.75,
      phase:Math.random()*Math.PI*2,
      twist:Math.random()*Math.PI*2,
      spin:(Math.random()-.5)*1.8,
      opacity:.38+Math.random()*.36,
      color:shades[Math.floor(Math.random()*shades.length)],
      depth:.65+Math.random()*.65
    };
  }
  function resize() {
    const rect=parent.getBoundingClientRect();
    width=Math.max(1,rect.width);height=Math.max(1,rect.height);
    dpr=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    canvas.style.width=width+'px';canvas.style.height=height+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const target=Math.max(10,Math.min(18,Math.round(width/95)));
    while(petals.length<target)petals.push(makePetal(false));
    if(petals.length>target)petals.length=target;
  }
  function draw(p,x,y,angle) {
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    ctx.fillStyle=p.color;ctx.globalAlpha=p.opacity;
    // Pétalo estrecho, con punta y curvatura, sin imágenes ni DOM por partícula.
    const s=p.size;
    ctx.beginPath();ctx.moveTo(-s*.48,0);
    ctx.quadraticCurveTo(-s*.12,-s*.43,s*.47,-s*.16);
    ctx.quadraticCurveTo(s*.73,s*.07,s*.27,s*.32);
    ctx.quadraticCurveTo(-s*.16,s*.44,-s*.48,0);
    ctx.fill();ctx.restore();
  }
  function tick(now) {
    if(!running)return;
    raf=requestAnimationFrame(tick);
    if(document.hidden||reduced.matches||document.body.classList.contains('effect-none')||!document.body.classList.contains('november-theme'))return;
    if(now-last<32)return; // ~30 fps con pocas partículas.
    const dt=Math.min(.055,last?(now-last)/1000:.033);last=now;
    ctx.clearRect(0,0,width,height);
    for(let i=0;i<petals.length;i++){
      let p=petals[i];p.phase+=dt*p.frequency*2;
      p.x+=p.direction*p.speed*p.depth*dt;
      const y=p.y+Math.sin(p.phase)*p.amplitude+Math.sin(p.phase*.43)*7;
      p.twist+=p.spin*dt;
      draw(p,p.x,y,p.twist+Math.sin(p.phase)*.38);
      if((p.direction===1 && p.x>width+p.size*2)||(p.direction===-1 && p.x<-p.size*2))
        petals[i]=makePetal(true);
    }
  }
  const ro=new ResizeObserver(resize);ro.observe(parent);
  const onVisible=()=>{last=0;if(document.hidden)ctx.clearRect(0,0,width,height);};
  document.addEventListener('visibilitychange',onVisible);
  resize();raf=requestAnimationFrame(tick);
  return {dispose(){running=false;cancelAnimationFrame(raf);ro.disconnect();document.removeEventListener('visibilitychange',onVisible);canvas.remove();}};
}
