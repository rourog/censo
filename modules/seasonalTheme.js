/* Seasonal profiles coordinate decoration without changing clinical data. */
export const SEASONAL_PROFILES = Object.freeze({
  halloween: {
    id: 'halloween', name: 'Halloween', months: [10],
    defaults: { base: 'base-plum', accent: 'accent-orange', effect: 'effect-halloween' },
    banner: { background: '#29113e', text: '#fff1df', accent: '#fb923c',
      titleFont: 'Georgia, "Times New Roman", serif', nodeGlyph: '🎃' },
    ambient: { sprite: '../assets/seasonal/bats.png', count: 6, minSize: 35, maxSize: 55,
      flapFps: 12, speed: 100, fallFps: 12, groundSeconds: 3 },
    // Set an effect ID only once the alternate celebration has been selected.
    confetti: { effect: null, colors: ['#fb923c', '#a855f7', '#f3e8ff'] }
  }
});
export function resolveSeasonalProfile(mode = 'auto', date = new Date()) {
  if (mode === 'off') return null;
  if (SEASONAL_PROFILES[mode]) return SEASONAL_PROFILES[mode];
  const month = Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Mexico_City', month: 'numeric' }).format(date));
  return Object.values(SEASONAL_PROFILES).find(profile => profile.months.includes(month)) || null;
}
export function getSeasonalProfile() {
  return resolveSeasonalProfile(localStorage.getItem('censo-season') || 'auto');
}
const confettiRenderers = new Map();
export function registerSeasonalConfetti(id, renderer) {
  if (typeof renderer !== 'function') throw new TypeError('Confetti renderer must be a function');
  confettiRenderers.set(id, renderer);
  return () => confettiRenderers.delete(id);
}
export function launchSeasonalConfetti(options) {
  const profile = getSeasonalProfile();
  const configured = profile?.confetti;
  const renderer = confettiRenderers.get(configured?.effect);
  const settings = { ...options, ...(configured?.colors ? { colors: configured.colors } : {}), disableForReducedMotion: true };
  if (renderer) renderer(settings);
  else if (typeof window.confetti === 'function') window.confetti(settings);
}
