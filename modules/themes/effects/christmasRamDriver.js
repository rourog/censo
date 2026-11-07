/* Special RAM visitor: one reserved person slot, no clinical state. */
const SHEET=new URL('../../../assets/themes/christmas/scene/ram-doctor.webp',import.meta.url);
const FRAMES=[[14.66667,-18],[309.66667,-21],[604.16667,-17],[11.66667,276],[310.16667,276],[601.66667,276],[14.66667,572],[308.16667,572],[607.16667,572],[15.16667,867],[308.66667,863],[605.16667,867],[14.16667,1161],[308.16667,1161],[600.16667,1161],[2.66667,1458],[303.66667,1458],[605.16667,1458]];
const WALK=[0,1,2,1],WAVE=[12,13,14,15,16,15,16,17,12];
const SCALE=.65*50/63;
export function ramVisitTiming(geometry){
  const from=geometry.hospitalLeft+geometry.hospitalWidth*83/720;
  const to=geometry.hospitalLeft+geometry.hospitalWidth*224/720;
  const walkMs=Math.abs(to-from)/32*1000;
  return {walkMs,stopMs:600+walkMs+2400+walkMs+600};
}
export function createRamDriver(controls){
  const node=document.createElement('span');node.className='christmas-ambulance christmas-ram-driver';node.setAttribute('aria-hidden','true');node.hidden=true;
  node.style.backgroundImage='url("'+SHEET.href+'")';controls.append(node);
  let state='hidden',footprint=null;
  function hide(){node.hidden=true;state='hidden';footprint=null;}
  function paint(elapsed,geometry,timing){
    if(elapsed<0||elapsed>=timing.stopMs){hide();return;}
    const from=geometry.hospitalLeft+geometry.hospitalWidth*83/720,to=geometry.hospitalLeft+geometry.hospitalWidth*224/720;
    let x=from,index=1,opacity=1,shrink=1,t=elapsed;
    if(t<600){state='getting-out';opacity=t/600;shrink=.85+.15*opacity;}
    else if((t-=600)<timing.walkMs){state='walking-to-door';x=from+(to-from)*t/timing.walkMs;index=6+WALK[Math.floor(t/145)%4];}
    else if((t-=timing.walkMs)<2400){state='waving';x=to;index=WAVE[Math.min(8,Math.floor(t/2400*9))];}
    else if((t-=2400)<timing.walkMs){state='returning';x=to+(from-to)*t/timing.walkMs;index=3+WALK[Math.floor(t/145)%4];}
    else{t-=timing.walkMs;state='getting-in';opacity=1-t/600;shrink=.85+.15*opacity;}
    // Walk diagonally from the parked vehicle onto the raised pedestrian plane.
    const progress=to===from?0:Math.max(0,Math.min(1,(x-from)/(to-from)));
    const ground=(geometry.parkingBottom??geometry.bottom)+(geometry.bottom-(geometry.parkingBottom??geometry.bottom))*progress;
    footprint={x,ground:ground+4,halfWidth:11,lane:0};
    const factor=108/300*SCALE,[left,top]=FRAMES[index];
    node.style.width=(96*SCALE)+'px';node.style.height=(108*SCALE)+'px';node.style.left=(x-48*SCALE)+'px';node.style.bottom=(ground+4)+'px';
    node.style.backgroundSize=(887*factor)+'px '+(1774*factor)+'px';node.style.backgroundPosition=(-left*factor)+'px '+(-top*factor)+'px';
    node.style.transformOrigin='50% 100%';node.style.transform='scale('+shrink+')';node.style.opacity=String(Math.max(0,Math.min(1,opacity)));node.hidden=false;
  }
  return {paint,hide,getFootprint:()=>footprint?[footprint]:[],getStatus:()=>({ramDriver:state,ramDriverVisible:!node.hidden}),dispose(){hide();node.remove();}};
}
