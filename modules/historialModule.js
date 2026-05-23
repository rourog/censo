/*
  MÓDULO: historialModule.js

  RESPONSABILIDAD:
  - Controlar historial.html.
  - Reutilizar firebaseModule.js para Auth/Firestore.
  - Reutilizar utilsModule.js para escapeHtml, normalizar y vibración.
  - Cargar, filtrar, renderizar y purgar registros de la colección "historial".

  NO DEBE:
  - Contener contraseñas hardcodeadas.
  - Inicializar Firebase por su cuenta.
  - Duplicar configuración de Firebase.
*/

import {
  auth,
  db,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  deleteDoc,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from './firebaseModule.js?v=historial-admin-v3-20260522';

import {
  escapeHtml,
  normalizar,
  vibrar
} from './utilsModule.js?v=historial-admin-v3-20260522';

const BUILD = 'historial-admin-v3-20260522';
const AUTH_EMAIL_ADMIN = 'adscrito@hrd.censo';

const BASE_THEMES = [
  'base-dark',
  'base-midnight',
  'base-gray-dark',
  'base-navy',
  'base-plum',
  'base-forest',
  'base-coffee',
  'base-light',
  'base-pure-white',
  'base-gray-light',
  'base-sand',
  'base-rose',
  'base-mint',
  'base-lavender'
];

const ACCENT_THEMES = [
  'accent-blue',
  'accent-pure-blue',
  'accent-green',
  'accent-emerald',
  'accent-pink',
  'accent-purple',
  'accent-orange',
  'accent-amber',
  'accent-red',
  'accent-pure-red',
  'accent-crimson',
  'accent-gold',
  'accent-teal',
  'accent-lime',
  'accent-indigo',
  'accent-cyan'
];

const state = {
  historialGlobal: [],
  filtrados: [],
  isFetching: false,
  targetDeleteId: null,
  authInitialResponded: false,
  soloAlertas: false
};

function $(id) {
  return document.getElementById(id);
}

function formatTimestamp(value, options = {}) {
  if (!value) return '-';

  let date = null;

  if (typeof value.toDate === 'function') {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }

  if (!date || Number.isNaN(date.getTime())) return '-';

  const baseOptions = {
    day: '2-digit',
    month: 'short',
    year: options.shortYear ? '2-digit' : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };

  return date.toLocaleString('es-MX', baseOptions).toUpperCase();
}

function normalizeHistoryDoc(docSnap) {
  const data = docSnap.data() || {};

  const fechaEgresoStr = formatTimestamp(data.fechaEgreso);
  const fechaIngresoStr = formatTimestamp(data.creado, { shortYear: true });

  return {
    id: docSnap.id,
    ...data,
    alerta: Boolean(data.alerta),
    observacionAlerta: String(data.observacionAlerta || '').trim(),
    fechaEgresoStr,
    fechaIngresoStr
  };
}

function getDestinoCategory(destino) {
  const dest = normalizar(destino || '');

  if (dest.includes('alta')) return 'alta';
  if (dest.includes('defuncion')) return 'defuncion';
  if (dest.includes('medicina interna')) return 'interna';
  if (dest.includes('cirugia')) return 'cirugia';
  if (dest.includes('ginecologia') || dest.includes('tococirugia')) return 'ginecologia';
  if (dest.includes('pediatria')) return 'pediatria';
  if (dest.includes('traumatologia')) return 'traumatologia';

  return '';
}

function renderChip(destino) {
  if (!destino) return '<span class="history-muted">-</span>';
  return `<span class="history-chip">${escapeHtml(destino)}</span>`;
}

function renderEmpty(message) {
  const tbody = $('tableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7"><div class="history-empty">${escapeHtml(message)}</div></td></tr>`;
}

function renderError(message) {
  const tbody = $('tableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7"><div class="history-error">${escapeHtml(message)}</div></td></tr>`;
}

function renderTable(lista) {
  const tbody = $('tableBody');
  const counterText = $('counterText');
  if (!tbody) return;

  if (counterText) {
    const total = state.historialGlobal.length;
    const alertas = state.historialGlobal.filter(p => p.alerta || p.observacionAlerta).length;
    counterText.textContent = `${lista.length} / ${total} REGISTROS · ${alertas} ALERTAS`;
  }

  if (!lista.length) {
    renderEmpty('No se encontraron egresos que coincidan con la búsqueda.');
    return;
  }

  const rows = [];

  lista.forEach((p) => {
    const egresadoPor = p.egresadoPor
      ? `<span class="history-badge">${escapeHtml(p.egresadoPor)}</span>`
      : '';

    const rowClass = p.alerta ? 'history-alert-row' : '';

    rows.push(`
      <tr class="${rowClass}" data-id="${escapeHtml(p.id)}">
        <td>
          <div class="history-patient-name">${escapeHtml(p.nombre || '-')}</div>
          ${egresadoPor}
        </td>

        <td>
          <span class="history-muted">${escapeHtml(p.edad || '-')}</span>
        </td>

        <td>
          <span style="color: var(--accent); font-weight: 700;">${escapeHtml(p.cama || '-')}</span>
          <span class="history-muted" style="display:block;">${escapeHtml(p.area || '')}</span>
        </td>

        <td>
          <div>${escapeHtml(p.diagnostico || '-')}</div>
        </td>

        <td>
          ${renderChip(p.destino)}
        </td>

        <td>
          <div style="font-weight:700;">${escapeHtml(p.fechaEgresoStr || '-')}</div>
          <span class="history-muted" title="Ingreso original">ING: ${escapeHtml(p.fechaIngresoStr || '-')}</span>
        </td>

        <td style="text-align:center; vertical-align: middle;">
          <div class="history-action-grid">
            <button class="history-action-btn" type="button" data-action="copy" data-id="${escapeHtml(p.id)}" title="Copiar resumen">
              <span class="material-symbols-outlined">content_copy</span>
            </button>
            <button class="history-action-btn danger" type="button" data-action="delete" data-id="${escapeHtml(p.id)}" title="Purgar registro">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `);

    if (p.observacionAlerta) {
      rows.push(`
        <tr class="history-observation-row">
          <td colspan="7">
            <span class="history-observation-line">
              <strong>OBSERVACIÓN:</strong> ${escapeHtml(p.observacionAlerta)}
            </span>
          </td>
        </tr>
      `);
    }
  });

  tbody.innerHTML = rows.join('');
}

function aplicarFiltros() {
  const qTexto = normalizar($('search')?.value || '');
  const qDestino = normalizar($('filterDestino')?.value || '');

  const filtrados = state.historialGlobal.filter((p) => {
    const bloqueTexto = [
      p.nombre,
      p.edad,
      p.diagnostico,
      p.pendientes,
      p.destino,
      p.cama,
      p.area,
      p.observacionAlerta,
      p.egresadoPor
    ].join(' ');

    const coincideTexto = !qTexto || normalizar(bloqueTexto).includes(qTexto);

    let coincideDestino = true;
    if (qDestino) {
      coincideDestino = getDestinoCategory(p.destino) === qDestino;
    }

    const coincideAlerta = !state.soloAlertas || Boolean(p.alerta || p.observacionAlerta);

    return coincideTexto && coincideDestino && coincideAlerta;
  });

  state.filtrados = filtrados;
  renderTable(filtrados);
}

async function descargarHistorial() {
  if (state.isFetching) return;

  state.isFetching = true;

  const reloadIcon = $('reloadIcon');
  const counterText = $('counterText');

  if (reloadIcon) reloadIcon.classList.add('spin');
  if (counterText) counterText.textContent = 'DESCARGANDO ARCHIVO HISTÓRICO...';

  try {
    const qReq = query(collection(db, 'historial'), orderBy('fechaEgreso', 'desc'));
    const snapshot = await getDocs(qReq);

    state.historialGlobal = snapshot.docs.map(normalizeHistoryDoc);
    aplicarFiltros();
  } catch (error) {
    console.error('[HISTORIAL] Error al cargar historial:', error);
    renderError('ERROR AL CARGAR DATOS: ' + (error?.message || String(error)));
    if (counterText) counterText.textContent = 'ERROR DE CONEXIÓN';
  } finally {
    state.isFetching = false;
    if (reloadIcon) reloadIcon.classList.remove('spin');
  }
}

function crearResumenPaciente(p) {
  return [
    `${p.cama || '-'} · ${p.nombre || '-'} · ${p.edad || '-'}`,
    `DX: ${p.diagnostico || '-'}`,
    `DESTINO: ${p.destino || '-'}`,
    `EGRESO: ${p.fechaEgresoStr || '-'}`,
    p.observacionAlerta ? `OBSERVACIÓN: ${p.observacionAlerta}` : ''
  ].filter(Boolean).join('\n');
}

async function copiarResumen(id) {
  const paciente = state.historialGlobal.find(p => p.id === id);
  if (!paciente) return;

  const resumen = crearResumenPaciente(paciente);

  try {
    await navigator.clipboard.writeText(resumen);
    vibrar(20);
  } catch (error) {
    console.error('[HISTORIAL] No se pudo copiar:', error);
    alert(resumen);
  }
}

function abrirSecureDelete(id) {
  state.targetDeleteId = id;

  const input = $('deleteConfirmInput');
  const modal = $('deleteSecureModal');

  if (input) input.value = '';
  if (modal) modal.classList.add('active');

  setTimeout(() => input?.focus(), 150);
}

function cerrarSecureModal() {
  const modal = $('deleteSecureModal');
  if (modal) modal.classList.remove('active');
  state.targetDeleteId = null;
}

async function ejecutarPurga() {
  const input = $('deleteConfirmInput');
  const adminPassword = input?.value.trim() || '';

  if (!adminPassword) {
    vibrar([50, 50, 50]);
    alert('Ingresa la contraseña del usuario administrador.');
    return;
  }

  if (!state.targetDeleteId) return;

  const btn = $('btnConfirmSecureDelete');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spin material-symbols-outlined">sync</span>';
  }

  try {
    // No se compara la contraseña en el frontend.
    // Firebase Auth valida la contraseña real del usuario administrador.
    await signInWithEmailAndPassword(auth, AUTH_EMAIL_ADMIN, adminPassword);

    await deleteDoc(doc(db, 'historial', state.targetDeleteId));

    const deletedId = state.targetDeleteId;
    cerrarSecureModal();

    state.historialGlobal = state.historialGlobal.filter(p => p.id !== deletedId);
    aplicarFiltros();
    vibrar(25);
  } catch (error) {
    console.error('[HISTORIAL] Error al purgar registro:', error);
    vibrar([80, 50, 80]);
    alert('Contraseña de administrador incorrecta o error al borrar el registro.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'ELIMINAR';
    }
  }
}

function setLoginLoading(texto = 'CARGANDO...') {
  const input = $('nipInput');
  const btn = $('btnEnter');

  if (input) input.disabled = true;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spin material-symbols-outlined" style="margin-right: 6px;">sync</span> ${texto}`;
  }
}

function enableLoginControls() {
  const input = $('nipInput');
  const btn = $('btnEnter');

  if (input) {
    input.disabled = false;
    input.value = '';
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = 'ENTRAR';
  }
}

function showMainApp() {
  $('loginScreen')?.classList.remove('active');

  const mainApp = $('mainAppContainer');
  if (mainApp) mainApp.style.display = 'flex';

  descargarHistorial();
}

function showLoginScreen() {
  $('loginScreen')?.classList.add('active');

  const mainApp = $('mainAppContainer');
  if (mainApp) mainApp.style.display = 'none';

  enableLoginControls();

  state.historialGlobal = [];
  state.filtrados = [];
  renderEmpty('Esperando autenticación...');
}

async function login() {
  const nip = $('nipInput')?.value.trim() || '';
  const btn = $('btnEnter');

  if (!nip) {
    vibrar([50, 50, 50]);
    alert('Por favor ingresa el código.');
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spin material-symbols-outlined">sync</span> CARGANDO...';
    }

    // No se compara ninguna contraseña en el frontend.
    // Firebase Auth valida la contraseña real del usuario administrador adscrito@hrd.censo.
    await signInWithEmailAndPassword(auth, AUTH_EMAIL_ADMIN, nip);
  } catch (error) {
    console.error('[HISTORIAL] Error de login:', error);
    vibrar([50, 50, 50]);
    alert('Código incorrecto o error de red. Intenta de nuevo.');
    enableLoginControls();
  }
}

