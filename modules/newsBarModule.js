/*
  CENSO DE URGENCIAS · newsBarModule.js
  Versión: 1.3

  RESPONSABILIDAD:
  - Escuchar anuncios internos desde Firestore.
  - Mostrar noticias externas solamente cuando no hay anuncios activos.
  - Mantener una velocidad lineal constante para ambos tipos de contenido.
  - Priorizar Delicias, Chihuahua, medicina y México con máximo 12 noticias.
  - Administrar anuncios mediante Ctrl + Alt + N.
*/

const MODULE_VERSION = '1.3';
const ANNOUNCEMENTS_COLLECTION = 'announcements';
const AUTH_EMAIL_INTERNO = 'interno@hrd.censo';
const DESKTOP_MEDIA = window.matchMedia('(min-width: 769px)');
const NEWS_TIME_ZONE = 'America/Chihuahua';

const PIXELS_PER_SECOND = 55;
const EXTERNAL_REFRESH_INTERVAL = 20 * 60 * 1000;
const EXTERNAL_RETRY_INTERVAL = 10 * 60 * 1000;
const EXTERNAL_MAX_ITEMS = 12;
const ACTIVITY_THROTTLE = 15 * 1000;
const EXTERNAL_REQUEST_TIMEOUT = 9000;

const STORAGE = {
  externalCache: 'censo-newsbar-external-cache-v1',
  adminSession: 'censo-newsbar-admin-session-v1'
};

const EXTERNAL_FEEDS = [
  {
    region: 'Delicias',
    code: 'DEL',
    limit: 12,
    rssUrl:
      'https://news.google.com/rss/search?q=' +
      encodeURIComponent('"Delicias" Chihuahua when:1d') +
      '&hl=es-419&gl=MX&ceid=MX:es-419'
  },
  {
    region: 'Chihuahua',
    code: 'CHIH',
    limit: 12,
    rssUrl:
      'https://news.google.com/rss/search?q=' +
      encodeURIComponent('Chihuahua México when:1d') +
      '&hl=es-419&gl=MX&ceid=MX:es-419'
  },
  {
    region: 'Medicina',
    code: 'MED',
    limit: 12,
    rssUrl:
      'https://news.google.com/rss/search?q=' +
      encodeURIComponent(
        '("salud" OR "medicina" OR "hospitales" OR "medicamentos" OR "enfermedades") México when:1d'
      ) +
      '&hl=es-419&gl=MX&ceid=MX:es-419'
  },
  {
    region: 'México',
    code: 'MX',
    limit: 12,
    rssUrl:
      'https://news.google.com/rss?hl=es-419&gl=MX&ceid=MX:es-419'
  }
];

const EXTERNAL_PRIORITY = [
  { code: 'DEL', preferred: 4, maximum: 6 },
  { code: 'CHIH', preferred: 3, maximum: 5 },
  { code: 'MED', preferred: 3, maximum: 3 },
  { code: 'MX', preferred: 2, maximum: 12 }
];

const EXTERNAL_DISPLAY_SEQUENCE = [
  'DEL',
  'CHIH',
  'MED',
  'DEL',
  'MX',
  'CHIH',
  'MED',
  'DEL',
  'MX',
  'MED',
  'CHIH',
  'DEL'
];

