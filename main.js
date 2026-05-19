// ==========================================================
// 1. IMPORTACIONES DE FIREBASE (NÚCLEO, BD Y AUTENTICACIÓN)
// ==========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
import { initializeFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

// ==========================================================
// 2. CONFIGURACIÓN E INICIALIZACIÓN
// ==========================================================
const firebaseConfig = {
  apiKey: "AIzaSyDyBGnwCaBaKEpqZshEcwbYJ8VHzbAQU48",
  authDomain: "censo-de-urgencias.firebaseapp.com",
  projectId: "censo-de-urgencias",
  storageBucket: "censo-de-urgencias.firebasestorage.app",
  messagingSenderId: "887013797611",
  appId: "1:887013797611:web:555a63ce66aeb50b4a58ae",
  measurementId: "G-Y8GRGC6ZP7"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });
const auth = getAuth(app);

// FORZAR PERSISTENCIA DE SESIÓN PARA EVITAR QUE SE CIERRE EN MÓVILES
setPersistence(auth, browserLocalPersistence);

// ==========================================================
// 3. LÓGICA DE LOGIN SILENCIOSO Y ROLES
// ==========================================================
const loginScreen = document.getElementById('loginScreen');
const mainAppContainer = document.getElementById('mainAppContainer');
const mainFabBtn = document.getElementById('mainFabBtn');
let unsubscribe = null; 
let rolUsuario = "INTERNO"; 

window.isInlineEditing = false;
window.pendingSnapshotList = null;
let selectedNavIndex = -1;

function showMainApp() {
  loginScreen.classList.remove('active');
  mainAppContainer.style.display = 'flex';
  mainFabBtn.style.display = currentViewMode === 'table' && window.innerWidth >= 768 ? 'none' : 'flex';
  initFirebaseListener(); 
  setTimeout(initPlexus, 100);
}

function showLoginScreen() {
  loginScreen.classList.add('active');
  mainAppContainer.style.display = 'none';
  mainFabBtn.style.display = 'none';
  
  // Reactivamos los controles en caso de que Firebase confirme que no hay sesión
  const inputNip = document.getElementById('nipInput');
  const btn = document.getElementById('btnEnter');
  
  inputNip.disabled = false;
  inputNip.value = '';
  
  btn.disabled = false;
  btn.innerHTML = 'ENTRAR';

  if(unsubscribe) unsubscribe();
  pacientesGlobal = []; camasLibresGlobal = []; render([]); 
}

document.getElementById('btnEnter').addEventListener('click', async () => {
  const nip = document.getElementById('nipInput').value.trim();
  const btn = document.getElementById('btnEnter');
  
  // Usuario fijo para no teclear correos
  const correoOperativo = "interno@hrd.censo";

  if (!nip) {
    vibrar([50, 50, 50]);
    alert("Por favor ingresa el código.");
    return;
  }

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spin material-symbols-outlined">sync</span> CARGANDO...';
    
    // Auth sin contraseñas quemadas
    await signInWithEmailAndPassword(auth, correoOperativo, nip);
  } catch (error) {
    vibrar([50, 50, 50]);
    alert("Código incorrecto o error de red. Intenta de nuevo.");
    btn.disabled = false;
    btn.innerHTML = 'ENTRAR';
  }
});

document.getElementById('nipInput').addEventListener('keypress', function (e) {
  if (e.key === 'Enter') { document.getElementById('btnEnter').click(); }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    rolUsuario = user.email.includes('adscrito') ? "ADSCRITO" : "INTERNO";
    showMainApp(); 
  } else {
    showLoginScreen();
  }
});

document.getElementById('btnLogoutBtn').addEventListener('click', () => {
  vibrar(15);
  if(confirm("¿Seguro que deseas cerrar la sesión?")) { signOut(auth); }
});

// ==========================================================
// 4. CONFIGURACIÓN DEL HOSPITAL Y CAMAS LIMPIAS
// ==========================================================
let destinosGlobal = [
  "🟡 Observación", "🟢 Alta a domicilio", "⭕ Alta Voluntaria", "⚫ Defunción",
  "🏥 Ingreso a Medicina Interna", "🩺 Interconsulta a Medicina Interna",
  "🔪 Ingreso a Cirugía General", "🧵 Interconsulta a Cirugía General",
  "✂️ Ingreso a Cirugía Plástica", "💄 Interconsulta a Cirugía Plástica",
  "🤰 Ingreso a Ginecología", "🌸 Interconsulta a Ginecología",
  "❤️ Ingreso a Cardiología", "💓 Interconsulta a Cardiología",
  "👶 Ingreso a Pediatría", "🧸 Interconsulta a Pediatría",
  "🦴 Ingreso a Traumatología y Ortopedia", "📋 Interconsulta a Traumatología y Ortopedia",
  "🧠 Ingreso a Psiquiatría", "💭 Interconsulta a Psiquiatría",
  "🗣️ Interconsulta a Psicología", "🤱 Ingreso a Tococirugía",
  "💧 Interconsulta a Urologia", "🧪 Ingreso a Urologia",
  "👓 Interconsulta a Oftalmologia", "👁️ Ingreso a Oftalmologia",
  "🍎 Ingreso a Gastroenterologia"
];

const masterCamas = [
  { area: "SALA DE CHOQUE", cama: "CHOQUE 1" }, { area: "SALA DE CHOQUE", cama: "CHOQUE 2" },
  { area: "OBSERVACIÓN", cama: "CAMA 1" }, { area: "OBSERVACIÓN", cama: "CAMA 1-2" }, { area: "OBSERVACIÓN", cama: "SILLA 1" },
  { area: "OBSERVACIÓN", cama: "CAMA 2" }, { area: "OBSERVACIÓN", cama: "CAMA 2-2" }, { area: "OBSERVACIÓN", cama: "SILLA 2" },
  { area: "OBSERVACIÓN", cama: "CAMA 3" }, { area: "OBSERVACIÓN", cama: "CAMA 3-2" }, { area: "OBSERVACIÓN", cama: "SILLA 3" },
  { area: "OBSERVACIÓN", cama: "CAMA 4" }, { area: "OBSERVACIÓN", cama: "CAMA 4-2" }, { area: "OBSERVACIÓN", cama: "SILLA 4" },
  { area: "OBSERVACIÓN", cama: "CAMA 5" }, { area: "OBSERVACIÓN", cama: "CAMA 5-2" }, { area: "OBSERVACIÓN", cama: "SILLA 5" },
  { area: "TRAUMA MENOR", cama: "CAMA 1" }, { area: "TRAUMA MENOR", cama: "CAMA 2" }, { area: "TRAUMA MENOR", cama: "CAMA 3" }, { area: "TRAUMA MENOR", cama: "CAMA 4" },
  { area: "TRAUMA MENOR", cama: "SILLA 1" }, { area: "TRAUMA MENOR", cama: "SILLA 2" }, { area: "TRAUMA MENOR", cama: "SILLA 3" },
  { area: "PEDIATRÍA", cama: "CUNA 1" }, { area: "PEDIATRÍA", cama: "CUNA 2" }, { area: "PEDIATRÍA", cama: "CUNA 3" }, 
  { area: "PEDIATRÍA", cama: "SILLA 1" }, { area: "PEDIATRÍA", cama: "SILLA 2" },
  { area: "EXTRAS", cama: "EXTRA 1" }, { area: "EXTRAS", cama: "EXTRA 2" }, { area: "EXTRAS", cama: "EXTRA 3" }, { area: "EXTRAS", cama: "EXTRA 4" }, { area: "EXTRAS", cama: "EXTRA 5" }
];

function limpiarNombreCama(camaStr) {
  if (!camaStr) return '';
  let c = String(camaStr).toUpperCase().replace('🔴', '').replace('🟢', '').replace('🟡', '').replace('🔵', '').replace('🟠', '').trim();
  if (c.startsWith('OBSERVACION SILLA')) return c.replace('OBSERVACION SILLA', 'SILLA').trim();
  if (c.startsWith('OBSERVACION')) return c.replace('OBSERVACION', 'CAMA').trim();
  if (c.startsWith('TRAUMA SILLA')) return c.replace('TRAUMA SILLA', 'SILLA').trim();
  if (c.startsWith('TRAUMA') && !c.includes('MENOR')) return c.replace('TRAUMA', 'CAMA').trim();
  if (c.startsWith('PEDIATRIA CUNA')) return c.replace('PEDIATRIA CUNA', 'CUNA').trim();
  if (c.startsWith('PEDIATRIA SILLA')) return c.replace('PEDIATRIA SILLA', 'SILLA').trim();
  return c;
}

