/*
  MÓDULO: bedAdminModule.js

  RESPONSABILIDAD:
  - Sincronizar el catálogo de camas desde Firestore.
  - Mantener un nivel basal inmutable y administrar solo ubicaciones temporales.
  - Ofrecer un panel compacto e independiente para administrar ubicaciones.
  - Impedir retirar camas ocupadas.
*/

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
  const { SALA_2 } = bedModule;
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
    if (bed.area !== SALA_2 && !temporaryAreas.includes(bed.area)) throw new Error('Selecciona un área válida para la ubicación temporal.');
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
  const { SALA_2, normalizarUbicacion } = app.bed;
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
  let currentUid = null;
  let listenerGeneration = 0;
  let initialization = null;
  let revision = 0;
  let syncState = 'loading';
  let syncError = '';
  let busy = false;
  let ui = null;

  const inSala2 = bed => normalizarUbicacion(bed).area === SALA_2;

  async function hasServerOccupant(matches) {
    const patients = await getDocsFromServer(collection(db, 'pacientes'));
    let occupied = false;
    patients.forEach(snapshot => {
      if (matches(snapshot.data(), snapshot.id)) occupied = true;
    });
    return occupied;
  }

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

  async function saveSala2Assignment(patient, patientId = null) {
    const uid = auth.currentUser?.uid;
    if (!uid || syncState !== 'ready') throw new Error('ESPERA A QUE SE SINCRONICEN LAS CAMAS CON FIREBASE.');

    const catalogRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
    const patients = collection(db, 'pacientes');
    const patientRef = patientId === null ? doc(patients) : doc(patients, patientId);
    const key = bedKey(patient);
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(catalogRef);
      const data = snapshot.exists() ? snapshot.data() : null;
      if (!model.isSharedDocument(data) || !data.beds.some(bed => bedKey(bed) === key)) {
        throw new Error('ESA UBICACIÓN FUE RETIRADA. VUELVE A SELECCIONAR UNA CAMA.');
      }
      if (await hasServerOccupant((bed, id) => id !== patientId && bedKey(bed) === key)) {
        throw new Error('LA CAMA ESTÁ OCUPADA. VUELVE A SELECCIONAR UNA CAMA LIBRE.');
      }
      if (auth.currentUser?.uid !== uid || currentUid !== uid) throw new Error('La sesión cambió. Vuelve a intentarlo.');

      // Comparte la revisión con las bajas para obligar a releer la ocupación
      // si otro cliente asignó a Sala 2 mientras se estaba retirando.
      transaction.set(catalogRef, model.sharedDocument(readTemporaryBeds(data), data, uid, serverTimestamp()));
      if (patientId === null) transaction.set(patientRef, patient);
      else transaction.update(patientRef, patient);
    });
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
        closeBedManager();
        syncState = 'loading';
        syncError = '';
        applyCatalog(defaultTemporaryBeds, { refreshPatients: false });
      }
    });
  }

  function ensureStylesheet() {
    if (document.getElementById('censo-bed-admin-styles')) return;
    const link = document.createElement('link');
    link.id = 'censo-bed-admin-styles';
    link.rel = 'stylesheet';
    const url = new URL('./bedAdmin.css', import.meta.url);
    url.searchParams.set('v', String(window.CensoBuild?.version || Date.now()));
    link.href = url.href;
    document.head.appendChild(link);
  }

  function areaLabel(area) {
    if (area === 'OBSERVACIÓN') return 'Observación';
    if (area === 'TRAUMA MENOR') return 'Trauma';
    if (area === 'PEDIATRÍA') return 'Pediatría';
    if (area === 'EXTRAS') return 'Extras';
    if (area === SALA_2) return 'Sala 2';
    return area;
  }

  function ensureBedManagerUi() {
    if (ui?.modal?.isConnected) return true;
    const settingsButton = document.getElementById('adminSettingsBtn');
    if (!settingsButton) return false;

    ensureStylesheet();
    settingsButton.setAttribute('aria-label', 'Configurar camas y sillas');
    settingsButton.title = 'Configurar camas y sillas';

    const wrapper = document.createElement('div');
    wrapper.id = 'censoBedModal';
    wrapper.className = 'censo-bedmodal';
    wrapper.hidden = true;
    wrapper.innerHTML = `
      <section class="censo-bedmodal__card" role="dialog" aria-modal="true" aria-labelledby="censoBedModalTitle">
        <header class="censo-bedmodal__head">
          <div>
            <h2 id="censoBedModalTitle">Camas y sillas</h2>
            <span id="censoBedCount"></span>
          </div>
          <button id="censoBedClose" class="censo-bedmodal__close" type="button" aria-label="Cerrar">×</button>
        </header>
        <div class="censo-bedmodal__body">
          <div id="censoBedStatus" class="censo-bed-status" role="status"></div>
          <button id="censoBedRetry" class="censo-bed-retry" type="button" hidden>Reintentar conexión</button>

          <form id="censoBedSalaForm" class="censo-bed-sala">
            <div>
              <h3>Sala 2</h3>
              <span id="censoBedSalaStatus"></span>
            </div>
            <div class="censo-bed-add-row censo-bed-sala__controls">
              <label id="censoBedSalaCountField">
                <span>Camas iniciales</span>
                <input id="censoBedSalaCount" type="number" min="1" max="${MAX_BEDS - basalBeds.length}" step="1" required inputmode="numeric" value="1">
              </label>
              <button id="censoBedSalaCreate" class="censo-bed-add" type="submit">Crear Sala 2</button>
              <button id="censoBedSalaRemove" class="censo-bed-add censo-bed-sala__remove" type="button" hidden>Retirar Sala 2</button>
            </div>
          </form>

          <form id="censoBedForm" class="censo-bed-add-form">
            <div class="censo-bed-add-title">Agregar ubicación</div>
            <div class="censo-bed-add-row">
              <label>
                <span>Área</span>
                <select id="censoBedArea" required>
                  ${model.temporaryAreas.map(area => `<option value="${esc(area)}">${esc(areaLabel(area))}</option>`).join('')}
                  <option id="censoBedSalaOption" value="${SALA_2}" hidden disabled>Sala 2</option>
                </select>
              </label>
              <label>
                <span>Tipo</span>
                <select id="censoBedType" required>
                  <option value="CAMA">Cama</option>
                  <option value="SILLA">Silla</option>
                  <option value="CUNA">Cuna</option>
                </select>
              </label>
              <label>
                <span>Número</span>
                <input id="censoBedNumber" type="number" min="1" max="999" step="1" required inputmode="numeric" placeholder="Ej. 11">
              </label>
              <button id="censoBedAdd" class="censo-bed-add" type="submit">Agregar</button>
            </div>
          </form>
          <p id="censoBedMessage" class="censo-bed-message" role="status" aria-live="polite"></p>
          <div id="censoBedList" class="censo-bed-grid" aria-label="Ubicaciones activas"></div>
          <p class="censo-bed-help">La × retira ubicaciones temporales libres.</p>
          <p id="censoBedOutsideCatalog" class="censo-bed-help" role="status" hidden></p>
        </div>
      </section>`;

    document.body.appendChild(wrapper);

    const get = suffix => document.getElementById(`censoBed${suffix}`);
    ui = {
      settingsButton,
      modal: wrapper,
      close: get('Close'),
      status: get('Status'),
      retry: get('Retry'),
      count: get('Count'),
      list: get('List'),
      salaForm: get('SalaForm'),
      salaStatus: get('SalaStatus'),
      salaCountField: get('SalaCountField'),
      salaCount: get('SalaCount'),
      salaCreate: get('SalaCreate'),
      salaRemove: get('SalaRemove'),
      salaOption: get('SalaOption'),
      form: get('Form'),
      area: get('Area'),
      type: get('Type'),
      number: get('Number'),
      message: get('Message'),
      outsideCatalog: get('OutsideCatalog'),
      add: get('Add')
    };

    ui.settingsButton.addEventListener('click', openBedManager);
    ui.close.addEventListener('click', closeBedManager);
    ui.modal.addEventListener('click', event => {
      if (event.target === ui.modal) closeBedManager();
    });

    ui.salaForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (ui.salaCreate.disabled || ui.salaCreate.hidden) return;
      try {
        ui.message.textContent = 'Creando Sala 2…';
        await mutate({ type: 'create-sala', count: ui.salaCount.valueAsNumber });
        ui.message.textContent = 'Sala 2 creada.';
      } catch (error) {
        ui.message.textContent = saveError(error);
      }
    });

    ui.salaRemove.addEventListener('click', async () => {
      if (ui.salaRemove.disabled || ui.salaRemove.hidden) return;
      if (!confirm('¿Retirar Sala 2 y todas sus ubicaciones del censo?')) return;
      try {
        ui.message.textContent = 'Retirando Sala 2…';
        await mutate({ type: 'remove-sala', revision });
        ui.message.textContent = 'Sala 2 retirada.';
      } catch (error) {
        ui.message.textContent = saveError(error);
      }
    });

    ui.form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      try {
        const bed = model.fromForm(ui.area.value, ui.type.value, ui.number.value);
        ui.message.textContent = 'Guardando…';
        await mutate({ type: 'add', bed });
        ui.number.value = '';
        ui.message.textContent = `${areaLabel(bed.area)} · ${bed.cama} agregada.`;
        ui.number.focus();
      } catch (error) {
        ui.message.textContent = saveError(error);
      }
    });

    ui.list.addEventListener('click', async event => {
      const button = event.target.closest('[data-bed-remove]');
      if (!button || busy) return;
      const bed = catalog.find(item => bedKey(item) === button.dataset.bedRemove);
      if (!bed || isBasal(bed) || isOccupied(bed)) return;
      if (!confirm(`¿Retirar ${bed.cama} de ${areaLabel(bed.area)}?`)) return;
      try {
        ui.message.textContent = 'Quitando ubicación…';
        await mutate({ type: 'remove', key: bedKey(bed) });
        ui.message.textContent = `${areaLabel(bed.area)} · ${bed.cama} retirada.`;
      } catch (error) {
        ui.message.textContent = saveError(error);
      }
    });

    ui.retry.addEventListener('click', listenCatalog);
    renderAdmin();
    return true;
  }

  function openBedManager() {
    if (!ensureBedManagerUi()) return;
    if (!auth.currentUser) return;
    app.utils?.vibrar?.(15);
    ui.message.textContent = '';
    ui.modal.hidden = false;
    renderAdmin();
    window.setTimeout(() => ui.area?.focus(), 40);
  }

  function closeBedManager() {
    if (ui?.modal) ui.modal.hidden = true;
  }

  function initBedAdminUiBridge() {
    if (!ensureBedManagerUi()) return;
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && ui?.modal && !ui.modal.hidden) closeBedManager();
    });
  }

  async function mutate(action) {
    if (!auth.currentUser) {
      throw new Error('Inicia sesión en el Censo para modificar camas.');
    }
    if (syncState !== 'ready') throw new Error('Espera a que termine la sincronización de camas.');

    const uid = auth.currentUser.uid;
    const ref = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
    busy = true;
    renderAdmin();

    try {
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        if (auth.currentUser?.uid !== uid || currentUid !== uid) {
          throw new Error('La sesión cambió. Vuelve a intentarlo.');
        }
        const data = snapshot.exists() ? snapshot.data() : null;
        if (!model.isSharedDocument(data)) throw new Error('Espera a que termine la sincronización del catálogo compartido.');
        const current = readTemporaryBeds(data);
        let next = current.map(bed => ({ ...bed }));

        if (action.type === 'add') {
          const bed = model.normalizeBed(action.bed);
          if (inSala2(bed) && !current.some(inSala2)) throw new Error('Crea Sala 2 antes de agregar ubicaciones.');
          if (isBasal(bed) || next.some(item => bedKey(item) === bedKey(bed))) {
            throw new Error('Esa cama o silla ya existe en el área seleccionada.');
          }
          next.push(bed);
        } else if (action.type === 'remove') {
          if (basalBeds.some(bed => bedKey(bed) === action.key)) throw new Error('El nivel basal está protegido y no puede retirarse.');
          const target = next.find(item => bedKey(item) === action.key);
          if (!target) return;
          next = next.filter(item => bedKey(item) !== action.key);
          if (inSala2(target) && !next.some(inSala2)) throw new Error('Usa «Retirar Sala 2» para quitar la última ubicación.');
          if (await hasServerOccupant(bed => bedKey(bed) === action.key) || isOccupied(target)) {
            throw new Error('La cama está ocupada y no puede retirarse.');
          }
        } else if (action.type === 'create-sala') {
          if (current.some(inSala2)) throw new Error('Sala 2 ya está activa.');
          const capacity = MAX_BEDS - basalBeds.length - current.length;
          if (!Number.isInteger(action.count) || action.count < 1 || action.count > capacity) {
            throw new Error(`Quedan ${capacity} ubicaciones disponibles en el catálogo.`);
          }
          for (let number = 1; number <= action.count; number++) {
            next.push(model.fromForm(SALA_2, 'CAMA', number));
          }
        } else if (action.type === 'remove-sala') {
          if (!current.some(inSala2)) return;
          if (await hasServerOccupant(inSala2) || state.pacientesGlobal.some(inSala2)) {
            throw new Error('Traslada o egresa a todos los pacientes de Sala 2 antes de retirarla.');
          }
          if (data.revision !== action.revision) throw new Error('El catálogo cambió. Revisa las ubicaciones y vuelve a confirmar.');
          next = next.filter(bed => !inSala2(bed));
        } else {
          throw new Error('Acción de camas desconocida.');
        }

        if (auth.currentUser?.uid !== uid || currentUid !== uid) throw new Error('La sesión cambió. Vuelve a intentarlo.');
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

    ui.count.textContent = `${catalog.length} ubicaciones · ${temporaryBeds.length} temporales`;
    const ready = syncState === 'ready';
    ui.status.hidden = ready;
    ui.status.textContent = syncState === 'loading'
      ? 'Sincronizando camas…'
      : syncState === 'waiting'
        ? 'Esperando confirmación de Firebase…'
        : syncError;
    ui.retry.hidden = !['error', 'waiting'].includes(syncState);

    const canChange = ready && Boolean(auth.currentUser) && !busy;
    const salaBeds = temporaryBeds.filter(inSala2);
    const salaActive = salaBeds.length > 0;
    const salaOccupied = state.pacientesGlobal.some(inSala2);
    const capacity = MAX_BEDS - catalog.length;
    ui.salaStatus.textContent = salaActive
      ? (salaOccupied ? 'Traslada o egresa a los pacientes para retirarla.' : `${salaBeds.length} ubicaciones activas`)
      : 'Inactiva';
    ui.salaCountField.hidden = salaActive;
    ui.salaCount.disabled = salaActive || !canChange;
    ui.salaCount.max = String(Math.max(1, capacity));
    ui.salaCreate.hidden = salaActive;
    ui.salaCreate.disabled = !canChange || capacity === 0;
    ui.salaRemove.hidden = !salaActive;
    ui.salaRemove.disabled = !canChange || salaOccupied;
    ui.salaOption.hidden = !salaActive;
    ui.salaOption.disabled = !salaActive;
    if (!salaActive && ui.area.value === SALA_2) ui.area.value = model.temporaryAreas[0];

    ui.add.disabled = !canChange;
    ui.add.textContent = busy ? 'Guardando…' : 'Agregar';
    ui.area.disabled = busy;
    ui.type.disabled = busy;
    ui.number.disabled = busy;

    const columns = [
      { label: 'Choque', areas: ['SALA DE CHOQUE'] },
      { label: 'Observación', areas: ['OBSERVACIÓN'] },
      ...(salaActive ? [{ label: 'Sala 2', areas: [SALA_2] }] : []),
      { label: 'Trauma', areas: ['TRAUMA MENOR'] },
      { label: 'Pediatría', areas: ['PEDIATRÍA'] },
      { label: 'Extras', areas: ['EXTRAS', 'PEDILUVIO', "EFE'S"] }
    ];

    ui.list.className = salaActive ? 'censo-bed-grid has-sala-2' : 'censo-bed-grid';
    ui.list.innerHTML = columns.map(column => {
      const beds = catalog.filter(bed => column.areas.includes(bed.area));
      return `
        <section class="censo-bed-column">
          <h3>${esc(column.label)}</h3>
          <div class="censo-bed-column__items">
            ${beds.length ? beds.map(bed => {
              const occupant = occupantFor(bed);
              const occupied = Boolean(occupant);
              const temporary = !isBasal(bed);
              const removable = temporary && !occupied && (!inSala2(bed) || salaBeds.length > 1);
              const title = occupied
                ? `${bed.cama} · ocupada${occupant?.nombre ? ` por ${occupant.nombre}` : ''}`
                : temporary
                  ? `${bed.cama} · temporal`
                  : `${bed.cama} · basal`;
              return `
                <div class="censo-bed-row${temporary ? ' is-temporary' : ''}${occupied ? ' is-occupied' : ''}" title="${esc(title)}">
                  <span class="censo-bed-row__name">${esc(bed.cama)}</span>
                  ${removable ? `
                    <button
                      type="button"
                      class="censo-bed-remove"
                      data-bed-remove="${esc(bedKey(bed))}"
                      aria-label="Quitar ${esc(bed.cama)} de ${esc(column.label)}"
                      title="Quitar ubicación temporal"
                      ${busy || !ready ? 'disabled' : ''}
                    >×</button>` : ''}
                </div>`;
            }).join('') : '<div class="censo-bed-empty">—</div>'}
          </div>
        </section>`;
    }).join('');

    const outsideCount = state.pacientesGlobal.filter(patient =>
      !catalog.some(bed => bedKey(bed) === bedKey(patient))
    ).length;
    ui.outsideCatalog.hidden = outsideCount === 0;
    ui.outsideCatalog.textContent = `${outsideCount} paciente(s) permanecen en ubicaciones antiguas fuera del catálogo.`;
  }

  return {
    initBedCatalogAuthBridge,
    initBedAdminUiBridge,
    refreshBedAdmin: renderAdmin,
    isBedCatalogReady: () => syncState === 'ready',
    requireSharedBed,
    saveSala2Assignment,
    getBedCatalog: () => catalog.map(bed => ({ ...bed }))
  };
}
