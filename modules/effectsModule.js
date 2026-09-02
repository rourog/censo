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

  const rodrSonidos = [
    { nombre: 'FAHHHH', icono: 'campaign', archivo: 'fahhhhhhhhhhhhhh.mp3' },
    { nombre: 'Anime Wow', icono: 'auto_awesome', archivo: 'anime-wow-sound-effect.mp3' },
    { nombre: 'Spiderman meme song', icono: 'music_note', archivo: 'spiderman-meme-song.mp3' },
    { nombre: 'Romance', icono: 'favorite', archivo: 'romanceeeeeeeeeeeeee.mp3' },
    { nombre: 'M e o w', icono: 'pets', archivo: 'm-e-o-w.mp3' },
    { nombre: 'Hola muy buenas tardes', icono: 'waving_hand', archivo: 'hola-muy-buenas-tardes.mp3' },
    { nombre: 'Evil Morty', icono: 'psychology', archivo: 'audio-cortado-2.mp3' }
  ];

  function mostrarRodrSoundboard() {
    const existente = document.getElementById('rodrrodriguezSoundboard');
    if (existente) {
      existente.style.display = 'flex';
      return;
    }
    const host = document.getElementById('alfrojasSoundboard')?.parentElement
      || document.querySelector('.header-top .header-left');
    if (!host) return;

    const soundboard = document.createElement('div');
    soundboard.id = 'rodrrodriguezSoundboard';
    soundboard.setAttribute('role', 'group');
    soundboard.setAttribute('aria-label', 'Sonidos de RODRRODRIGUEZ');
    soundboard.style.cssText = 'display: flex; align-items: center; gap: 6px; margin-left: 4px; padding: 2px 4px; min-width: 0; max-width: min(240px, 34vw); overflow-x: auto; scrollbar-width: thin;';
    let activeAudio = null;
    let activeButton = null;

    function stopAudio() {
      const audio = activeAudio;
      const button = activeButton;
      activeAudio = null;
      activeButton = null;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      if (button) {
        button.setAttribute('aria-pressed', 'false');
        button.title = button.dataset.nombreSonido;
      }
    }

    rodrSonidos.forEach(({ nombre, icono, archivo }) => {
      const button = document.createElement('button');
      button.className = 'icon-btn sound-btn';
      button.type = 'button';
      button.title = nombre;
      button.dataset.nombreSonido = nombre;
      button.setAttribute('aria-label', nombre);
      button.setAttribute('aria-pressed', 'false');
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = icono;
      button.appendChild(icon);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const detener = activeButton === button;
        stopAudio();
        if (detener) return;

        // La descarga y la reproducción comienzan únicamente al pulsar.
        const audio = new Audio();
        audio.preload = 'none';
        audio.src = `https://www.myinstants.com/media/sounds/${archivo}`;
        activeAudio = audio;
        activeButton = button;
        button.setAttribute('aria-pressed', 'true');
        button.title = `${nombre} · Pulsar para detener`;
        const onError = () => {
          if (activeAudio !== audio) return;
          stopAudio();
          button.title = `${nombre} · No se pudo reproducir. Pulsa para reintentar`;
        };
        audio.addEventListener('ended', () => {
          if (activeAudio === audio) stopAudio();
        }, { once: true });
        audio.addEventListener('error', onError, { once: true });
        try {
          Promise.resolve(audio.play()).catch(onError);
        } catch {
          onError();
        }
      });
      soundboard.appendChild(button);
    });
    host.appendChild(soundboard);
  }

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
        if (key === 'rodrrodriguez') mostrarRodrSoundboard();
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
