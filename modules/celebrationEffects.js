/* Decorative celebrations only. No patient data or Firestore access. */
let current=null,generation=0,audio=null;
const soundNodes=new Set(),root=new URL('../assets/celebrations/',import.meta.url),build=String(window.CensoBuild?.version||'2.74');
function versioned(path){const url=new URL(path,root);url.searchParams.set('v',build);return url.href;}
export async function unlockCelebrationAudio(){if(localStorage.getItem('censo-celebration-sound')!=='on')return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')await audio.resume();}catch{}}
export function initCelebrationAudio(){if(initCelebrationAudio.installed)return;initCelebrationAudio.installed=true;document.addEventListener('pointerdown',unlockCelebrationAudio,{passive:true});document.addEventListener('keydown',unlockCelebrationAudio);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCelebration();});window.addEventListener('pagehide',stopCelebration);}
function batSound(){if(localStorage.getItem('censo-celebration-sound')!=='on'||audio?.state!=='running')return;const now=audio.currentTime;for(let i=0;i<18;i++){const osc=audio.createOscillator(),gain=audio.createGain(),start=now+i*.15;osc.type=i%3===0?'triangle':'sine';const freq=i%3===0?120:1800+Math.random()*1700;osc.frequency.setValueAtTime(freq,start);osc.frequency.exponentialRampToValueAtTime(freq*.55,start+.09);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(i%3===0?.035:.018,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+.11);osc.connect(gain);gain.connect(audio.destination);soundNodes.add(osc);osc.onended=()=>{soundNodes.delete(osc);osc.disconnect();gain.disconnect();};osc.start(start);osc.stop(start+.12);}}
export function stopCelebration(){generation++;if(current){clearTimeout(current.timer);cancelAnimationFrame(current.raf);for(const a of current.animations||[])a.cancel();current.layer.remove();current=null;}for(const n of soundNodes){try{n.stop();}catch{}}soundNodes.clear();}
function layer(){const el=document.createElement('div');el.setAttribute('aria-hidden','true');Object.assign(el.style,{position:'fixed',inset:'0',zIndex:'95',pointerEvents:'none',overflow:'hidden'});document.body.appendChild(el);current={layer:el,animations:[]};return current;}
export async function launchCelebration(kind,settings={}){
 stopCelebration();if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const token=generation,session=layer(),duration=kind==='bats'?3000:5000;
 try{
  if(kind==='fireworks'){
   const iframe=document.createElement('iframe');iframe.title='Celebración';iframe.setAttribute('aria-hidden','true');iframe.tabIndex=-1;Object.assign(iframe.style,{width:'100%',height:'100%',border:'0',pointerEvents:'none'});
   await new Promise((resolve,reject)=>{session.timer=setTimeout(()=>reject(Error('Tiempo de carga agotado')),8000);iframe.onload=()=>{clearTimeout(session.timer);iframe.contentWindow?.labFireworks?resolve():reject(Error('Motor no disponible'));};iframe.src=versioned('vendor/caleb/frame.html');session.layer.appendChild(iframe);});
   if(token!==generation)return;iframe.contentWindow.labFireworks.start({shell:'crossette',duration:5,count:150,size:1,x:settings.origin?.x??.5});
  }else if(kind==='balloons'){
   const {BalloonArtwork}=await import(versioned('vendor/balloons/artwork.js'));if(token!==generation)return;
   const defs=document.createElement('div');defs.innerHTML=BalloonArtwork.svgFiltersHtml;Object.assign(defs.style,{width:'0',height:'0',overflow:'hidden'});session.layer.appendChild(defs);
   const colors=[['#ffec37ee','#f8b13dff'],['#f89640ee','#c03940ff'],['#3bc0f0ee','#0075bcff'],['#b0cb47ee','#3d954bff'],['#cf85b8ee','#a3509dff']],count=Math.max(7,Math.min(15,Math.round(innerWidth/110)));
   for(let i=0;i<count;i++){const width=Math.min(innerWidth,innerHeight)*(.12+Math.random()*.07),color=colors[i%5],balloon=BalloonArtwork.createBallonElement({balloonColor:color[1],lightColor:color[0],width});session.layer.appendChild(balloon);const x=(i+.5)/count*innerWidth,drift=(Math.random()-.5)*120,tilt=8+Math.random()*8,transform=(xx,y,a)=>`translate(-50%,0) translate(${xx}px,${y}px) rotate(${a}deg)`;session.animations.push(balloon.animate([{transform:transform(x,innerHeight,tilt),opacity:0},{transform:transform(x+drift*.3,innerHeight*.65,-tilt),opacity:1,offset:.2},{transform:transform(x+drift*.7,0,tilt),opacity:1,offset:.7},{transform:transform(x+drift,-width*3,-tilt),opacity:0}],{duration,fill:'both',easing:'linear'}));}
  }else if(kind==='bats'){
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),dpr=Math.min(devicePixelRatio||1,2),w=innerWidth,h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;Object.assign(canvas.style,{width:'100%',height:'100%'});session.layer.appendChild(canvas);ctx.scale(dpr,dpr);
   const image=new Image();image.src=new URL('../assets/seasonal/bats.png',import.meta.url).href;const ox=(settings.origin?.x??.5)*w,oy=(settings.origin?.y??.6)*h,start=performance.now();
   const bats=Array.from({length:14},(_,i)=>({angle:-Math.PI/2+(Math.random()-.5)*Math.PI*1.7,speed:100+Math.random()*160,size:35+Math.random()*20,phase:Math.random()*5,red:i===0}));batSound();
   const draw=now=>{if(token!==generation)return;const t=Math.min(1,(now-start)/duration);ctx.clearRect(0,0,w,h);ctx.globalAlpha=Math.min(1,(1-t)*4);ctx.imageSmoothingEnabled=false;for(const b of bats){const x=ox+Math.cos(b.angle)*b.speed*t*3,y=oy+Math.sin(b.angle)*b.speed*t*3+Math.sin(t*8+b.phase)*15;if(image.complete&&image.naturalWidth)ctx.drawImage(image,(Math.floor((now-start)/1000*12+b.phase)%5)*16,b.red?0:24,16,24,x-b.size/2,y-b.size*.75,b.size,b.size*1.5);}if(t<1)session.raf=requestAnimationFrame(draw);};session.raf=requestAnimationFrame(draw);
  }
  if(token!==generation)return;session.timer=setTimeout(()=>{if(token===generation)stopCelebration();},duration);
 }catch(error){if(token!==generation)return;stopCelebration();console.warn('[CENSO] Celebración no disponible:',error);if(typeof window.confetti==='function')window.confetti({...settings,disableForReducedMotion:true});}
}
