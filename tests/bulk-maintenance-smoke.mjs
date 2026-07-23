import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'modules/maintenanceModule.js'), 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { createMaintenanceModule, BULK_SNAPSHOT_KEY } = await import(moduleUrl);

function createStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

globalThis.window = { sessionStorage: createStorage() };
globalThis.alert = () => {};
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null
};

let serverPatients = new Map([
  ['p1', {
    nombre: 'ANA', edad: '30', cama: 'CAMA 1', area: 'OBSERVACION',
    diagnostico: 'NEUMONÍA', pendientes: 'BH', destino: 'INGRESO',
    observacion: 'ANTIGUA', observacionAlerta: 'VIGILAR', alerta: true
  }],
  ['p2', {
    nombre: 'LUIS', edad: '42', cama: 'CAMA 2', area: 'OBSERVACION',
    diagnostico: 'DOLOR ABDOMINAL', pendientes: '', destino: '',
    observacion: '', observacionAlerta: '', alerta: false
  }],
  ['p3', {
    nombre: 'SIN DATOS', edad: '50', cama: 'CAMA 3', area: 'OBSERVACION',
    diagnostico: '', pendientes: '', destino: '', observacion: '', observacionAlerta: '', alerta: false
  }]
]);

const committedBatches = [];
const firebase = {
  db: {},
  collection: (_db, name) => name,
  doc: (_db, collectionName, id) => `${collectionName}/${id}`,
  getDocsFromServer: async () => ({
    forEach(callback) {
      serverPatients.forEach((data, id) => callback({ id, data: () => ({ ...data }) }));
    }
  }),
  writeBatch: () => {
    const operations = [];
    return {
      update: (ref, data) => operations.push({ ref, data: { ...data } }),
      async commit() {
        operations.forEach(({ ref, data }) => {
          const id = ref.split('/').at(-1);
          serverPatients.set(id, { ...serverPatients.get(id), ...data });
        });
        committedBatches.push(operations);
      }
    };
  }
};

const state = {
  isFetchingData: false,
  pacientesGlobal: [...serverPatients].map(([fila, data]) => ({ fila, ...data }))
};

let filterCalls = 0;
const maintenance = createMaintenanceModule({
  state,
  firebase,
  utils: { vibrar: () => {} },
  filtrar: () => { filterCalls += 1; }
});

const clearResult = await maintenance.clearAllOperationalData();
assert.equal(clearResult.changed, 2, 'Sólo deben escribirse pacientes con datos operativos.');
assert.equal(committedBatches.length, 1, 'El borrado debe usar un solo lote atómico.');
assert.equal(committedBatches[0].length, 2);
assert.deepEqual(
  Object.keys(committedBatches[0][0].data).sort(),
  ['alerta', 'destino', 'diagnostico', 'observacion', 'observacionAlerta', 'pendientes'].sort(),
  'El borrado no debe incluir cama, área, nombre, edad ni fecha.'
);
assert.equal(serverPatients.get('p1').nombre, 'ANA');
assert.equal(serverPatients.get('p1').cama, 'CAMA 1');
assert.equal(serverPatients.get('p1').edad, '30');
assert.equal(serverPatients.get('p1').diagnostico, '');
assert.equal(serverPatients.get('p1').alerta, false);

const saved = JSON.parse(window.sessionStorage.getItem(BULK_SNAPSHOT_KEY));
assert.equal(saved.patients.length, 2, 'El snapshot debe contener sólo lo que realmente se limpió.');
assert.equal(saved.patients[0].diagnostico, 'NEUMONÍA');

// Simula trabajo nuevo posterior al borrado. RESTAURAR no debe pisarlo.
serverPatients.set('p2', { ...serverPatients.get('p2'), diagnostico: 'DIAGNÓSTICO NUEVO' });
const restoreResult = await maintenance.restoreOperationalData();
assert.equal(restoreResult.restored, 1);
assert.equal(restoreResult.skipped, 1);
assert.equal(serverPatients.get('p1').diagnostico, 'NEUMONÍA');
assert.equal(serverPatients.get('p1').alerta, true);
assert.equal(serverPatients.get('p2').diagnostico, 'DIAGNÓSTICO NUEVO', 'No se deben sobrescribir datos nuevos.');
assert.equal(window.sessionStorage.getItem(BULK_SNAPSHOT_KEY), null, 'El snapshot debe consumirse después de restaurar.');
assert.equal(filterCalls, 2, 'Borrar y restaurar deben refrescar la interfaz local.');

await assert.rejects(
  () => maintenance.restoreOperationalData(),
  /YA NO ESTÁ DISPONIBLE/u,
  'El mismo snapshot no debe poder restaurarse dos veces.'
);

assert.equal(maintenance.handleMaintenanceSearchCommand('BORRA'), false);
assert.equal(maintenance.handleMaintenanceSearchCommand('OTRA COSA'), false);
assert.equal(maintenance.handleMaintenanceSearchCommand('borrar'), true, 'El comando normalizado BORRAR debe reconocerse.');
maintenance.closeMaintenanceModal();
assert.equal(maintenance.handleMaintenanceSearchCommand('restaurar'), true, 'RESTAURAR debe consumirse como comando aunque ya no exista respaldo.');

console.log('OK: borrado masivo, snapshot local y restauración de un solo uso verificados.');
