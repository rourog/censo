/*
  MÓDULO: themeModule.js
  THEME ENGINE V3

  RESPONSABILIDAD:
  - Catálogo accesible de fondos y acentos.
  - Adaptar el tono del acento a fondos claros/oscuros.
  - Aplicar y persistir tema y animación decorativa localmente.
  - Renderizar selector, vista previa y restablecimiento.
*/

const seasonUrl = new URL('./seasonalTheme.js', import.meta.url);
seasonUrl.searchParams.set('v', String(window.CensoBuild?.version || Date.now()));
const { getSeasonalProfile, SEASONAL_PROFILES, getCelebrationChoice, launchSeasonalConfetti, initCelebrationAudio, unlockCelebrationAudio } = await import(seasonUrl.href);
const ambientUrl = new URL('./seasonalAmbient.js', import.meta.url);
ambientUrl.searchParams.set('v', String(window.CensoBuild?.version || Date.now()));
const { createSeasonalAmbient } = await import(ambientUrl.href);

export function createThemeModule(app) {
  const { state } = app;
  const ambient = createSeasonalAmbient();

  const bases = [
    { id: 'base-dark', name: 'Slate', color: '#0f172a', mode: 'dark' },
    { id: 'base-midnight', name: 'OLED', color: '#000000', mode: 'dark' },
    { id: 'base-gray-dark', name: 'Grafito', color: '#27272a', mode: 'dark' },
    { id: 'base-navy', name: 'Navy', color: '#001529', mode: 'dark' },
    { id: 'base-ocean', name: 'Océano', color: '#082f49', mode: 'dark' },
    { id: 'base-teal-dark', name: 'Teal', color: '#042f2e', mode: 'dark' },
    { id: 'base-forest', name: 'Bosque', color: '#064e3b', mode: 'dark' },
    { id: 'base-plum', name: 'Ciruela', color: '#3b0764', mode: 'dark' },
    { id: 'base-burgundy', name: 'Borgoña', color: '#3f0a17', mode: 'dark' },
    { id: 'base-coffee', name: 'Café', color: '#451a03', mode: 'dark' },

    { id: 'base-light', name: 'Blanco frío', color: '#f8fafc', mode: 'light' },
    { id: 'base-pure-white', name: 'Blanco', color: '#ffffff', mode: 'light' },
    { id: 'base-gray-light', name: 'Gris', color: '#e2e8f0', mode: 'light' },
    { id: 'base-ice', name: 'Hielo', color: '#eff6ff', mode: 'light' },
    { id: 'base-sage', name: 'Salvia', color: '#f3f7f2', mode: 'light' },
    { id: 'base-sand', name: 'Arena', color: '#fefce8', mode: 'light' },
    { id: 'base-peach', name: 'Durazno', color: '#fff7ed', mode: 'light' },
    { id: 'base-rose', name: 'Rosa', color: '#fff1f2', mode: 'light' },
    { id: 'base-mint', name: 'Menta', color: '#f0fdf4', mode: 'light' },
    { id: 'base-lavender', name: 'Lavanda', color: '#faf5ff', mode: 'light' }
  ];

  const accents = [
    { id: 'accent-blue', name: 'Azul', light: '#1d4ed8', dark: '#60a5fa' },
    { id: 'accent-pure-blue', name: 'Royal', light: '#1e40af', dark: '#93c5fd' },
    { id: 'accent-sky', name: 'Celeste', light: '#0369a1', dark: '#38bdf8' },
    { id: 'accent-cyan', name: 'Cian', light: '#0e7490', dark: '#22d3ee' },
    { id: 'accent-teal', name: 'Turquesa', light: '#0f766e', dark: '#2dd4bf' },
    { id: 'accent-emerald', name: 'Esmeralda', light: '#047857', dark: '#34d399' },
    { id: 'accent-green', name: 'Verde', light: '#15803d', dark: '#4ade80' },
    { id: 'accent-lime', name: 'Lima', light: '#4d7c0f', dark: '#a3e635' },

    { id: 'accent-gold', name: 'Oro', light: '#8a6100', dark: '#ffd700', metallic: 'gold' },
    { id: 'accent-silver', name: 'Plata', light: '#475569', dark: '#d1d5db', metallic: 'silver' },
    { id: 'accent-bronze', name: 'Bronce', light: '#7c3f12', dark: '#d08a3e', metallic: 'bronze' },
    { id: 'accent-copper', name: 'Cobre', light: '#8f3f12', dark: '#f28c52', metallic: 'copper' },
    { id: 'accent-amber', name: 'Ámbar', light: '#b45309', dark: '#fbbf24' },
    { id: 'accent-orange', name: 'Naranja', light: '#c2410c', dark: '#fb923c' },

    { id: 'accent-red', name: 'Rojo', light: '#b91c1c', dark: '#ff5252' },
    { id: 'accent-pure-red', name: 'Rojo puro', light: '#a80000', dark: '#ff2d2d' },
    { id: 'accent-scarlet', name: 'Escarlata', light: '#c1121f', dark: '#ff375f' },
    { id: 'accent-crimson', name: 'Carmesí', light: '#be123c', dark: '#fb7185' },
    { id: 'accent-pink', name: 'Rosa', light: '#be185d', dark: '#f472b6' },
    { id: 'accent-fuchsia', name: 'Fucsia', light: '#a21caf', dark: '#e879f9' },
    { id: 'accent-purple', name: 'Púrpura', light: '#7e22ce', dark: '#c084fc' },
    { id: 'accent-violet', name: 'Violeta', light: '#6d28d9', dark: '#a78bfa' },
    { id: 'accent-indigo', name: 'Índigo', light: '#4338ca', dark: '#818cf8' }
  ];

  const effects = [
    { id: 'effect-halloween', name: 'Murciélagos y niebla', icon: 'dark_mode' },
    { id: 'effect-waves', name: 'Olas', icon: 'waves' },
    { id: 'effect-aurora', name: 'Aurora', icon: 'blur_on' },
    { id: 'effect-grid', name: 'Rejilla', icon: 'grid_4x4' },
    { id: 'effect-radar', name: 'Radar', icon: 'radar' },
    { id: 'effect-particles', name: 'Partículas', icon: 'grain' },
    { id: 'effect-pulse', name: 'Pulso', icon: 'track_changes' },
    { id: 'effect-scan', name: 'Escáner', icon: 'document_scanner' },
    { id: 'effect-nebula', name: 'Nebulosa', icon: 'blur_circular' },
    { id: 'effect-none', name: 'Ninguna', icon: 'motion_photos_off' }
  ];

  const DEFAULT_BASE = 'base-dark';
  const DEFAULT_ACCENT = 'accent-blue';
  const DEFAULT_EFFECT = 'effect-waves';
  const baseIds = new Set(bases.map(item => item.id));
  const accentIds = new Set(accents.map(item => item.id));
  const effectIds = new Set(effects.map(item => item.id));

  function ensureStylesheet(id, filename) {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    const url = new URL(`./${filename}`, import.meta.url);
    url.searchParams.set('v', String(window.CensoBuild?.version || Date.now()));
    link.href = url.href;
    document.head.appendChild(link);
  }

  function ensureThemeStylesheets() {
    ensureStylesheet('censo-seasonal-styles', 'seasonalTheme.css');
    ensureStylesheet('censo-theme-v2-styles', 'themePaletteV2.css');
    ensureStylesheet('censo-theme-v3-effects', 'themeEffectsV3.css');
    ensureStylesheet('censo-theme-v3-layout-effects', 'themeEffectsV4.css');
  }

  function validBase(value) {
    return baseIds.has(value) ? value : DEFAULT_BASE;
  }

  function validAccent(value) {
    if (value === 'accent-slate') return 'accent-silver';
    return accentIds.has(value) ? value : DEFAULT_ACCENT;
  }

  function validEffect(value) {
    return effectIds.has(value) ? value : DEFAULT_EFFECT;
  }

  function preferenceKey(part) {
    const profile = getSeasonalProfile();
    return profile ? `censo-season-${profile.id}-${part}` : `censo-${part}`;
  }
  function getCurrentTheme() {
    const defaults = getSeasonalProfile()?.defaults || { base: DEFAULT_BASE, accent: DEFAULT_ACCENT, effect: DEFAULT_EFFECT };
    return {
      base: validBase(localStorage.getItem(preferenceKey('base')) || defaults.base),
      accent: validAccent(localStorage.getItem(preferenceKey('accent')) || defaults.accent),
      effect: validEffect(localStorage.getItem(preferenceKey('effect')) || defaults.effect)
    };
  }
  function applySeasonalBanner() {
    const profile = getSeasonalProfile(), body = document.body;
    const props = { '--season-banner-bg': 'background', '--season-banner-text': 'text', '--season-banner-accent': 'accent', '--season-title-font': 'titleFont' };
    if (profile) body.dataset.season = profile.id;
    else delete body.dataset.season;
    for (const [css, key] of Object.entries(props)) {
      if (profile?.banner[key]) body.style.setProperty(css, profile.banner[key]);
      else body.style.removeProperty(css);
    }
    if (profile?.banner.nodeGlyph) body.dataset.seasonNodeGlyph = profile.banner.nodeGlyph;
    else delete body.dataset.seasonNodeGlyph;
    updateToggles();
    const celebration = document.getElementById('celebrationPicker');
    if (celebration) celebration.value = getCelebrationChoice();
  }
  function updateToggles() {
    const values = {
      season: localStorage.getItem('censo-season') === 'off' ? 'off' : 'on',
      celebrations: localStorage.getItem('censo-celebration-mode') === 'all' ? 'all' : 'seasonal',
      sound: localStorage.getItem('censo-celebration-sound') === 'on' ? 'on' : 'off'
    };
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const active = values[button.dataset.themeToggle] === button.dataset.value;
      button.setAttribute('aria-pressed', String(active));
    });
    const picker = document.getElementById('celebrationPicker');
    if (picker) picker.parentElement.hidden = values.celebrations === 'all' || !!getSeasonalProfile();
  }
  function toggleGroup(id, label, choices) {
    return `<section class="theme-toggle-section"><div class="theme-picker-group__label">${label}</div>
      <div class="theme-toggle-group" role="group" aria-label="${label}">
        ${choices.map(([value, text]) => `<button type="button" data-theme-toggle="${id}" data-value="${value}" aria-pressed="false">${text}</button>`).join('')}
      </div></section>`;
  }
  function refreshSeason() {
    applySeasonalBanner();
    const theme = getCurrentTheme();
    applyTheme(theme.base, theme.accent, false);
    applyEffect(theme.effect, false);
  }

  function renderBaseGroup(mode, title) {
    const items = bases.filter(item => item.mode === mode);
    return `
      <section class="theme-picker-group" aria-label="${title}">
        <div class="theme-picker-group__label"><span>${title}</span><span>${items.length}</span></div>
        <div class="theme-picker-grid">
          ${items.map(item => `
            <button class="theme-swatch base-swatch" type="button" data-val="${item.id}" aria-label="Fondo ${item.name}" title="${item.name}">
              <span class="theme-swatch__dot" style="background:${item.color}"></span>
              <span class="theme-swatch__name">${item.name}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderAccentGrid() {
    return `
      <section class="theme-picker-group" aria-label="Colores de acento">
        <div class="theme-picker-group__label"><span>Colores</span><span>${accents.length}</span></div>
        <div class="theme-picker-grid">
          ${accents.map(item => `
            <button class="theme-swatch theme-swatch--accent accent-swatch ${item.metallic ? 'theme-swatch--metallic' : ''}" type="button" data-val="${item.id}" data-metal="${item.metallic || ''}" aria-label="Acento ${item.name}" title="${item.name}" style="--swatch-light:${item.light};--swatch-dark:${item.dark}">
              <span class="theme-swatch__dot"></span>
              <span class="theme-swatch__name">${item.name}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderEffectPicker() {
    return `
      <section class="theme-effect-picker" aria-label="Animación decorativa">
        <div class="theme-picker-group__label"><span>Animación</span><span>Escritorio</span></div>
        <div class="theme-effect-grid">
          ${effects.map(item => `
            <button class="theme-effect-option" type="button" data-effect="${item.id}" aria-label="Animación ${item.name}">
              <span class="material-symbols-outlined" aria-hidden="true">${item.icon}</span>
              <span>${item.name}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function ensureExtras() {
    if (document.getElementById('themeV2Extras')) return;
    const modalContent = document.querySelector('#themeModal .modal-content');
    if (!modalContent) return;

    const extras = document.createElement('div');
    extras.id = 'themeV2Extras';
    extras.innerHTML = `
      ${toggleGroup('season', 'Tema', [['on', 'Tema estacional'], ['off', 'Tema normal']])}
      ${toggleGroup('celebrations', 'Celebraciones', [['all', 'Todas las animaciones'], ['seasonal', 'Animación estacional']])}
      ${toggleGroup('sound', 'Sonidos', [['on', 'ON'], ['off', 'OFF']])}
      <section class="season-picker" aria-label="Celebración">
        <div><label for="celebrationPicker">Celebración</label>
        <select id="celebrationPicker"><option value="confetti">Confeti</option><option value="fireworks">Fuegos artificiales</option><option value="balloons">Globos</option></select></div>
        <button id="celebrationPreview" type="button" class="theme-reset">PROBAR CELEBRACIÓN</button>
      </section>
      ${renderEffectPicker()}
      <section class="theme-preview" aria-label="Vista previa del tema">
        <div class="theme-preview__head">
          <span class="theme-preview__title">Vista previa</span>
          <span id="themeSelectionLabel" class="theme-preview__selection"></span>
        </div>
        <div class="theme-preview__card">
          <div class="theme-preview__patient">CAMA 3 · PACIENTE</div>
          <div class="theme-preview__meta">DIAGNÓSTICO Y PENDIENTES</div>
          <div class="theme-preview__row">
            <span class="theme-preview__chip">OBSERVACIÓN</span>
            <button class="theme-preview__cta" type="button" tabindex="-1">ACCIÓN</button>
          </div>
        </div>
      </section>
      <button id="themeResetBtn" class="theme-reset" type="button">RESTABLECER APARIENCIA</button>
    `;
    modalContent.appendChild(extras);
    document.getElementById('celebrationPicker').value = getCelebrationChoice();
    document.getElementById('celebrationPicker').addEventListener('change', event => localStorage.setItem('censo-celebration', event.target.value));
    extras.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        const {themeToggle, value} = button.dataset;
        if (themeToggle === 'season') {
          if (value === 'off') {
            localStorage.setItem('censo-season-last', localStorage.getItem('censo-season') || 'auto');
            localStorage.setItem('censo-season', 'off');
          } else {
            localStorage.setItem('censo-season', localStorage.getItem('censo-season-last') || 'auto');
          }
          refreshSeason();
        } else if (themeToggle === 'celebrations') {
          localStorage.setItem('censo-celebration-mode', value);
          updateToggles();
        } else {
          localStorage.setItem('censo-celebration-sound', value);
          if (value === 'on') unlockCelebrationAudio();
          updateToggles();
        }
      });
    });
    updateToggles();
    document.getElementById('celebrationPreview').addEventListener('click', async () => {
      app.cerrarModal?.('themeModal');
      await unlockCelebrationAudio();
      launchSeasonalConfetti({particleCount:150, spread:80, origin:{y:.6}});
    });
    initCelebrationAudio().catch(error => console.warn('[CENSO] Audio decorativo no disponible:', error));

    extras.querySelectorAll('.theme-effect-option').forEach(button => {
      button.addEventListener('click', () => applyEffect(button.dataset.effect));
    });
    document.getElementById('themeResetBtn')?.addEventListener('click', () => {
      for (const part of ['base', 'accent', 'effect']) localStorage.removeItem(preferenceKey(part));
      refreshSeason();
    });
  }

  function renderThemePickers() {
    ensureThemeStylesheets();
    const baseGrid = document.getElementById('baseColorPicker');
    const accentGrid = document.getElementById('accentColorPicker');
    if (!baseGrid || !accentGrid) return;

    baseGrid.className = 'theme-picker-section';
    accentGrid.className = 'theme-picker-section';
    baseGrid.innerHTML = renderBaseGroup('dark', 'Oscuros') + renderBaseGroup('light', 'Claros');
    accentGrid.innerHTML = renderAccentGrid();

    baseGrid.querySelectorAll('.base-swatch').forEach(button => {
      button.addEventListener('click', () => applyTheme(button.dataset.val, null));
    });
    accentGrid.querySelectorAll('.accent-swatch').forEach(button => {
      button.addEventListener('click', () => applyTheme(null, button.dataset.val));
    });

    const baseLabel = baseGrid.parentElement?.querySelector('label');
    const accentLabel = accentGrid.parentElement?.querySelector('label');
    if (baseLabel) baseLabel.textContent = 'FONDO';
    if (accentLabel) accentLabel.textContent = 'ACENTO';

    ensureExtras();
  }

  function removeOldThemeClasses() {
    [...document.body.classList]
      .filter(className => className.startsWith('base-') || className.startsWith('accent-'))
      .forEach(className => document.body.classList.remove(className));
  }

  function removeOldEffectClasses() {
    [...document.body.classList]
      .filter(className => className.startsWith('effect-'))
      .forEach(className => document.body.classList.remove(className));
  }

  function updatePickerState(base, accent) {
    document.querySelectorAll('.base-swatch').forEach(button => {
      const active = button.dataset.val === base;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('.accent-swatch').forEach(button => {
      const active = button.dataset.val === accent;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const baseName = bases.find(item => item.id === base)?.name || base;
    const accentName = accents.find(item => item.id === accent)?.name || accent;
    const selection = document.getElementById('themeSelectionLabel');
    if (selection) selection.textContent = `${baseName} · ${accentName}`;
  }

  function updateEffectPicker(effect) {
    document.querySelectorAll('.theme-effect-option').forEach(button => {
      const active = button.dataset.effect === effect;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function applyTheme(newBase, newAccent, persist = true) {
    const current = getCurrentTheme();
    const base = validBase(newBase || current.base);
    const accent = validAccent(newAccent || current.accent);

    removeOldThemeClasses();
    document.body.classList.add(base, accent);
    if (persist) {
      localStorage.setItem(preferenceKey('base'), base);
      localStorage.setItem(preferenceKey('accent'), accent);
    }
    updatePickerState(base, accent);

    window.setTimeout(() => {
      const metaColor = getComputedStyle(document.body).getPropertyValue('--theme-meta').trim();
      const metas = document.querySelectorAll('meta[name="theme-color"]');
      if (metaColor) metas.forEach(meta => meta.setAttribute('content', metaColor));
    }, 50);
  }

  function applyEffect(newEffect, persist = true) {
    const effect = validEffect(newEffect || getCurrentTheme().effect);
    removeOldEffectClasses();
    document.body.classList.add(effect);
    if (persist) localStorage.setItem(preferenceKey('effect'), effect);
    ambient.sync(getSeasonalProfile() || (effect === 'effect-halloween' ? SEASONAL_PROFILES.halloween : null), effect);
    updateEffectPicker(effect);
  }

  function initTheme() {
    const savedView = localStorage.getItem('censo-view') || 'kanban';
    state.currentViewMode = savedView;
    const viewIcon = document.getElementById('viewIcon');
    if (viewIcon) viewIcon.textContent = state.currentViewMode === 'kanban' ? 'table_rows' : 'grid_view';

    renderThemePickers();
    refreshSeason();
    let lastSeason = getSeasonalProfile()?.id || '';
    const checkDate = () => {
      const id = getSeasonalProfile()?.id || '';
      if (id !== lastSeason) { lastSeason = id; refreshSeason(); }
    };
    window.setInterval(checkDate, 60000);
    document.addEventListener('visibilitychange', checkDate);
    window.addEventListener('storage', (event) => {
      if (!event.key || event.key.startsWith('censo-')) refreshSeason();
    });
  }

  return {
    initTheme,
    applyTheme,
    applyEffect,
    renderThemePickers
  };
}
