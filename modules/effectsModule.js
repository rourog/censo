import { createPlexusController } from './plexus.js?v=bulk-reset-v1-20260722';

/*
  MÓDULO: effectsModule.js

  RESPONSABILIDAD:
  - Animación plexus del encabezado.
  - Easter eggs visuales y soundboard.

  NO DEBE:
  - Tocar Firebase.
  - Modificar datos clínicos.
*/

export function createEffectsModule(app) {
  const { vibrar } = app.utils;

  let plexusController = null;
  let pendingPlexusPatients = null;

  function initPlexus() {
    if (plexusController) return;
    const canvas = document.getElementById('plexusCanvas');
    if (!canvas) return;
    plexusController = createPlexusController(canvas);
    if (!plexusController) return;

    // Si Firestore respondió antes de que el canvas estuviera visible, usamos
    // esa lista; de lo contrario tomamos el estado completo disponible.
    const initialPatients = pendingPlexusPatients ?? app.state.pacientesGlobal;
    if (!app.state.isFetchingData || initialPatients.length > 0) {
      plexusController.syncPatients(initialPatients);
      pendingPlexusPatients = null;
    }
  }

  function syncPlexusPatients(listaPacientes = []) {
    pendingPlexusPatients = Array.isArray(listaPacientes) ? listaPacientes : [];
    if (!plexusController) return;
    if (app.state.isFetchingData && pendingPlexusPatients.length === 0) return;
    plexusController.syncPatients(pendingPlexusPatients);
    pendingPlexusPatients = null;
  }

  const easterEggsMap = {
    'yehernandez': ['❤️', '🐶', '🐕', '🦴', '🐾', '🐩', '💖', '🦮', '🎾', '💕'],
    'rodrrodriguez': ['🤖', '💻', '👾', '⚙️', '🖨️', '🔈', '🕹️', '🐺', '🎧', '🛠️'],
    'alfrojas': ['🔪', '🩸', '🗡️', '🩹', '🚑', '⚔️', '🪓', '🏥', '🚨', '💉'],
    'iharo': ['🐱', '🐈', '🧶', '😻', '🐾', '😽', '🐭', '🙀', '😼', '🐟']
  };

  let activeEasterEggs = new Set();

  function checkEasterEggs(query) {
    const q = query.toLowerCase().replace(/\s+/g, '');
    let isEasterEggTriggered = false;
    for (const key in easterEggsMap) {
      if (q.includes(key) && !activeEasterEggs.has(key)) {
        activeEasterEggs.add(key);
        const cantidadEmojis = easterEggsMap[key].length;
        for(let i=0; i < cantidadEmojis; i++) { spawnSurfer(key, i); }
        isEasterEggTriggered = true;
      
        // MOSTRAR SOUNDBOARD SI ES ALFROJAS
        if (key === 'alfrojas') {
          const soundboard = document.getElementById('alfrojasSoundboard');
          if (soundboard) soundboard.style.display = 'flex';
        }
      }
    }
    return isEasterEggTriggered;
  }

  function spawnSurfer(key, index) {
    const container = document.getElementById('easterEggContainer');
    if (!container) return;
    const emoji = easterEggsMap[key][index];
    const wrapper = document.createElement('div');
    wrapper.className = 'surfer-wrapper';
    const duration = 15 + Math.random() * 15; 
    wrapper.style.animationDuration = `${duration}s`;
    wrapper.style.animationDelay = `-${Math.random() * duration}s`; 
    wrapper.style.bottom = `${5 + Math.random() * 40}px`; 
  
    const inner = document.createElement('span');
    inner.className = 'surfer-emoji';
    inner.innerText = emoji;
    const bobDuration = 2 + Math.random() * 2; 
    inner.style.animationDuration = `${bobDuration}s`;
    inner.style.animationDelay = `-${Math.random() * 2}s`; 
  
    inner.onpointerdown = (e) => {
       e.stopPropagation(); e.preventDefault(); vibrar(15);
       inner.style.animation = 'none'; inner.style.transform = 'scale(0)'; inner.style.opacity = '0'; inner.style.transition = 'all 0.2s ease';
       setTimeout(() => wrapper.remove(), 200); 
    };
    wrapper.appendChild(inner); container.appendChild(wrapper);
  }

  return {
    initPlexus,
    syncPlexusPatients,
    checkEasterEggs
  };
}
