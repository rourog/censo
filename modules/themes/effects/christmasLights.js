/* Seasonal Engine 2.0: 30 fixed bulbs (15 per side).
 * Active bulbs represent patients. No Firestore access or clinical writes.
 */
const PER_SIDE = 15;
const TOTAL_BULBS = PER_SIDE * 2;
const POINTER_RADIUS = 90;
const OVERLOAD_TIME = 1500;
export function getChristmasLightEnergy(distance,radius=POINTER_RADIUS){
  const value=Math.max(0,Math.min(1,1-distance/radius));
  return value*value*(3-2*value);
}
// Colors belong to physical bulbs, so even patients from one area yield a varied string.
const BULB_COLORS = ['#ff303f','#ffd12e','#248bff','#21e87a','#ac50ff','#ff841f'];
const GARLAND_SWAGS = 3;
const GARLAND_TOP = 7;
const GARLAND_SAG = 15;
function garlandY(progress){
  const phase=progress>=1?0:(progress*GARLAND_SWAGS)%1;
  return GARLAND_TOP+4*GARLAND_SAG*phase*(1-phase);
}
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
  const heat=new Map();
  let pointer=null,energyFrame=0,lastEnergyTime=null;
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
    const signature=patients.map(patientId).sort().join('|');
    const key=JSON.stringify(layout);
    patientSignature=signature;
    if(key===renderKey)return;
    renderKey=key;
    stopPointerEnergy();
    root.replaceChildren();
    if(!layout)return;
    const garland=document.createElementNS('http://www.w3.org/2000/svg','svg');
    garland.classList.add('christmas-garland');
    garland.setAttribute('aria-hidden','true');
    garland.setAttribute('focusable','false');
    for(const side of [layout.left,layout.right]){
      const start=side[0],end=side[PER_SIDE-1],span=(end-start)/GARLAND_SWAGS;
      let curve='M '+start+' '+GARLAND_TOP;
      for(let i=0;i<GARLAND_SWAGS;i++){
        curve+=' Q '+(start+span*(i+.5))+' '+(GARLAND_TOP+GARLAND_SAG*2)
          +' '+(start+span*(i+1))+' '+GARLAND_TOP;
      }
      const addPath=(className,d)=>{
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('class',className);path.setAttribute('d',d);garland.append(path);
      };
      addPath('christmas-garland-edge',curve);
      addPath('christmas-garland-green',curve);
      // Pointed leaves and fine veins follow the tangent of each U-shaped swag.
      let darkLeaves='',lightLeaves='',veins='';
      const count=Math.ceil((end-start)/9);
      for(let i=0;i<=count;i++){
        const progress=i/count,x=start+(end-start)*progress,y=garlandY(progress);
        const phase=progress>=1?0:(progress*GARLAND_SWAGS)%1;
        const slope=4*GARLAND_SAG*GARLAND_SWAGS*(1-2*phase)/(end-start);
        const length=Math.hypot(1,slope),tx=1/length,ty=slope/length;
        for(const sign of [-1,1]){
          const size=6+(i%3)*.55;
          const tipX=x+tx*4-ty*sign*size,tipY=y+ty*4+tx*sign*size;
          const midX=(x+tipX)/2,midY=(y+tipY)/2;
          const dx=tipX-x,dy=tipY-y,norm=Math.hypot(dx,dy);
          const px=-dy/norm*2.1,py=dx/norm*2.1;
          const leaf=' M '+x+' '+y+' Q '+(midX+px)+' '+(midY+py)+' '+tipX+' '+tipY
            +' Q '+(midX-px)+' '+(midY-py)+' '+x+' '+y+' Z';
          if((i+(sign>0?1:0))%2)lightLeaves+=leaf;else darkLeaves+=leaf;
          veins+=' M '+x+' '+y+' L '+tipX+' '+tipY;
        }
      }
      addPath('christmas-garland-leaves-dark',darkLeaves);
      addPath('christmas-garland-leaves-light',lightLeaves);
      addPath('christmas-garland-veins',veins);
    }
    root.append(garland);
    const positions=[];
    for(let i=0;i<PER_SIDE;i++){
      const top=garlandY(i/(PER_SIDE-1))+4;
      positions.push({x:layout.left[i],top},{x:layout.right[i],top});
    }
    positions.forEach((position,index)=>{
      const bulb=document.createElement('button');
      bulb.type='button';
      bulb.className='christmas-bulb is-idle';
      bulb.style.left=(position.x-layout.bulbSize/2)+'px';
      bulb.style.top=position.top+'px';
      bulb.style.setProperty('--bulb-size',layout.bulbSize+'px');
      bulb.style.setProperty('--sway-delay',(-((index*.61)%5.7))+'s');
      bulb.style.setProperty('--glow-delay',(-((index*.79)%1.6))+'s');
      bulb.style.setProperty('--pulse-delay',(-((index*1.37)%.95))+'s');
      setBulbColor(bulb,BULB_COLORS[index%BULB_COLORS.length]);
      labelBulb(bulb);
      root.append(bulb);
    });
    updateIllumination();
  }
  function setBulbColor(bulb,color){
    bulb.dataset.color=color;
    bulb.style.setProperty('--bulb-color',color);
    bulb.style.setProperty('--bulb-glow',color+'b3');
  }
  function labelBulb(bulb){
    bulb.setAttribute('aria-label',bulb.classList.contains('is-off')
      ?'Foco roto; se repondrá en un momento'
      :bulb.classList.contains('is-lit')
        ?'Foco encendido por paciente. Romper foco'
        :'Acercar el cursor para dar energía. Mantenerlo encima para sobrecargar, o romper con clic');
  }
  function updateIllumination(){
    if(disposed)return;
    const ids=patients.map(patientId).sort();
    const seed=ids.join('|')||'sin-pacientes';
    const shuffled=shuffledSlots(seed+'|'+shuffleStep);
    const lit=new Set(shuffled.slice(0,Math.min(ids.length,TOTAL_BULBS)));
    root.querySelectorAll('.christmas-bulb').forEach((bulb,index)=>{
      bulb.classList.toggle('is-lit',lit.has(index));
      bulb.classList.toggle('is-idle',!lit.has(index));
      // Patient assignments change without resetting a break or pointer/focus state.
      setBulbColor(bulb,BULB_COLORS[index%BULB_COLORS.length]);
      labelBulb(bulb);
    });
  }
  function extinguish(bulb){
    if(bulb.classList.contains('is-off'))return;
    const fractureColor=bulb.dataset.pointerTint||bulb.dataset.color;
    resetBulbEnergy(bulb);
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
        node.style.setProperty('--fragment-color',fractureColor);
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
  function resetBulbEnergy(bulb){
    heat.delete(bulb);
    bulb.classList.remove('has-pointer-energy');
    for(const property of ['--pointer-strength','--pointer-tint','--pointer-glow','--pointer-halo','--pointer-spread']){
      bulb.style.removeProperty(property);
    }
    delete bulb.dataset.pointerTint;
  }
  function stopPointerEnergy(){
    pointer=null;lastEnergyTime=null;
    if(energyFrame)cancelAnimationFrame(energyFrame);
    energyFrame=0;
    root.querySelectorAll('.christmas-bulb').forEach(resetBulbEnergy);
  }
  function updatePointerEnergy(timestamp){
    energyFrame=0;
    if(disposed||document.hidden||!pointer){stopPointerEnergy();return;}
    const elapsed=lastEnergyTime===null?0:Math.min(50,Math.max(0,timestamp-lastEnergyTime));
    lastEnergyTime=timestamp;
    // Batch all layout reads before changing bulb styles.
    const positions=Array.from(root.querySelectorAll('.christmas-bulb'),bulb=>({
      bulb,rect:bulb.getClientRects().length?bulb.getBoundingClientRect():null
    }));
    let focusBulb=null,nearestDistance=Infinity;
    for(const {bulb,rect} of positions){
      if(!rect)continue;
      const distance=Math.hypot(pointer.x-rect.left-rect.width/2,pointer.y-rect.top-rect.height/2);
      if(distance<=14&&distance<nearestDistance){focusBulb=bulb;nearestDistance=distance;}
    }
    for(const {bulb,rect} of positions){
      if(!rect||bulb.classList.contains('is-off')){resetBulbEnergy(bulb);continue;}
      const distance=Math.hypot(pointer.x-rect.left-rect.width/2,pointer.y-rect.top-rect.height/2);
      const strength=getChristmasLightEnergy(distance);
      if(strength<.005){resetBulbEnergy(bulb);continue;}
      // Only direct, sustained exposure can break a bulb; nearby bulbs merely glow.
      const currentHeat=heat.get(bulb)||0;
      const nextHeat=bulb===focusBulb?currentHeat+elapsed:Math.max(0,currentHeat-elapsed*2);
      heat.set(bulb,nextHeat);
      const core=Math.max(0,(strength-.65)/.35);
      const green=Math.round(203+52*core),blue=Math.round(65+190*core);
      const tint='rgb(255,'+green+','+blue+')';
      bulb.dataset.pointerTint=tint;
      bulb.classList.add('has-pointer-energy');
      bulb.style.setProperty('--pointer-strength',strength.toFixed(3));
      bulb.style.setProperty('--pointer-tint',tint);
      bulb.style.setProperty('--pointer-glow','rgba(255,'+green+','+blue+',.85)');
      bulb.style.setProperty('--pointer-halo','rgba(255,'+green+','+blue+',.45)');
      bulb.style.setProperty('--pointer-spread',(12+strength*12+Math.min(1,nextHeat/OVERLOAD_TIME)*8)+'px');
      if(nextHeat>=OVERLOAD_TIME)extinguish(bulb);
    }
    if(pointer&&!disposed)energyFrame=requestAnimationFrame(updatePointerEnergy);
  }
  const onMove=event=>{
    if(event.pointerType==='touch'||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
    pointer={x:event.clientX,y:event.clientY};
    if(!energyFrame)energyFrame=requestAnimationFrame(updatePointerEnergy);
  };
  const onVisibility=()=>{if(document.hidden)stopPointerEnergy();};
  const handlers={click:onClick};
  for(const [type,handler] of Object.entries(handlers))root.addEventListener(type,handler);
  header.addEventListener('pointermove',onMove,{passive:true});
  header.addEventListener('pointerleave',stopPointerEnergy);
  header.addEventListener('pointercancel',stopPointerEnergy);
  document.addEventListener('visibilitychange',onVisibility);
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
      const signature=patients.map(patientId).sort().join('|');
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
      disposed=true;stopPointerEnergy();
      for(const id of timers)clearTimeout(id);timers.clear();
      observer.disconnect();
      for(const [type,handler] of Object.entries(handlers))root.removeEventListener(type,handler);
      header.removeEventListener('pointermove',onMove);
      header.removeEventListener('pointerleave',stopPointerEnergy);
      header.removeEventListener('pointercancel',stopPointerEnergy);
      document.removeEventListener('visibilitychange',onVisibility);
      root.remove();
    }
  };
}