async function logout() {
  if (!confirm('¿Cerrar sesión del historial?')) return;

  try {
    await signOut(auth);
  } catch (error) {
    console.error('[HISTORIAL] Error al cerrar sesión:', error);
    alert('No se pudo cerrar sesión: ' + (error?.message || String(error)));
  }
}

function applyStoredTheme() {
  const base = localStorage.getItem('censo-base') || 'base-dark';
  const accent = localStorage.getItem('censo-accent') || 'accent-blue';

  const validBase = BASE_THEMES.includes(base) ? base : 'base-dark';
  const validAccent = ACCENT_THEMES.includes(accent) ? accent : 'accent-blue';

  document.body.className = `${validBase} ${validAccent} history-body`;

  setTimeout(() => {
    const metaColor = getComputedStyle(document.body).getPropertyValue('--theme-meta').trim();
    if (metaColor) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', metaColor);
  }, 50);
}

function cycleBaseTheme() {
  const current = localStorage.getItem('censo-base') || 'base-dark';
  const idx = BASE_THEMES.indexOf(current);
  const next = BASE_THEMES[(idx + 1 + BASE_THEMES.length) % BASE_THEMES.length];

  localStorage.setItem('censo-base', next);
  applyStoredTheme();
}

function bindEvents() {
  $('btnEnter')?.addEventListener('click', login);

  $('nipInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
  });

  $('btnLogoutBtn')?.addEventListener('click', logout);
  $('reloadBtn')?.addEventListener('click', descargarHistorial);
  $('themeToggleBtn')?.addEventListener('click', cycleBaseTheme);

  $('backToCensoBtn')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  $('search')?.addEventListener('input', aplicarFiltros);
  $('filterDestino')?.addEventListener('change', aplicarFiltros);

  $('filterAlertsBtn')?.addEventListener('click', () => {
    state.soloAlertas = !state.soloAlertas;
    $('filterAlertsBtn')?.classList.toggle('active', state.soloAlertas);
    aplicarFiltros();
  });

  $('btnCancelDelete')?.addEventListener('click', cerrarSecureModal);
  $('btnConfirmSecureDelete')?.addEventListener('click', ejecutarPurga);

  $('deleteConfirmInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') ejecutarPurga();
  });

  $('deleteSecureModal')?.addEventListener('click', (e) => {
    if (e.target?.id === 'deleteSecureModal') cerrarSecureModal();
  });

  $('tableBody')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'delete') abrirSecureDelete(id);
    if (action === 'copy') copiarResumen(id);
  });
}

