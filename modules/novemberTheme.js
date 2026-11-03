/* Tema Noviembre 2026: decorativo, sin escrituras ni lecturas adicionales a Firestore. */
import { PAPER_ATLAS } from './novemberPaperAtlas.js';
import { STONE_TILE } from './novemberStoneTile.js';

const COLORS = [
  ['#ff4da6','#7c8cff','#59d35d','#83d7ff','#ffe13b','#ff9d42','#8d92ff','#ef4fb5','#76d66d'],
  ['#f43f5e','#fb7185','#f59e0b','#facc15','#22c55e','#14b8a6','#60a5fa','#818cf8','#ec4899'],
  ['#0f8a42','#34d399','#f8f4e9','#ffffff','#ef4444','#b91c1c'],
  ['#3aa665','#b8f0d0','#f1efe5','#ffffff','#ff8d8d','#d45252'],
  ['#ff9b2f','#ffc94a','#ffe08a','#2fbf71','#1f9d67','#1d7f5a'],
  ['#ff5ca8','#ff7a59','#facc15','#3ddc97','#38bdf8','#8b5cf6']
];
const FLAGS = { size:50, gap:2, tilt:5, sway:15, period:2.5, shuffle:20000 };
const currentInChihuahua = () => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone:'America/Chihuahua',year:'numeric',month:'numeric' }).formatToParts(new Date());
  const get = type => +parts.find(part=>part.type===type)?.value;
  return get('year') === 2026 && get('month') === 11;
};
function styleOnce() {
  if (document.getElementById('november-theme-css')) return;
  const css = document.createElement('style'); css.id='november-theme-css';
  css.textContent = `
    body.november-theme .header::before { display:none !important; }
    body.november-theme #plexusCanvas { display:none !important; }
    .november-background { position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden; }
    .november-stone { position:absolute;inset:0;opacity:.30;background-image:url("${STONE_TILE}");background-repeat:repeat;background-size:140px 140px;filter:saturate(.5) contrast(1.09) brightness(.73);mix-blend-mode:soft-light; }
    .november-light { position:absolute;inset:0;background:
      radial-gradient(ellipse 28% 140% at 7% 52%,rgba(0,186,83,.34),transparent 92%),
      radial-gradient(ellipse 30% 135% at 93% 48%,rgba(225,42,50,.32),transparent 92%),
      radial-gradient(ellipse 27% 125% at 50% 50%,rgba(255,255,247,.13),transparent 95%);
      opacity:.92;mix-blend-mode:screen; }
    .november-tint { position:absolute;inset:0;background:linear-gradient(90deg,rgba(38,91,58,.38),rgba(185,131,69,.30) 50%,rgba(121,48,48,.4));opacity:.20;mix-blend-mode:color; }
    .november-flags {position:absolute;inset:0;z-index:3;pointer-events:none;}
    .november-flag {position:absolute;top:18px;width:50px;height:50px;transform-origin:center top;
      animation:november-sway 2.5s ease-in-out infinite;will-change:transform;transition:opacity .35s ease;}
    .november-flag-inner {position:absolute;inset:0;display:block;background:currentColor;
      -webkit-mask-image:url("${PAPER_ATLAS}");mask-image:url("${PAPER_ATLAS}");
      -webkit-mask-size:300% 300%;mask-size:300% 300%;mask-mode:luminance;
      -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
      filter:drop-shadow(0 3px 3px rgba(0,0,0,.2));}
    @keyframes november-sway {
      0%,100% {transform:rotate(calc(var(--nov-tilt) - 7.5deg));}
      50% {transform:rotate(calc(var(--nov-tilt) + 7.5deg));}
    }
    .november-fireworks {position:fixed;inset:0;width:100vw;height:100vh;z-index:5;pointer-events:none;opacity:.70;}
    @media print { .november-flags,.november-background,.november-fireworks {display:none !important;} }
    @media (max-width:767px) { .november-flags {display:none !important;} }
    body.effect-none .november-flag {animation:none !important;transform:rotate(var(--nov-tilt));}
    @media (prefers-reduced-motion:reduce) {.november-flag {animation:none !important;transform:rotate(var(--nov-tilt));} .november-fireworks {display:none;}}
  `;
  document.head.appendChild(css);
}
function shuffled(n) {
  const indexes=Array.from({length:n},(_,i)=>i);
  for(let i=n-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[indexes[i],indexes[j]]=[indexes[j],indexes[i]];}
  return indexes;
}

