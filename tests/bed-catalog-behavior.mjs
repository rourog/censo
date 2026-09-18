import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const sourceUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const moduleUrl = file => sourceUrl(read(file));
const bed = await import(moduleUrl('modules/bedModule.js'));
const legacy = await import(moduleUrl('modules/constants.js'));
const bedAdminSource = read('modules/bedAdminModule.js').replaceAll(
  'import.meta.url',
  JSON.stringify(new URL('../modules/bedAdminModule.js', import.meta.url).href)
);
const { createBedCatalogModel, createBedAdminModule } = await import(sourceUrl(bedAdminSource));
const model = createBedCatalogModel(bed);
const key = bed.claveCama;
const location = (area, cama) => ({ area, cama });
const obs = cama => location('OBSERVACIÓN', cama);
const defaults = model.compose(model.readTemporaryBeds(null));

assert.equal(bed.basalBeds.length, 22);
assert.equal(defaults.length, 27);
assert.ok(Object.isFrozen(bed.basalBeds) && bed.basalBeds.every(Object.isFrozen));
assert.deepEqual(bed.basalBeds.filter(b => b.area === 'SALA DE CHOQUE'), [location('SALA DE CHOQUE', 'CAMA 1')]);
assert.deepEqual(bed.basalBeds.filter(b => b.area === 'TRAUMA MENOR').map(b => b.cama), ['CAMA 1', 'CAMA 2', 'SILLA 1', 'SILLA 2']);
assert.deepEqual(bed.basalBeds.filter(b => b.area === 'PEDIATRÍA').map(b => b.cama), ['CUNA 1', 'CUNA 2', 'CUNA 3', 'SILLA 1', 'SILLA 2']);
assert.equal(bed.basalBeds.filter(b => b.area === 'OBSERVACIÓN').length, 10);
assert.deepEqual(bed.defaultTemporaryBeds.map(b => b.cama), ['CAMA 6', 'CAMA 7', 'CAMA 8', 'CAMA 9', 'CAMA 10']);
assert.ok(!defaults.some(bed.esUbicacionRetirada));
assert.deepEqual(model.readTemporaryBeds({ beds: legacy.masterCamas }), bed.defaultTemporaryBeds);
assert.deepEqual(model.readTemporaryBeds({ beds: [] }), bed.defaultTemporaryBeds, 'Un catálogo antiguo vacío no elimina el basal ni las nuevas temporales.');
assert.deepEqual(model.readTemporaryBeds({ schemaVersion: 2, temporaryBeds: [] }), [], 'No reponer temporales retiradas al recargar.');
assert.equal(model.compose([]).length, 22);
for (const data of [{}, { schemaVersion: 3, temporaryBeds: [] }, { schemaVersion: 2, temporaryBeds: null }]) {
  assert.throws(() => model.readTemporaryBeds(data));
}
assert.throws(() => model.validateTemporaryBeds([obs('SILLA6'), obs('SILLA-06')]));
assert.throws(() => model.validateTemporaryBeds([obs('CAMA 1')]));
assert.throws(() => model.validateTemporaryBeds([location('EXTRAS', 'EXTRA 1')]));
assert.throws(() => model.validateTemporaryBeds([location('SALA DE CHOQUE', 'CAMA 2')]));
assert.equal(model.validateTemporaryBeds([obs('SILLA 6'), location('TRAUMA MENOR', 'SILLA 6')]).length, 2);
assert.throws(() => model.validateTemporaryBeds(Array.from({ length: 229 }, (_, i) => obs(`CAMA ${i + 20}`))));
for (const n of ['0', '-1', '1.5', '01', '1e2', '1000', '']) assert.throws(() => model.fromForm('OBSERVACIÓN', 'SILLA', n, ''));
assert.deepEqual(model.fromForm('EXTRAS', 'CAMA', '11'), location('EXTRAS', 'CAMA 11'));
assert.throws(() => model.fromForm('OBSERVACIÓN', 'EXTRA', '11', ''));
assert.equal(model.fromForm('observacion', 'SILLA', '6', '').cama, 'SILLA 6');

const oldPatients = [location('SALA DE CHOQUE', 'CHOQUE 1'), location('EXTRAS', 'PEDILUVIO'), location('EXTRAS', "EFE'S"), obs('CAMA 1-2'), obs('CAMA 10')];
const beforePatients = structuredClone(oldPatients);
const free = bed.calcularCamasLibres(defaults, oldPatients);
for (const patient of oldPatients) assert.ok(!free.some(b => key(b) === key(patient)));
assert.deepEqual(oldPatients, beforePatients, 'El cálculo no debe modificar pacientes heredados.');
const freeBefore = bed.calcularCamasLibres(defaults, []);
const freeAfter = bed.calcularCamasLibres(defaults.filter(b => key(b) !== key(obs('CAMA 6'))), []);
assert.equal(freeBefore.find(b => key(b) === key(obs('CAMA 7'))).fila, freeAfter.find(b => key(b) === key(obs('CAMA 7'))).fila);

