/*
  MÓDULO: bedAdminModule.js

  RESPONSABILIDAD:
  - Sincronizar el catálogo de camas desde Firestore.
  - Mantener un nivel basal inmutable y administrar solo ubicaciones temporales.
  - Integrar la administración de camas como tercera pestaña del panel de noticias.
  - Impedir retirar camas ocupadas.
*/

const ADMIN_SESSION = 'censo-newsbar-admin-session-v1';
const SETTINGS_COLLECTION = 'settings';
const SETTINGS_DOC = 'bedCatalog';
const MAX_BEDS = 250;
const CATALOG_VERSION = 'basal-20260918';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

function cleanText(value, maxLength) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

// Modelo sin DOM ni Firebase, también utilizado por las pruebas de migración.
export function createBedCatalogModel(bedModule) {
  const bedKey = bedModule.claveCama;
  const basalBeds = bedModule.basalBeds.map(bed => ({ ...bed }));
  const basalKeys = new Set(basalBeds.map(bedKey));
  const defaultTemporaryBeds = bedModule.defaultTemporaryBeds.map(bed => ({ ...bed }));
  const temporaryAreas = ['OBSERVACIÓN', 'TRAUMA MENOR', 'PEDIATRÍA', 'EXTRAS'];
  const isBasal = bed => basalKeys.has(bedKey(bed));

  function normalizeBed(raw) {
    const area = cleanText(raw?.area, 60).toLocaleUpperCase('es-MX');
    const cama = cleanText(raw?.cama, 60).toLocaleUpperCase('es-MX');
    const descripcion = cleanText(raw?.descripcion, 120).toLocaleUpperCase('es-MX');
    if (!area || !cama) throw new Error('Cada ubicación necesita área y nombre.');
    return bedModule.normalizarUbicacion(descripcion ? { area, cama, descripcion } : { area, cama });
  }

  function validateTemporaryBeds(input) {
    if (!Array.isArray(input)) throw new Error('El catálogo temporal no es válido.');
    if (input.length + basalBeds.length > MAX_BEDS) throw new Error(`Se alcanzó el límite de ${MAX_BEDS} ubicaciones.`);
    const seen = new Set(basalKeys);
    return input.map(raw => {
      const bed = normalizeBed(raw);
      const key = bedKey(bed);
      if (/^EXTRA(?:\s|\d|$)/u.test(bed.cama)) throw new Error('Usa Cama, Silla o Cuna dentro del área EXTRAS.');
      if (['SALA DE CHOQUE', 'PEDILUVIO', "EFE'S"].includes(bed.area)) throw new Error('Esta área conserva únicamente su nivel basal.');
      if (seen.has(key)) throw new Error('Esa cama o silla ya existe en el área seleccionada.');
      seen.add(key);
      return bed;
    });
  }

  function readTemporaryBeds(data) {
    if (data == null) return defaultTemporaryBeds.map(bed => ({ ...bed }));
    if (data.catalogVersion != null && data.catalogVersion !== CATALOG_VERSION) throw new Error('Versión de catálogo no compatible. Actualiza el censo.');
    if (data.schemaVersion === 2) return validateTemporaryBeds(data.temporaryBeds);
    if (data.schemaVersion != null && data.schemaVersion !== 1) throw new Error('Versión de catálogo no compatible. Actualiza el censo.');
    if (!Array.isArray(data.beds) || data.beds.length > MAX_BEDS) throw new Error('El catálogo anterior no es válido.');
    const migrated = new Map(defaultTemporaryBeds.map(bed => [bedKey(bed), { ...bed }]));
    for (const raw of data.beds) {
      const bed = normalizeBed(raw);
      if (isBasal(bed) || bedModule.esUbicacionRetirada(bed)) continue;
      migrated.set(bedKey(bed), bed);
    }
    return validateTemporaryBeds([...migrated.values()]);
  }

  function compose(temporaries) {
    const areas = [...new Set(basalBeds.map(bed => bed.area))];
    const order = area => areas.includes(area) ? areas.indexOf(area) : areas.length;
    return [...basalBeds.map(bed => ({ ...bed })), ...validateTemporaryBeds(temporaries)]
      .sort((a, b) => order(a.area) - order(b.area)
        || a.area.localeCompare(b.area, 'es')
        || a.cama.localeCompare(b.cama, 'es', { numeric: true }));
  }

  function fromForm(area, type, number) {
    const bed = normalizeBed({ area, cama: `${type} ${number}` });
    if (!temporaryAreas.includes(bed.area)) throw new Error('Selecciona un área válida para la ubicación temporal.');
    if (!['CAMA', 'SILLA', 'CUNA'].includes(type) || !/^[1-9]\d{0,2}$/u.test(String(number))) {
      throw new Error('Selecciona un tipo y un número entero entre 1 y 999.');
    }
    return bed;
  }

  function sharedDocument(temporaries, previous, uid, timestamp) {
    const next = validateTemporaryBeds(temporaries);
    return {
      schemaVersion: 2,
      catalogVersion: CATALOG_VERSION,
      basalBeds: basalBeds.map(bed => ({ ...bed })),
      temporaryBeds: next,
      beds: compose(next),
      revision: (Number.isSafeInteger(previous?.revision) && previous.revision >= 0 ? previous.revision : 0) + 1,
      updatedBy: uid,
      updatedAt: timestamp
    };
  }

  function isSharedDocument(data) {
    const temporaries = readTemporaryBeds(data);
    const sameBeds = (actual, expected) => Array.isArray(actual)
      && actual.length === expected.length
      && actual.every((bed, i) => JSON.stringify(normalizeBed(bed)) === JSON.stringify(normalizeBed(expected[i])));
    return data?.schemaVersion === 2 && data.catalogVersion === CATALOG_VERSION
      && Number.isSafeInteger(data.revision) && data.revision > 0
      && sameBeds(data.basalBeds, basalBeds) && sameBeds(data.beds, compose(temporaries));
  }

  return { bedKey, basalBeds, defaultTemporaryBeds, temporaryAreas, isBasal, normalizeBed, validateTemporaryBeds, readTemporaryBeds, compose, fromForm, sharedDocument, isSharedDocument };
}

