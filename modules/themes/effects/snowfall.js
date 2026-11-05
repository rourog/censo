/* Layered snowfall: 1 canvas, <=30 FPS, no clinical reads/writes. */
export function createSnowfall(host){
  if(!host)return {dispose(){},getStatus(){return {count:0}}};
  const canvas=document.createElement('canvas');
  canvas.className='christmas-snow';
  canvas.setAttribute('aria-hidden','true');
  host.appendChild(canvas);
  const ctx=canvas.getContext('2d');
  if(!ctx){canvas.remove();return {dispose(){},getStatus(){return {count:0}}}};
  let width=1,height=1,dpr=1,flakes=[],frame=0,last=0,alive=true,phase=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const rand=(a,b)=>a+Math.random()*(b-a);
  function flake(randomY=true){
    return {x:rand(0,width),y:randomY?rand(0,height):rand(-12,-2),
      r:rand(1,3.1),depth:rand(.5,1.3),speed:rand(16,38),sway:rand(0,7)};
  }
  function resize(){
    const box=host.getBoundingClientRect();
    width=Math.max(1,box.width);height=Math.max(1,box.height);
    dpr=Math.min(devicePixelRatio||1,1.35);
    canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);
    canvas.style.width=width+'px';canvas.style.height=height+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    flakes=Array.from({length:Math.min(240,Math.round(width*height/6000))},()=>flake());
  }
  function tick(now){
    if(!alive)return;
    frame=requestAnimationFrame(tick);
    if(document.hidden||reduced.matches||document.body.classList.contains('effect-none')||
       !document.body.classList.contains('christmas-theme')){
      last=0;ctx.clearRect(0,0,width,height);return;
    }
    if(last&&now-last<33)return;
    const dt=Math.min(.055,last?(now-last)/1000:.033);
    last=now;phase+=dt;
    ctx.clearRect(0,0,width,height);
    for(const p of flakes){
      p.y+=p.speed*p.depth*dt;
      p.x+=(Math.sin(phase*.7+p.sway)*11+5)*p.depth*dt;
      if(p.y>height+7)Object.assign(p,flake(false));
      if(p.x>width+5)p.x=-5;
      ctx.globalAlpha=1;ctx.fillStyle=p.depth<.8?'#b5cfe5':p.depth<1.08?'#d8eaf6':'#ffffff';
      ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.depth,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  const observer=new ResizeObserver(resize);observer.observe(host);
  resize();frame=requestAnimationFrame(tick);
  return {getStatus:()=>({count:flakes.length,running:alive&&!document.hidden}),
    dispose(){alive=false;cancelAnimationFrame(frame);observer.disconnect();flakes=[];canvas.remove();}};
}
