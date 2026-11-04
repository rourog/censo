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
  const colors=['#facc15','#f59e0b','#fde047','#ffb52b','#fbbf24','#ffd66b','#fbb536','#f97316','#fb923c','#ff8c1a','#ffa43a','#fdba74'];
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
  // El borde SUPERIOR es sinusoidal. Debajo de ese borde, cada capa
  // contiene pétalos en toda su profundidad, hasta el pie del lienzo.
  // Al ser un mosaico periódico, la onda avanza sin cortes.
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
      const upper=Math.max(0,Math.min(height-2,height*(center+amplitude*waveY)));
      // Distribución en todo el bloque bajo la cresta; una proporción
      // moderada se concentra cerca del borde para dibujar la onda.
      const depth=Math.random()<.32?Math.pow(Math.random(),2)*.24:Math.random();
      const y=upper+(height-upper)*depth;
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
    still=makeTile(Math.round(65*unit),5,8,.09,.23,.72,.13,2,.3);
    layers=[
      {tile:makeTile(Math.round(185*unit),6,10,.22,.41,.37,.145,2,0),speed:40,offset:0,vertical:4,rate:.34},
      {tile:makeTile(Math.round(215*unit),7,12,.28,.49,.49,.17,2,1.1),speed:68,offset:width*.24,vertical:6,rate:.48},
      {tile:makeTile(Math.round(220*unit),8,15,.37,.59,.64,.20,2,2.2),speed:104,offset:width*.50,vertical:8,rate:.66},
      {tile:makeTile(Math.round(170*unit),10,17,.48,.74,.74,.15,2,3.3),speed:144,offset:width*.73,vertical:10,rate:.86}
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
  return {getStatus(){return {revision:'wind-v3.08',running:alive&&!document.hidden&&!reduced.matches&&!document.body.classList.contains('effect-none'),width,layerSpeeds:layers.map(layer=>layer.speed),layerOffsets:layers.map(layer=>Math.round(layer.offset))};},dispose(){
    alive=false;cancelAnimationFrame(frame);ro.disconnect();
    document.removeEventListener('visibilitychange',onVisibility);
    layers=[];still=null;canvas.remove();
  }};
}