// DOM reducido: ejecutar los handlers reales de agregar/quitar, no solo regex.
const nodes = new Map();
function element() {
  let html = '';
  const listeners = new Map();
  return {
    isConnected: true, hidden: false, value: '', disabled: false, dataset: {}, style: {}, textContent: '', id: '',
    set innerHTML(value) { html = value; for (const match of value.matchAll(/id="([^"]+)"/g)) if (!nodes.has(match[1])) nodes.set(match[1], element()); },
    get innerHTML() { return html; },
    setAttribute() {}, focus() {},
    insertBefore(child) { nodes.set(child.id, child); },
    appendChild(child) { child.isConnected = true; if (child.id) nodes.set(child.id, child); },
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
    async fire(type, event = {}) { for (const fn of listeners.get(type) || []) await fn({ preventDefault() {}, ...event }); }
  };
}
const settingsButton = element(); settingsButton.id = 'adminSettingsBtn'; nodes.set(settingsButton.id, settingsButton);
globalThis.document = {
  body: element(), head: element(),
  getElementById: id => nodes.get(id) || null,
  createElement: element,
  querySelector: () => null,
  addEventListener() {}
};
globalThis.window = { CensoBuild: { version: 'test' }, setTimeout: fn => fn() };
globalThis.MutationObserver = class { observe() {} disconnect() {} };
globalThis.confirm = () => true;
const storage = new Map([['censo-newsbar-admin-session-v1', '1']]);
globalThis.sessionStorage = { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) };
let data = { beds: [...legacy.masterCamas, obs('CAMA 11')] };
let writes = 0;
let remotePatients = [];
let failRemote = false;
let onGet = null;
let conflict = null;
const observers = [];
const authObservers = [];
const auth = { currentUser: { uid: 'test' } };
const snapshot = () => ({ exists: () => data !== null, data: () => structuredClone(data), metadata: { fromCache: false, hasPendingWrites: false } });
const broadcast = () => observers.filter(o => o.active).forEach(o => o.next(snapshot()));
const firebase = {
  db: {}, auth, doc: (_, collection, id) => ({ collection, id }), collection: (_, name) => name,
  serverTimestamp: () => 'TIME',
  onAuthStateChanged(_, fn) { authObservers.push(fn); fn(auth.currentUser); return () => {}; },
  onSnapshot(ref, options, next, error) { assert.equal(ref.collection, 'settings'); assert.equal(ref.id, 'bedCatalog'); assert.equal(options.includeMetadataChanges, true); const observer = { next, error, active: true }; observers.push(observer); next(snapshot()); return () => { observer.active = false; }; },
  async getDocFromServer() { return snapshot(); },
  async getDocsFromServer(name) {
    assert.equal(name, 'pacientes');
    if (failRemote) throw Object.assign(new Error('offline'), { code: 'unavailable' });
    return { forEach: fn => remotePatients.forEach(p => fn({ data: () => p })) };
  },
  async runTransaction(_, fn) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let staged;
      await fn({
        async get() { onGet?.(); return snapshot(); },
        set(ref, next) { assert.equal(ref.collection, 'settings'); assert.equal(ref.id, 'bedCatalog'); staged = structuredClone(next); }
      });
      if (conflict) { const action = conflict; conflict = null; action(); broadcast(); continue; }
      if (staged) { data = staged; writes++; broadcast(); }
      return;
    }
  }
};
const state = { pacientesGlobal: oldPatients, camasLibresGlobal: [], unsubscribe: null };
const appBed = { ...bed, masterCamas: defaults.map(b => ({ ...b })) };
const sharedReference = appBed.masterCamas;
const admin = createBedAdminModule({ state, bed: appBed, firebase });
admin.initBedCatalogAuthBridge();
admin.initBedAdminUiBridge();
await new Promise(resolve => setImmediate(resolve));
const field = name => nodes.get(`censoBed${name}`);
async function add(type, number, area = 'OBSERVACIÓN') {
  field('Area').value = area; field('Type').value = type; field('Number').value = number;
  await field('Form').fire('submit');
}
async function remove(bed) { await field('List').fire('click', { target: { closest: () => ({ dataset: { bedRemove: key(bed) } }) } }); }
assert.equal(writes, 1, 'La migración se guarda al iniciar sesión, sin esperar un cambio manual.');
assert.ok(model.isSharedDocument(data));
assert.ok(!field('Description'));
assert.equal(appBed.masterCamas, sharedReference);
assert.equal(admin.getBedCatalog().length, 28);
assert.match(field('Count').textContent, /28 ubicaciones · 6 temporales/);
assert.match(field('Message').textContent, /fuera del catálogo/);
assert.doesNotMatch(field('List').innerHTML, /data-bed-remove="OBSERVACION\|CAMA 1"/);
assert.match(field('List').innerHTML, /data-bed-remove="OBSERVACION\|CAMA 6"/);

