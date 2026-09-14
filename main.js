// main.js
// Entrada mínima con diagnóstico de carga de módulos.
// La versión se inyecta desde index.html -> version.json.

const BUILD = String(window.CensoBuild?.version || `runtime-${Date.now()}`);

console.info(`[CENSO] main.js cargado. BUILD: ${BUILD}`);
window.CensoBuild = {
  ...(window.CensoBuild || {}),
  version: BUILD,
  stage: 'main-loaded'
};

async function loadBootModule() {
  const path = `./modules/appModule.js?v=${encodeURIComponent(BUILD)}`;

  try {
    const module = await import(path);
    console.info(`[CENSO] appModule cargado desde: ${path}`);
    return module;
  } catch (error) {
    console.warn(`[CENSO] No se pudo cargar ${path}`, error);
    throw error;
  }
}

function showBootError(error) {
  console.error('[CENSO] Error fatal de arranque:', error);

  const btn = document.getElementById('btnEnter');
  const input = document.getElementById('nipInput');
  const loginScreen = document.getElementById('loginScreen');

  if (input) input.disabled = true;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'ERROR AL CARGAR APP';
  }

  if (loginScreen) {
    const existing = document.getElementById('censoBootError');
    existing?.remove();

    const box = document.createElement('div');
    box.id = 'censoBootError';
    box.style.cssText = [
      'max-width: 340px',
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
      'No se pudo cargar la aplicación.\n\n' +
      `BUILD: ${BUILD}\n\n` +
      'Detalle: ' + (error?.message || String(error));

    loginScreen.appendChild(box);
  }
}

loadBootModule()
  .then(({ bootApp }) => {
    if (typeof bootApp !== 'function') {
      throw new Error('appModule.js cargó, pero no exporta bootApp().');
    }
    return bootApp();
  })
  .catch(showBootError);
