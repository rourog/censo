/* November 2026: isolated sugar skull ornaments, visual-only, no Firestore access. */
const SPRITE = new URL('../assets/seasonal/november/calaveritas-atlas.png', import.meta.url);
SPRITE.searchParams.set('v', String(window.CensoBuild?.version || 'november-skulls-1'));
const W=38, H=44, GAP=9, COUNT_PER_SIDE=3;
const ART_ORDER=[2,0,3,1,4,5];
function ensureStyle(){
  if(document.getElementById('november-skull-css'))return;
  const style=document.createElement('style');
  style.id='november-skull-css';
  style.textContent=`
    .november-skulls{position:absolute;inset:0;z-index:3;overflow:hidden;pointer-events:none;}
    .november-skull{
      position:absolute;top:3px;width:${W}px;height:68px;pointer-events:none;
      transform-origin:50% 0;will-change:transform;
      animation:november-skull-sway var(--skull-period,3.1s) ease-in-out infinite alternate;
      animation-delay:var(--skull-delay,0s);
    }
    .november-skull-thread{
      position:absolute;left:50%;top:0;width:1px;height:var(--skull-rope,11px);
      transform:translateX(-50%);
      background:linear-gradient(to bottom,rgba(255,221,157,.54),rgba(255,184,91,.85));
    }
    .november-skull-thread::after{
      content:'';position:absolute;left:50%;bottom:-2px;transform:translateX(-50%);
      width:4px;height:4px;border-radius:50%;background:#e6a14f;
    }
    .november-skull-art{
      position:absolute;left:0;top:var(--skull-rope,11px);
      width:${W}px;height:${H}px;display:block;
      background-image:url("${SPRITE.href}");
      background-size:300% 200%;background-repeat:no-repeat;
      background-position:var(--skull-x,0%) var(--skull-y,0%);
      filter:drop-shadow(0 2px 2px rgba(0,0,0,.27));
    }
    @keyframes november-skull-sway{
      from{transform:rotate(calc(var(--skull-tilt,0deg) - 3.5deg));}
      to{transform:rotate(calc(var(--skull-tilt,0deg) + 3.5deg));}
    }
    body.effect-none .november-skull{
      animation:none!important;transform:rotate(var(--skull-tilt,0deg));
    }
    @media(max-width:767px),print{.november-skulls{display:none!important;}}
    @media(prefers-reduced-motion:reduce){
      .november-skull{animation:none!important;transform:rotate(var(--skull-tilt,0deg));}
    }
  `;
  document.head.appendChild(style);
}
export function createNovemberSkullGarland(header){
  ensureStyle();
  const layer=document.createElement('div');
  layer.className='november-skulls';layer.setAttribute('aria-hidden','true');
  header.appendChild(layer);
  let occupied=[];
  function layout(){
    occupied=[];
    const title=header.querySelector('.main-title');
    const left=header.querySelector('.header-left');
    const right=header.querySelector('.header-right');
    const bounds=header.getBoundingClientRect();
    if(bounds.width<768||!title||!left||!right){
      layer.replaceChildren();return;
    }
    const t=title.getBoundingClientRect();
    const buttons=part=>Array.from(part.querySelectorAll('button,[role="button"]'))
      .filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden')
      .map(el=>el.getBoundingClientRect());
    const lb=buttons(left),rb=buttons(right);
    const lastLeft=lb.length?Math.max(...lb.map(x=>x.right)):bounds.left+14;
    const firstRight=rb.length?Math.min(...rb.map(x=>x.left)):bounds.right-14;
    const pad=17,stride=W+GAP;
    const sides=[
      {start:Math.max(10,lastLeft-bounds.left+pad),end:t.left-bounds.left-pad,side:-1},
      {start:t.right-bounds.left+pad,end:firstRight-bounds.left-pad,side:1}
    ];
    for(const {start,end,side} of sides){
      const n=Math.min(COUNT_PER_SIDE,Math.max(0,Math.floor((end-start+GAP)/stride)));
      for(let i=0;i<n;i++){
        const x=side===-1?end-W-i*stride:start+i*stride;
        occupied.push({x,i,side});
      }
    }
    if(layer.childElementCount!==occupied.length){
      layer.replaceChildren();
      occupied.forEach((_,i)=>{
        const art=ART_ORDER[i];
        const slot=document.createElement('span');slot.className='november-skull';
        const thread=document.createElement('span');thread.className='november-skull-thread';
        const img=document.createElement('span');img.className='november-skull-art';
        img.style.setProperty('--skull-x',(art%3)*50+'%');
        img.style.setProperty('--skull-y',Math.floor(art/3)*100+'%');
        slot.append(thread,img);layer.appendChild(slot);
      });
    }
    Array.from(layer.children).forEach((slot,i)=>{
      const p=occupied[i];
      slot.style.left=p.x+'px';
      slot.style.setProperty('--skull-rope',(p.i===1?16:p.i===2?9:12)+'px');
      slot.style.setProperty('--skull-tilt',(p.side*(p.i===1?1.8:.6))+'deg');
      slot.style.setProperty('--skull-period',(3.05+(i%3)*.34)+'s');
      slot.style.setProperty('--skull-delay',(-i*.27)+'s');
    });
  }
  function overlaps(x,flagWidth=50){
    return occupied.some(({x:sk})=>x<sk+W+5 && x+flagWidth>sk-5);
  }
  return {layout,overlaps,getCount:()=>occupied.length,dispose:()=>layer.remove()};
}
