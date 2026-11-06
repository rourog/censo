/* User-selected Mixkit effects. Local assets, shared sound preference, bounded voices. */
export const AMBULANCE_DURATION_MS=13255.9410430839;
const ROOT=new URL('../../../assets/themes/christmas/audio/',import.meta.url);
const SOURCES={bulb:{file:'bulb-glitch.mp3',volume:.35},tree:{file:'tree-shake.mp3',volume:.4},
  gift:{file:'gift-reveal.mp3',volume:.35},ambulance:{file:'ambulance-arrival.mp3',volume:.3}};
export function createChristmasAudio(env=globalThis){
  const active=new Set(),prepared=new Map(),lastPlayed=new Map();let disposed=false,monitor=0;
  const enabled=()=>{try{return !disposed&&!env.document.hidden&&env.localStorage.getItem('censo-celebration-sound')==='on';}catch{return false;}};
  function release(voice){
    if(voice.stopped)return;voice.stopped=true;voice.pending=false;
    voice.media.onended=null;voice.media.onerror=null;voice.media.pause();active.delete(voice);
    if(!active.size&&monitor){env.clearInterval(monitor);monitor=0;}
  }
  function stop(){for(const voice of [...active])release(voice);}
  function check(){if(!enabled())stop();}
  function prepare(){
    if(!enabled())return;
    for(const [kind,source] of Object.entries(SOURCES))if(!prepared.has(kind)){
      try{const media=new env.Audio(new URL(source.file,ROOT).href);media.preload='auto';media.load();prepared.set(kind,media);}catch{}
    }
  }
  function play(kind){
    if(!SOURCES[kind]||!enabled())return null;
    const now=env.performance.now();if(now-(lastPlayed.get(kind)??-Infinity)<80)return null;
    lastPlayed.set(kind,now);
    try{
      prepare();const base=prepared.get(kind);if(!base)return null;
      for(const voice of [...active])if(voice.kind===kind)release(voice);
      if(active.size>=4){const old=[...active].find(v=>v.kind!=='ambulance');if(old)release(old);else return null;}
      const media=base.cloneNode(true);media.volume=SOURCES[kind].volume;
      const voice={kind,media,pending:true,stopped:false};active.add(voice);
      const handle={get pending(){return voice.pending;},
        get elapsedMs(){return voice.stopped?null:media.currentTime*1000;},
        get durationMs(){return Number.isFinite(media.duration)&&media.duration>0?media.duration*1000:AMBULANCE_DURATION_MS;},
        stop(){release(voice);}};
      // Keep the final clock sample through the last animation frame.
      media.onended=()=>{voice.pending=false;active.delete(voice);if(!active.size&&monitor){env.clearInterval(monitor);monitor=0;}};
      media.onerror=()=>release(voice);
      if(!monitor)monitor=env.setInterval(check,100);
      Promise.resolve(media.play()).then(()=>{voice.pending=false;if(!enabled())release(voice);}).catch(()=>release(voice));
      return handle;
    }catch{return null;}
  }
  env.document.addEventListener('visibilitychange',check);env.addEventListener('pagehide',stop);env.addEventListener('storage',check);
  prepare();
  return {play,stop,prepare,getStatus:()=>({enabled:enabled(),voices:active.size,ambulanceTimeMs:[...active].find(v=>v.kind==='ambulance')?.media.currentTime*1000||0}),
    dispose(){if(disposed)return;disposed=true;stop();prepared.clear();
      env.document.removeEventListener('visibilitychange',check);env.removeEventListener('pagehide',stop);env.removeEventListener('storage',check);}};
}
