/* Noviembre 2026 — flujo infinito de pétalos de cempasúchil.
 * Cinco planos cacheados: uno inmóvil y cuatro bandas que se desplazan
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
  // La onda es espacial: cada pétalo sigue una sinusoide real
  // definida por su coordenada X, no una franja uniforme de altura.
  // Tres ciclos por lienzo y distinta fase/profundidad para cada plano.
  function makeTile(count,sizeMin,sizeMax,alphaMin,alphaMax,center=.55,amplitude=.16,waves=2,phaseOffset=0){
    const tile=document.createElement('canvas');
    tile.width=Math.max(1,Math.ceil(width*dpr));
    tile.height=Math.max(1,Math.ceil(height*dpr));
    const g=tile.getContext('2d',{alpha:true});
    if(!g)return tile;
    g.setTransform(dpr,0,0,dpr,0,0);
    for(let i=0;i<count;i++){
      const x=random(0,width);
      const waveY=Math.sin((x/width)*Math.PI*2*waves+phaseOffset);
      const noise=random(-.075,.075)*height;
      const y=Math.max(2,Math.min(height-2,height*(center+amplitude*waveY)+noise));
      const size=random(sizeMin,sizeMax);
      const color=shade(),alpha=random(alphaMin,alphaMax),angle=random(-Math.PI,Math.PI);
      petal(g,x,y,size,color,alpha,angle);
      if(x<size)petal(g,x+width,y,size,color,alpha,angle);
      if(x>width-size)petal(g,x-width,y,size,color,alpha,angle);
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
    // Sinusoidales periódicas: 2 ciclos enteros por mosaico para
    // repetir sin saltos; velocidad y tamaño producen parallax.
    const unit=width/1000;
    still=makeTile(Math.round(24*unit),5,8,.09,.23,.72,.11,2,.3);
    layers=[
      {tile:makeTile(Math.round(80*unit),6,10,.24,.43,.37,.12,2,0),speed:20,offset:0,vertical:3,rate:.28},
      {tile:makeTile(Math.round(105*unit),7,12,.30,.51,.49,.14,2,1.1),speed:34,offset:width*.24,vertical:5,rate:.40},
      {tile:makeTile(Math.round(120*unit),8,15,.39,.61,.64,.17,2,2.2),speed:52,offset:width*.50,vertical:7,rate:.56},
      {tile:makeTile(Math.round(100*unit),10,17,.50,.76,.74,.12,2,3.3),speed:72,offset:width*.73,vertical:9,rate:.74}
    ];
    previous=0;
  }
  function strip(tile,offset,y=0){
    // Offset creciente desplaza el mosaico a la DERECHA;
    // repetición modular para scroll infinito sin cortes.
    const x=((offset%width)+width)%width;
    const tileHeight=tile.height/dpr;
    ctx.drawImage(tile,x-width,y,width,tileHeight);
    ctx.drawImage(tile,x,y,width,tileHeight);
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
