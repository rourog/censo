/* Seasonal profiles coordinate decoration without changing clinical data.
 * Reactivate next season by setting SEASONAL_ENABLED to true. Historical
 * preferences, counters, sprites and testable profiles remain untouched. */
export const SEASONAL_ENABLED = false;
export const SEASONAL_PROFILES = Object.freeze({
  halloween: {
    id: 'halloween', name: 'Halloween', months: [10],
    defaults: { base: 'base-plum', accent: 'accent-orange', effect: 'effect-halloween' },
    banner: { background: 'linear-gradient(90deg, #ff6500 0%, #d94d09 16%, #4a145f 36%, #29113e 50%, #4a145f 64%, #d94d09 84%, #ff6500 100%)', text: '#fff1df', accent: '#fb923c',
      titleFont: '"Creepster", Georgia, serif', nodeGlyph: '🎃' },
    ambient: { sprite: '../assets/seasonal/bats.png', count: 6, minSize: 35, maxSize: 55,
      flapFps: 12, speed: 100, fallFps: 12, groundSeconds: 3,
      ghosts: { sprite: '../assets/seasonal/ghost.png', batsPerGhost: 10, fps: 12, speed: 115, minSize: 27, maxSize: 33 } },
    // Halloween replaces the usual celebration for this season.
    confetti: { effect: 'bats', duration: 3, colors: ['#ff6500', '#fb923c', '#a855f7', '#6d28d9'] }
  }
});
export function resolveSeasonalProfile(mode = 'auto', date = new Date()) {
  if (mode === 'off') return null;
  if (SEASONAL_PROFILES[mode]) return SEASONAL_PROFILES[mode];
  const month = Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Mexico_City', month: 'numeric' }).format(date));
  return Object.values(SEASONAL_PROFILES).find(profile => profile.months.includes(month)) || null;
}
export function getSeasonalProfile() {
  // Temporarily retired: even old manually selected Halloween themes stay off.
  return SEASONAL_ENABLED ? resolveSeasonalProfile(localStorage.getItem('censo-season') || 'auto') : null;
}
const confettiRenderers = new Map();
export function registerSeasonalConfetti(id, renderer) {
  if (typeof renderer !== 'function') throw new TypeError('Confetti renderer must be a function');
  confettiRenderers.set(id, renderer);
  return () => confettiRenderers.delete(id);
}
let celebrationModule;
// Noviembre usa su propia celebración predeterminada sin alterar la
// preferencia que el usuario tenga guardada para el resto del año.
function novemberActive() {
  return typeof document !== 'undefined' && document.body.classList.contains('november-theme');
}
export function setCelebrationChoice(choice) {
  if (!['confetti', 'fireworks', 'balloons'].includes(choice)) return;
  localStorage.setItem(novemberActive() ? 'censo-november-celebration' : 'censo-celebration', choice);
}
export function getCelebrationChoice() {
  const saved = novemberActive()
    ? localStorage.getItem('censo-november-celebration')
    : localStorage.getItem('censo-celebration');
  return ['confetti', 'fireworks', 'balloons'].includes(saved) ? saved : (novemberActive() ? 'fireworks' : 'confetti');
}
function loadCelebrations() {
  const url = new URL('./celebrationEffects.js', import.meta.url);
  url.searchParams.set('v', String(window.CensoBuild?.version || '2.75'));
  return celebrationModule ||= import(url.href);
}
export async function initCelebrationAudio() {
  (await loadCelebrations()).initCelebrationAudio();
}
export async function unlockCelebrationAudio() {
  (await loadCelebrations()).unlockCelebrationAudio();
}
export function launchSeasonalConfetti(options = {}) {
  if (typeof document !== 'undefined' && document.hidden) return;
  const profile = getSeasonalProfile();
  const configured = profile?.confetti;
  const choices = ['confetti', 'fireworks', 'balloons', ...(configured?.effect ? [configured.effect] : [])];
  const effect = localStorage.getItem('censo-celebration-mode') === 'all'
    ? choices[Math.floor(Math.random() * choices.length)]
    : configured?.effect || getCelebrationChoice();
  // La salva tricolor aprobada en el laboratorio sustituye al
  // motor genérico de fuegos artificiales solo durante noviembre.
  // Si no está inicializado, se mantiene el motor existente.
  if (novemberActive() && effect === 'fireworks') {
    const controller = window.__novemberThemeController;
    if (controller?.salute) return controller.salute({ force: true });
  }
  const renderer = confettiRenderers.get(effect);
  const settings = { ...options, ...(configured?.colors ? { colors: configured.colors } : {}), disableForReducedMotion: true };
  if (renderer) renderer(settings);
  else if (effect !== 'confetti') {
    return loadCelebrations().then(module => module.launchCelebration(effect, settings)).catch(error => {
      console.warn('[CENSO] No se pudo cargar la celebración:', error);
      window.confetti?.(settings);
    });
  } else if (typeof window.confetti === 'function') window.confetti(settings);
}
