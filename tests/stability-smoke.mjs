import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function importLocalModule(path) {
  const source = readFileSync(resolve(root, path), 'utf8');
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  return import(url);
}

function createClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    toggle: (name, force) => force ? values.add(name) : values.delete(name),
    contains: (name) => values.has(name)
  };
}

const elements = new Map();
function element(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id,
      classList: createClassList(),
      style: {},
      dataset: {},
      innerHTML: '',
      innerText: '',
      disabled: false,
      setAttribute(name, value) { this[name] = value; }
    });
  }
  return elements.get(id);
}

globalThis.window = {
  isInlineEditing: false,
  pendingSnapshotList: null,
  prompt: () => null
};
globalThis.document = {
  getElementById: (id) => element(id)
};

const { createPatientModule } = await importLocalModule('modules/patientModule.js');

let snapshotHandler;
let snapshotErrorHandler;
let unsubscribeCalls = 0;
let filterCalls = 0;
let renderErrorCalls = 0;

const patientState = {
  pacientesGlobal: [],
  camasLibresGlobal: [],
  isFetchingData: false,
  unsubscribe: null
};

const patientApp = {
  state: patientState,
  firebase: {
    db: {},
    collection: () => ({}),
    onSnapshot: (_query, next, error) => {
      snapshotHandler = next;
      snapshotErrorHandler = error;
      return () => { unsubscribeCalls += 1; };
    }
  },
  bed: {
    masterCamas: [{ area: 'OBSERVACION', cama: '01' }],
    limpiarNombreCama: (value) => String(value).padStart(2, '0')
  },
  utils: {
    escapeHtml: (value) => String(value)
  },
  filtrar: () => { filterCalls += 1; },
  mostrarError: () => { renderErrorCalls += 1; }
};

const patientModule = createPatientModule(patientApp);
patientModule.initFirebaseListener();

const originalWarn = console.warn;
const originalError = console.error;
console.warn = () => {};
console.error = () => {};

snapshotHandler({
  forEach(callback) {
    callback({
      id: 'paciente-1',
      data: () => ({
        nombre: { toString: () => { throw new Error('dato corrupto'); } },
        cama: 1,
        area: 'OBSERVACION',
        creado: { valor: 'fecha inválida' }
      })
    });
  }
});

assert.equal(patientState.pacientesGlobal.length, 1, 'Un campo inválido no debe ocultar al paciente completo.');
assert.equal(patientState.pacientesGlobal[0].nombre, '', 'Los textos corruptos deben degradarse a una cadena segura.');
assert.equal(patientState.pacientesGlobal[0].fechaIngresoFormateada, '-', 'Una fecha inválida debe tener un valor visible seguro.');
assert.equal(patientState.camasLibresGlobal.length, 0, 'La cama ocupada debe seguir identificándose.');
assert.equal(filterCalls, 1, 'Un snapshot válido debe renderizarse una sola vez.');

snapshotErrorHandler(new Error('sin red'));
assert.equal(patientState.pacientesGlobal.length, 1, 'Un error de red no debe borrar el último censo recibido.');
assert.equal(renderErrorCalls, 0, 'Si existen datos previos, el error no debe reemplazar toda la pantalla.');

patientModule.initFirebaseListener();
assert.equal(unsubscribeCalls, 1, 'Reconectar debe cerrar la suscripción anterior.');

console.warn = originalWarn;
console.error = originalError;

const { createModalModule } = await importLocalModule('modules/modalModule.js');

const alerts = [];
globalThis.alert = (message) => alerts.push(String(message));

const batchOperations = [];
let batchCommits = 0;
let modalFilterCalls = 0;
const modalState = {
  pacientesGlobal: [{ fila: 'abc', nombre: 'PACIENTE', alerta: false, cama: '01', area: 'OBSERVACION' }],
  camasLibresGlobal: [],
  rolUsuario: 'INTERNO'
};

const modalApp = {
  state: modalState,
  firebase: {
    db: {},
    collection: (_db, name) => name,
    addDoc: async () => {},
    doc: (_db, collectionName, id) => `${collectionName}/${id}`,
    updateDoc: async () => { throw new Error('sin red'); },
    writeBatch: () => ({
      set: (ref, data) => batchOperations.push({ type: 'set', ref, data }),
      delete: (ref) => batchOperations.push({ type: 'delete', ref }),
      commit: async () => { batchCommits += 1; }
    }),
    serverTimestamp: () => 'SERVER_TIMESTAMP'
  },
  bed: {
    destinosGlobal: [],
    agruparPorArea: () => ({}),
    parseDestinoClinico: () => null,
    getDestinoMaterialIcon: () => '',
    getDestinoActionLabel: () => ''
  },
  utils: {
    escapeHtml: (value) => String(value),
    normalizar: (value) => String(value),
    vibrar: () => {}
  },
  filtrar: () => { modalFilterCalls += 1; },
  render: () => {},
  resetAllSwipes: () => {}
};

const modalModule = createModalModule(modalApp);
await modalModule.toggleAlertaPaciente('abc');
assert.equal(modalState.pacientesGlobal[0].alerta, false, 'Una alerta fallida debe revertir el cambio optimista.');
assert.equal(modalFilterCalls, 2, 'La alerta debe renderizar el cambio y su reversión.');
assert.match(alerts.at(-1), /ERROR AL CAMBIAR ALERTA/u);

modalModule.borrarPacienteDirecto('abc', 'PACIENTE');
await modalModule.ejecutarBorrado();

assert.equal(batchCommits, 1, 'El egreso debe confirmar un solo lote atómico.');
assert.deepEqual(
  batchOperations.map(({ type, ref }) => ({ type, ref })),
  [
    { type: 'set', ref: 'historial/abc' },
    { type: 'delete', ref: 'pacientes/abc' }
  ],
  'Archivar y retirar del censo deben formar parte del mismo lote.'
);

console.log('OK: pruebas de estabilidad superadas.');