function selectPrioritizedExternalNews(items) {
  const grouped = new Map(
    EXTERNAL_PRIORITY.map(({ code }) => [code, []])
  );

  items
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((item) => {
      const bucket = grouped.get(item.regionCode);
      if (bucket) bucket.push(item);
    });

  const selectedByCode = new Map(
    EXTERNAL_PRIORITY.map(({ code }) => [code, []])
  );
  const selectedIds = new Set();

  function takeFromRegion(code, amount, maximum) {
    const source = grouped.get(code) || [];
    const destination = selectedByCode.get(code) || [];
    let taken = 0;

    for (const item of source) {
      if (taken >= amount || destination.length >= maximum) break;
      if (selectedIds.has(item.id)) continue;

      destination.push(item);
      selectedIds.add(item.id);
      taken += 1;
    }

    selectedByCode.set(code, destination);
  }

  // Primera pasada: reserva la mezcla recomendada.
  EXTERNAL_PRIORITY.forEach(({ code, preferred, maximum }) => {
    takeFromRegion(code, preferred, maximum);
  });

  // Completa espacios con prioridad geográfica.
  // Medicina permanece limitada a tres titulares.
  const fillPriority = ['DEL', 'CHIH', 'MX'];

  while (
    Array.from(selectedByCode.values()).flat().length < EXTERNAL_MAX_ITEMS
  ) {
    let addedInPass = false;

    for (const code of fillPriority) {
      const config = EXTERNAL_PRIORITY.find((item) => item.code === code);
      const before = selectedByCode.get(code).length;

      takeFromRegion(code, 1, config.maximum);

      if (selectedByCode.get(code).length > before) {
        addedInPass = true;
      }

      if (
        Array.from(selectedByCode.values()).flat().length >=
        EXTERNAL_MAX_ITEMS
      ) {
        break;
      }
    }

    if (!addedInPass) break;
  }

  // Intercala MED entre las noticias regionales.
  const queues = new Map(
    Array.from(selectedByCode.entries()).map(([code, list]) => [
      code,
      [...list]
    ])
  );

  const ordered = [];

  for (const code of EXTERNAL_DISPLAY_SEQUENCE) {
    const queue = queues.get(code) || [];
    const item = queue.shift();

    if (item) ordered.push(item);
    queues.set(code, queue);
  }

  ['DEL', 'CHIH', 'MED', 'MX'].forEach((code) => {
    const queue = queues.get(code) || [];

    while (queue.length && ordered.length < EXTERNAL_MAX_ITEMS) {
      ordered.push(queue.shift());
    }
  });

  return ordered.slice(0, EXTERNAL_MAX_ITEMS);
}


