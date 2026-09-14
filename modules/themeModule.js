/*
  MÓDULO: themeModule.js
  THEME ENGINE V2

  RESPONSABILIDAD:
  - Catálogo accesible de fondos y acentos.
  - Adaptar el tono del acento a fondos claros/oscuros.
  - Aplicar y persistir tema localmente.
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
    { id: 'accent-gold', name: 'Oro', light: '#a16207', dark: '#facc15' },
    { id: 'accent-amber', name: 'Ámbar', light: '#b45309', dark: '#fbbf24' },
    { id: 'accent-orange', name: 'Naranja', light: '#c2410c', dark: '#fb923c' },
    { id: 'accent-red', name: 'Rojo', light: '#b91c1c', dark: '#f87171' },
    { id: 'accent-pure-red', name: 'Rubí', light: '#991b1b', dark: '#fca5a5' },
    { id: 'accent-crimson', name: 'Carmesí', light: '#be123c', dark: '#fb7185' },
    { id: 'accent-pink', name: 'Rosa', light: '#be185d', dark: '#f472b6' },
    { id: 'accent-fuchsia', name: 'Fucsia', light: '#a21caf', dark: '#e879f9' },
    { id: 'accent-purple', name: 'Púrpura', light: '#7e22ce', dark: '#c084fc' },
    { id: 'accent-violet', name: 'Violeta', light: '#6d28d9', dark: '#a78bfa' },
    { id: 'accent-indigo', name: 'Índigo', light: '#4338ca', dark: '#818cf8' },
    { id: 'accent-slate', name: 'Plata', light: '#334155', dark: '#cbd5e1' }
  ];

  const DEFAULT_BASE = 'base-dark';
  const DEFAULT_ACCENT = 'accent-blue';
  const baseIds = new Set(bases.map(item => item.id));
  const accentIds = new Set(accents.map(item => item.id));

  function ensureThemeStylesheet() {
    if (document.getElementById('censo-theme-v2-styles')) return;
    const link = document.createElement('link');
    link.id = 'censo-theme-v2-styles';
    link.rel = 'stylesheet';
    const url = new URL('./themePaletteV2.css', import.meta.url);
    url.searchParams.set('v', String(window.CensoBuild?.version || Date.now()));
    link.href = url.href;
    document.head.appendChild(link);
  }

  function validBase(value) {
    return baseIds.has(value) ? value : DEFAULT_BASE;
  }

  function validAccent(value) {
    return accentIds.has(value) ? value : DEFAULT_ACCENT;
  }

  function getCurrentTheme() {
    return {
      base: validBase(localStorage.getItem('censo-base')),
      accent: validAccent(localStorage.getItem('censo-accent'))
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
            <button class="theme-swatch theme-swatch--accent accent-swatch" type="button" data-val="${item.id}" aria-label="Acento ${item.name}" title="${item.name} · claro ${item.light} · oscuro ${item.dark}" style="--swatch-light:${item.light};--swatch-dark:${item.dark}">
              <span class="theme-swatch__dot"></span>
              <span class="theme-swatch__name">${item.name}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function ensurePreview() {
    if (document.getElementById('themeV2Extras')) return;
    const modalContent = document.querySelector('#themeModal .modal-content');
    if (!modalContent) return;

    const extras = document.createElement('div');
    extras.id = 'themeV2Extras';
    extras.innerHTML = `
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
    document.getElementById('themeResetBtn')?.addEventListener('click', () => applyTheme(DEFAULT_BASE, DEFAULT_ACCENT));
  }

  function renderThemePickers() {
    ensureThemeStylesheet();
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

    ensurePreview();
  }

  function removeOldThemeClasses() {
    [...document.body.classList]
      .filter(className => className.startsWith('base-') || className.startsWith('accent-'))
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

  function initTheme() {
    const savedView = localStorage.getItem('censo-view') || 'kanban';
    state.currentViewMode = savedView;
    const viewIcon = document.getElementById('viewIcon');
    if (viewIcon) viewIcon.textContent = state.currentViewMode === 'kanban' ? 'table_rows' : 'grid_view';

    renderThemePickers();
    const current = getCurrentTheme();
    applyTheme(current.base, current.accent);
  }

  return {
    initTheme,
    applyTheme,
    renderThemePickers
  };
}
