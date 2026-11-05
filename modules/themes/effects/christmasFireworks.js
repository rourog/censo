/* Christmas celebration, decorative and independent of patient data. */
export function createChristmasFireworks(config) {
 const canvas=document.createElement('canvas');
 canvas.className='christmas-fireworks';canvas.setAttribute('aria-hidden','true');
 document.body.appendChild(canvas);
 const ctx=canvas.getContext('2d');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let active=false,frame=0,started=0,particles=[],disposed=false;
 function salute({force=false}={}) {
  if(disposed||active||!ctx||document.hidden||reduced.matches||
    (!force&&document.body.classList.contains('effect-none')))return false;
  const root=document.getElementById('mainAppContainer');
  if(!root||!root.getClientRects().length)return false;
  const dpr=Math.min(devicePixelRatio||1,1.4);
  canvas.width=Math.ceil(innerWidth*dpr);canvas.height=Math.ceil(innerHeight*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  for(let k=0;k<3;k++)for(let i=0;i<130;i++){
    const a=i*Math.PI*2/130,v=2+Math.random()*2.6;
    particles.push({x:innerWidth*(.24+k*.26),y:innerHeight*(k===1?.18:.23),
      vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,
      size:2+Math.random()*2,color:config.colors[k%config.colors.length]});
  }
  active=true;started=performance.now();frame=requestAnimationFrame(paint);return true;
 }
 function paint(now) {
  if(!active||disposed)return;
  ctx.clearRect(0,0,innerWidth,innerHeight);
  for(const p of particles) {
    p.x+=p.vx;p.y+=p.vy;p.vy+=.025;p.life-=.012;
    if(p.life<=0)continue;
    ctx.globalAlpha=p.life;ctx.fillStyle=p.color;
    ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
  if(now-started<config.duration&&!document.hidden)frame=requestAnimationFrame(paint);
  else{active=false;particles=[];ctx.clearRect(0,0,innerWidth,innerHeight);}
 }
 const visibility=()=>{if(document.hidden){active=false;cancelAnimationFrame(frame);particles=[];}};
 document.addEventListener('visibilitychange',visibility);
 return {salute,getStatus:()=>({active}),dispose(){
  disposed=true;active=false;cancelAnimationFrame(frame);
  document.removeEventListener('visibilitychange',visibility);
  particles=[];canvas.remove();
 }};
}