function getEmojiOnly(texto) {
  if (!texto) return '';
  const t = String(texto).trim();
  const firstSpace = t.indexOf(' ');
  return firstSpace > -1 ? t.substring(0, firstSpace) : t.substring(0, 2);
}

// ==========================================================
// VARIABLES GLOBALES DEL CENSO
// ==========================================================
let pacientesGlobal = [];
let camasLibresGlobal = []; 
let currentViewMode = localStorage.getItem('censo-view') || 'kanban'; 
let isFetchingData = true;

const areaVisuals = {
  'SALA DE CHOQUE': { emoji: '❤️', class: 'icon-heartbeat' },
  'OBSERVACION': { emoji: '👀', class: 'icon-look' },
  'OBSERVACIÓN': { emoji: '👀', class: 'icon-look' },
  'TRAUMA MENOR': { emoji: '🦴', class: 'icon-spin' },
  'PEDIATRIA': { emoji: '🧸', class: 'icon-wiggle' },
  'PEDIATRÍA': { emoji: '🧸', class: 'icon-wiggle' },
  'EXTRAS': { emoji: '✨', class: 'icon-twinkle' },
  'SIN ÁREA ASIGNADA': { emoji: '🏥', class: '' }
};

function vibrar(patron) { if (navigator.vibrate) { navigator.vibrate(patron); } }