export function initNovemberTheme(app) {
  if (!currentInChihuahua() || window.__novemberThemeController) return null;
  const header=document.querySelector('.header');
  if (!header) return null;
  document.body.classList.add('november-theme');
  styleOnce();
  const background=document.createElement('div');background.className='november-background';background.setAttribute('aria-hidden','true');
  background.innerHTML='<div class="november-stone"></div><div class="november-light"></div><div class="november-tint"></div>';
  const flags=document.createElement('div');flags.className='november-flags';flags.setAttribute('aria-hidden','true');
  header.prepend(background,flags);
  const canvas=document.createElement('canvas');canvas.className='november-fireworks';canvas.setAttribute('aria-hidden','true');
  document.body.appendChild(canvas);
  const ctx=canvas.getContext('2d',{alpha:true});
  let count=0, positions=[], paletteIndex=-1, active=false, raf=0, particles=[], shells=0, start=0;
  let hidden=document.hidden, lastFired=0;
  function capacity() {
    const title=header.querySelector('.main-title');
    const left=header.querySelector('.header-left');
    const right=header.querySelector('.header-right');
    if(!title||!left||!right) return [];
    const head=header.getBoundingClientRect(),t=title.getBoundingClientRect();
    if(head.width<320 || t.width<40) return [];
    const bounds=(section) => Array.from(section.querySelectorAll('button, [role="button"]'))
      .filter(el=>el.getClientRects().length && getComputedStyle(el).visibility!=='hidden')
      .map(el=>el.getBoundingClientRect());
    const leftButtons=bounds(left),rightButtons=bounds(right);
    const lastLeft=leftButtons.length?Math.max(...leftButtons.map(b=>b.right)):head.left+16;
    const firstRight=rightButtons.length?Math.min(...rightButtons.map(b=>b.left)):head.right-16;
    // 8px para inclinacion y balanceo y 6px de margen de seguridad
    const safe=14,stride=FLAGS.size+FLAGS.gap;
    const L0=Math.max(10,lastLeft-head.left+safe),L1=t.left-head.left-safe;
    const R0=t.right-head.left+safe,R1=firstRight-head.left-safe;
    const leftPos=[],rightPos=[];
    for(let x=L1-FLAGS.size;x>=L0;x-=stride)leftPos.push(x);
    for(let x=R0;x+FLAGS.size<=R1;x+=stride)rightPos.push(x);
    const available=[];
    while(leftPos.length||rightPos.length){
      if(leftPos.length)available.push(leftPos.shift());
      if(rightPos.length)available.push(rightPos.shift());
    }
    return available;
  }
  function updateLayout() {
    positions=capacity();
    const desired=count;
    const visible=Math.max(0,Math.min(desired,positions.length));
    if (flags.childElementCount!==visible) {
      flags.replaceChildren();
      for(let i=0;i<visible;i++){
        const slot=document.createElement('span');slot.className='november-flag';
        slot.style.animationDelay=(-i*.23)+'s';
        slot.style.setProperty('--nov-tilt',(i%2?FLAGS.tilt:-FLAGS.tilt)+'deg');
        const inner=document.createElement('span');inner.className='november-flag-inner';slot.appendChild(inner);flags.appendChild(slot);
      }
      shuffleFlags();
    }
    Array.from(flags.children).forEach((el,i)=>el.style.left=positions[i]+'px');
  }
  function shuffleFlags() {
    const palette=COLORS[Math.floor(Math.random()*COLORS.length)];
    const order=shuffled(9);
    const slots=Array.from(flags.children);
    const hues=shuffled(slots.length).map(i=>palette[i%palette.length]);
    slots.forEach((slot,i)=>{
      const art=order[i%9], col=Math.floor(art/3), row=art%3;
      const inner=slot.firstElementChild;
      inner.style.webkitMaskPosition=(row*50)+'% '+(col*50)+'%';
      inner.style.maskPosition=(row*50)+'% '+(col*50)+'%';
      inner.style.color=hues[i%hues.length];
    });
    paletteIndex=(paletteIndex+1)%COLORS.length;
  }
  function syncPatients(patients) {
    const next=Array.isArray(patients)?patients.length:0;
    if (next!==count){ count=next;updateLayout(); }
  }
  // Fuegos: salvas tricolores (90 partículas), anillos ocasionales;
  // tamaño 140, estelas .80, duración máxima de 5s y frecuencia baja.
  function resizeCanvas() {
    const dpr=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.floor(innerWidth*dpr);canvas.height=Math.floor(innerHeight*dpr);
    canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function burst(x,y,color,ring=false,scale=1){
    const n=ring?60:90;
    for(let i=0;i<n;i++){
      const a=(i/n)*Math.PI*2+(ring?0:Math.random()*.15);
      const v=(ring?2.1:1.25+Math.random()*1.45)*1.4*scale;
      particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,color,size:1.2+Math.random()*1.4});
    }
  }
  function animate(now) {
    if(!active)return;
    ctx.fillStyle='rgba(0,0,0,0.20)';ctx.globalCompositeOperation='destination-out';ctx.fillRect(0,0,innerWidth,innerHeight);
    ctx.globalCompositeOperation='source-over';
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.028;p.vx*=.994;p.life-=.014;
      ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;
      ctx.beginPath();ctx.arc(p.x,p.y,p.size*Math.max(.3,p.life),0,Math.PI*2);ctx.fill();
      if(p.life<=0)particles.splice(i,1);
    }
    ctx.globalAlpha=1;
    if(now-start<5000 && !hidden) raf=requestAnimationFrame(animate);
    else {active=false;particles=[];ctx.clearRect(0,0,innerWidth,innerHeight);}
  }
  function salute() {
    if(hidden||active||!ctx||document.body.classList.contains('effect-none')||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    if(!document.getElementById('mainAppContainer') || getComputedStyle(document.getElementById('mainAppContainer')).display==='none')return;
    resizeCanvas();
    const colors=['#079b4c','#ffffff','#dc2836'];
    // Tres estallidos sincronizados distribuidos sobre la franja superior.
    const x0=innerWidth*.25,x1=innerWidth*.50,x2=innerWidth*.75,y=Math.max(100,innerHeight*.23);
    burst(x0,y,colors[0]);burst(x1,y-30,colors[1]);burst(x2,y,colors[2]);
    if(Math.random()<.45){
      burst(innerWidth*.5,y+65,colors[0],true,.64);
      burst(innerWidth*.5,y+65,colors[1],true,.88);
      burst(innerWidth*.5,y+65,colors[2],true,1.12);
    }
    active=true;start=performance.now();raf=requestAnimationFrame(animate);
    lastFired=Date.now();
  }
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden){active=false;cancelAnimationFrame(raf);particles=[];ctx?.clearRect(0,0,innerWidth,innerHeight);}});
  const ro=new ResizeObserver(()=>updateLayout());ro.observe(header);
  if(header.querySelector('.header-left'))ro.observe(header.querySelector('.header-left'));
  if(header.querySelector('.header-right'))ro.observe(header.querySelector('.header-right'));
  app.syncNovemberPatients=syncPatients;
  syncPatients(app.state.pacientesGlobal);
  updateLayout();shuffleFlags();
  // Medimos de nuevo al mostrar la app tras el login, incluso si el
  // navegador no emite un ResizeObserver por los elementos ocultos.
  const firstLayoutCheck=setInterval(()=>{if(header.getBoundingClientRect().width>320){updateLayout();clearInterval(firstLayoutCheck);}},300);
  const shuffleTimer=setInterval(()=>{if(!document.hidden)shuffleFlags();},FLAGS.shuffle);
  const showTimer=setInterval(()=>{if(!document.hidden && Date.now()-lastFired>130000)salute();},30000);
  // La primera salva ocurre solo después de que el censo real esté visible.
  lastFired=Date.now()-110000;
  window.__novemberThemeController={syncPatients,shuffleFlags,salute,getStatus(){return {patients:count,availablePositions:positions.length,visibleFlags:flags.childElementCount,headerWidth:header.getBoundingClientRect().width};},dispose(){clearInterval(firstLayoutCheck);clearInterval(shuffleTimer);clearInterval(showTimer);ro.disconnect();cancelAnimationFrame(raf);background.remove();flags.remove();canvas.remove();document.body.classList.remove('november-theme');}};
  return window.__novemberThemeController;
}
