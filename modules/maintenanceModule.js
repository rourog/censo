/*
  MÓDULO: maintenanceModule.js

  RESPONSABILIDAD:
  - Detectar los comandos BORRAR y RESTAURAR desde la búsqueda.
  - Limpiar datos operativos de todos los pacientes mediante un lote atómico.
  - Conservar un único snapshot local, temporal y de un solo uso.

  NO DEBE:
  - Modificar cama, área, nombre, edad ni fecha de ingreso.
  - Guardar el snapshot en Firestore.
  - Restaurar encima de datos nuevos escritos después de la limpieza.
*/

console.info('[CENSO] maintenanceModule.js cargado. BUILD: bulk-reset-v1-20260722');

export const BULK_SNAPSHOT_KEY = 'censo:bulk-clear-snapshot:v1';
export const BULK_CLEAR_TEXT_FIELDS = [
  'diagnostico',
  'pendientes',
  'destino',
  'observacion',
  'observacionAlerta'
];

const MAX_BATCH_WRITES = 500;

function getClearPayload() {
  return {
    diagnostico: '',
    pendientes: '',
    destino: '',
    observacion: '',
    observacionAlerta: '',
    alerta: false
  };
}

function hasOperationalData(data = {}) {
  return BULK_CLEAR_TEXT_FIELDS.some(field => String(data[field] ?? '').trim() !== '') || Boolean(data.alerta);
}

function isStillCleared(data = {}) {
  return BULK_CLEAR_TEXT_FIELDS.every(field => String(data[field] ?? '').trim() === '') && !Boolean(data.alerta);
}

function snapshotPatient(id, data = {}) {
  return {
    fila: String(id),
    diagnostico: String(data.diagnostico ?? ''),
    pendientes: String(data.pendientes ?? ''),
    destino: String(data.destino ?? ''),
    observacion: String(data.observacion ?? ''),
    observacionAlerta: String(data.observacionAlerta ?? ''),
    alerta: Boolean(data.alerta)
  };
}

function getRestorePayload(patient = {}) {
  return {
    diagnostico: String(patient.diagnostico ?? ''),
    pendientes: String(patient.pendientes ?? ''),
    destino: String(patient.destino ?? ''),
    observacion: String(patient.observacion ?? ''),
    observacionAlerta: String(patient.observacionAlerta ?? ''),
    alerta: Boolean(patient.alerta)
  };
}

