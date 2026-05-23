// historial.js
// Entrada modular del archivo histórico.
// BUILD: historial-admin-v3-20260522

console.info('[HISTORIAL] historial.js cargado. BUILD: historial-admin-v3-20260522');
window.HistorialBuild = { version: 'historial-admin-v3-20260522', stage: 'entry-loaded' };

async function loadHistorialModule() {
  const candidates = [
    './modules/historialModule.js?v=historial-admin-v3-20260522',
    './censo_modular_grande/modules/historialModule.js?v=historial-admin-v3-20260522'
  ];

  let lastError = null;

  for (const path of candidates) {
    try {
      const module = await import(path);
      console.info(`[HISTORIAL] historialModule cargado desde: ${path}`);
      return module;
    } catch (error) {
      lastError = error;
      console.warn(`[HISTORIAL] No se pudo cargar ${path}`, error);
    }
  }

  throw lastError || new Error('No se pudo cargar historialModule.js');
}

function showBootError(error) {
  console.error('[HISTORIAL] Error fatal de arranque:', error);

  const btn = document.getElementById('btnEnter');
  const input = document.getElementById('nipInput');
  const loginScreen = document.getElementById('loginScreen');

  if (input) input.disabled = true;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'ERROR AL CARGAR HISTORIAL';
  }

  if (loginScreen) {
    const box = document.createElement('div');
    box.style.cssText = [
      'max-width: 360px',
      'margin-top: 14px',
      'padding: 12px',
      'border: 1px solid rgba(239,68,68,.45)',
      'border-radius: 10px',
      'color: #fecaca',
      'background: rgba(239,68,68,.12)',
      'font-family: Fira Code, monospace',
      'font-size: .72rem',
      'line-height: 1.45',
      'text-align: left',
      'white-space: pre-wrap'
    ].join(';');

    box.textContent =
      'No se pudo cargar modules/historialModule.js.\n\n' +
      'Estructura esperada:\n' +
      'historial.html\n' +
      'historial.js\n' +
      'modules/historialModule.js\n' +
      'modules/firebaseModule.js\n' +
      'modules/utilsModule.js\n\n' +
      'Detalle: ' + (error?.message || String(error));

    loginScreen.appendChild(box);
  }
}

loadHistorialModule()
  .then(({ bootHistorial }) => {
    if (typeof bootHistorial !== 'function') {
      throw new Error('historialModule.js cargó, pero no exporta bootHistorial().');
    }
    bootHistorial();
  })
  .catch(showBootError);
