/*
  MÓDULO: bedAdminModule.js

  RESPONSABILIDAD:
  - Sincronizar el catálogo de camas desde Firestore.
  - Mantener el catálogo predeterminado como respaldo seguro.
  - Integrar la administración de camas como tercera pestaña del panel de noticias.
  - Impedir retirar camas ocupadas.
*/

const ADMIN_SESSION = 'censo-newsbar-admin-session-v1';
const SETTINGS_COLLECTION = 'settings';
const SETTINGS_DOC = 'bedCatalog';
const MAX_BEDS = 250;

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('es-MX')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value, maxLength) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeBed(raw) {
  const area = cleanText(raw?.area, 60).toLocaleUpperCase('es-MX');
  const cama = cleanText(raw?.cama, 60).toLocaleUpperCase('es-MX');
  const descripcion = cleanText(raw?.descripcion, 120).toLocaleUpperCase('es-MX');

  if (!area || !cama) throw new Error('Cada cama necesita área y nombre.');
  return descripcion ? { area, cama, descripcion } : { area, cama };
}

function bedKey(bed) {
  return `${normalizeKey(bed.area)}|${normalizeKey(bed.cama)}`;
}

function validateBeds(input) {
  if (!Array.isArray(input)) throw new Error('El catálogo de camas no es válido.');
  if (input.length > MAX_BEDS) throw new Error(`El catálogo no puede exceder ${MAX_BEDS} camas.`);

  const seen = new Set();
  const beds = input.map(normalizeBed);
  for (const bed of beds) {
    const key = bedKey(bed);
    if (seen.has(key)) throw new Error(`Cama duplicada: ${bed.area} / ${bed.cama}.`);
    seen.add(key);
  }
  return beds;
}

