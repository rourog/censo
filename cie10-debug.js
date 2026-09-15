(() => {
  const startedAt = performance.now();
  const entries = [];
  let heartbeat = 0;

  const stamp = () => `${((performance.now() - startedAt) / 1000).toFixed(2)}s`;
  const text = value => {
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); } catch (_) { return String(value); }
  };

  const style = document.createElement('style');
  style.textContent = `
    #cie10DebugPanel{position:fixed;right:12px;bottom:12px;z-index:50000;width:min(430px,calc(100vw - 24px));max-height:42vh;display:flex;flex-direction:column;background:rgba(2,6,23,.96);color:#e2e8f0;border:1px solid rgba(148,163,184,.35);border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,.4);font:11px/1.45 'Fira Code',monospace;overflow:hidden}
    #cie10DebugHead{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:#0f172a;border-bottom:1px solid rgba(148,163,184,.25)}
    #cie10DebugHead strong{color:#93c5fd;font-size:11px;letter-spacing:.04em}
    #cie10DebugState{color:#94a3b8;font-size:10px}
    #cie10DebugLog{padding:8px 10px;overflow:auto;white-space:pre-wrap;word-break:break-word;min-height:80px}
    #cie10DebugLog .ok{color:#86efac}#cie10DebugLog .warn{color:#fde68a}#cie10DebugLog .error{color:#fca5a5}#cie10DebugLog .info{color:#cbd5e1}
    #cie10DebugPanel button{border:1px solid rgba(148,163,184,.3);background:#111827;color:#cbd5e1;border-radius:6px;padding:3px 7px;font:inherit;cursor:pointer}
    #cie10DebugPanel.collapsed #cie10DebugLog{display:none}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('aside');
  panel.id = 'cie10DebugPanel';
  panel.innerHTML = `
    <div id="cie10DebugHead">
      <div><strong>DEBUG CIE-10</strong> <span id="cie10DebugState">iniciando…</span></div>
      <button id="cie10DebugToggle" type="button">OCULTAR</button>
    </div>
    <div id="cie10DebugLog"></div>`;
  document.body.appendChild(panel);

  const logRoot = document.getElementById('cie10DebugLog');
  const stateRoot = document.getElementById('cie10DebugState');
  const toggle = document.getElementById('cie10DebugToggle');

  function renderEntry(entry) {
    const row = document.createElement('div');
    row.className = entry.level;
    row.textContent = `[${entry.time}] ${entry.message}`;
    logRoot.appendChild(row);
    logRoot.scrollTop = logRoot.scrollHeight;
  }

  function log(message, level = 'info') {
    const entry = { time: stamp(), message: text(message), level };
    entries.push(entry);
    if (entries.length > 120) entries.shift();
    renderEntry(entry);
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info']('[CIE10-DEBUG]', entry.message);
  }

  window.Cie10Debug = {
    log,
    entries,
    setState(value) { stateRoot.textContent = String(value); },
    markOk(value) { stateRoot.textContent = String(value); log(value, 'ok'); }
  };

  toggle.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    toggle.textContent = panel.classList.contains('collapsed') ? 'MOSTRAR' : 'OCULTAR';
  });

  window.addEventListener('error', event => {
    log(`ERROR GLOBAL · ${event.message || 'sin mensaje'} · ${event.filename || ''}:${event.lineno || ''}`, 'error');
  });
  window.addEventListener('unhandledrejection', event => {
    log(`PROMESA RECHAZADA · ${text(event.reason)}`, 'error');
  });

  log(`HTML listo · ${location.href}`);
  log(`UA · ${navigator.userAgent}`);
  log(`DecompressionStream · ${typeof DecompressionStream === 'function' ? 'SI' : 'NO'}`, typeof DecompressionStream === 'function' ? 'ok' : 'warn');
  log(`Pako al iniciar · ${window.pako?.ungzip ? 'SI' : 'NO (esperado en esta prueba)'}`);

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const target = args[0] instanceof Request ? args[0].url : String(args[0]);
    const short = target.split('/').pop();
    const t0 = performance.now();
    log(`FETCH INICIO · ${short}`);
    try {
      const response = await nativeFetch(...args);
      log(`FETCH RESPUESTA · ${short} · HTTP ${response.status} · ${Math.round(performance.now() - t0)} ms`, response.ok ? 'ok' : 'error');
      return response;
    } catch (error) {
      log(`FETCH ERROR · ${short} · ${Math.round(performance.now() - t0)} ms · ${text(error)}`, 'error');
      throw error;
    }
  };

  const nativeText = Response.prototype.text;
  Response.prototype.text = async function(...args) {
    const t0 = performance.now();
    const url = this.url || 'Response local';
    const short = url.split('/').pop() || url;
    log(`BODY INICIO · ${short}`);
    try {
      const body = await nativeText.apply(this, args);
      log(`BODY LISTO · ${short} · ${body.length.toLocaleString('es-MX')} chars · ${Math.round(performance.now() - t0)} ms`, 'ok');
      return body;
    } catch (error) {
      log(`BODY ERROR · ${short} · ${text(error)}`, 'error');
      throw error;
    }
  };

  const watchNode = (id, label) => {
    const node = document.getElementById(id);
    if (!node) { log(`No existe #${id}`, 'warn'); return; }
    let last = node.textContent.trim();
    log(`${label} inicial · ${last}`);
    new MutationObserver(() => {
      const now = node.textContent.trim();
      if (now !== last) {
        last = now;
        log(`${label} · ${now}`);
        stateRoot.textContent = now;
      }
    }).observe(node, { childList: true, subtree: true, characterData: true });
  };
  watchNode('cie10LoadingText', 'ETAPA');
  watchNode('cie10Status', 'ESTADO');

  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          log(`LONG TASK · ${Math.round(entry.duration)} ms`, entry.duration > 1000 ? 'error' : 'warn');
        }
      });
      observer.observe({ type: 'longtask', buffered: true });
    } catch (_) {}
  }

  let lastBeat = performance.now();
  setInterval(() => {
    const now = performance.now();
    const gap = now - lastBeat;
    lastBeat = now;
    heartbeat += 1;
    if (gap > 1800) log(`HEARTBEAT retrasado · ${Math.round(gap)} ms`, 'warn');
    stateRoot.dataset.heartbeat = String(heartbeat);
  }, 1000);

  window.addEventListener('DOMContentLoaded', () => log('DOMContentLoaded', 'ok'), { once: true });
  window.addEventListener('load', () => log('window.load', 'ok'), { once: true });
})();