function escapeHtml(texto) { return String(texto || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function cerrarModal(id) { 
  document.getElementById(id).classList.remove('active'); 
  closeAllPopovers(null); 
}
function cerrarModalBorrado() { document.getElementById('deleteConfirmModal').classList.remove('active'); }

const chipPalette = [
  { bg: '#ffe4e6', text: '#9f1239' }, { bg: '#dcfce7', text: '#166534' }, 
  { bg: '#fef9c3', text: '#854d0e' }, { bg: '#dbeafe', text: '#1e40af' }, 
  { bg: '#ffedd5', text: '#9a3412' }, { bg: '#f3e8ff', text: '#6b21a8' }, { bg: '#e0f7fa', text: '#006064' }  
];

function getChipColor(text) {
  if (!text) return { bg: 'var(--chip-bg)', text: 'var(--chip-text)' };
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  return chipPalette[Math.abs(hash) % chipPalette.length];
}

function getColorfulChipHtml(destino) {
  if (!destino) return '';
  const isColorful = document.body.className.includes('base-light') || 
                     document.body.className.includes('base-pure-white') || 
                     document.body.className.includes('base-gray-light') || 
                     document.body.className.includes('base-sand') || 
                     document.body.className.includes('base-rose') || 
                     document.body.className.includes('base-mint') || 
                     document.body.className.includes('base-lavender');
  if (isColorful) {
    const colors = getChipColor(destino);
    return `<div class="chip" style="background-color: ${colors.bg}; color: ${colors.text}; border-color: rgba(0,0,0,0.1); font-weight: 700;">${escapeHtml(destino)}</div>`;
  } else { return `<div class="chip">${escapeHtml(destino)}</div>`; }
}

function agruparPorArea(lista) {
  const grupos = {};
  lista.forEach(p => { 
    const areaRaw = p.area || 'SIN ÁREA ASIGNADA';
    const area = String(areaRaw).trim(); 
    if (!grupos[area]) grupos[area] = []; 
    grupos[area].push(p); 
  }); 
  return grupos;
}

function crearCampo(label, value) {
  if (!value || !String(value).trim()) return '';
  return `<div class="field field-fade-in"><span class="label">${label}</span><div class="value">${escapeHtml(value)}</div></div>`;
}

function generarSkeletonHtml() {
  const isDesktop = window.innerWidth >= 768;
  if (currentViewMode === 'table' && isDesktop) {
    let rows = '';
    for(let i=0; i<10; i++) rows += `<div class="skeleton-row"><div class="skeleton-block skeleton-cell" style="width: 5%"></div><div class="skeleton-block skeleton-cell" style="width: 10%"></div><div class="skeleton-block skeleton-cell" style="width: 20%"></div><div class="skeleton-block skeleton-cell" style="width: 30%"></div><div class="skeleton-block skeleton-cell" style="width: 20%"></div><div class="skeleton-block skeleton-cell" style="width: 15%"></div></div>`;
    return `<div class="table-wrapper animate-in" style="background: transparent;"><div class="section-header" style="background: var(--section-head); border-bottom: 2px solid var(--line);"><div class="skeleton-block" style="height: 1rem; width: 150px;"></div></div><div class="skeleton-loader">${rows}</div></div>`;
  } 
  if (isDesktop) {
    let columnsHtml = '';
    ['SALA DE CHOQUE', 'OBSERVACIÓN', 'PEDIATRÍA'].forEach(titulo => {
      let cards = '';
      for(let i=0; i<3; i++) cards += `<div class="skeleton-card" style="margin-bottom: 12px; border-radius: var(--radius-md); border: 1px solid var(--line);"><div class="skeleton-main"><div class="skeleton-block skeleton-name" style="width: 80%"></div><div class="skeleton-block skeleton-bed" style="width: 40%"></div></div><div class="skeleton-right"><div class="skeleton-block skeleton-chip"></div><div class="skeleton-block skeleton-caret"></div></div></div>`;
      columnsHtml += `<div class="section" style="min-width: 450px; flex: 1;"><div class="section-header"><div class="section-title">${titulo}</div></div><div class="patient-list" style="padding: 16px;">${cards}</div></div>`;
    });
    return `<div style="display: flex; flex-direction: row; gap: 24px; padding: 10px 16px;">${columnsHtml}</div>`;
  }
  let mobileCards = '';
  for(let i=0; i<6; i++) mobileCards += `<div class="skeleton-card"><div class="skeleton-main"><div class="skeleton-block skeleton-name"></div><div class="skeleton-block skeleton-bed"></div></div><div class="skeleton-right"><div class="skeleton-block skeleton-chip"></div><div class="skeleton-block skeleton-caret"></div></div></div>`;
  return `<div class="section animate-in" style="margin-top:0; border-top:none;"><div class="section-header"><div class="section-title">CARGANDO CENSO...</div></div><div class="skeleton-loader">${mobileCards}</div></div>`;
}

function render(lista) {
  const content = document.getElementById('content');
  const metaText = document.getElementById('meta-text');
  const mainAppContainer = document.getElementById('mainAppContainer');
  const fabBtn = document.getElementById('mainFabBtn');
  selectedNavIndex = -1; 

  if(metaText) metaText.innerHTML = `${lista.length} PACIENTES`;
  content.classList.remove('view-table-mode'); 
  mainAppContainer.classList.remove('table-is-active');
  if(fabBtn && mainAppContainer.style.display !== 'none') fabBtn.style.display = 'flex';

  if (!lista.length) { 
    if (isFetchingData) { content.innerHTML = generarSkeletonHtml(); } 
    else { content.innerHTML = `<div class="empty animate-in">NO HAY PACIENTES EN EL CENSO.</div>`; }
    if (typeof window.syncPlexusPatients === 'function') window.syncPlexusPatients(lista);
    return; 
  }

  const grupos = agruparPorArea(lista);
  let areas = Object.keys(grupos);
  const isDesktop = window.innerWidth >= 768;

  const ordenEstricto = [
    "SALA DE CHOQUE",
    "OBSERVACIÓN", "OBSERVACION", 
    "TRAUMA MENOR",
    "PEDIATRÍA", "PEDIATRIA",
    "EXTRAS",
    "SIN ÁREA ASIGNADA"
  ];

  areas.sort((a, b) => {
    const indexA = ordenEstricto.indexOf(a.toUpperCase().trim());
    const indexB = ordenEstricto.indexOf(b.toUpperCase().trim());
    const posA = indexA === -1 ? 999 : indexA;
    const posB = indexB === -1 ? 999 : indexB;
    return posA - posB;
  });

  if (currentViewMode === 'table' && isDesktop) {
    content.classList.add('view-table-mode');
    mainAppContainer.classList.add('table-is-active'); 
    if(fabBtn) fabBtn.style.display = 'none';

    let htmlArr = [];
    htmlArr.push(`<div class="table-wrapper animate-in" id="scrollTableWrapper">
      <div id="scrollGuiderObj" class="scroll-guider" title="Ir al extremo"><span class="material-symbols-outlined">arrow_downward</span></div>
      <table class="censo-table"><thead><tr>
        <th style="width: 5%; text-align: center;">CAMA</th>
        <th style="width: 6%; text-align: center;">INGRESO</th>
        <th style="width: 20%;">PACIENTE</th>
        <th style="width: 3.5%;">EDAD</th>
        <th style="width: 26%;">DIAGNÓSTICO</th>
        <th style="width: 26%;">PENDIENTES</th>
        <th style="width: 9%; text-align: center;">DESTINO</th>
        <th style="width: 4.5%; text-align: center;"><span class="material-symbols-outlined" style="font-size: 1.2rem;">settings</span></th>
      </tr></thead><tbody>`);
    
    areas.forEach((area) => {
      const areaNormalizada = String(area).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
      const visual = areaVisuals[areaNormalizada] || areaVisuals[area.toUpperCase()] || { emoji: '🏥', class: '' };

      htmlArr.push(`<tr style="background: rgba(128, 128, 128, 0.15);"><td colspan="8" style="padding: 6px 10px; font-weight: 800; font-size: 0.85rem; color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--line);"><span class="area-icon ${visual.class}">${visual.emoji}</span> ${escapeHtml(area)}</td></tr>`);

      grupos[area].forEach((p) => {
        const destinoChip = getColorfulChipHtml(p.destino);
        htmlArr.push(`<tr class="patient-row" data-fila="${p.fila}" onclick="toggleTableRow(this)">
            <td style="padding: 6px 10px; text-align: center;"><span style="color: var(--accent); font-weight: 700; font-size: 0.85rem;">${escapeHtml(p.cama || '-')}</span></td>
            <td style="padding: 6px 10px; font-size: 0.7rem; color: var(--muted); font-family: 'Fira Code', monospace; line-height: 1.3; text-align: center;">${p.fechaIngresoFormateada || '-'}</td>
            
            <td style="padding: 6px 10px; font-family: 'Space Mono', monospace; font-weight: 700; font-size: 0.9rem; line-height: 1.3;" class="patient-name editable-cell" data-campo="nombre" data-original="${escapeHtml(p.nombre)}" contenteditable="true" onfocus="iniciarEdicionSubtle(this)" onblur="finalizarEdicionSubtle(this)" onkeydown="manejarTeclasSubtle(this, event)" onclick="event.stopPropagation()">
              <div class="truncate-text" title="${escapeHtml(p.nombre)}">${escapeHtml(p.nombre)}</div>
            </td>
            
            <td style="padding: 6px 10px;" class="editable-cell" data-campo="edad" data-original="${escapeHtml(p.edad)}" contenteditable="true" onfocus="iniciarEdicionSubtle(this)" onblur="finalizarEdicionSubtle(this)" onkeydown="manejarTeclasSubtle(this, event)" onclick="event.stopPropagation()">
              <span style="color: var(--muted); font-size: 0.85rem;" class="value">${escapeHtml(p.edad || '-')}</span>
            </td>
            
            <td style="padding: 6px 10px;" class="editable-cell" data-campo="diagnostico" data-original="${escapeHtml(p.diagnostico)}" contenteditable="true" onfocus="iniciarEdicionSubtle(this)" onblur="finalizarEdicionSubtle(this)" onkeydown="manejarTeclasSubtle(this, event)" onclick="event.stopPropagation()">
              <div class="truncate-text" style="font-size: 0.8rem; line-height: 1.3;" title="${escapeHtml(p.diagnostico)}">${escapeHtml(p.diagnostico || '-')}</div>
            </td>
            
            <td style="padding: 6px 10px;" class="editable-cell" data-campo="pendientes" data-original="${escapeHtml(p.pendientes)}" contenteditable="true" onfocus="iniciarEdicionSubtle(this)" onblur="finalizarEdicionSubtle(this)" onkeydown="manejarTeclasSubtle(this, event)" onclick="event.stopPropagation()">
              <div class="truncate-text" style="font-size: 0.8rem; line-height: 1.3;" title="${escapeHtml(p.pendientes)}">${escapeHtml(p.pendientes || '-')}</div>
            </td>
            
            <td style="padding: 6px 10px; position: relative; text-align: center;" onclick="abrirDestinoFlotante(this, '${p.fila}', '${escapeHtml(p.destino)}', event)">
              ${destinoChip || '<span style="color:var(--muted); opacity:0.4;">-</span>'}
            </td>
            
            <td style="padding: 4px 10px; text-align: center; white-space: nowrap;"><button class="btn-table edit" style="padding: 4px; font-size: 0.9rem; margin-right: 2px;" onclick="abrirModal('${p.fila}'); event.stopPropagation();" title="Editar"><span class="material-symbols-outlined" style="font-size: 1.1rem;">edit</span></button><button class="btn-table delete" style="padding: 4px; font-size: 0.9rem;" onclick="borrarPacienteDirecto('${p.fila}', '${escapeHtml(p.nombre)}'); event.stopPropagation();" title="Borrar"><span class="material-symbols-outlined" style="font-size: 1.1rem;">delete</span></button></td>
        </tr>`);
      });
    });

    htmlArr.push(`</tbody></table><button class="btn-add-table" onclick="abrirModalAgregar()"><span class="material-symbols-outlined" style="margin-right: 8px;">person_add</span> NUEVO INGRESO</button></div>`);
    content.innerHTML = htmlArr.join('');
    
    setTimeout(initScrollGuider, 100);

    if (typeof window.syncPlexusPatients === 'function') window.syncPlexusPatients(lista);
    return;
  }

  content.innerHTML = '';
  areas.forEach((area, indexArea) => {
    const pacientes = grupos[area];
    const delayBase = indexArea * 150; 
    const areaNormalizada = String(area).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    const visual = areaVisuals[areaNormalizada] || areaVisuals[area.toUpperCase()] || { emoji: '🏥', class: '' };

    const sectionHtml = `
      <section class="section animate-in" style="animation-delay: ${delayBase}ms;">
        <div class="section-header">
          <div class="section-title">
            <span class="area-icon ${visual.class}">${visual.emoji}</span> ${escapeHtml(area)}
          </div>
        </div>
        <div class="patient-list">
          ${pacientes.map((p, indexPatient) => {
            const camaHtml = p.cama ? `<div class="patient-bed">${escapeHtml(p.cama)}</div>` : '';
            
            // MODO TARJETA: Solo Emoji para Destino
            const emojiSolo = p.destino ? getEmojiOnly(p.destino) : '';
            const destinoEmojiHtml = emojiSolo ? `<div class="chip-emoji" title="${escapeHtml(p.destino)}">${emojiSolo}</div>` : '';
            
            const fechaLimpia = p.fechaIngresoFormateada ? p.fechaIngresoFormateada.replace(/<[^>]*>?/gm, ' ') : '-';

            const detailsHtml = [ 
                crearCampo('INGRESO', fechaLimpia),
                crearCampo('EDAD', p.edad), 
                crearCampo('DIAGNÓSTICO', p.diagnostico), 
                crearCampo('PENDIENTES', p.pendientes), 
                crearCampo('DESTINO', p.destino) 
            ].filter(Boolean).join('');
            const delayPatient = delayBase + (indexPatient * 50);
            
            return `<div class="card animate-in" data-fila="${p.fila}" data-nombre="${escapeHtml(p.nombre)}" style="animation-delay: ${delayPatient}ms;"><div class="swipe-bg"><div class="swipe-action swipe-delete"><span class="material-symbols-outlined">delete</span></div><div class="swipe-action swipe-edit"><span class="material-symbols-outlined">edit</span></div></div><div class="card-content-wrapper"><div class="card-header" onclick="toggleCard(this)"><div class="patient-main"><div class="patient-name">${escapeHtml(p.nombre)}</div>${camaHtml}</div><div class="header-right">${destinoEmojiHtml}<div class="caret"><span class="material-symbols-outlined">expand_more</span></div></div></div><div class="details"><div class="details-content">${detailsHtml}<button class="btn-editar-tarjeta" onclick="abrirModal('${p.fila}'); event.stopPropagation();"><span class="material-symbols-outlined" style="font-size: 1.1rem; margin-right: 4px;">edit_square</span> EDITAR PACIENTE</button></div></div></div></div>`;
          }).join('')}
        </div>
      </section>
    `;
    content.innerHTML += sectionHtml;
  });
  
  setTimeout(initSwipe, 50);
  if (typeof window.syncPlexusPatients === 'function') window.syncPlexusPatients(lista);
}

function initFirebaseListener() {
  isFetchingData = true;
  document.getElementById('reloadIcon').classList.add('spin');
  
  unsubscribe = onSnapshot(collection(db, "pacientes"), (snapshot) => {
    pacientesGlobal = [];
    let occupiedBeds = []; 

    snapshot.forEach((doc) => {
      let data = doc.data();
      data.fila = doc.id; 

      if (data.creado) {
        let fechaObj;
        if (typeof data.creado.toDate === 'function') {
          fechaObj = data.creado.toDate();
        } else {
          fechaObj = new Date(data.creado);
        }
        
        let dStr = fechaObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).toUpperCase();
        let tStr = fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
        data.fechaIngresoFormateada = `${escapeHtml(dStr)}<br><span style="opacity:0.65; font-size:0.9em;">${escapeHtml(tStr)}</span>`;

        const tzOffset = fechaObj.getTimezoneOffset() * 60000;
        data.fechaIngresoISO = (new Date(fechaObj - tzOffset)).toISOString().slice(0, 16);
      } else {
        data.fechaIngresoFormateada = '-';
        data.fechaIngresoISO = '';
      }

      if(data.cama) {
        data.cama = limpiarNombreCama(data.cama);
        let areaName = String(data.area || '').toUpperCase().trim();
        occupiedBeds.push(`${areaName}|${data.cama}`); 
      }

      pacientesGlobal.push(data);
    });

    const ordenCamas = masterCamas.map(c => c.cama.toUpperCase().trim());

    pacientesGlobal.sort((a, b) => {
        let idxA = ordenCamas.indexOf((a.cama || '').toUpperCase().trim());
        let idxB = ordenCamas.indexOf((b.cama || '').toUpperCase().trim());
        
        idxA = idxA === -1 ? 9999 : idxA;
        idxB = idxB === -1 ? 9999 : idxB;

        if (idxA !== idxB) {
            return idxA - idxB; 
        }

        let dateA = a.creado && typeof a.creado.toDate === 'function' ? a.creado.toDate().getTime() : 0;
        let dateB = b.creado && typeof b.creado.toDate === 'function' ? b.creado.toDate().getTime() : 0;
        return dateB - dateA; 
    });

    camasLibresGlobal = masterCamas.filter(c => {
        let areaName = c.area.toUpperCase().trim();
        let camaName = c.cama.toUpperCase().trim();
        return !occupiedBeds.includes(`${areaName}|${camaName}`);
    });

    camasLibresGlobal = camasLibresGlobal.map((c, i) => ({ ...c, fila: 'cama_libre_'+i }));

    isFetchingData = false;
    
    if (window.isInlineEditing) {
      window.pendingSnapshotList = [...pacientesGlobal];
      document.getElementById('reloadIcon').classList.remove('spin');
      return;
    }

    filtrar(); 
    document.getElementById('reloadIcon').classList.remove('spin');
  }, (error) => {
    isFetchingData = false;
    mostrarError(error);
    document.getElementById('reloadIcon').classList.remove('spin');
  });
}

// ==========================================================
// CÁLCULO INTELIGENTE Y ACTIVACIÓN DEL GUÍA DE SCROLL
// ==========================================================
let scrollGuiderHandler = null;

function initScrollGuider() {
  const wrapper = document.getElementById('scrollTableWrapper');
  const guider = document.getElementById('scrollGuiderObj');
  if (!wrapper || !guider) return;

  if (scrollGuiderHandler) {
    wrapper.removeEventListener('scroll', scrollGuiderHandler);
  }

  let isScrolling = false;
  const checkScrollPosition = () => {
    const atBottom = wrapper.scrollHeight - wrapper.scrollTop <= wrapper.clientHeight + 20;
    const atTop = wrapper.scrollTop <= 20;
    const isScrollable = wrapper.scrollHeight > wrapper.clientHeight;

    if (!isScrollable) {
      guider.className = 'scroll-guider'; 
      return;
    }

    if (!atBottom) {
      guider.innerHTML = '<span class="material-symbols-outlined">arrow_downward</span>';
      guider.className = 'scroll-guider active-down';
      guider.title = "Ir al final del censo";
    } else if (atBottom && !atTop) {
      guider.innerHTML = '<span class="material-symbols-outlined">arrow_upward</span>';
      guider.className = 'scroll-guider active-up';
      guider.title = "Volver arriba";
    } else {
      guider.className = 'scroll-guider';
    }
  };

  scrollGuiderHandler = () => {
    if (!isScrolling) {
      window.requestAnimationFrame(() => {
        checkScrollPosition();
        isScrolling = false;
      });
      isScrolling = true;
    }
  };

  wrapper.addEventListener('scroll', scrollGuiderHandler, { passive: true });
  
  guider.onclick = (e) => {
    e.stopPropagation();
    vibrar(15);
    const goesDown = guider.classList.contains('active-down');
    wrapper.scrollTo({
      top: goesDown ? wrapper.scrollHeight : 0,
      behavior: 'smooth'
    });
  };

  checkScrollPosition();
}

// ==========================================================
// NAVEGACIÓN POR TECLADO OCULTA Y AGREGADA A "NUEVO INGRESO"
// ==========================================================
document.addEventListener('keydown', (e) => {
  if (currentViewMode !== 'table' || window.innerWidth < 768 || window.isInlineEditing) return;
  
  const elements = Array.from(document.querySelectorAll('.patient-row, .btn-add-table'));
  if (!elements.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedNavIndex = Math.min(selectedNavIndex + 1, elements.length - 1);
    updateNavHighlight(elements);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedNavIndex = Math.max(selectedNavIndex - 1, 0);
    updateNavHighlight(elements);
  } else if (e.key === 'Enter' && selectedNavIndex !== -1) {
    e.preventDefault();
    const el = elements[selectedNavIndex];
    
    if (el.classList.contains('btn-add-table')) {
      abrirModalAgregar();
    } else {
      const filaId = el.getAttribute('data-fila');
      abrirModal(filaId);
    }
  }
});

function updateNavHighlight(elements) {
  elements.forEach(r => r.classList.remove('selected-nav'));
  if (elements[selectedNavIndex]) {
    const el = elements[selectedNavIndex];
    el.classList.add('selected-nav');
    
    if (el.classList.contains('patient-row')) {
      const yaEstaAbierta = el.classList.contains('expanded-row');
      document.querySelectorAll('.patient-row').forEach(tr => tr.classList.remove('expanded-row'));
      el.classList.add('expanded-row');
    }
    
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ==========================================================
// COMPONENTES FLOTANTES GLOBALES (LIMPIEZA DE SELECTS MODALES)
// ==========================================================
const closeAllPopovers = (e) => {
  if (e && e.type === 'scroll' && e.target.closest && e.target.closest('.custom-select-popover')) return;
  if (e && e.type === 'click' && e.target.closest && (e.target.closest('.custom-select-wrapper') || e.target.closest('.custom-select-popover'))) return;
  
  document.querySelectorAll('.custom-select-popover.active').forEach(p => {
    p.classList.remove('active');
    const pid = p.getAttribute('data-parent');
    if(pid && document.getElementById(pid)) document.getElementById(pid).appendChild(p);
  });
};
document.addEventListener('click', closeAllPopovers);
document.addEventListener('scroll', closeAllPopovers, true);

// ==========================================================
// SELECTOR PERSONALIZADO TIPO COMBOBOX (MODALES)
// ==========================================================
window.initCustomSelect = function(wrapperId, optionsHtml) {
  const wrapper = document.getElementById(wrapperId);
  if(!wrapper) return;
  const display = wrapper.querySelector('.custom-select-display');
  let popover = wrapper.querySelector('.custom-select-popover');
  
  if (!popover) popover = document.getElementById(wrapperId + '-popover');
  if (!popover) return;
  
  popover.id = wrapperId + '-popover';
  popover.setAttribute('data-parent', wrapperId);

  const search = popover.querySelector('.custom-select-search input');
  const list = popover.querySelector('.custom-select-options');
  list.innerHTML = optionsHtml;

  display.onclick = (e) => {
    e.stopPropagation();
    const isActive = popover.classList.contains('active');
    
    closeAllPopovers(null);

    if (!isActive) {
      document.body.appendChild(popover); 
      
      const rect = display.getBoundingClientRect();
      popover.style.position = 'fixed';
      popover.style.width = rect.width + 'px';
      popover.style.left = rect.left + 'px';
      popover.style.zIndex = '999999';
      
      const dropdownHeight = 250;
      if (rect.bottom + dropdownHeight > window.innerHeight) {
        popover.style.top = 'auto';
        popover.style.bottom = (window.innerHeight - rect.top) + 'px';
        popover.style.boxShadow = '0 -10px 25px rgba(0,0,0,0.5)';
      } else {
        popover.style.top = rect.bottom + 'px';
        popover.style.bottom = 'auto';
        popover.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
      }

      popover.classList.add('active');
      search.value = '';
      Array.from(list.children).forEach(c => c.style.display = 'block');
      setTimeout(() => search.focus(), 50);
    }
  };

  search.oninput = (e) => {
    const q = normalizar(e.target.value);
    Array.from(list.children).forEach(opt => {
      if (opt.classList.contains('custom-select-optgroup')) return;
      const text = normalizar(opt.innerText);
      opt.style.display = text.includes(q) ? 'block' : 'none';
    });
  };

  list.onclick = (e) => {
    const opt = e.target.closest('.custom-select-option');
    if(opt) { 
      display.innerText = opt.innerText; 
      display.dataset.value = opt.getAttribute('data-value'); 
      popover.classList.remove('active'); 
      wrapper.appendChild(popover); 
    }
  };
};

// ==========================================================
// EDICIÓN ULTRA SUTIL EN LÍNEA
// ==========================================================
window.iniciarEdicionSubtle = function(el) {
  const tr = el.closest('tr');
  if (!tr.classList.contains('expanded-row')) { toggleTableRow(tr); }
  
  window.isInlineEditing = true;
  el.classList.add('is-editing');
  
  const trunc = el.querySelector('.truncate-text');
  if (trunc) { el.innerText = trunc.innerText; }
  
  if (el.innerText.trim() === '-') { el.innerText = ''; }
  
  const range = document.createRange(); const sel = window.getSelection();
  range.selectNodeContents(el); range.collapse(false); sel.removeAllRanges(); sel.addRange(range);
};

window.finalizarEdicionSubtle = async function(el) {
  el.classList.remove('is-editing');
  window.isInlineEditing = false;
  
  const campo = el.getAttribute('data-campo');
  const filaId = el.closest('tr').getAttribute('data-fila');
  const valorOriginal = el.getAttribute('data-original').toUpperCase().trim();
  const nuevoValorRaw = el.innerText.toUpperCase().normalize('NFC').trim();
  
  const nuevoValorFinal = nuevoValorRaw === '' ? '-' : nuevoValorRaw;
  
  const campoEstilizado = (campo === 'diagnostico' || campo === 'pendientes') ? 
    `<div class="truncate-text" style="font-size: 0.8rem; line-height: 1.3;" title="${escapeHtml(nuevoValorFinal)}">${escapeHtml(nuevoValorFinal)}</div>` : 
    (campo === 'nombre') ? `<div class="truncate-text" title="${escapeHtml(nuevoValorFinal)}">${escapeHtml(nuevoValorFinal)}</div>` : escapeHtml(nuevoValorFinal);
  
  el.innerHTML = campoEstilizado;

  if (window.pendingSnapshotList) {
    pacientesGlobal = window.pendingSnapshotList;
    window.pendingSnapshotList = null;
    filtrar();
  }

  if (nuevoValorRaw !== valorOriginal && nuevoValorFinal !== valorOriginal) {
    el.style.opacity = '0.3';
    try {
      const valorBD = nuevoValorFinal === '-' ? '' : nuevoValorFinal;
      await updateDoc(doc(db, "pacientes", filaId), { [campo]: valorBD });
      el.setAttribute('data-original', nuevoValorFinal);
      const pLocal = pacientesGlobal.find(p => p.fila === filaId);
      if (pLocal) pLocal[campo] = valorBD;
      vibrar(15);
    } catch (e) {
      alert("Error al guardar campo: " + e.message);
      el.setAttribute('data-original', valorOriginal);
      el.innerHTML = valorOriginal;
    } finally { el.style.opacity = '1'; }
  }
  
  setTimeout(() => {
    const trRestaurado = document.querySelector(`tr[data-fila="${filaId}"]`);
    if (trRestaurado && !trRestaurado.classList.contains('expanded-row')) { trRestaurado.classList.add('expanded-row'); }
  }, 40);
};

window.manejarTeclasSubtle = function(el, event) {
  const campo = el.getAttribute('data-campo');
  if (event.key === 'Enter') {
    if (campo === 'nombre' || campo === 'edad') {
      event.preventDefault(); el.blur();
    }
  } else if (event.key === 'Escape') {
    event.preventDefault();
    el.innerText = el.getAttribute('data-original');
    el.blur();
  }
};

// ==========================================================
// DESTINO SUPERPUESTO MINIMALISTA EN EL BODY (EN LÍNEA)
// ==========================================================
window.abrirDestinoFlotante = function(tdEl, filaId, destinoActual, event) {
  event.stopPropagation();
  const tr = tdEl.closest('tr');
  if (!tr.classList.contains('expanded-row')) { toggleTableRow(tr); return; }
  if (document.querySelector('.inline-destino-container')) return; 

  window.isInlineEditing = true; 

  const container = document.createElement('div');
  container.className = 'inline-destino-container animate-in';
  
  let opcionesHtml = `
    <div style="padding: 6px; background: var(--panel); border-bottom: 1px solid var(--line);">
      <input type="text" class="inline-search-input input-control" placeholder="Buscar destino..." autocomplete="off" style="width: 100%; padding: 6px 10px; font-size: 0.8rem; margin: 0; outline: none;">
    </div>
    <div class="inline-options-wrapper">
      <div class="inline-destino-option ${!destinoActual ? 'selected' : ''}" data-value="">(SIN DESTINO)</div>
  `;
  destinosGlobal.forEach(d => {
    const dStr = d.toUpperCase().trim();
    const sel = dStr === destinoActual.toUpperCase().trim() ? 'selected' : '';
    opcionesHtml += `<div class="inline-destino-option ${sel}" data-value="${escapeHtml(dStr)}">${escapeHtml(dStr)}</div>`;
  });
  opcionesHtml += `</div>`;
  
  container.innerHTML = opcionesHtml;
  document.body.appendChild(container);
  
  const rect = tdEl.getBoundingClientRect();
  container.style.position = 'fixed';
  container.style.width = Math.max(220, rect.width) + 'px';
  container.style.left = rect.left + 'px';
  container.style.zIndex = '99999';

  const dropdownHeight = 250; 
  if (rect.bottom + dropdownHeight > window.innerHeight) {
    container.style.top = 'auto';
    container.style.bottom = (window.innerHeight - rect.top) + 'px';
    container.style.boxShadow = '0 -10px 25px rgba(0,0,0,0.5)';
  } else {
    container.style.top = rect.bottom + 'px';
    container.style.bottom = 'auto';
  }

  const inputBuscador = container.querySelector('.inline-search-input');
  const wrapperOptions = container.querySelector('.inline-options-wrapper');

  inputBuscador.addEventListener('input', (e) => {
      const q = normalizar(e.target.value);
      wrapperOptions.querySelectorAll('.inline-destino-option').forEach(opt => {
          const text = normalizar(opt.innerText);
          opt.style.display = text.includes(q) ? 'block' : 'none';
      });
  });

  const cerrarDirecto = (e) => {
    if (e && e.type === 'scroll' && container.contains(e.target)) return;
    window.isInlineEditing = false;
    if (container.parentNode) container.remove();
    if (window.pendingSnapshotList) { pacientesGlobal = window.pendingSnapshotList; window.pendingSnapshotList = null; filtrar(); }
    document.removeEventListener('scroll', cerrarDirecto, true);
  };

  container.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (e.target.classList.contains('inline-search-input')) return;

    const opcionEl = e.target.closest('.inline-destino-option');
    if (!opcionEl) return;
    
    const nuevoDestino = opcionEl.getAttribute('data-value');
    cerrarDirecto();
    
    if (nuevoDestino !== destinoActual.toUpperCase().trim()) {
      tdEl.innerHTML = '<span class="spin material-symbols-outlined" style="font-size:1.2rem;">sync</span>';
      try {
        await updateDoc(doc(db, "pacientes", filaId), { destino: nuevoDestino });
        vibrar(15);
        const pLocal = pacientesGlobal.find(p => p.fila === filaId);
        if (pLocal) pLocal.destino = nuevoDestino;
      } catch (e) { alert("Error destino: " + e.message); }
      filtrar();
    }
  });

  const closeHandler = (e) => {
    if (container && !container.contains(e.target)) { 
        cerrarDirecto(); 
        document.removeEventListener('click', closeHandler); 
    }
  };
  setTimeout(() => {
      document.addEventListener('click', closeHandler);
      document.addEventListener('scroll', cerrarDirecto, true);
      inputBuscador.focus();
  }, 10);
};

function toggleCard(headerEl) {
  vibrar(15); 
  const card = headerEl.closest('.card'); 
  card.classList.toggle('open');
  resetAllSwipes();
  if (card.classList.contains('open')) { setTimeout(() => { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 350); }
}

function toggleTableRow(row) {
  const yaEstaAbierta = row.classList.contains('expanded-row');
  document.querySelectorAll('.patient-row').forEach(tr => { tr.classList.remove('expanded-row'); });
  if (!yaEstaAbierta) { row.classList.add('expanded-row'); }
}

function abrirModal(fila) {
  vibrar(30); 
  const paciente = pacientesGlobal.find(p => p.fila === fila);
  if(!paciente) return;
  
  document.getElementById('modalFila').value = paciente.fila;
  document.getElementById('modalFechaIngreso').value = paciente.fechaIngresoISO || '';
  document.getElementById('modalNombre').value = (paciente.nombre || '').toUpperCase();
  document.getElementById('modalEdad').value = (paciente.edad || '').toUpperCase();
  document.getElementById('modalDiagnostico').value = (paciente.diagnostico || '').toUpperCase();
  document.getElementById('modalPendientes').value = (paciente.pendientes || '').toUpperCase();

  const pDestinoStr = String(paciente.destino || '').toUpperCase().trim();
  let htmlDestino = `<div class="custom-select-option" data-value="">(SIN DESTINO)</div>`;
  destinosGlobal.forEach(d => { htmlDestino += `<div class="custom-select-option" data-value="${escapeHtml(d.toUpperCase())}">${escapeHtml(d.toUpperCase())}</div>`; });
  initCustomSelect('editDestinoWrapper', htmlDestino);
  const destinoDisplay = document.querySelector('#editDestinoWrapper .custom-select-display');
  destinoDisplay.innerText = pDestinoStr || '(SIN DESTINO)';
  destinoDisplay.dataset.value = pDestinoStr;

  let htmlMover = `<div class="custom-select-option" data-value="">NO MOVER (MANTENER EN CAMA ACTUAL)</div>`;
  const gruposLibres = agruparPorArea(camasLibresGlobal);
  for (const [area, camas] of Object.entries(gruposLibres)) {
    htmlMover += `<div class="custom-select-optgroup">${escapeHtml(area.toUpperCase())}</div>`;
    camas.forEach(c => { htmlMover += `<div class="custom-select-option" data-value="${c.fila}">${escapeHtml(c.cama.toUpperCase())}</div>`; });
  }
  initCustomSelect('editMoverWrapper', htmlMover);
  const moverDisplay = document.querySelector('#editMoverWrapper .custom-select-display');
  moverDisplay.innerText = 'NO MOVER (MANTENER EN CAMA ACTUAL)';
  moverDisplay.dataset.value = '';
  
  document.getElementById('editModal').classList.add('active');
}

async function guardarEdicion() {
  const btnGuardar = document.getElementById('btnGuardarEdit');
  const filaId = document.getElementById('modalFila').value;
  const destinoVal = document.querySelector('#editDestinoWrapper .custom-select-display').dataset.value || '';
  const moverAFila = document.querySelector('#editMoverWrapper .custom-select-display').dataset.value || '';
  const fechaInput = document.getElementById('modalFechaIngreso').value;

  btnGuardar.disabled = true; btnGuardar.innerHTML = '<span class="spin material-symbols-outlined">sync</span> GUARDANDO...';
  
  try {
    let updateData = {
        nombre: document.getElementById('modalNombre').value.toUpperCase(),
        edad: document.getElementById('modalEdad').value.toUpperCase(),
        diagnostico: document.getElementById('modalDiagnostico').value.toUpperCase(),
        pendientes: document.getElementById('modalPendientes').value.toUpperCase(),
        destino: destinoVal
    };

    if (fechaInput) updateData.creado = new Date(fechaInput);

    if (moverAFila && moverAFila !== "") {
        const nuevaCamaObj = camasLibresGlobal.find(c => c.fila === moverAFila);
        if (nuevaCamaObj) {
            updateData.cama = nuevaCamaObj.cama.toUpperCase();
            updateData.area = nuevaCamaObj.area.toUpperCase();
        }
    }

    await updateDoc(doc(db, "pacientes", filaId), updateData);
    vibrar(20); 
    cerrarModal('editModal');
  } catch (error) {
    vibrar([100, 50, 100]); 
    alert('ERROR AL GUARDAR: ' + error.message);
  } finally {
    btnGuardar.disabled = false; btnGuardar.innerHTML = '<span class="material-symbols-outlined">save</span> GUARDAR';
  }
}

let filaABorrar = null;
let iconoAlertaInterval = null;

function mostrarModalBorrar(fila, nombre) {
  vibrar([60, 50, 60]);
  filaABorrar = fila; 
  document.getElementById('deleteTargetName').innerText = nombre;
  document.getElementById('deleteConfirmModal').classList.add('active');
  
  const iconEl = document.getElementById('warningIconObj');
  let esSirena = true; 
  iconEl.innerHTML = '<span class="material-symbols-outlined" style="font-size: inherit;">warning</span>'; 
  if(iconoAlertaInterval) clearInterval(iconoAlertaInterval);
  iconoAlertaInterval = setInterval(() => { 
    esSirena = !esSirena; 
    iconEl.innerHTML = esSirena ? '<span class="material-symbols-outlined" style="font-size: inherit; color: var(--error-text);">warning</span>' : '<span class="material-symbols-outlined" style="font-size: inherit; color: var(--accent);">error</span>'; 
  }, 400); 
}

function borrarPacienteDialog() {
  const fila = document.getElementById('modalFila').value;
  const nom = document.getElementById('modalNombre').value;
  cerrarModal('editModal'); mostrarModalBorrar(fila, nom); 
}

function borrarPacienteDirecto(fila, nombre) { mostrarModalBorrar(fila, nombre); }

async function ejecutarBorrado() {
  const btnBorrar = document.getElementById('btnConfirmDelete');
  if (!filaABorrar) return;

  btnBorrar.disabled = true; 
  btnBorrar.innerHTML = '<span class="spin material-symbols-outlined">sync</span>...';
  vibrar(20);
  
  try {
    const pacienteData = pacientesGlobal.find(p => p.fila === filaABorrar);
    if (pacienteData) {
      const { fila, fechaIngresoFormateada, fechaIngresoISO, ...datosParaArchivar } = pacienteData;
      await setDoc(doc(db, "historial", filaABorrar), {
        ...datosParaArchivar,
        fechaEgreso: serverTimestamp(),
        egresadoPor: rolUsuario
      });
    }

    await deleteDoc(doc(db, "pacientes", filaABorrar));
    vibrar([30, 50, 30]); 
    cerrarModalBorrado(); 
    if (typeof confetti === 'function') { confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#ef4444', '#10b981', '#3b82f6', '#fbbf24'] }); }
  } catch (error) {
    vibrar([100, 50, 100]); 
    alert('ERROR AL BORRAR: ' + error.message); 
    cerrarModalBorrado();
  } finally {
    btnBorrar.disabled = false; btnBorrar.innerHTML = '<span class="material-symbols-outlined">delete</span> SÍ, BORRAR';
  }
}

function abrirModalAgregar() {
  vibrar(30); 
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('addFechaIngreso').value = now.toISOString().slice(0,16);

  let htmlCamas = '';
  if (camasLibresGlobal.length === 0) { 
    htmlCamas = `<div class="custom-select-option" data-value="">NO HAY CAMAS DISPONIBLES 🛑</div>`; 
  } else {
    const gruposLibres = agruparPorArea(camasLibresGlobal);
    for (const [area, camas] of Object.entries(gruposLibres)) {
      htmlCamas += `<div class="custom-select-optgroup">${escapeHtml(area.toUpperCase())}</div>`;
      camas.forEach(c => { htmlCamas += `<div class="custom-select-option" data-value="${escapeHtml(c.cama.toUpperCase())}|${escapeHtml(c.area.toUpperCase())}">${escapeHtml(c.cama.toUpperCase())}</div>`; });
    }
  }
  initCustomSelect('addCamaWrapper', htmlCamas);
  const camaDisplay = document.querySelector('#addCamaWrapper .custom-select-display');
  camaDisplay.innerText = 'SELECCIONA UNA CAMA LIBRE...';
  camaDisplay.dataset.value = '';

  let htmlDestino = `<div class="custom-select-option" data-value="">(SIN DESTINO)</div>`;
  destinosGlobal.forEach(d => { htmlDestino += `<div class="custom-select-option" data-value="${escapeHtml(d.toUpperCase())}">${escapeHtml(d.toUpperCase())}</div>`; });
  initCustomSelect('addDestinoWrapper', htmlDestino);
  const destinoDisplay = document.querySelector('#addDestinoWrapper .custom-select-display');
  destinoDisplay.innerText = '(SIN DESTINO)';
  destinoDisplay.dataset.value = '';

  document.getElementById('addNombre').value = ''; 
  document.getElementById('addEdad').value = ''; 
  document.getElementById('addDiagnostico').value = ''; 
  document.getElementById('addPendientes').value = '';
  
  document.getElementById('addModal').classList.add('active');
}

async function guardarNuevo() {
  const btnGuardar = document.getElementById('btnGuardarAdd');
  const selectCamaVal = document.querySelector('#addCamaWrapper .custom-select-display').dataset.value;
  if(!selectCamaVal) { alert("POR FAVOR SELECCIONA UNA CAMA DISPONIBLE."); return; }
  const [nombreCamaReal, areaReal] = selectCamaVal.split('|');
  
  const nom = document.getElementById('addNombre').value.toUpperCase(); 
  if(!nom) { alert("EL NOMBRE ES OBLIGATORIO."); return; }

  const destinoVal = document.querySelector('#addDestinoWrapper .custom-select-display').dataset.value || '';
  const fechaInput = document.getElementById('addFechaIngreso').value;

  btnGuardar.disabled = true; 
  btnGuardar.innerHTML = '<span class="spin material-symbols-outlined">sync</span> PROCESANDO...';

  try {
    const fechaCreacion = fechaInput ? new Date(fechaInput) : new Date();

    await addDoc(collection(db, "pacientes"), {
        nombre: nom,
        edad: document.getElementById('addEdad').value.toUpperCase(),
        diagnostico: document.getElementById('addDiagnostico').value.toUpperCase(),
        pendientes: document.getElementById('addPendientes').value.toUpperCase(),
        destino: destinoVal,
        cama: nombreCamaReal,
        area: areaReal,
        creado: fechaCreacion
    });
    vibrar(20); 
    cerrarModal('addModal');
  } catch (error) {
    vibrar([100, 50, 100]); 
    alert("ERROR: " + error.message); 
  } finally {
    btnGuardar.disabled = false; btnGuardar.innerHTML = '<span class="material-symbols-outlined">add</span> INGRESAR';
  }
}

window.cerrarModal = cerrarModal;
window.cerrarModalBorrado = cerrarModalBorrado;
window.toggleCard = toggleCard;
window.toggleTableRow = toggleTableRow;
window.abrirModal = abrirModal;
window.guardarEdicion = guardarEdicion;
window.borrarPacienteDialog = borrarPacienteDialog;
window.borrarPacienteDirecto = borrarPacienteDirecto;
window.ejecutarBorrado = ejecutarBorrado;
window.abrirModalAgregar = abrirModalAgregar;
window.guardarNuevo = guardarNuevo;

function normalizar(texto) { return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }

const easterEggsMap = {
  'yehernandez': ['❤️', '🐶', '🐕', '🦴', '🐾', '🐩', '💖', '🦮', '🎾', '💕'],
  'rodrrodriguez': ['🤖', '💻', '👾', '⚙️', '🖨️', '🔈', '🕹️', '🐺', '🎧', '🛠️'],
  'alfrojas': ['🔪', '🩸', '🗡️', '🩹', '🚑', '⚔️', '🪓', '🏥', '🚨', '💉'],
  'iharo': ['🐱', '🐈', '🧶', '😻', '🐾', '😽', '🐭', '🙀', '😼', '🐟']
};

let activeEasterEggs = new Set();

function checkEasterEggs(query) {
  const q = query.toLowerCase().replace(/\s+/g, '');
  let isEasterEggTriggered = false;
  for (const key in easterEggsMap) {
    if (q.includes(key) && !activeEasterEggs.has(key)) {
      activeEasterEggs.add(key);
      const cantidadEmojis = easterEggsMap[key].length;
      for(let i=0; i < cantidadEmojis; i++) { spawnSurfer(key, i); }
      isEasterEggTriggered = true;
      
      // MOSTRAR SOUNDBOARD SI ES ALFROJAS
      if (key === 'alfrojas') {
        document.getElementById('alfrojasSoundboard').style.display = 'flex';
      }
    }
  }
  return isEasterEggTriggered;
}

function spawnSurfer(key, index) {
  const container = document.getElementById('easterEggContainer');
  if (!container) return;
  const emoji = easterEggsMap[key][index];
  const wrapper = document.createElement('div');
  wrapper.className = 'surfer-wrapper';
  const duration = 15 + Math.random() * 15; 
  wrapper.style.animationDuration = `${duration}s`;
  wrapper.style.animationDelay = `-${Math.random() * duration}s`; 
  wrapper.style.bottom = `${5 + Math.random() * 40}px`; 
  
  const inner = document.createElement('span');
  inner.className = 'surfer-emoji';
  inner.innerText = emoji;
  const bobDuration = 2 + Math.random() * 2; 
  inner.style.animationDuration = `${bobDuration}s`;
  inner.style.animationDelay = `-${Math.random() * 2}s`; 
  
  inner.onpointerdown = (e) => {
     e.stopPropagation(); e.preventDefault(); vibrar(15);
     inner.style.animation = 'none'; inner.style.transform = 'scale(0)'; inner.style.opacity = '0'; inner.style.transition = 'all 0.2s ease';
     setTimeout(() => wrapper.remove(), 200); 
  };
  wrapper.appendChild(inner); container.appendChild(wrapper);
}

function resetAllSwipes() {
  document.querySelectorAll('.card').forEach(c => c.classList.remove('swipe-ready-delete', 'swipe-ready-edit'));
  document.querySelectorAll('.card-content-wrapper').forEach(cw => cw.style.transform = 'translateX(0)');
}

function initSwipe() {
  let xDown = null, yDown = null, activeCard = null;
  document.querySelectorAll('.card-content-wrapper').forEach(el => {
    el.addEventListener('touchstart', e => { 
      if (e.target.closest('.btn-editar-tarjeta') || e.target.closest('.header-right')) return;
      xDown = e.touches[0].clientX; yDown = e.touches[0].clientY; activeCard = el; 
    }, {passive: true});
    
    el.addEventListener('touchmove', e => {
      if(!xDown || !activeCard) return;
      let xDiff = xDown - e.touches[0].clientX;
      let yDiff = yDown - e.touches[0].clientY;
      
      if (Math.abs(xDiff) > Math.abs(yDiff)) {
        if(Math.abs(xDiff) > 30) {
          activeCard.style.transform = `translateX(${-xDiff * 0.4}px)`;
          if(xDiff > 110) { activeCard.closest('.card').classList.add('swipe-ready-delete'); }
          else if(xDiff < -110) { activeCard.closest('.card').classList.add('swipe-ready-edit'); }
          else { activeCard.closest('.card').classList.remove('swipe-ready-delete', 'swipe-ready-edit'); }
        }
      }
    }, {passive: true});
    
    el.addEventListener('touchend', e => {
      if(!xDown || !activeCard) return;
      let xDiff = xDown - e.changedTouches[0].clientX;
      const fila = activeCard.closest('.card').getAttribute('data-fila');
      const nombre = activeCard.closest('.card').getAttribute('data-nombre');
      
      activeCard.style.transform = 'translateX(0)';
      activeCard.closest('.card').classList.remove('swipe-ready-delete', 'swipe-ready-edit');
      
      if(xDiff > 110) { setTimeout(() => borrarPacienteDirecto(fila, nombre), 100); }
      else if(xDiff < -110) { setTimeout(() => abrirModal(fila), 100); }
      
      xDown = null; activeCard = null;
    });
  });
}

function filtrar() {
  const searchInput = document.getElementById('search');
  const q = normalizar(searchInput.value);
  const eggFound = checkEasterEggs(q); 
  
  if (eggFound) {
    searchInput.value = ''; searchInput.blur();
    document.getElementById('searchWrapper').classList.add('collapsed');
    vibrar([40, 60, 40]);
    render(pacientesGlobal); return;
  }
  if (isFetchingData) return; 
  if (!q) { render(pacientesGlobal); return; }
  
  const filtrados = pacientesGlobal.filter(p => { 
    return normalizar([p.nombre, p.cama, p.area || '', p.edad, p.diagnostico, p.pendientes, p.destino].join(' ')).includes(q); 
  });
  render(filtrados);
  document.querySelectorAll('.animate-in').forEach(el => { el.classList.remove('animate-in'); el.style.animationDelay = '0ms'; el.style.opacity = '1'; });
}

function mostrarError(error) { 
  document.getElementById('content').innerHTML = `<div class="error animate-in">ERROR:\n${escapeHtml(error && error.message ? error.message : error)}</div>`; 
  if(document.getElementById('meta-text')) document.getElementById('meta-text').innerHTML = `ERROR DE CONEXIÓN`; 
}

// ==========================================================
// SISTEMA DE TEMAS 
// ==========================================================
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
  currentViewMode = savedView;
  document.getElementById('viewIcon').textContent = currentViewMode === 'kanban' ? 'table_rows' : 'grid_view'; 
  
  renderThemePickers();
  applyTheme(localStorage.getItem('censo-base'), localStorage.getItem('censo-accent'));
}

// EVENTOS UI
document.getElementById('search').addEventListener('input', filtrar);
document.getElementById('search').addEventListener('search', (e) => { if (e.target.value === '') render(pacientesGlobal); });

document.getElementById('themeToggleBtn').addEventListener('click', () => { 
  vibrar(15); 
  document.getElementById('themeModal').classList.add('active');
});

document.getElementById('viewToggleBtn').addEventListener('click', () => {
  vibrar(15);
  currentViewMode = currentViewMode === 'kanban' ? 'table' : 'kanban';
  localStorage.setItem('censo-view', currentViewMode);
  document.getElementById('viewIcon').textContent = currentViewMode === 'kanban' ? 'table_rows' : 'grid_view';
  render(pacientesGlobal);
});

document.getElementById('searchToggleBtn').addEventListener('click', () => {
  vibrar(15); const wrapper = document.getElementById('searchWrapper'); const searchInput = document.getElementById('search');
  wrapper.classList.toggle('collapsed');
  if (!wrapper.classList.contains('collapsed')) { setTimeout(() => searchInput.focus(), 300); } else { searchInput.value = ''; render(pacientesGlobal); }
});

document.getElementById('historyBtn').addEventListener('click', () => {
  vibrar(15);
  window.open('https://rourog.github.io/censo/historial.html', '_blank');
});

document.getElementById('reloadBtn').addEventListener('click', () => { 
    vibrar(15); document.getElementById('reloadIcon').classList.add('spin'); render(pacientesGlobal); 
    setTimeout(() => document.getElementById('reloadIcon').classList.remove('spin'), 800); 
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (!isFetchingData) render(pacientesGlobal); }, 200);
});

