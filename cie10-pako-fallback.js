(() => {
  const DEBUG = () => window.Cie10Debug;
  const CDN = 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js';
  const TIMEOUT_MS = 7000;

  function log(message, level = 'info') {
    DEBUG()?.log?.(message, level);
  }

  function retryIfNeeded() {
    const errorBox = document.getElementById('cie10Error');
    const retryBtn = document.getElementById('cie10Retry');
    const status = document.getElementById('cie10Status')?.textContent || '';
    if ((errorBox && !errorBox.hidden) || /error/i.test(status)) {
      log('PAKO disponible · reintentando catálogo automáticamente', 'warn');
      window.setTimeout(() => retryBtn?.click(), 60);
    }
  }

  function loadPako() {
    if (window.pako?.ungzip) {
      log('PAKO ya estaba disponible', 'ok');
      retryIfNeeded();
      return;
    }

    log('PAKO FALLBACK · iniciando descarga CDN');
    const script = document.createElement('script');
    script.src = CDN;
    script.async = true;
    script.crossOrigin = 'anonymous';

    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      log(`PAKO FALLBACK · timeout después de ${TIMEOUT_MS} ms`, 'error');
      script.remove();
    }, TIMEOUT_MS);

    script.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (window.pako?.ungzip) {
        log('PAKO FALLBACK · cargado correctamente', 'ok');
        retryIfNeeded();
      } else {
        log('PAKO FALLBACK · script cargó pero window.pako.ungzip no existe', 'error');
      }
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      log('PAKO FALLBACK · error de red/CDN', 'error');
    };

    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPako, { once: true });
  } else {
    loadPako();
  }
})();
