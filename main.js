// main.js
// Entrada mínima con diagnóstico de carga de módulos.
// BUILD: newsbar-v1.3-20260723
// Ruta ideal en GitHub:
//   index.html
//   style.css
//   main.js
//   modules/appModule.js

const BUILD = 'newsbar-v1.3-20260723';

console.info(`[CENSO] main.js cargado. BUILD: ${BUILD}`);
window.CensoBuild = { version: BUILD, stage: 'main-loaded' };

async function loadBootModule() {
  const candidates = [
    `./modules/appModule.js?v=${BUILD}`
  ];

  let lastError = null;

  for (const path of candidates) {
    try {
      const module = await import(path);
      console.info(`[CENSO] appModule cargado desde: ${path}`);
      return module;
    } catch (error) {
      lastError = error;
      console.warn(`[CENSO] No se pudo cargar ${path}`, error);
    }
  }

  throw lastError || new Error('No se pudo cargar appModule.js');
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
    const box = document.createElement('div');
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
      'No se pudo cargar modules/appModule.js.\n\n' +
      'Revisa que la estructura sea:\n' +
      'index.html\nstyle.css\nmain.js\nmodules/appModule.js\n\n' +
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