initTheme(); 

// ==========================================================
// SISTEMA DE PARTÍCULAS NEURAL Y SINAPSIS
// ==========================================================
let plexusRunning = false;
let isTabActive = true;

document.addEventListener("visibilitychange", () => { isTabActive = !document.hidden; });

window.syncPlexusPatients = () => {};

function initPlexus() {
  if (plexusRunning) return;
  plexusRunning = true;

  const canvas = document.getElementById('plexusCanvas');
  const ctx = canvas.getContext('2d');
  let width, height, standardParticles = [], patientParticles = [];

  function resize() { 
    width = canvas.width = canvas.offsetWidth; 
    height = canvas.height = canvas.offsetHeight; 
    initStandardParticles();
  }

  const plexusAreaColors = {
    'SALA DE CHOQUE': { solid: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' },
    'OBSERVACION': { solid: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
    'OBSERVACIÓN': { solid: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
    'TRAUMA MENOR': { solid: '#eab308', glow: 'rgba(234, 179, 8, 0.4)' },
    'PEDIATRIA': { solid: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
    'PEDIATRÍA': { solid: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
    'EXTRAS': { solid: '#d946ef', glow: 'rgba(217, 70, 239, 0.4)' }
  };

  function createParticle(isPatient, colorSet) {
    return {
      isPatient: isPatient,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: isPatient ? (Math.random() * 2 + 3) : (Math.random() * 1.5 + 0.5),
      color: colorSet
    };
  }
  
  function initStandardParticles() {
    standardParticles = [];
    let num = Math.floor(width / 35); 
    for (let i = 0; i < num; i++) {
      standardParticles.push(createParticle(false, null));
    }
  }

  window.syncPlexusPatients = (listaPacientes) => {
    patientParticles = [];
    (listaPacientes || []).forEach(p => {
      let areaNormalizada = String(p.area || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
      let colorSet = plexusAreaColors[areaNormalizada] || { solid: '#ffffff', glow: 'rgba(255,255,255,0.3)' };
      patientParticles.push(createParticle(true, colorSet));
    });
  };

  window.addEventListener('resize', resize);
  resize();

  function animate() {
    if (!isTabActive) {
      requestAnimationFrame(animate);
      return;
    }

    ctx.clearRect(0, 0, width, height);
    
    let isLight = document.body.className.includes('base-light') || 
                  document.body.className.includes('base-pure-white') || 
                  document.body.className.includes('base-gray-light') || 
                  document.body.className.includes('base-sand') || 
                  document.body.className.includes('base-rose') || 
                  document.body.className.includes('base-mint') || 
                  document.body.className.includes('base-lavender');
                  
    let defaultFill = isLight ? 'rgba(15, 23, 42, 0.3)' : 'rgba(255, 255, 255, 0.3)';
    let defaultStroke = isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    
    let allParticles = standardParticles.concat(patientParticles);
    ctx.lineWidth = 0.8; 

    for (let i = 0; i < allParticles.length; i++) {
      let p = allParticles[i];
      p.x += p.vx; p.y += p.vy;
      
      if (p.x < 0 || p.x > width) p.vx *= -1; 
      if (p.y < 0 || p.y > height) p.vy *= -1;
      
      if (p.isPatient) {
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, p.radius + 3, 0, Math.PI * 2); 
        ctx.fillStyle = p.color.glow; 
        ctx.fill();
        
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); 
        ctx.fillStyle = p.color.solid; 
        ctx.fill();
      } else {
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); 
        ctx.fillStyle = defaultFill; 
        ctx.fill();
      }

      for (let j = i + 1; j < allParticles.length; j++) {
        let p2 = allParticles[j];
        let dx = p.x - p2.x, dy = p.y - p2.y;
        if (dx*dx + dy*dy < 8000) { 
          ctx.beginPath(); 
          ctx.strokeStyle = defaultStroke; 
          ctx.moveTo(p.x, p.y); 
          ctx.lineTo(p2.x, p2.y); 
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(animate);
  }
  animate();
}
