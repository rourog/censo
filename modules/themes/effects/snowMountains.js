import {ROAD_HEIGHT} from './christmasStageLayout.js?v=3.71.0';
/* Three opaque stationary sinusoidal snow bands with phase offsets.
 * Two rear SVG bands, a village slot, then the closest SVG band. No per-frame work or clinical data.
 */
const SVG_NS='http://www.w3.org/2000/svg';
function sinePath({width=1200,height=240,base,amplitude,cycles,phase}){
  const points=[];
  for(let x=0;x<=width;x+=12){
    const y=base+Math.sin((x/width)*cycles*Math.PI*2+phase)*amplitude;
    points.push((x===0?'M':'L')+x+' '+y.toFixed(2));
  }
  return points.join(' ')+' L'+width+' '+height+' L0 '+height+' Z';
}
export function createSnowMountains(host){
  if(!host)return {dispose(){},getStatus:()=>({layers:0})};
  const wrapper=document.createElement('div');
  wrapper.className='christmas-snow-mountains';
  wrapper.setAttribute('aria-hidden','true');
  const svg=document.createElementNS(SVG_NS,'svg');
  svg.setAttribute('viewBox','0 0 1200 240');
  svg.setAttribute('preserveAspectRatio','none');
  // Highest rear crest aligns with hospital roof + the raised road plane.
  // Match the shared hospital-width formula without resize handlers or sprite scaling.
  svg.style.top='auto';svg.style.bottom='0px';
  svg.style.height='calc((min(720px, 48vw, calc(52vw - 108px)) * 115 / 720 + '+ROAD_HEIGHT+'px) * 4 / 3)';
  svg.setAttribute('focusable','false');
  svg.setAttribute('aria-hidden','true');
  const foreground=svg.cloneNode(false);
  foreground.setAttribute('viewBox','0 0 1200 24');
  foreground.style.top='auto';foreground.style.bottom=(ROAD_HEIGHT-7)+'px';foreground.style.height='14px';
  const villageHost=document.createElement('div');villageHost.className='christmas-village';
  const layers=[
    {base:104,amplitude:44,cycles:2.1,phase:0.25,fill:'#8dbbdc'},
    {base:139,amplitude:35,cycles:2.1,phase:1.05,fill:'#bfdef4'},
    {base:9,amplitude:3,cycles:2.1,phase:1.88,fill:'#f8fcff',height:24}
  ];
  for(const [index,layer] of layers.entries()){
    const path=document.createElementNS(SVG_NS,'path');
    path.setAttribute('d',sinePath(layer));
    path.setAttribute('fill',layer.fill);
    path.setAttribute('fill-opacity','1');
    (index===layers.length-1?foreground:svg).append(path);
  }
  foreground.classList.add('christmas-snow-foreground');
  wrapper.append(svg,villageHost,foreground);
  host.append(wrapper);
  return {
    villageHost,
    getStatus:()=>({layers:layers.length,animated:false,shape:'sinusoidal'}),
    dispose(){wrapper.remove();}
  };
}
