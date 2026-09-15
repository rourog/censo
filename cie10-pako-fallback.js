(() => {
  const CDN = 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js';
  const TIMEOUT_MS = 7000;

  function retryIfNeeded() {
    const errorBox = document.getElementById('cie10Error');
    const retryBtn = document.getElementById('cie10Retry');
    const status = document.getElementById('cie10Status')?.textContent || '';
    if ((errorBox && !errorBox.hidden) || /error/i.test(status)) {
      window.setTimeout(() => retryBtn?.click(), 60);
    }
  }

  function loadPako() {
    if (window.pako?.ungzip) {
      retryIfNeeded();
      return;
    }

    const script = document.createElement('script');
    script.src = CDN;
    script.async = true;
    script.crossOrigin = 'anonymous';

    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      script.remove();
    }, TIMEOUT_MS);

    script.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (window.pako?.ungzip) retryIfNeeded();
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
    };

    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPako, { once:true });
  } else {
    loadPako();
  }
})();