export function createMaintenanceModule(app) {
  const { state } = app;
  const { db, collection, doc, getDocsFromServer, writeBatch } = app.firebase;
  const { vibrar } = app.utils;

  let pendingAction = null;
  let operationInProgress = false;

  function getStorage() {
    try {
      return window.sessionStorage;
    } catch (error) {
      console.warn('[CENSO] sessionStorage no está disponible:', error);
      return null;
    }
  }

  function readSnapshot() {
    const storage = getStorage();
    if (!storage) return null;

    try {
      const raw = storage.getItem(BULK_SNAPSHOT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.version !== 1 || !Array.isArray(parsed.patients) || !parsed.token) {
        storage.removeItem(BULK_SNAPSHOT_KEY);
        return null;
      }
      return parsed;
    } catch (error) {
      console.warn('[CENSO] Snapshot local inválido; se descartará:', error);
      try { storage.removeItem(BULK_SNAPSHOT_KEY); } catch (_) {}
      return null;
    }
  }

  function saveSnapshot(snapshot) {
    const storage = getStorage();
    if (!storage) {
      throw new Error('ESTE NAVEGADOR NO PERMITE CREAR EL RESPALDO LOCAL. NO SE BORRÓ NADA.');
    }

    try {
      storage.setItem(BULK_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch (error) {
      throw new Error('NO SE PUDO CREAR EL RESPALDO LOCAL. NO SE BORRÓ NADA.');
    }
  }

  function consumeSnapshot() {
    const storage = getStorage();
    if (!storage) return;
    storage.removeItem(BULK_SNAPSHOT_KEY);
  }

  function setModalContent(action, snapshot = null) {
    const title = document.getElementById('bulkMaintenanceTitle');
    const lead = document.getElementById('bulkMaintenanceLead');
    const detail = document.getElementById('bulkMaintenanceDetail');
    const confirmButton = document.getElementById('btnConfirmBulkMaintenance');
    const icon = document.querySelector('#bulkMaintenanceIcon .material-symbols-outlined');

    if (action === 'clear') {
      if (title) title.textContent = 'BORRAR DATOS DEL CENSO';
      if (lead) lead.textContent = '¿QUIERES BORRAR LOS DATOS OPERATIVOS DE TODOS LOS PACIENTES?';
      if (detail) detail.textContent = 'SE BORRARÁN DIAGNÓSTICOS, PENDIENTES, DESTINOS, OBSERVACIONES Y DESTACADOS. CAMA, NOMBRE Y EDAD NO CAMBIARÁN.';
      if (confirmButton) confirmButton.innerHTML = '<span class="material-symbols-outlined">delete_sweep</span> SÍ, BORRAR DATOS';
      if (icon) icon.textContent = 'warning';
      return;
    }

    const count = snapshot?.patients?.length || 0;
    if (title) title.textContent = 'RESTAURAR DATOS';
    if (lead) lead.textContent = `¿QUIERES RESTAURAR EL RESPALDO LOCAL DE ${count} PACIENTE${count === 1 ? '' : 'S'}?`;
    if (detail) detail.textContent = 'EL RESPALDO SE USARÁ UNA SOLA VEZ. NO SE SOBRESCRIBIRÁN PACIENTES QUE YA TENGAN DATOS NUEVOS.';
    if (confirmButton) confirmButton.innerHTML = '<span class="material-symbols-outlined">restore</span> SÍ, RESTAURAR';
    if (icon) icon.textContent = 'restore_page';
  }

  function closeMaintenanceModal() {
    if (operationInProgress) return;
    pendingAction = null;
    document.getElementById('bulkMaintenanceModal')?.classList.remove('active');
  }

  function openMaintenanceModal(action) {
    if (operationInProgress) return;
    if (state.isFetchingData) {
      alert('ESPERA A QUE TERMINE DE CARGAR EL CENSO.');
      return;
    }

    const snapshot = readSnapshot();
    if (action === 'clear' && snapshot) {
      alert('YA EXISTE UN RESPALDO LOCAL PENDIENTE. ESCRIBE RESTAURAR ANTES DE VOLVER A BORRAR.');
      return;
    }
    if (action === 'restore' && !snapshot) {
      alert('NO HAY UN RESPALDO LOCAL PENDIENTE EN ESTA PESTAÑA.');
      return;
    }

    pendingAction = action;
    setModalContent(action, snapshot);
    document.getElementById('bulkMaintenanceModal')?.classList.add('active');
    vibrar(action === 'clear' ? [60, 45, 60] : [25, 35, 25]);
  }

  function handleMaintenanceSearchCommand(normalizedQuery) {
    if (normalizedQuery === 'borrar') {
      openMaintenanceModal('clear');
      return true;
    }
    if (normalizedQuery === 'restaurar') {
      openMaintenanceModal('restore');
      return true;
    }
    return false;
  }

  function updateLocalPatients(ids, payloadFactory) {
    const idSet = new Set(ids.map(String));
    state.pacientesGlobal.forEach(patient => {
      if (!idSet.has(String(patient.fila))) return;
      Object.assign(patient, payloadFactory(patient));
    });
    try {
      app.filtrar();
    } catch (error) {
      console.warn('[CENSO] La operación terminó, pero no se pudo refrescar la vista local:', error);
    }
  }

  async function clearAllOperationalData() {
    const snapshotDocs = await getDocsFromServer(collection(db, 'pacientes'));
    const patients = [];

    snapshotDocs.forEach(docSnapshot => {
      const data = docSnapshot.data() || {};
      if (hasOperationalData(data)) patients.push(snapshotPatient(docSnapshot.id, data));
    });

    if (patients.length === 0) {
      return { changed: 0, message: 'EL CENSO YA NO TIENE DATOS OPERATIVOS QUE BORRAR.' };
    }
    if (patients.length > MAX_BATCH_WRITES) {
      throw new Error(`EL CENSO TIENE ${patients.length} PACIENTES Y SUPERA EL LÍMITE DE SEGURIDAD DEL LOTE.`);
    }

    const snapshot = {
      version: 1,
      token: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      patients
    };

    // El respaldo debe existir antes del commit. Si el commit falla, se retira
    // para no ofrecer una restauración de algo que nunca se borró.
    saveSnapshot(snapshot);

    try {
      const batch = writeBatch(db);
      const clearPayload = getClearPayload();
      patients.forEach(patient => batch.update(doc(db, 'pacientes', patient.fila), clearPayload));
      await batch.commit();
    } catch (error) {
      consumeSnapshot();
      throw error;
    }

    updateLocalPatients(patients.map(patient => patient.fila), () => getClearPayload());
    return { changed: patients.length, message: `SE BORRARON LOS DATOS DE ${patients.length} PACIENTE${patients.length === 1 ? '' : 'S'}.` };
  }

  async function restoreOperationalData() {
    const snapshot = readSnapshot();
    if (!snapshot) throw new Error('EL RESPALDO LOCAL YA NO ESTÁ DISPONIBLE.');
    if (snapshot.patients.length > MAX_BATCH_WRITES) {
      throw new Error('EL RESPALDO SUPERA EL LÍMITE DE SEGURIDAD DEL LOTE.');
    }

    const currentDocs = await getDocsFromServer(collection(db, 'pacientes'));
    const currentById = new Map();
    currentDocs.forEach(docSnapshot => currentById.set(String(docSnapshot.id), docSnapshot.data() || {}));

    const eligible = snapshot.patients.filter(patient => {
      const current = currentById.get(String(patient.fila));
      return current && isStillCleared(current);
    });
    const skipped = snapshot.patients.length - eligible.length;

    if (eligible.length > 0) {
      const batch = writeBatch(db);
      eligible.forEach(patient => batch.update(doc(db, 'pacientes', patient.fila), getRestorePayload(patient)));
      await batch.commit();
      updateLocalPatients(eligible.map(patient => patient.fila), patient => {
        const saved = snapshot.patients.find(item => String(item.fila) === String(patient.fila));
        return getRestorePayload(saved);
      });
    }

    // Consumir incluso si todos fueron omitidos evita que un snapshot antiguo
    // pueda aplicarse más tarde sobre otro ciclo de limpieza.
    consumeSnapshot();
    return {
      restored: eligible.length,
      skipped,
      message: `SE RESTAURARON ${eligible.length} PACIENTE${eligible.length === 1 ? '' : 'S'}.${skipped ? ` ${skipped} SE OMITIERON PORQUE YA TENÍAN DATOS NUEVOS O YA NO EXISTÍAN.` : ''}`
    };
  }

  async function executeMaintenanceAction() {
    if (operationInProgress || !pendingAction) return;
    const action = pendingAction;
    const button = document.getElementById('btnConfirmBulkMaintenance');

    operationInProgress = true;
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="spin material-symbols-outlined">sync</span> PROCESANDO...';
    }

    try {
      const result = action === 'clear'
        ? await clearAllOperationalData()
        : await restoreOperationalData();
      vibrar(action === 'clear' ? [50, 35, 50] : [20, 25, 20]);
      alert(result.message);
      pendingAction = null;
      document.getElementById('bulkMaintenanceModal')?.classList.remove('active');
    } catch (error) {
      vibrar([100, 50, 100]);
      alert(`${action === 'clear' ? 'ERROR AL BORRAR' : 'ERROR AL RESTAURAR'}: ${error.message}`);
    } finally {
      operationInProgress = false;
      if (button) button.disabled = false;
      if (pendingAction) setModalContent(pendingAction, readSnapshot());
    }
  }

  function bindMaintenanceEvents() {
    document.getElementById('btnCancelBulkMaintenance')?.addEventListener('click', closeMaintenanceModal);
    document.getElementById('btnCloseBulkMaintenance')?.addEventListener('click', closeMaintenanceModal);
    document.getElementById('btnConfirmBulkMaintenance')?.addEventListener('click', executeMaintenanceAction);
  }

  return {
    bindMaintenanceEvents,
    handleMaintenanceSearchCommand,
    openMaintenanceModal,
    closeMaintenanceModal,
    executeMaintenanceAction,
    clearAllOperationalData,
    restoreOperationalData,
    readSnapshot
  };
}
