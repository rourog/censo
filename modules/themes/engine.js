/* Seasonal Engine 2.0 - manages lifecycle, not patient data. */
import {getSeasonalConfiguration,getRegisteredSeasons,loadSeasonController} from './registry.js';
import {isDecorationEnabled,setDecorationEnabled,getPreviewSeason,setPreviewSeason} from './preferences.js';

export function createSeasonalEngine(app,{onChange=()=>{}}={}) {
  let active=null,controller=null,generation=0,timer=0,started=false,disposed=false;
  let latestPatients=Array.isArray(app.state?.pacientesGlobal)?app.state.pacientesGlobal:[];
  const emit=()=>{onChange(active);document.dispatchEvent(new CustomEvent('censo:enginechange',{detail:{season:active?.id||null}}));};

  async function sync() {
    if(disposed)return;
    const season=getSeasonalConfiguration();
    if((active?.id||null)===(season?.id||null) && (!!controller === !!season))return;
    const token=++generation;
    if(controller){
      try{controller.dispose?.();}catch(error){console.warn('[SeasonalEngine] Cleanup failed:',error);}
      controller=null;active=null;
    }
    if(!season){emit();return;}
    try {
      const next=await loadSeasonController(season,app);
      if(disposed || token!==generation || getSeasonalConfiguration()?.id!==season.id){
        next?.dispose?.();
        return;
      }
      controller=next||null;
      active=controller?season:null;
      controller?.syncPatients?.(latestPatients);
      emit();
    }catch(error){
      if(token===generation){active=null;controller=null;emit();}
      console.error('[SeasonalEngine] Unable to start season:',error);
    }
  }

  function syncPatients(patients=[]) {
    latestPatients=Array.isArray(patients)?patients:[];
    controller?.syncPatients?.(latestPatients);
  }

  function setEnabled(enabled) {
    setDecorationEnabled(enabled);
    return sync();
  }
  function setPreview(id='auto') {
    if(id!=='auto' && !getRegisteredSeasons().some(item=>item.id===id))return Promise.resolve();
    setPreviewSeason(id);
    return sync();
  }
  function start() {
    if(started||disposed)return Promise.resolve();
    started=true;
    timer=window.setInterval(()=>{if(!document.hidden)void sync();},60000);
    document.addEventListener('visibilitychange',onVisible);
    window.addEventListener('focus',onVisible);
    window.addEventListener('storage',onStorage);
    return sync();
  }
  function onVisible(){if(!document.hidden)void sync();}
  function onStorage(event){if(!event.key || event.key.startsWith('censo-seasonal-') || event.key==='censo-november-theme')void sync();}
  function stop() {
    if(disposed)return;
    disposed=true;++generation;
    clearInterval(timer);
    document.removeEventListener('visibilitychange',onVisible);
    window.removeEventListener('focus',onVisible);
    window.removeEventListener('storage',onStorage);
    controller?.dispose?.();controller=null;active=null;
  }
  return {
    start,stop,sync,syncPatients,setEnabled,setPreview,
    getStatus:()=>({engine:'2.0',activeSeason:active?.id||null,calendarSeason:getSeasonalConfiguration()?.id||null,
      enabled:isDecorationEnabled('november'),preview:getPreviewSeason(),registered:getRegisteredSeasons().map(item=>item.id),
      controller:controller?.getStatus?.()||null})
  };
}