await add('SILLA', '6');
let expectedWrites = 2;
assert.equal(writes, expectedWrites);
assert.equal(data.schemaVersion, 2);
assert.deepEqual(data.beds, model.compose(data.temporaryBeds));
assert.deepEqual(data.basalBeds, bed.basalBeds);
assert.ok(data.temporaryBeds.every(b => !model.isBasal(b)));
assert.ok(!('descripcion' in data.temporaryBeds.find(b => b.cama === 'SILLA 6')));
assert.ok(state.camasLibresGlobal.some(b => key(b) === key(obs('SILLA 6'))));
await add('SILLA', '6', 'observacion');
assert.equal(writes, expectedWrites);
assert.match(field('Message').textContent, /ya existe/);
await add('CAMA', '1');
assert.equal(writes, expectedWrites);
await add('CAMA', '11', 'EXTRAS');
assert.equal(writes, ++expectedWrites);
assert.ok(data.beds.some(b => b.area === 'EXTRAS' && b.cama === 'CAMA 11'));
await remove(obs('CAMA 1'));
assert.equal(writes, expectedWrites);
assert.doesNotMatch(field('List').innerHTML, /data-bed-remove="OBSERVACION\|CAMA 1"/u);
await remove(obs('CAMA 10'));
assert.equal(writes, expectedWrites);
assert.doesNotMatch(field('List').innerHTML, /data-bed-remove="OBSERVACION\|CAMA 10"/u);
remotePatients = [obs('CAMA 11')];
await remove(obs('CAMA 11'));
assert.equal(writes, expectedWrites);
assert.match(field('Message').textContent, /ocupada/);
remotePatients = [];
failRemote = true;
await remove(obs('CAMA 11'));
assert.equal(writes, expectedWrites);
assert.match(field('Message').textContent, /No se guardó/);
failRemote = false;
await remove(obs('CAMA 11'));
assert.equal(writes, ++expectedWrites);
assert.ok(!admin.getBedCatalog().some(b => key(b) === key(obs('CAMA 11'))));

// La transacción reintenta con el catálogo remoto y conserva otra alta.
conflict = () => { data = model.sharedDocument([...data.temporaryBeds, obs('SILLA 8')], data, 'other-device', 'TIME'); };
await add('SILLA', '7');
assert.ok(data.temporaryBeds.some(b => b.cama === 'SILLA 8'));
assert.ok(data.temporaryBeds.some(b => b.cama === 'SILLA 7'));
const beforeLock = writes;
onGet = () => { auth.currentUser = null; };
await add('SILLA', '9');
assert.equal(writes, beforeLock);
assert.match(field('Message').textContent, /sesión cambió/i);
onGet = null;
auth.currentUser = { uid: 'test' };

// Todos los pacientes permanecen intactos; las retiradas ocupadas siguen visibles.
assert.deepEqual(state.pacientesGlobal, beforePatients);
state.pacientesGlobal = [];
for (const temporary of [...data.temporaryBeds]) await remove(temporary);
assert.deepEqual(data.temporaryBeds, []);
assert.equal(admin.getBedCatalog().length, 22);
const secondState = { pacientesGlobal: [], camasLibresGlobal: [] };
const second = createBedAdminModule({ state: secondState, bed: { ...bed, masterCamas: [] }, firebase });
second.initBedCatalogAuthBridge();
assert.equal(second.getBedCatalog().length, 22, 'Otro equipo respeta las temporales vacías.');
await add('CAMA', '6');
assert.equal(second.getBedCatalog().length, 23, 'El alta se sincroniza a otros equipos.');
assert.equal(appBed.masterCamas, sharedReference);
const lastValid = admin.getBedCatalog();
const saved = structuredClone(data);
data = { schemaVersion: 99, temporaryBeds: [] };
const oldError = console.error;
console.error = () => {};
broadcast();
console.error = oldError;
assert.deepEqual(admin.getBedCatalog(), lastValid);
assert.equal(field('Add').disabled, true);
data = saved; broadcast();
auth.currentUser = null; authObservers.forEach(fn => fn(null));
const beforeLoggedOut = writes;
await add('SILLA', '9');
assert.equal(writes, beforeLoggedOut);