export function createNewsBarModule(app) {
  const {
    db,
    auth,
    collection,
    onSnapshot,
    addDoc,
    doc,
    deleteDoc,
    serverTimestamp,
    signInWithEmailAndPassword,
    onAuthStateChanged
  } = app.firebase;

  let initialized = false;
  let visible = false;
  let announcementUnsubscribe = null;
  let newsAuthUnsubscribe = null;

  let announcements = [];
  let externalNews = [];
  let externalFetchedAt = 0;
  let externalLastAttemptAt = 0;
  let externalLoading = false;
  let externalLoadFailed = false;
  let lastActivityCheckAt = 0;

  let currentTickerItemHtml = '';
  let currentTickerItemCount = 0;
  let tickerFrame = 0;
  let resizeObserver = null;
  let desktopMediaHandler = null;

  let elements = {};

  function ensureStylesheet() {
    const id = 'censo-newsbar-styles';
    if (document.getElementById(id)) return;

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = new URL('./newsBar.css', import.meta.url).href;
    document.head.appendChild(link);
  }

  function resolveAppVersion() {
    const footerVersion = document.querySelector('.footer span:last-child');
    const raw = footerVersion?.textContent?.trim();

    if (raw) return raw.replace(/^v/i, '');
    return MODULE_VERSION;
  }

  function injectMarkup() {
    if (document.getElementById('censoNewsBar')) return;

    const appVersion = escapeHtml(resolveAppVersion());

    document.body.insertAdjacentHTML('beforeend', `
      <section
        id="censoNewsDrawer"
        class="censo-newsdrawer"
        aria-label="Avisos del servicio"
        hidden
      >
        <div class="censo-newsdrawer__head">
          <div>
            <h2>Avisos del servicio</h2>
            <small id="censoNewsDrawerStatus"></small>
          </div>
          <button
            id="censoNewsDrawerClose"
            class="censo-newsdrawer__close"
            type="button"
            aria-label="Cerrar"
          >×</button>
        </div>
        <div id="censoNewsDrawerList" class="censo-newsdrawer__list"></div>
      </section>

      <footer
        id="censoNewsBar"
        class="censo-newsbar"
        aria-label="Avisos y noticias"
        data-feed-mode="external"
      >
        <button
          id="censoNewsIcon"
          class="censo-newsbar__icon"
          type="button"
          aria-label="Avisos"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm10.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/>
          </svg>
        </button>

        <div id="censoNewsViewport" class="censo-newsbar__viewport">
          <div id="censoNewsTrack" class="censo-newsbar__track"></div>
        </div>

        <div class="censo-newsbar__signature">
          <span class="censo-newsbar__by">by</span>
          <strong>ROUROG</strong>
          <span>v${appVersion}</span>
        </div>
      </footer>

      <div id="censoNewsAdminModal" class="censo-newsmodal" hidden>
        <section
          class="censo-newsmodal__card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="censoNewsAdminTitle"
        >
          <div class="censo-newsmodal__head">
            <h2 id="censoNewsAdminTitle">Administración de avisos</h2>
            <button
              id="censoNewsAdminClose"
              class="censo-newsmodal__close"
              type="button"
              aria-label="Cerrar"
            >×</button>
          </div>

          <div class="censo-newsmodal__body">
            <div id="censoNewsAuthView">
              <p class="censo-newsmodal__copy">
                Introduce la misma contraseña usada para entrar al censo.
              </p>

              <div class="censo-newsmodal__field">
                <label for="censoNewsPassword">Contraseña</label>
                <input
                  id="censoNewsPassword"
                  type="password"
                  autocomplete="current-password"
                >
              </div>

              <p id="censoNewsAuthError" class="censo-newsmodal__error"></p>

              <div class="censo-newsmodal__actions">
                <button
                  id="censoNewsAuthSubmit"
                  class="censo-newsmodal__button censo-newsmodal__button--primary"
                  type="button"
                >Entrar</button>
              </div>
            </div>

            <div id="censoNewsManagerView" hidden>
              <form id="censoNewsForm">
                <div class="censo-newsmodal__field">
                  <label for="censoNewsText">Nuevo aviso</label>
                  <textarea
                    id="censoNewsText"
                    maxlength="240"
                    placeholder="Escribe un aviso breve y accionable..."
                    required
                  ></textarea>
                </div>

                <div class="censo-newsmodal__row">
                  <div class="censo-newsmodal__field">
                    <label for="censoNewsTime">Hora mostrada</label>
                    <input id="censoNewsTime" type="time">
                  </div>

                  <div class="censo-newsmodal__field">
                    <label for="censoNewsExpiry">Vigencia</label>
                    <select id="censoNewsExpiry">
                      <option value="0">Sin caducidad</option>
                      <option value="1">1 hora</option>
                      <option value="4">4 horas</option>
                      <option value="8" selected>8 horas</option>
                      <option value="24">24 horas</option>
                    </select>
                  </div>
                </div>

                <p id="censoNewsManagerMessage" class="censo-newsmodal__success"></p>

                <div class="censo-newsmodal__actions">
                  <button
                    id="censoNewsAdminLock"
                    class="censo-newsmodal__button"
                    type="button"
                  >Bloquear</button>
                  <button
                    class="censo-newsmodal__button censo-newsmodal__button--primary"
                    type="submit"
                  >Publicar aviso</button>
                </div>
              </form>

              <div id="censoNewsAdminList" class="censo-newsadmin-list"></div>

              <div class="censo-newsmodal__actions">
                <button
                  id="censoNewsDeleteAll"
                  class="censo-newsmodal__button censo-newsmodal__button--danger"
                  type="button"
                >Eliminar todos</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    `);

    elements = {
      bar: document.getElementById('censoNewsBar'),
      icon: document.getElementById('censoNewsIcon'),
      viewport: document.getElementById('censoNewsViewport'),
      track: document.getElementById('censoNewsTrack'),
      drawer: document.getElementById('censoNewsDrawer'),
      drawerClose: document.getElementById('censoNewsDrawerClose'),
      drawerStatus: document.getElementById('censoNewsDrawerStatus'),
      drawerList: document.getElementById('censoNewsDrawerList'),
      adminModal: document.getElementById('censoNewsAdminModal'),
      adminClose: document.getElementById('censoNewsAdminClose'),
      authView: document.getElementById('censoNewsAuthView'),
      managerView: document.getElementById('censoNewsManagerView'),
      password: document.getElementById('censoNewsPassword'),
      authError: document.getElementById('censoNewsAuthError'),
      authSubmit: document.getElementById('censoNewsAuthSubmit'),
      form: document.getElementById('censoNewsForm'),
      text: document.getElementById('censoNewsText'),
      time: document.getElementById('censoNewsTime'),
      expiry: document.getElementById('censoNewsExpiry'),
      managerMessage: document.getElementById('censoNewsManagerMessage'),
      adminList: document.getElementById('censoNewsAdminList'),
      adminLock: document.getElementById('censoNewsAdminLock'),
      deleteAll: document.getElementById('censoNewsDeleteAll')
    };
  }

  function bindEvents() {
    elements.bar.addEventListener('click', (event) => {
      if (event.target.closest('.censo-newsbar__link')) return;
      if (elements.bar.dataset.feedMode !== 'internal') return;

      if (
        event.target.closest(
          '.censo-newsbar__icon, .censo-newsbar__viewport, .censo-newsbar__signature'
        )
      ) {
        toggleDrawer();
      }
    });

    elements.drawerClose.addEventListener('click', closeDrawer);

    elements.adminClose.addEventListener('click', closeAdmin);
    elements.adminModal.addEventListener('click', (event) => {
      if (event.target === elements.adminModal) closeAdmin();
    });

    elements.authSubmit.addEventListener('click', authenticateAdmin);
    elements.password.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') authenticateAdmin();
    });

    elements.form.addEventListener('submit', publishAnnouncement);

    elements.adminList.addEventListener('click', (event) => {
      const button = event.target.closest('[data-delete-announcement]');
      if (button) deleteAnnouncement(button.dataset.deleteAnnouncement);
    });

    elements.adminLock.addEventListener('click', () => {
      sessionStorage.removeItem(STORAGE.adminSession);
      showAuthView();
    });

    elements.deleteAll.addEventListener('click', deleteAllAnnouncements);

    document.addEventListener('keydown', handleGlobalKeydown);

    document.addEventListener('pointerdown', handleCensusActivity, {
      capture: true,
      passive: true
    });
    document.addEventListener('keydown', handleCensusActivity, {
      capture: true
    });
    document.addEventListener('input', handleCensusActivity, {
      capture: true
    });
    document.addEventListener('change', handleCensusActivity, {
      capture: true
    });
    window.addEventListener('focus', handleCensusActivity);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleCensusActivity();
    });

    window.addEventListener('resize', scheduleTickerSpeed, { passive: true });

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(scheduleTickerSpeed);
      resizeObserver.observe(elements.viewport);
    }
  }

  function startAnnouncementListener() {
    if (announcementUnsubscribe) return;

    announcementUnsubscribe = onSnapshot(
      collection(db, ANNOUNCEMENTS_COLLECTION),
      (snapshot) => {
        announcements = snapshot.docs.map((snapshotDoc) => {
          const data = snapshotDoc.data() || {};

          return {
            id: snapshotDoc.id,
            text: String(data.text || '').trim(),
            displayTime: String(data.displayTime || '--:--'),
            createdAtMs:
              Number(data.createdAtMs) ||
              data.createdAt?.toMillis?.() ||
              Date.now(),
            expiresAt:
              Number(data.expiresAt) ||
              data.expiresAt?.toMillis?.() ||
              null
          };
        });

        render();
      },
      (error) => {
        console.error('[NEWSBAR] Error escuchando anuncios:', error);
        announcements = [];
        render();
      }
    );
  }

  function stopAnnouncementListener() {
    if (!announcementUnsubscribe) return;
    announcementUnsubscribe();
    announcementUnsubscribe = null;
  }

  function getActiveAnnouncements() {
    const now = Date.now();

    return announcements
      .filter((item) => item.text && (!item.expiresAt || item.expiresAt > now))
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  }

  function getDisplayState() {
    const internal = getActiveAnnouncements();

    if (internal.length) {
      return {
        mode: 'internal',
        items: internal.map((item) => ({
          ...item,
          kind: 'internal'
        }))
      };
    }

    return {
      mode: 'external',
      items: getTodayExternalNews()
    };
  }

  function render() {
    if (!initialized) return;

    const state = getDisplayState();
    elements.bar.dataset.feedMode = state.mode;

    if (state.mode === 'external') {
      closeDrawer();
    }

    if (!state.items.length) {
      currentTickerItemHtml = '';
      currentTickerItemCount = 0;

      const message = externalLoading
        ? 'Cargando noticias externas…'
        : externalLoadFailed
          ? 'No hay avisos y no fue posible consultar noticias de hoy.'
          : 'No hay avisos ni noticias publicadas hoy.';

      elements.track.innerHTML = `
        <div class="censo-newsbar__group">
          <div class="censo-newsbar__item">${escapeHtml(message)}</div>
        </div>
      `;

      elements.drawerList.innerHTML = `
        <div class="censo-news-empty">No hay avisos activos.</div>
      `;
      elements.drawerStatus.textContent = '';
      renderAdminList();
      return;
    }

    currentTickerItemCount = state.items.length;
    currentTickerItemHtml = state.items.map((item) => {
      const label = item.kind === 'external'
        ? item.regionCode
        : item.displayTime;

      if (item.kind === 'external') {
        return `
          <a
            class="censo-newsbar__item censo-newsbar__link"
            href="${escapeHtml(item.url)}"
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir noticia"
          >
            <span class="censo-newsbar__item-label">${escapeHtml(label)}</span>
            <span>${escapeHtml(item.text)}</span>
          </a>
        `;
      }

      return `
        <div class="censo-newsbar__item">
          <span class="censo-newsbar__item-label">${escapeHtml(label)}</span>
          <span>${escapeHtml(item.text)}</span>
        </div>
      `;
    }).join('');

    const group = `
      <div class="censo-newsbar__group">${currentTickerItemHtml}</div>
    `;

    elements.track.innerHTML = group + group;
    scheduleTickerSpeed();

    if (state.mode === 'internal') {
      elements.drawerStatus.textContent =
        `${state.items.length} aviso${state.items.length === 1 ? '' : 's'} activo${state.items.length === 1 ? '' : 's'}`;

      elements.drawerList.innerHTML = state.items.map((item) => `
        <article class="censo-newsdrawer__item">
          <time>${escapeHtml(item.displayTime)}</time>
          <p>${escapeHtml(item.text)}</p>
        </article>
      `).join('');
    }

    renderAdminList();

    if (state.mode === 'external') {
      ensureExternalFeed();
    }
  }

  function scheduleTickerSpeed() {
    if (!elements.track || !elements.viewport) return;

    if (tickerFrame) cancelAnimationFrame(tickerFrame);

    tickerFrame = requestAnimationFrame(() => {
      tickerFrame = 0;
      applyConstantTickerSpeed();
    });
  }

  function applyConstantTickerSpeed() {
    const groups = elements.track.querySelectorAll('.censo-newsbar__group');

    if (groups.length < 2 || !currentTickerItemHtml) return;

    // Cada aviso aparece una sola vez dentro de cada ciclo.
    // Los dos grupos existen únicamente para cerrar el bucle sin saltos.
    groups.forEach((group) => {
      group.innerHTML = currentTickerItemHtml;
    });

    const contentWidth = Math.max(1, groups[0].scrollWidth);
    const viewportWidth = Math.max(1, elements.viewport.clientWidth);

    // Con un solo aviso dejamos un tramo vacío amplio para que no parezca
    // repetido continuamente. Con varios avisos solo separamos los ciclos.
    const minimumGap =
      currentTickerItemCount === 1
        ? Math.max(viewportWidth, 360)
        : 180;

    // Si el contenido es muy corto, garantizamos que el siguiente ciclo
    // no entre antes de que el anterior haya abandonado la pantalla.
    const clearanceGap = Math.max(
      minimumGap,
      viewportWidth - contentWidth + 120
    );

    const spacerHtml = `
      <span
        class="censo-newsbar__cycle-gap"
        aria-hidden="true"
        style="width:${Math.ceil(clearanceGap)}px"
      ></span>
    `;

    groups.forEach((group) => {
      group.insertAdjacentHTML('beforeend', spacerHtml);
    });

    const travelDistance = Math.max(1, groups[0].scrollWidth);
    const durationSeconds = Math.max(4, travelDistance / PIXELS_PER_SECOND);

    elements.track.style.setProperty(
      '--censo-newsbar-duration',
      `${durationSeconds.toFixed(3)}s`
    );

    elements.track.style.animation = 'none';
    void elements.track.offsetWidth;
    elements.track.style.animation = '';
  }

  function loadExternalCache() {
    try {
      const cache = JSON.parse(
        localStorage.getItem(STORAGE.externalCache) || '{}'
      );

      externalNews = Array.isArray(cache.items)
        ? selectPrioritizedExternalNews(cache.items)
        : [];
      externalFetchedAt = Number(cache.fetchedAt) || 0;
      externalLastAttemptAt = externalFetchedAt;
    } catch {
      externalNews = [];
      externalFetchedAt = 0;
      externalLastAttemptAt = 0;
    }
  }

  function saveExternalCache(items) {
    externalNews = items;
    externalFetchedAt = Date.now();

    localStorage.setItem(
      STORAGE.externalCache,
      JSON.stringify({
        fetchedAt: externalFetchedAt,
        items
      })
    );
  }

  async function ensureExternalFeed(force = false) {
    if (getActiveAnnouncements().length || externalLoading) return;

    const now = Date.now();
    const cacheBelongsToToday =
      externalFetchedAt > 0 &&
      getDateKey(externalFetchedAt) === getDateKey();

    const requiredInterval = externalLoadFailed
      ? EXTERNAL_RETRY_INTERVAL
      : EXTERNAL_REFRESH_INTERVAL;

    const refreshIsDue =
      externalLastAttemptAt === 0 ||
      !cacheBelongsToToday ||
      now - externalLastAttemptAt >= requiredInterval;

    if (!force && !refreshIsDue) return;

    externalLastAttemptAt = now;
    externalLoading = true;
    externalLoadFailed = false;
    render();

    const results = await Promise.allSettled(
      EXTERNAL_FEEDS.map(fetchExternalFeed)
    );

    const candidates = [];
    const seen = new Set();
    let successfulFeeds = 0;

    results.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      successfulFeeds += 1;

      result.value.forEach((item) => {
        const key = normalizeTitle(item.text);
        if (!key || seen.has(key)) return;

        seen.add(key);
        candidates.push(item);
      });
    });

    const selectedItems = selectPrioritizedExternalNews(candidates);
    externalLoading = false;

    if (successfulFeeds > 0) {
      // Se guarda incluso una lista vacía válida para evitar consultas repetidas.
      externalLoadFailed = false;
      saveExternalCache(selectedItems);
    } else {
      externalLoadFailed = true;
    }

    render();
  }

  async function fetchExternalFeed(feed) {
    const endpoint =
      'https://api.rss2json.com/v1/api.json?rss_url=' +
      encodeURIComponent(feed.rssUrl);

    const payload = await fetchJsonWithTimeout(
      endpoint,
      EXTERNAL_REQUEST_TIMEOUT
    );

    if (payload.status !== 'ok' || !Array.isArray(payload.items)) {
      throw new Error(payload.message || 'Respuesta RSS inválida');
    }

    return payload.items
      .slice(0, feed.limit * 2)
      .map((entry, index) => {
        const parsed = splitGoogleNewsTitle(entry.title);
        const publishedAt = Date.parse(entry.pubDate || '') || Date.now();

        return {
          id: `external-${feed.code}-${publishedAt}-${index}`,
          kind: 'external',
          region: feed.region,
          regionCode: feed.code,
          text: parsed.headline,
          source: parsed.source,
          url: entry.link || feed.rssUrl,
          createdAt: publishedAt
        };
      })
      .filter((item) =>
        item.text &&
        item.url &&
        isPublishedToday(item.createdAt)
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, feed.limit);
  }

  async function fetchJsonWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function handleCensusActivity() {
    if (!DESKTOP_MEDIA.matches || !visible) return;

    const now = Date.now();

    if (now - lastActivityCheckAt < ACTIVITY_THROTTLE) return;
    lastActivityCheckAt = now;

    if (!getActiveAnnouncements().length) {
      ensureExternalFeed();
    }
  }

  function handleGlobalKeydown(event) {
    if (
      event.ctrlKey &&
      event.altKey &&
      event.key.toLowerCase() === 'n'
    ) {
      event.preventDefault();
      openAdmin();
      return;
    }

    if (event.key === 'Escape') {
      closeAdmin();
      closeDrawer();
    }
  }

  function openDrawer() {
    if (elements.bar.dataset.feedMode !== 'internal') return;
    elements.drawer.hidden = false;
  }

  function closeDrawer() {
    if (elements.drawer) elements.drawer.hidden = true;
  }

  function toggleDrawer() {
    if (elements.drawer.hidden) openDrawer();
    else closeDrawer();
  }

  function openAdmin() {
    elements.authError.textContent = '';
    elements.managerMessage.textContent = '';
    elements.password.value = '';
    elements.adminModal.hidden = false;

    if (sessionStorage.getItem(STORAGE.adminSession) === '1') {
      showManagerView();
    } else {
      showAuthView();
    }
  }

  function closeAdmin() {
    if (elements.adminModal) elements.adminModal.hidden = true;
  }

  function showAuthView() {
    elements.authView.hidden = false;
    elements.managerView.hidden = true;

    setTimeout(() => elements.password.focus(), 40);
  }

  function showManagerView() {
    elements.authView.hidden = true;
    elements.managerView.hidden = false;
    setCurrentTime();
    renderAdminList();

    setTimeout(() => elements.text.focus(), 40);
  }

  async function authenticateAdmin() {
    const password = elements.password.value;

    if (!password) {
      elements.authError.textContent = 'Introduce la contraseña.';
      return;
    }

    elements.authSubmit.disabled = true;
    elements.authSubmit.textContent = 'Validando...';
    elements.authError.textContent = '';

    try {
      await signInWithEmailAndPassword(
        auth,
        AUTH_EMAIL_INTERNO,
        password
      );

      sessionStorage.setItem(STORAGE.adminSession, '1');
      showManagerView();
    } catch (error) {
      console.error('[NEWSBAR] Contraseña administrativa incorrecta:', error);
      elements.authError.textContent = 'Contraseña incorrecta.';
      elements.password.select();
    } finally {
      elements.authSubmit.disabled = false;
      elements.authSubmit.textContent = 'Entrar';
    }
  }

  async function publishAnnouncement(event) {
    event.preventDefault();

    const text = elements.text.value.trim();
    if (!text) return;

    const now = Date.now();
    const expiryHours = Number(elements.expiry.value);

    try {
      await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), {
        text,
        displayTime: elements.time.value || formatTime(now),
        createdAt: serverTimestamp(),
        createdAtMs: now,
        expiresAt:
          expiryHours > 0
            ? now + expiryHours * 60 * 60 * 1000
            : null,
        createdBy: auth.currentUser?.uid || null
      });

      elements.text.value = '';
      setCurrentTime();
      elements.managerMessage.textContent = 'Aviso publicado.';

      setTimeout(() => {
        elements.managerMessage.textContent = '';
      }, 1800);
    } catch (error) {
      console.error('[NEWSBAR] No se pudo publicar:', error);
      elements.managerMessage.textContent = 'No se pudo publicar el aviso.';
    }
  }

  async function deleteAnnouncement(id) {
    const item = announcements.find((announcement) => announcement.id === id);
    if (!item) return;

    if (!confirm(`¿Eliminar este aviso?\n\n${item.text}`)) return;

    try {
      await deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id));
    } catch (error) {
      console.error('[NEWSBAR] No se pudo eliminar:', error);
      alert('No se pudo eliminar el aviso.');
    }
  }

  async function deleteAllAnnouncements() {
    if (!announcements.length) return;

    if (
      !confirm(
        '¿Eliminar todos los avisos? La barra volverá a mostrar noticias externas.'
      )
    ) {
      return;
    }

    const results = await Promise.allSettled(
      announcements.map((item) =>
        deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, item.id))
      )
    );

    const failed = results.filter((result) => result.status === 'rejected');

    if (failed.length) {
      console.error('[NEWSBAR] Algunos avisos no se eliminaron:', failed);
      alert(`No se pudieron eliminar ${failed.length} avisos.`);
    }
  }

  function renderAdminList() {
    if (!elements.managerView || elements.managerView.hidden) return;

    const sorted = [...announcements].sort(
      (a, b) => b.createdAtMs - a.createdAtMs
    );

    elements.adminList.innerHTML = sorted.length
      ? sorted.map((item) => `
          <article class="censo-newsadmin-item">
            <div>
              <p>
                <strong>${escapeHtml(item.displayTime)}</strong>
                · ${escapeHtml(item.text)}
              </p>
              <small>${escapeHtml(formatExpiry(item.expiresAt))}</small>
            </div>
            <button
              class="censo-newsadmin-delete"
              type="button"
              data-delete-announcement="${escapeHtml(item.id)}"
              title="Eliminar"
            >×</button>
          </article>
        `).join('')
      : `
        <div class="censo-news-empty">
          No hay avisos internos. La barra está usando noticias externas.
        </div>
      `;
  }

  function setCurrentTime() {
    elements.time.value = formatTime(Date.now());
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);

    return (
      String(date.getHours()).padStart(2, '0') +
      ':' +
      String(date.getMinutes()).padStart(2, '0')
    );
  }

  function formatExpiry(expiresAt) {
    if (!expiresAt) return 'Sin caducidad';
    if (expiresAt <= Date.now()) return 'Caducado';

    return `Caduca ${new Date(expiresAt).toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short'
    })}`;
  }


  function getDateKey(timestamp = Date.now()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: NEWS_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date(timestamp));

    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value])
    );

    return `${values.year}-${values.month}-${values.day}`;
  }

  function isPublishedToday(timestamp) {
    return getDateKey(timestamp) === getDateKey();
  }

  function getTodayExternalNews() {
    return externalNews.filter((item) => isPublishedToday(item.createdAt));
  }

  function splitGoogleNewsTitle(rawTitle) {
    const title = String(rawTitle || '').trim();
    const parts = title.split(' - ');

    if (parts.length < 2) {
      return { headline: title, source: '' };
    }

    const source = parts.pop().trim();

    return {
      headline: parts.join(' - ').trim(),
      source
    };
  }

  function normalizeTitle(value) {
    return String(value)
      .toLocaleLowerCase('es-MX')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }



  function initNewsBarAuthBridge() {
    if (newsAuthUnsubscribe) return;

    newsAuthUnsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        // Cede el ciclo actual para que authModule actualice primero la pantalla.
        window.setTimeout(() => {
          if (user) startNewsBar();
          else hideNewsBar();
        }, 0);
      },
      (error) => {
        console.error('[NEWSBAR] Error observando Firebase Auth:', error);
        hideNewsBar();
      }
    );
  }

  function applyDesktopVisibility() {
    if (!initialized) return;

    if (visible && DESKTOP_MEDIA.matches) {
      document.body.classList.add('censo-newsbar-visible');
      startAnnouncementListener();
      render();

      if (!getActiveAnnouncements().length) {
        ensureExternalFeed();
      }
      return;
    }

    document.body.classList.remove('censo-newsbar-visible');
    closeDrawer();
    closeAdmin();
    stopAnnouncementListener();
  }

  function startNewsBar() {
    if (!initialized) {
      ensureStylesheet();
      injectMarkup();
      bindEvents();
      loadExternalCache();
      initialized = true;

      desktopMediaHandler = () => applyDesktopVisibility();
      DESKTOP_MEDIA.addEventListener('change', desktopMediaHandler);

      setInterval(() => {
        if (visible && DESKTOP_MEDIA.matches) render();
      }, 60 * 1000);
    }

    visible = true;
    applyDesktopVisibility();
  }

  function hideNewsBar() {
    visible = false;
    applyDesktopVisibility();
  }

  function destroyNewsBar() {
    hideNewsBar();
    stopAnnouncementListener();

    if (newsAuthUnsubscribe) {
      newsAuthUnsubscribe();
      newsAuthUnsubscribe = null;
    }

    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }

    if (desktopMediaHandler) {
      DESKTOP_MEDIA.removeEventListener('change', desktopMediaHandler);
      desktopMediaHandler = null;
    }

    document.getElementById('censoNewsBar')?.remove();
    document.getElementById('censoNewsDrawer')?.remove();
    document.getElementById('censoNewsAdminModal')?.remove();

    initialized = false;
    elements = {};
  }

  return {
    initNewsBarAuthBridge,
    startNewsBar,
    hideNewsBar,
    destroyNewsBar,
    refreshExternalNews: () => ensureExternalFeed(true)
  };
}
