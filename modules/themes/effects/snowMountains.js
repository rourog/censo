/* Three stationary sinusoidal snow bands with phase offsets.
 * Pure SVG: no per-frame animation, observers or clinical data.
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
  svg.setAttribute('focusable','false');
  svg.setAttribute('aria-hidden','true');
  const layers=[
    {base:176,amplitude:11,cycles:2.1,phase:0.25,fill:'#8dbbdc',opacity:.32},
    {base:196,amplitude:13,cycles:2.1,phase:1.05,fill:'#bfdef4',opacity:.55},
    {base:215,amplitude:10,cycles:2.1,phase:1.88,fill:'#f8fcff',opacity:.82}
  ];
  for(const layer of layers){
    const path=document.createElementNS(SVG_NS,'path');
    path.setAttribute('d',sinePath(layer));
    path.setAttribute('fill',layer.fill);
    path.setAttribute('fill-opacity',String(layer.opacity));
    svg.append(path);
  }
  wrapper.append(svg);
  host.append(wrapper);
  return {
    getStatus:()=>({layers:layers.length,animated:false,shape:'sinusoidal'}),
    dispose(){wrapper.remove();}
  };
}