// Ejecutar el lector real: no se filtran pacientes cuya cama fue retirada.
globalThis.window = { isInlineEditing: false };
const { createPatientModule } = await import(moduleUrl('modules/patientModule.js'));
let patientListener;
let displayedPatients;
const liveState = { pacientesGlobal: [], camasLibresGlobal: [] };
const liveApp = {
  state: liveState, bed: { ...bed, masterCamas: defaults },
  utils: { escapeHtml: value => String(value) },
  firebase: { db: {}, collection: () => 'pacientes', onSnapshot(_, fn) { patientListener = fn; return () => {}; } },
  filtrar() { displayedPatients = liveState.pacientesGlobal; },
  mostrarError(error) { throw error; }
};
createPatientModule(liveApp).initFirebaseListener();
const legacyRecords = [...oldPatients, location('EXTRAS', 'EXTRA 1'), location('TRAUMA MENOR', 'CAMA 3')];
patientListener({ forEach: fn => legacyRecords.forEach((patient, i) => fn({ id: `p${i}`, data: () => ({ ...patient, nombre: `PRUEBA ${i}` }) })) });
assert.equal(displayedPatients.length, legacyRecords.length);
assert.ok(displayedPatients.some(p => p.area === 'EXTRAS' && p.cama === 'EXTRA 1'));
assert.ok(displayedPatients.some(p => p.area === 'SALA DE CHOQUE' && p.cama === 'CAMA 1'));
assert.ok(displayedPatients.some(p => p.area === 'PEDILUVIO'));
assert.ok(!liveState.camasLibresGlobal.some(b => ['PEDILUVIO', "EFE'S", 'CAMA 10'].includes(b.cama)));
liveApp.isBedCatalogReady = () => false;
patientListener({ forEach: fn => legacyRecords.forEach((patient, i) => fn({ id: `p${i}`, data: () => ({ ...patient, nombre: `PRUEBA ${i}` }) })) });
assert.equal(displayedPatients.length, legacyRecords.length, 'Sin catálogo confirmado se siguen mostrando pacientes.');
assert.deepEqual(liveState.camasLibresGlobal, [], 'Sin catálogo confirmado no se ofrecen camas.');

// Nuevo ingreso con un selector abierto antes de retirar una ubicación.
const { createModalModule } = await import(moduleUrl('modules/modalModule.js'));
const selectedBed = { dataset: { value: 'EXTRA 1|EXTRAS' } };
const selectedDestination = { dataset: { value: '' } };
document.querySelector = selector => selector.startsWith('#addCamaWrapper') ? selectedBed : selectedDestination;
document.querySelectorAll = () => [];
for (const id of ['btnGuardarAdd', 'addNombre', 'addFechaIngreso', 'addEdad', 'addDiagnostico', 'addPendientes']) nodes.set(id, element());
nodes.get('addNombre').value = 'PRUEBA';
nodes.get('addFechaIngreso').value = '2026-09-17T10:00';
const alerts = [];
globalThis.alert = message => alerts.push(message);
let patientWrites = 0;
let sharedCheckError = null;
const modal = createModalModule({
  state: liveState, bed: { ...bed, masterCamas: defaults },
  async requireSharedBed() { if (sharedCheckError) throw sharedCheckError; },
  utils: { escapeHtml: String, normalizar: String, vibrar() {} },
  firebase: { ...firebase, async addDoc() { patientWrites++; } }
});
await modal.guardarNuevo();
assert.equal(patientWrites, 0);
assert.match(alerts.at(-1), /FUE RETIRADA/);
selectedBed.dataset.value = 'CAMA 1|SALA DE CHOQUE';
remotePatients = [location('SALA DE CHOQUE', 'CHOQUE 1')];
await modal.guardarNuevo();
assert.equal(patientWrites, 0);
assert.match(alerts.at(-1), /OCUPADA/);
selectedBed.dataset.value = 'PEDILUVIO|PEDILUVIO';
remotePatients = [location('EXTRAS', 'PEDILUVIO')];
await modal.guardarNuevo();
assert.equal(patientWrites, 0);
assert.match(alerts.at(-1), /OCUPADA/);
remotePatients = [];
selectedBed.dataset.value = 'CAMA 6|OBSERVACIÓN';
sharedCheckError = new Error('ESPERA A QUE SE SINCRONICEN LAS CAMAS CON FIREBASE.');
await modal.guardarNuevo();
assert.equal(patientWrites, 0, 'El guardado clínico respeta el bloqueo del catálogo compartido.');
assert.match(alerts.at(-1), /SINCRONICEN/);
sharedCheckError = null;
await modal.guardarNuevo();
assert.equal(patientWrites, 1);
console.log('OK: 22 basales + 5 temporales; migración, altas/bajas, duplicados, ocupación, sincronización, sesión, pacientes heredados y selectores obsoletos.');
