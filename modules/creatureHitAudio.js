/* Google Sound Library selections approved in the laboratory. */
const SOURCES = Object.freeze({
  bats: { url: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg', start: .39 },
  ghosts: { url: 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg', start: .04 }
});
export function createCreatureHitAudio(env = globalThis) {
  const active = new Set(), prepared = new Map();
  const enabled = () => {
    try { return env.localStorage.getItem('censo-celebration-sound') === 'on'; } catch { return false; }
  };
  function release(voice) {
    env.clearTimeout(voice.timer); env.clearInterval(voice.fade);
    voice.media.pause(); active.delete(voice);
  }
  function stop() { for (const voice of [...active]) release(voice); }
  function prepare() {
    if (!enabled()) return;
    for (const [kind, source] of Object.entries(SOURCES)) {
      if (prepared.has(kind)) continue;
      try {
        const media = new env.Audio(source.url); media.preload = 'auto';
        media.load(); prepared.set(kind, media);
      } catch { /* Preloading is optional. */ }
    }
  }
  function play(kind) {
    const source = SOURCES[kind];
    if (!source || !enabled() || env.document.hidden) return;
    try {
      prepare();
      // Cap simultaneous voices so rapid clicks stay unobtrusive.
      if (active.size >= 3) release(active.values().next().value);
      const media = prepared.get(kind).cloneNode(true);
      media.volume = .6; media.currentTime = source.start;
      const voice = { media, timer: 0, fade: 0 }; active.add(voice);
      media.onended = () => release(voice);
      media.onerror = () => release(voice);
      media.play().then(() => {
        if (!active.has(voice)) return;
        if (!enabled() || env.document.hidden) { release(voice); return; }
        voice.timer = env.setTimeout(() => {
          let step = 0;
          voice.fade = env.setInterval(() => {
            if (!enabled()) { stop(); return; }
            media.volume = Math.max(0, .6 * (1 - ++step / 7));
            if (step >= 7) release(voice);
          }, 20);
        }, 1050);
      }).catch(() => release(voice));
    } catch { /* Audio availability must never interrupt a hit or its counter. */ }
  }
  env.document.addEventListener('visibilitychange', () => { if (env.document.hidden) stop(); });
  env.addEventListener('pagehide', stop);
  env.addEventListener('storage', event => {
    if (!event.key || event.key === 'censo-celebration-sound') { if (enabled()) prepare(); else stop(); }
  });
  prepare();
  return { play, stop, prepare };
}