export function createBedAdminModule(app) {
  const { state } = app;
  const {
    db,
    auth,
    doc,
    onSnapshot,
    onAuthStateChanged,
    runTransaction,
    serverTimestamp
  } = app.firebase;

  const defaultBeds = validateBeds(app.bed.masterCamas).map(bed => ({ ...bed }));
  let catalog = defaultBeds.map(bed => ({ ...bed }));
  let authUnsubscribe = null;
  let catalogUnsubscribe = null;
  let domObserver = null;
  let managerObserver = null;
  let currentUid = null;
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
    const validated = validateBeds(nextBeds);
    catalog = validated.map(bed => ({ ...bed }));

    // masterCamas es un arreglo compartido. Se muta in-place para conservar
    // las referencias que ya tomaron modalModule y patientModule al arrancar.
    app.bed.masterCamas.splice(
      0,
      app.bed.masterCamas.length,
      ...catalog.map(bed => ({ ...bed }))
    );

    state.camasLibresGlobal = app.bed.calcularCamasLibres(
      app.bed.masterCamas,
      state.pacientesGlobal
    );

    renderAdmin();

    // Releer pacientes recalcula orden y camas libres usando el nuevo catálogo.
    if (refreshPatients && state.unsubscribe && typeof app.initFirebaseListener === 'function') {
      app.initFirebaseListener();
    }
  }

  function listenCatalog() {
    catalogUnsubscribe?.();
    catalogUnsubscribe = null;
    syncState = 'loading';
    syncError = '';
    renderAdmin();

    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const ref = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);

    catalogUnsubscribe = onSnapshot(ref, snapshot => {
      if (currentUid !== uid) return;
      try {
        const next = snapshot.exists()
          ? validateBeds(snapshot.data()?.beds)
          : defaultBeds;
        syncState = 'ready';
        syncError = snapshot.exists()
          ? ''
          : 'Usando catálogo predeterminado. El primer cambio creará la configuración compartida.';
        applyCatalog(next);
      } catch (error) {
        console.error('[CENSO] Catálogo de camas inválido:', error);
        syncState = 'error';
        syncError = 'La configuración guardada es inválida. Se mantiene el catálogo predeterminado.';
        applyCatalog(defaultBeds);
      }
    }, error => {
      if (currentUid !== uid) return;
      console.error('[CENSO] No se pudo sincronizar el catálogo de camas:', error);
      syncState = 'error';
      syncError = 'No se pudo sincronizar camas. Se mantiene el catálogo predeterminado local.';
      applyCatalog(defaultBeds);
    });
  }

  function initBedCatalogAuthBridge() {
    if (authUnsubscribe) return;
    authUnsubscribe = onAuthStateChanged(auth, user => {
      const uid = user?.uid || null;
      if (uid === currentUid) return;
      currentUid = uid;
      catalogUnsubscribe?.();
      catalogUnsubscribe = null;

      if (user) {
        listenCatalog();
      } else {
        unlocked = false;
        syncState = 'loading';
        syncError = '';
        applyCatalog(defaultBeds, { refreshPatients: false });
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
        <div class="censo-sound-heading"><strong>Catálogo de camas</strong><span id="censoBedCount"></span></div>
        <div id="censoBedList" class="censo-newsadmin-list"></div>
        <form id="censoBedForm" class="censo-sound-form">
          <div class="censo-newsmodal__field">
            <label for="censoBedArea">Área</label>
            <input id="censoBedArea" list="censoBedAreas" maxlength="60" required placeholder="Ej. OBSERVACIÓN">
            <datalist id="censoBedAreas"></datalist>
          </div>
          <div class="censo-newsmodal__field">
            <label for="censoBedName">Nombre de cama / lugar</label>
            <input id="censoBedName" maxlength="60" required placeholder="Ej. CAMA 11">
          </div>
          <div class="censo-newsmodal__field">
            <label for="censoBedDescription">Descripción opcional</label>
            <input id="censoBedDescription" maxlength="120" placeholder="Ej. AISLAMIENTO RESPIRATORIO">
          </div>
          <p id="censoBedMessage" class="censo-newsmodal__copy" role="status" aria-live="polite"></p>
          <div class="censo-newsmodal__actions">
            <button id="censoBedAdd" class="censo-newsmodal__button censo-newsmodal__button--primary" type="submit">Agregar cama</button>
          </div>
        </form>
        <div class="censo-newsmodal__actions">
          <button id="censoBedReset" class="censo-newsmodal__button" type="button">Restaurar catálogo predeterminado</button>
        </div>`;
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
      areas: get('Areas'),
      name: get('Name'),
      description: get('Description'),
      message: get('Message'),
      add: get('Add'),
      reset: get('Reset')
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
        const bed = normalizeBed({
          area: ui.area.value,
          cama: ui.name.value,
          descripcion: ui.description.value
        });
        await mutate({ type: 'add', bed });
        ui.form.reset();
        ui.message.textContent = `${bed.area} / ${bed.cama} agregada.`;
      } catch (error) {
        ui.message.textContent = saveError(error);
      }
    });

    ui.list.addEventListener('click', async event => {
      const button = event.target.closest('[data-bed-remove]');
      if (!button || busy || !unlocked) return;
      const bed = catalog.find(item => bedKey(item) === button.dataset.bedRemove);
      if (!bed) return;
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

    ui.reset.addEventListener('click', async () => {
      if (busy || !unlocked) return;
      const occupiedCustom = catalog.filter(bed => isOccupied(bed) && !defaultBeds.some(def => bedKey(def) === bedKey(bed)));
      if (occupiedCustom.length) {
        ui.message.textContent = 'No se puede restaurar: hay pacientes ocupando camas personalizadas.';
        return;
      }
      if (!confirm('¿Restaurar el catálogo predeterminado de camas? Se eliminarán las camas personalizadas vacías.')) return;
      try {
        await mutate({ type: 'reset' });
        ui.message.textContent = 'Catálogo predeterminado restaurado.';
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
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        const current = snapshot.exists()
          ? validateBeds(snapshot.data()?.beds)
          : defaultBeds.map(bed => ({ ...bed }));
        let next = current.map(bed => ({ ...bed }));

        if (action.type === 'add') {
          const bed = normalizeBed(action.bed);
          if (next.some(item => bedKey(item) === bedKey(bed))) {
            throw new Error('Esa cama ya existe en el área seleccionada.');
          }
          if (next.length >= MAX_BEDS) throw new Error(`Se alcanzó el límite de ${MAX_BEDS} camas.`);
          next.push(bed);
        } else if (action.type === 'remove') {
          const target = next.find(item => bedKey(item) === action.key);
          if (!target) return;
          if (isOccupied(target)) throw new Error('La cama está ocupada y no puede retirarse.');
          next = next.filter(item => bedKey(item) !== action.key);
        } else if (action.type === 'reset') {
          next = defaultBeds.map(bed => ({ ...bed }));
        } else {
          throw new Error('Acción de camas desconocida.');
        }

        transaction.set(ref, {
          beds: validateBeds(next),
          updatedBy: uid,
          updatedAt: serverTimestamp()
        });
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

    const areas = [...new Set(catalog.map(bed => bed.area))];
    ui.areas.innerHTML = areas.map(area => `<option value="${esc(area)}"></option>`).join('');
    ui.count.textContent = `${catalog.length} camas`;
    ui.status.textContent = syncState === 'loading'
      ? 'Cargando catálogo compartido…'
      : syncState === 'error'
        ? syncError
        : syncError || 'Los cambios guardados se aplican en todos los equipos.';
    ui.retry.hidden = syncState !== 'error';

    const occupiedCustom = catalog.some(bed => isOccupied(bed) && !defaultBeds.some(def => bedKey(def) === bedKey(bed)));
    ui.add.disabled = busy || !unlocked || syncState !== 'ready';
    ui.add.textContent = busy ? 'Guardando…' : 'Agregar cama';
    ui.reset.disabled = busy || !unlocked || syncState !== 'ready' || occupiedCustom;
    ui.area.disabled = busy;
    ui.name.disabled = busy;
    ui.description.disabled = busy;

    const grouped = new Map();
    catalog.forEach(bed => {
      if (!grouped.has(bed.area)) grouped.set(bed.area, []);
      grouped.get(bed.area).push(bed);
    });

    ui.list.innerHTML = catalog.length
      ? [...grouped.entries()].map(([area, beds]) => `
          <div class="censo-bed-group">
            <div class="censo-sound-heading"><strong>${esc(area)}</strong><span>${beds.length}</span></div>
            ${beds.map(bed => {
              const occupant = occupantFor(bed);
              const occupied = Boolean(occupant);
              return `<div class="censo-newsadmin-item censo-sound-item">
                <div>
                  <span class="material-symbols-outlined" aria-hidden="true">bed</span>
                  <div><strong>${esc(bed.cama)}</strong>${bed.descripcion ? `<small style="display:block;color:var(--muted);margin-top:2px;">${esc(bed.descripcion)}</small>` : ''}${occupied ? `<small style="display:block;color:var(--accent);margin-top:2px;">OCUPADA · ${esc(occupant.nombre || 'PACIENTE')}</small>` : ''}</div>
                </div>
                <div class="censo-sound-actions">
                  <button type="button" class="censo-newsmodal__button censo-newsmodal__button--danger" data-bed-remove="${esc(bedKey(bed))}" ${occupied || busy || !unlocked || syncState !== 'ready' ? 'disabled' : ''}>Quitar</button>
                </div>
              </div>`;
            }).join('')}
          </div>`).join('')
      : '<p class="censo-news-empty">No hay camas configuradas.</p>';
  }

  return {
    initBedCatalogAuthBridge,
    initBedAdminUiBridge,
    setBedAdminUnlocked: setUnlocked,
    getBedCatalog: () => catalog.map(bed => ({ ...bed }))
  };
}
