/* Noviembre 2026 — flujo infinito de pétalos de cempasúchil.
 * Cuatro planos cacheados: uno inmóvil y tres bandas que se desplazan
 * horizontalmente en bucle, con vaivén vertical. Un solo canvas visible,
 * sin partículas DOM ni lecturas/escrituras de pacientes.
 */
export function createNovemberPetalField() {
  const parent=document.querySelector('.desktop-waves-bg');
  if(!parent || !window.matchMedia('(min-width:768px)').matches) return {dispose(){}};
  const canvas=document.createElement('canvas');
  canvas.className='november-petal-field';
  canvas.setAttribute('aria-hidden','true');
  parent.appendChild(canvas);
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx){canvas.remove();return {dispose(){}};}
  let width=1,height=1,dpr=1,frame=0,previous=0,alive=true,layers=[],still=null,phase=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const colors=['#facc15','#f59e0b','#fde047','#ffb52b','#fbbf24','#ffd66b','#fbb536'];
  const random=(a,b)=>a+Math.random()*(b-a);
  const shade=()=>colors[Math.floor(Math.random()*colors.length)];
  function petal(g,x,y,size,color,alpha,angle){
    g.save();
    g.translate(x,y);g.rotate(angle);g.globalAlpha=alpha;g.fillStyle=color;
    g.beginPath();
    g.moveTo(-size*.52,0);
    g.quadraticCurveTo(-size*.08,-size*.48,size*.54,-size*.14);
    g.quadraticCurveTo(size*.78,size*.10,size*.28,size*.38);
    g.quadraticCurveTo(-size*.16,size*.40,-size*.52,0);
    g.fill();
    g.restore();
  }
  function makeTile(count,sizeMin,sizeMax,alphaMin,alphaMax){
    const tile=document.createElement('canvas');
    tile.width=Math.max(1,Math.ceil(width*dpr));
    tile.height=Math.max(1,Math.ceil(height*dpr));
    const g=tile.getContext('2d',{alpha:true});
    if(!g)return tile;
    g.setTransform(dpr,0,0,dpr,0,0);
    for(let i=0;i<count;i++){
      const x=random(0,width),y=random(-4,height+4),s=random(sizeMin,sizeMax);
      const color=shade(),alpha=random(alphaMin,alphaMax),angle=random(-Math.PI,Math.PI);
      petal(g,x,y,s,color,alpha,angle);
      // La misma figura aparece al otro extremo cuando toca el borde,
      // de modo que los mosaicos continúan sin saltos.
      if(x<s) petal(g,x+width,y,s,color,alpha,angle);
      if(x>width-s) petal(g,x-width,y,s,color,alpha,angle);
    }
    return tile;
  }
  function redraw(){
    const rect=parent.getBoundingClientRect();
    width=Math.max(1,rect.width);height=Math.max(1,rect.height);
    dpr=Math.min(window.devicePixelRatio||1,1.25);
    canvas.width=Math.max(1,Math.ceil(width*dpr));
    canvas.height=Math.max(1,Math.ceil(height*dpr));
    canvas.style.width=width+'px';canvas.style.height=height+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    // Densidad alta: de ~145 pétalos en 768 px a ~350 en 1920 px.
    const unit=width/1000;
    still=makeTile(Math.round(36*unit),5,9,.12,.28);
    layers=[
      {tile:makeTile(Math.round(84*unit),6,12,.23,.42),speed:15,offset:0,vertical:3,rate:.40},
      {tile:makeTile(Math.round(104*unit),8,15,.32,.58),speed:-24,offset:width*.34,vertical:5,rate:.65},
      {tile:makeTile(Math.round(62*unit),10,18,.48,.74),speed:38,offset:width*.72,vertical:8,rate:.82}
    ];
    previous=0;
  }
  function strip(tile,offset,y=0){
    const x=((-offset%width)+width)%width;
    const tileHeight=tile.height/dpr;
    ctx.drawImage(tile,-x,y,width,tileHeight);
    ctx.drawImage(tile,width-x,y,width,tileHeight);
  }
  function paint(now){
    if(!alive)return;
    frame=requestAnimationFrame(paint);
    if(document.hidden || reduced.matches || document.body.classList.contains('effect-none') ||
       !document.body.classList.contains('november-theme')){previous=0;return;}
    if(previous && now-previous<33)return;
    const dt=Math.min(.05,previous?(now-previous)/1000:.033);
    previous=now;phase+=dt;
    ctx.clearRect(0,0,width,height);
    if(still)ctx.drawImage(still,0,0,width,height);
    for(const layer of layers){
      layer.offset=(layer.offset+layer.speed*dt+width)%width;
      const vertical=Math.sin(phase*layer.rate*Math.PI*2)*layer.vertical;
      strip(layer.tile,layer.offset,vertical);
    }
  }
  const ro=new ResizeObserver(redraw);ro.observe(parent);
  const onVisibility=()=>{previous=0;if(document.hidden)ctx.clearRect(0,0,width,height);};
  document.addEventListener('visibilitychange',onVisibility);
  redraw();frame=requestAnimationFrame(paint);
  return {dispose(){
    alive=false;cancelAnimationFrame(frame);ro.disconnect();
    document.removeEventListener('visibilitychange',onVisibility);
    layers=[];still=null;canvas.remove();
  }};
}