async function bootAuth() {
  setLoginLoading('CARGANDO...');

  try {
    await Promise.race([
      setPersistence(auth, browserLocalPersistence),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout configurando persistencia local')), 3000))
    ]);
  } catch (error) {
    console.warn('[HISTORIAL] No se pudo fijar persistencia local. Se continúa:', error);
  }

  const fallbackTimer = setTimeout(() => {
    if (state.authInitialResponded) return;
    state.authInitialResponded = true;
    console.warn('[HISTORIAL] Firebase Auth no respondió a tiempo. Se habilita login manual.');
    showLoginScreen();
  }, 8000);

  onAuthStateChanged(auth, (user) => {
    if (!state.authInitialResponded) {
      state.authInitialResponded = true;
      clearTimeout(fallbackTimer);
    }

    if (user) {
      showMainApp();
    } else {
      showLoginScreen();
    }
  }, (error) => {
    if (!state.authInitialResponded) {
      state.authInitialResponded = true;
      clearTimeout(fallbackTimer);
    }

    console.error('[HISTORIAL] Error inicializando Auth:', error);
    showLoginScreen();
  });
}

export function bootHistorial() {
  console.info('[HISTORIAL] bootHistorial iniciado. BUILD:', BUILD);

  window.HistorialApp = {
    __build: BUILD,
    state,
    descargarHistorial,
    aplicarFiltros,
    renderTable,
    abrirSecureDelete,
    cerrarSecureModal,
    ejecutarPurga
  };

  window.HistorialBuild = {
    version: BUILD,
    stage: 'ready'
  };

  applyStoredTheme();
  bindEvents();
  bootAuth();
}