export function createBedAdminModule(app) {
  const { state } = app;
  const {
    db,
    auth,
    doc,
    onSnapshot,
    onAuthStateChanged,
    collection,
    getDocFromServer,
    getDocsFromServer,
    runTransaction,
    serverTimestamp
  } = app.firebase;

  const model = createBedCatalogModel(app.bed);
  const { bedKey, basalBeds, defaultTemporaryBeds, isBasal, readTemporaryBeds, compose } = model;
  let temporaryBeds = defaultTemporaryBeds.map(bed => ({ ...bed }));
  let catalog = compose(temporaryBeds);
  let authUnsubscribe = null;
  let catalogUnsubscribe = null;
  let domObserver = null;
  let managerObserver = null;
  let currentUid = null;
  let listenerGeneration = 0;
  let initialization = null;
  let revision = 0;
  let syncState = 'loading';
  let syncError = '';
  let unlocked = false;
  let busy = false;
  let ui = null;

  function isOccupied(bed) {
    const key = bedKey(bed);
    return state.pacientesGlobal.some(patient => bedKey({ area: patient.area, cama: patient.cama }) === key);
  }

  function occupantFor(bed) {
    const key = bedKey(bed);
    return state.pacientesGlobal.find(patient => bedKey({ area: patient.area, cama: patient.cama }) === key) || null;
  }

  function applyCatalog(nextBeds, { refreshPatients = true } = {}) {
    catalog = compose(nextBeds);
    temporaryBeds = nextBeds.map(bed => ({ ...bed }));

    // masterCamas es un arreglo compartido. Se muta in-place para conservar
    // las referencias que ya tomaron modalModule y patientModule al arrancar.
    app.bed.masterCamas.splice(
      0,
      app.bed.masterCamas.length,
      ...catalog.map(bed => ({ ...bed }))
    );

    state.camasLibresGlobal = syncState === 'ready' ? app.bed.calcularCamasLibres(
      app.bed.masterCamas,
      state.pacientesGlobal
    ) : [];

    renderAdmin();

    // Releer pacientes recalcula orden y camas libres usando el nuevo catálogo.
    if (refreshPatients && state.unsubscribe && typeof app.initFirebaseListener === 'function') {
      app.initFirebaseListener();
    }
  }

  function setSyncStatus(status, message = '') {
    syncState = status;
    syncError = message;
    if (status !== 'ready') state.camasLibresGlobal = [];
    renderAdmin();
  }

  function syncFailure(error) {
    console.error('[CENSO] No se pudo sincronizar el catálogo de camas:', error);
    setSyncStatus('error', `No se pueden asignar ni modificar camas hasta sincronizar. ${saveError(error)}`);
  }

  function initializeSharedCatalog(ref, uid, generation) {
    if (initialization?.generation === generation) return;
    const token = { generation };
    initialization = token;
    void runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      if (currentUid !== uid || auth.currentUser?.uid !== uid || listenerGeneration !== generation) throw new Error('La sesión cambió.');
      const data = snapshot.exists() ? snapshot.data() : null;
      if (model.isSharedDocument(data)) return;
      transaction.set(ref, model.sharedDocument(readTemporaryBeds(data), data, uid, serverTimestamp()));
    }).catch(error => {
      if (currentUid === uid && listenerGeneration === generation) syncFailure(error);
    }).finally(() => {
      if (initialization === token) initialization = null;
    });
  }

  function listenCatalog() {
    catalogUnsubscribe?.();
    catalogUnsubscribe = null;
    const generation = ++listenerGeneration;
    setSyncStatus('loading');

    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const ref = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);

    catalogUnsubscribe = onSnapshot(ref, { includeMetadataChanges: true }, snapshot => {
      if (currentUid !== uid || generation !== listenerGeneration) return;
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
        setSyncStatus('waiting', 'Esperando confirmación de Firebase. No se pueden asignar ni modificar camas hasta sincronizar.');
        return;
      }
      try {
        const data = snapshot.exists() ? snapshot.data() : null;
        if (!model.isSharedDocument(data)) {
          setSyncStatus('loading');
          initializeSharedCatalog(ref, uid, generation);
          return;
        }
        const next = readTemporaryBeds(data);
        const changed = syncState !== 'ready' || revision !== data.revision;
        revision = data.revision;
        syncState = 'ready';
        syncError = '';
        applyCatalog(next, { refreshPatients: changed });
      } catch (error) {
        syncFailure(error);
      }
    }, error => {
      if (currentUid === uid && generation === listenerGeneration) syncFailure(error);
    });
  }

  async function requireSharedBed(area, cama) {
    if (syncState !== 'ready' || !auth.currentUser) throw new Error('ESPERA A QUE SE SINCRONICEN LAS CAMAS CON FIREBASE.');
    const uid = auth.currentUser.uid;
    const snapshot = await getDocFromServer(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC));
    if (auth.currentUser?.uid !== uid || currentUid !== uid || syncState !== 'ready') throw new Error('LA SESIÓN O LA CONEXIÓN CAMBIÓ. VUELVE A INTENTARLO.');
    const data = snapshot.exists() ? snapshot.data() : null;
    if (!model.isSharedDocument(data)) throw new Error('EL CATÁLOGO COMPARTIDO CAMBIÓ. ESPERA A QUE SE SINCRONICE.');
    if (!data.beds.some(bed => bedKey(bed) === bedKey({ area, cama }))) throw new Error('ESA UBICACIÓN FUE RETIRADA. VUELVE A SELECCIONAR UNA CAMA.');
  }

  function initBedCatalogAuthBridge() {
    if (authUnsubscribe) return;
    authUnsubscribe = onAuthStateChanged(auth, user => {
      const uid = user?.uid || null;
      if (uid === currentUid) return;
      currentUid = uid;
      listenerGeneration++;
      catalogUnsubscribe?.();
      catalogUnsubscribe = null;

      if (user) {
        listenCatalog();
      } else {
        unlocked = false;
        syncState = 'loading';
        syncError = '';
        applyCatalog(defaultTemporaryBeds, { refreshPatients: false });
      }
    });
  }

  function ensureAdminUi() {
    if (ui?.panel?.isConnected) return true;

    const tabs = document.querySelector('.censo-admin-tabs');
    const noticesTab = document.getElementById('censoAdminNoticesTab');
    const soundsTab = document.getElementById('censoAdminSoundsTab');
    const noticesPanel = document.getElementById('censoAdminNoticesPanel');
    const soundsPanel = document.getElementById('censoAdminSoundsPanel');
    const managerView = document.getElementById('censoNewsManagerView');
    const lockButton = document.getElementById('censoNewsAdminLock');

    if (!tabs || !noticesTab || !soundsTab || !noticesPanel || !soundsPanel || !managerView) return false;

    let bedTab = document.getElementById('censoAdminBedsTab');
    if (!bedTab) {
      bedTab = document.createElement('button');
      bedTab.id = 'censoAdminBedsTab';
      bedTab.type = 'button';
      bedTab.setAttribute('role', 'tab');
      bedTab.setAttribute('aria-selected', 'false');
      bedTab.setAttribute('aria-controls', 'censoAdminBedsPanel');
      bedTab.tabIndex = -1;
      bedTab.textContent = 'Camas';
      tabs.insertBefore(bedTab, soundsTab);
    }

    let panel = document.getElementById('censoAdminBedsPanel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'censoAdminBedsPanel';
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'censoAdminBedsTab');
      panel.hidden = true;
      panel.innerHTML = `
        <p id="censoBedStatus" class="censo-newsmodal__copy" role="status"></p>
        <button id="censoBedRetry" class="censo-newsmodal__button" type="button" hidden>Reintentar conexión</button>
        <div class="censo-sound-heading"><strong>Camas y sillas</strong><span id="censoBedCount"></span></div>
        <p class="censo-newsmodal__copy">El nivel basal es fijo. Solo las ubicaciones temporales pueden agregarse o quitarse.</p>
        <div id="censoBedList" class="censo-newsadmin-list"></div>
        <form id="censoBedForm" class="censo-sound-form">
          <div class="censo-newsmodal__field">
            <label for="censoBedArea">Área</label>
            <select id="censoBedArea" required>${model.temporaryAreas.map(area => `<option value="${esc(area)}">${esc(area)}</option>`).join('')}</select>
          </div>
          <div class="censo-newsmodal__field">
            <label for="censoBedType">Tipo</label>
            <select id="censoBedType" required><option value="CAMA">Cama</option><option value="SILLA">Silla</option><option value="CUNA">Cuna</option></select>
          </div>
          <div class="censo-newsmodal__field">
            <label for="censoBedNumber">Número</label>
            <input id="censoBedNumber" type="number" min="1" max="999" step="1" required placeholder="Ej. 11">
          </div>
          <p id="censoBedMessage" class="censo-newsmodal__copy" role="status" aria-live="polite"></p>
          <div class="censo-newsmodal__actions">
            <button id="censoBedAdd" class="censo-newsmodal__button censo-newsmodal__button--primary" type="submit">Agregar temporal</button>
          </div>
        </form>`;
      managerView.insertBefore(panel, soundsPanel);
    }

    const get = suffix => document.getElementById(`censoBed${suffix}`);
    ui = {
      tabs,
      bedTab,
      noticesTab,
      soundsTab,
      noticesPanel,
      soundsPanel,
      managerView,
      lockButton,
      panel,
      status: get('Status'),
      retry: get('Retry'),
      count: get('Count'),
      list: get('List'),
      form: get('Form'),
      area: get('Area'),
      type: get('Type'),
      number: get('Number'),
      message: get('Message'),
      add: get('Add')
    };

    const leaveBeds = () => {
      if (!ui?.panel) return;
      ui.panel.hidden = true;
      ui.bedTab.setAttribute('aria-selected', 'false');
      ui.bedTab.tabIndex = -1;
    };

    ui.bedTab.addEventListener('click', () => {
      app.stopSoundPreview?.();
      ui.noticesPanel.hidden = true;
      ui.soundsPanel.hidden = true;
      ui.panel.hidden = false;
      ui.noticesTab.setAttribute('aria-selected', 'false');
      ui.soundsTab.setAttribute('aria-selected', 'false');
      ui.bedTab.setAttribute('aria-selected', 'true');
      ui.noticesTab.tabIndex = -1;
      ui.soundsTab.tabIndex = -1;
      ui.bedTab.tabIndex = 0;
      renderAdmin();
      setTimeout(() => ui.area?.focus(), 40);
    });

    ui.noticesTab.addEventListener('click', leaveBeds, true);
    ui.soundsTab.addEventListener('click', leaveBeds, true);

    ui.form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      try {
        const bed = model.fromForm(ui.area.value, ui.type.value, ui.number.value);
        await mutate({ type: 'add', bed });
        ui.number.value = '';
        ui.message.textContent = `${bed.area} / ${bed.cama} agregada como temporal.`;
      } catch (error) {
        ui.message.textContent = saveError(error);
      }
    });

    ui.list.addEventListener('click', async event => {
      const button = event.target.closest('[data-bed-remove]');
      if (!button || busy || !unlocked) return;
      const bed = catalog.find(item => bedKey(item) === button.dataset.bedRemove);
      if (!bed) return;
      if (isBasal(bed)) {
        ui.message.textContent = 'El nivel basal está protegido y no puede retirarse.';
        return;
      }
      if (isOccupied(bed)) {
        ui.message.textContent = 'No se puede retirar una cama mientras tenga un paciente asignado.';
        return;
      }
      if (!confirm(`¿Retirar ${bed.cama} de ${bed.area}?`)) return;
      try {
        await mutate({ type: 'remove', key: bedKey(bed) });
        ui.message.textContent = `${bed.area} / ${bed.cama} retirada.`;
      } catch (error) {
        ui.message.textContent = saveError(error);
      }
    });

    ui.retry.addEventListener('click', listenCatalog);
    ui.lockButton?.addEventListener('click', () => setUnlocked(false));

    managerObserver?.disconnect();
    managerObserver = new MutationObserver(() => syncAdminUnlockState());
    managerObserver.observe(managerView, { attributes: true, attributeFilter: ['hidden'] });
    syncAdminUnlockState();
    renderAdmin();
    return true;
  }

  function initBedAdminUiBridge() {
    if (ensureAdminUi()) return;
    if (domObserver) return;

    domObserver = new MutationObserver(() => {
      if (!ensureAdminUi()) return;
      domObserver.disconnect();
      domObserver = null;
    });
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  function syncAdminUnlockState() {
    const sessionUnlocked = sessionStorage.getItem(ADMIN_SESSION) === '1';
    const managerVisible = ui?.managerView && !ui.managerView.hidden;
    setUnlocked(Boolean(sessionUnlocked && managerVisible));
  }

  function setUnlocked(value) {
    unlocked = Boolean(value);
    renderAdmin();
  }

  async function mutate(action) {
    if (!unlocked || !auth.currentUser || sessionStorage.getItem(ADMIN_SESSION) !== '1') {
      throw new Error('Desbloquea la administración para modificar camas.');
    }
    if (syncState !== 'ready') throw new Error('Espera a que termine la sincronización de camas.');

    const uid = auth.currentUser.uid;
    const ref = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
    busy = true;
    renderAdmin();

    try {
      // Una instantánea local puede estar atrasada. La consulta es de solo
      // lectura y falla cerrada sin red; no modifica ni elimina pacientes.
      if (action.type === 'remove') {
        if (basalBeds.some(bed => bedKey(bed) === action.key)) throw new Error('El nivel basal está protegido y no puede retirarse.');
        const patients = await getDocsFromServer(collection(db, 'pacientes'));
        let occupied = false;
        patients.forEach(snapshot => {
          if (bedKey(snapshot.data()) === action.key) occupied = true;
        });
        if (occupied) throw new Error('La cama está ocupada y no puede retirarse.');
      }
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        if (!unlocked || auth.currentUser?.uid !== uid || currentUid !== uid || sessionStorage.getItem(ADMIN_SESSION) !== '1') {
          throw new Error('La administración se bloqueó. Vuelve a entrar.');
        }
        const data = snapshot.exists() ? snapshot.data() : null;
        if (!model.isSharedDocument(data)) throw new Error('Espera a que termine la sincronización del catálogo compartido.');
        const current = readTemporaryBeds(data);
        let next = current.map(bed => ({ ...bed }));

        if (action.type === 'add') {
          const bed = model.normalizeBed(action.bed);
          if (isBasal(bed) || next.some(item => bedKey(item) === bedKey(bed))) {
            throw new Error('Esa cama o silla ya existe en el área seleccionada.');
          }
          next.push(bed);
        } else if (action.type === 'remove') {
          const target = next.find(item => bedKey(item) === action.key);
          if (!target) return;
          if (isOccupied(target)) throw new Error('La cama está ocupada y no puede retirarse.');
          next = next.filter(item => bedKey(item) !== action.key);
        } else {
          throw new Error('Acción de camas desconocida.');
        }

        transaction.set(ref, model.sharedDocument(next, data, uid, serverTimestamp()));
      });
    } finally {
      busy = false;
      renderAdmin();
    }
  }

  function saveError(error) {
    if (String(error?.code || '').includes('permission-denied')) {
      return 'No se pudo guardar: falta habilitar settings/bedCatalog en las reglas de Firebase.';
    }
    if (String(error?.code || '').includes('unavailable')) {
      return 'No se guardó el cambio. Comprueba la conexión e inténtalo de nuevo.';
    }
    return error?.message || 'No se pudo modificar el catálogo de camas.';
  }

  function renderAdmin() {
    if (!ui) return;

    ui.count.textContent = `${basalBeds.length} basales · ${temporaryBeds.length} temporales`;
    ui.status.textContent = syncState === 'loading'
      ? 'Cargando catálogo compartido…'
      : syncState !== 'ready'
        ? syncError
        : `Sincronizado con Firebase · revisión ${revision}. Los cambios se comparten entre equipos.`;
    ui.retry.hidden = !['error', 'waiting'].includes(syncState);

    ui.add.disabled = busy || !unlocked || syncState !== 'ready';
    ui.add.textContent = busy ? 'Guardando…' : 'Agregar temporal';
    ui.area.disabled = busy;
    ui.type.disabled = busy;
    ui.number.disabled = busy;

    const renderSection = (title, items) => {
      const grouped = new Map();
      items.forEach(bed => {
        if (!grouped.has(bed.area)) grouped.set(bed.area, []);
        grouped.get(bed.area).push(bed);
      });
      return `<h3>${title} · ${items.length}</h3>` + (items.length ? [...grouped.entries()].map(([area, beds]) => `
          <div class="censo-bed-group">
            <div class="censo-sound-heading"><strong>${esc(area)}</strong><span>${beds.length}</span></div>
            ${beds.map(bed => {
              const occupant = occupantFor(bed);
              const occupied = Boolean(occupant);
              const basal = isBasal(bed);
              return `<div class="censo-newsadmin-item censo-sound-item">
                <div>
                  <span class="material-symbols-outlined" aria-hidden="true">${bed.cama.startsWith('SILLA') ? 'chair' : 'bed'}</span>
                  <div><strong>${esc(bed.cama)}</strong>${bed.descripcion ? `<small style="display:block;color:var(--muted);margin-top:2px;">${esc(bed.descripcion)}</small>` : ''}${occupied ? `<small style="display:block;color:var(--accent);margin-top:2px;">OCUPADA · ${esc(occupant.nombre || 'PACIENTE')}</small>` : ''}</div>
                </div>
                <div class="censo-sound-actions">
                  ${basal ? '<span title="Nivel basal protegido">🔒 Basal</span>' : `<button type="button" class="censo-newsmodal__button censo-newsmodal__button--danger" data-bed-remove="${esc(bedKey(bed))}" ${occupied || busy || !unlocked || syncState !== 'ready' ? 'disabled' : ''}>Quitar</button>`}
                </div>
              </div>`;
            }).join('')}
          </div>`).join('') : '<p class="censo-news-empty">No hay ubicaciones temporales activas.</p>');
    };
    const outsideCatalog = state.pacientesGlobal.filter(patient => !catalog.some(bed => bedKey(bed) === bedKey(patient)));
    ui.list.innerHTML = `<details><summary>Nivel basal protegido · ${basalBeds.length} ubicaciones</summary>${renderSection('Nivel basal', catalog.filter(isBasal))}</details>`
      + renderSection('Temporales activas', catalog.filter(bed => !isBasal(bed)))
      + (!temporaryBeds.some(bed => bed.area === 'EXTRAS') ? '<div class="censo-bed-group"><div class="censo-sound-heading"><strong>EXTRAS</strong><span>0</span></div><p class="censo-news-empty">Sin camas basales. Agrega camas o sillas temporales seleccionando EXTRAS.</p></div>' : '')
      + (outsideCatalog.length ? `<p class="censo-newsmodal__copy" role="status">${outsideCatalog.length} paciente(s) en ubicaciones fuera del catálogo activo. Permanecen en el censo hasta su traslado o egreso; esas ubicaciones no se ofrecen para nuevos ingresos.</p>` : '');
  }

  return {
    initBedCatalogAuthBridge,
    initBedAdminUiBridge,
    setBedAdminUnlocked: setUnlocked,
    refreshBedAdmin: renderAdmin,
    isBedCatalogReady: () => syncState === 'ready',
    requireSharedBed,
    getBedCatalog: () => catalog.map(bed => ({ ...bed }))
  };
}
