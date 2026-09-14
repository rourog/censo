/*
  MÓDULO: themeModule.js
  THEME ENGINE V3

  RESPONSABILIDAD:
  - Catálogo accesible de fondos y acentos.
  - Adaptar el tono del acento a fondos claros/oscuros.
  - Aplicar y persistir tema y animación decorativa localmente.
  - Renderizar selector, vista previa y restablecimiento.
*/

export function createThemeModule(app) {
  const { state } = app;

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

  function getCurrentTheme() {
    return {
      base: validBase(localStorage.getItem('censo-base')),
      accent: validAccent(localStorage.getItem('censo-accent')),
      effect: validEffect(localStorage.getItem('censo-effect'))
    };
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
            <button class="theme-swatch theme-swatch--accent accent-swatch ${item.metallic ? 'theme-swatch--metallic' : ''}" type="button" data-val="${item.id}" data-metal="${item.metallic || ''}" aria-label="Acento ${item.name}" title="${item.name} · claro ${item.light} · oscuro ${item.dark}" style="--swatch-light:${item.light};--swatch-dark:${item.dark}">
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
        <p class="theme-effect-note">Efecto decorativo. No modifica información clínica y se reduce automáticamente si el sistema solicita menos movimiento.</p>
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

    extras.querySelectorAll('.theme-effect-option').forEach(button => {
      button.addEventListener('click', () => applyEffect(button.dataset.effect));
    });
    document.getElementById('themeResetBtn')?.addEventListener('click', () => {
      applyTheme(DEFAULT_BASE, DEFAULT_ACCENT);
      applyEffect(DEFAULT_EFFECT);
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

  function applyTheme(newBase, newAccent) {
    const current = getCurrentTheme();
    const base = validBase(newBase || current.base);
    const accent = validAccent(newAccent || current.accent);

    removeOldThemeClasses();
    document.body.classList.add(base, accent);
    localStorage.setItem('censo-base', base);
    localStorage.setItem('censo-accent', accent);
    updatePickerState(base, accent);

    window.setTimeout(() => {
      const metaColor = getComputedStyle(document.body).getPropertyValue('--theme-meta').trim();
      const metas = document.querySelectorAll('meta[name="theme-color"]');
      if (metaColor) metas.forEach(meta => meta.setAttribute('content', metaColor));
    }, 50);
  }

  function applyEffect(newEffect) {
    const effect = validEffect(newEffect || getCurrentTheme().effect);
    removeOldEffectClasses();
    document.body.classList.add(effect);
    localStorage.setItem('censo-effect', effect);
    updateEffectPicker(effect);
  }

  function initTheme() {
    const savedView = localStorage.getItem('censo-view') || 'kanban';
    state.currentViewMode = savedView;
    const viewIcon = document.getElementById('viewIcon');
    if (viewIcon) viewIcon.textContent = state.currentViewMode === 'kanban' ? 'table_rows' : 'grid_view';

    renderThemePickers();
    const current = getCurrentTheme();
    applyTheme(current.base, current.accent);
    applyEffect(current.effect);
  }

  return {
    initTheme,
    applyTheme,
    applyEffect,
    renderThemePickers
  };
}
