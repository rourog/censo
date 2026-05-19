/*
  MÓDULO: themeModule.js

  RESPONSABILIDAD:
  - Catálogo de colores base/acento.
  - Aplicar y persistir tema.
  - Renderizar selectores de apariencia.

  NO DEBE:
  - Renderizar pacientes.
  - Tocar Firebase.
*/

export function createThemeModule(app) {
  const { state } = app;

  const bases = [
    { id: 'base-dark', color: '#0f172a' }, 
    { id: 'base-midnight', color: '#000000' }, 
    { id: 'base-gray-dark', color: '#27272a' },
    { id: 'base-navy', color: '#001529' },
    { id: 'base-plum', color: '#3b0764' }, 
    { id: 'base-forest', color: '#064e3b' }, 
    { id: 'base-coffee', color: '#451a03' }, 
    { id: 'base-light', color: '#f8fafc' },
    { id: 'base-pure-white', color: '#ffffff' }, 
    { id: 'base-gray-light', color: '#e2e8f0' },
    { id: 'base-sand', color: '#fefce8' }, 
    { id: 'base-rose', color: '#fff1f2' },
    { id: 'base-mint', color: '#f0fdf4' }, 
    { id: 'base-lavender', color: '#faf5ff' }
  ];
  const accents = [
    { id: 'accent-blue', color: '#3b82f6' }, 
    { id: 'accent-pure-blue', color: '#1d4ed8' },
    { id: 'accent-green', color: '#10b981' }, 
    { id: 'accent-emerald', color: '#059669' },
    { id: 'accent-pink', color: '#ec4899' }, 
    { id: 'accent-purple', color: '#a855f7' },
    { id: 'accent-orange', color: '#f97316' }, 
    { id: 'accent-amber', color: '#d97706' },
    { id: 'accent-red', color: '#ef4444' }, 
    { id: 'accent-pure-red', color: '#dc2626' },
    { id: 'accent-crimson', color: '#be123c' },
    { id: 'accent-gold', color: '#eab308' }, 
    { id: 'accent-teal', color: '#14b8a6' },
    { id: 'accent-lime', color: '#84cc16' }, 
    { id: 'accent-indigo', color: '#6366f1' },
    { id: 'accent-cyan', color: '#06b6d4' }
  ];

  function renderThemePickers() {
    const baseGrid = document.getElementById('baseColorPicker');
    const accentGrid = document.getElementById('accentColorPicker');
    if(!baseGrid || !accentGrid) return;
  
    baseGrid.innerHTML = bases.map(b => `<div class="color-swatch base-swatch" style="background-color: ${b.color};" data-val="${b.id}"></div>`).join('');
    accentGrid.innerHTML = accents.map(a => `<div class="color-swatch accent-swatch" style="background-color: ${a.color};" data-val="${a.id}"></div>`).join('');

    baseGrid.querySelectorAll('.base-swatch').forEach(sw => {
      sw.onclick = () => { applyTheme(sw.dataset.val, null); };
    });
    accentGrid.querySelectorAll('.accent-swatch').forEach(sw => {
      sw.onclick = () => { applyTheme(null, sw.dataset.val); };
    });
  }

  function applyTheme(newBase, newAccent) {
    let currentBase = localStorage.getItem('censo-base') || 'base-dark';
    let currentAccent = localStorage.getItem('censo-accent') || 'accent-blue';
  
    if(newBase) currentBase = newBase;
    if(newAccent) currentAccent = newAccent;

    document.body.className = `${currentBase} ${currentAccent}`;
    localStorage.setItem('censo-base', currentBase);
    localStorage.setItem('censo-accent', currentAccent);

    document.querySelectorAll('.base-swatch').forEach(sw => sw.classList.toggle('active', sw.dataset.val === currentBase));
    document.querySelectorAll('.accent-swatch').forEach(sw => sw.classList.toggle('active', sw.dataset.val === currentAccent));

    setTimeout(() => {
      const metaColor = getComputedStyle(document.body).getPropertyValue('--theme-meta').trim();
      if(metaColor) document.querySelector('meta[name="theme-color"]').setAttribute('content', metaColor);
    }, 50);
  }

  function initTheme() {
    const savedView = localStorage.getItem('censo-view') || 'kanban';
    state.currentViewMode = savedView;
    const viewIcon = document.getElementById('viewIcon');
    if (viewIcon) viewIcon.textContent = state.currentViewMode === 'kanban' ? 'table_rows' : 'grid_view'; 
  
    renderThemePickers();
    applyTheme(localStorage.getItem('censo-base'), localStorage.getItem('censo-accent'));
  }

  return {
    initTheme,
    applyTheme,
    renderThemePickers
  };
}
