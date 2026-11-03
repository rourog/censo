/* Noviembre 2026 — pétalos de cempasúchil arrastrados por viento lateral.
   Tres planos de profundidad en UN canvas. No toca el DOM clínico ni Firebase.
   Fondo fijo precalculado y dos capas con movimiento ligero (~30 fps). */
export function createNovemberPetalField() {
  const parent=document.querySelector('.desktop-waves-bg');
  if(!parent || !window.matchMedia('(min-width:768px)').matches) return {dispose(){}};
  const canvas=document.createElement('canvas');
  canvas.className='november-petal-field';
  canvas.setAttribute('aria-hidden','true');
  parent.appendChild(canvas);
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx){canvas.remove();return {dispose(){}};}
  const still=document.createElement('canvas');
  const stillCtx=still.getContext('2d',{alpha:true});
  let w=1,h=1,dpr=1,raf=0,last=0,running=true,petals=[];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const colors=['#facc15','#f59e0b','#fde047','#ffb52b','#fbbf24','#ffd66b'];
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const rand=(a,b)=>a+Math.random()*(b-a);
  function petal(front=false,edge=false){
    const dir=Math.random()<.5?-1:1;
    const size=front?rand(10,18):rand(6,12);
    return {x:edge?(dir>0?-size:w+size):rand(0,w),
      y:rand(0,h),dir,size,speed:front?rand(28,55):rand(16,36),
      amp:front?rand(11,23):rand(6,17),freq:rand(.48,1.2),
      phase:rand(0,Math.PI*2),angle:rand(0,Math.PI*2),
      spin:rand(-1,1),opacity:front?rand(.55,.8):rand(.28,.53),
      color:pick(colors),front};
  }
  function draw(g,p,x,y,angle){
    g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha=p.opacity;
    g.fillStyle=p.color;
    const z=p.size;
    g.beginPath();g.moveTo(-z*.48,0);
    g.quadraticCurveTo(-z*.12,-z*.43,z*.47,-z*.16);
    g.quadraticCurveTo(z*.73,z*.07,z*.27,z*.32);
    g.quadraticCurveTo(-z*.16,z*.44,-z*.48,0);
    g.fill();g.restore();
  }
  function paintStill(){
    still.width=canvas.width;still.height=canvas.height;
    if(!stillCtx)return;
    stillCtx.setTransform(dpr,0,0,dpr,0,0);
    stillCtx.clearRect(0,0,w,h);
    // Pétalos dispersos, inmóviles y discretos: ninguna animación adicional.
    const count=Math.max(8,Math.min(21,Math.round(w/68)));
    for(let i=0;i<count;i++){
      const p=petal(false,false);p.opacity=rand(.12,.31);p.size=rand(5,10);
      draw(stillCtx,p,p.x,p.y,p.angle);
    }
  }
  function resize(){
    const rect=parent.getBoundingClientRect();
    w=Math.max(1,rect.width);h=Math.max(1,rect.height);
    dpr=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    canvas.style.width=w+'px';canvas.style.height=h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    paintStill();
    const back=Math.max(9,Math.min(17,Math.round(w/102)));
    const front=Math.max(7,Math.min(15,Math.round(w/125)));
    petals=[...Array.from({length:back},()=>petal(false)),
            ...Array.from({length:front},()=>petal(true))];
  }
  function drawFrame(now){
    if(!running)return;
    raf=requestAnimationFrame(drawFrame);
    if(document.hidden||reduced.matches||document.body.classList.contains('effect-none')||
       !document.body.classList.contains('november-theme')){
      last=0;return;
    }
    if(now-last<33)return;
    const dt=Math.min(.055,last?(now-last)/1000:.033);last=now;
    ctx.clearRect(0,0,w,h);
    if(still.width&&still.height)ctx.drawImage(still,0,0,w,h);
    for(let i=0;i<petals.length;i++){
      const p=petals[i];p.x+=p.dir*p.speed*dt;
      p.phase+=dt*p.freq*2;
      p.angle+=dt*p.spin;
      const y=p.y+Math.sin(p.phase)*p.amp+Math.sin(p.phase*.48)*6;
      draw(ctx,p,p.x,y,p.angle+Math.sin(p.phase)*.4);
      if((p.dir>0&&p.x>w+p.size*2)||(p.dir<0&&p.x<-p.size*2))
        petals[i]=petal(p.front,true);
    }
  }
  const ro=new ResizeObserver(resize);ro.observe(parent);
  const onVisibility=()=>{last=0;if(document.hidden)ctx.clearRect(0,0,w,h);};
  document.addEventListener('visibilitychange',onVisibility);
  resize();raf=requestAnimationFrame(drawFrame);
  return {dispose(){
    running=false;cancelAnimationFrame(raf);ro.disconnect();
    document.removeEventListener('visibilitychange',onVisibility);
    canvas.remove();
    petals.length=0;
  }};
}
