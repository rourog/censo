import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = file => import(`data:text/javascript;base64,${Buffer.from(readFileSync(new URL(`../modules/${file}.js`, import.meta.url))).toString('base64')}`);
const bed = await load('bedModule');
const { createBedCatalogModel, createBedAdminModule } = await load('bedAdminModule');
const model = createBedCatalogModel(bed);
const tick = () => new Promise(resolve => setImmediate(resolve));
const obs = number => ({ area: 'OBSERVACIÓN', cama: `CAMA ${number}` });
let data = null;
let writes = 0;
let epoch = 0;
let failWrite = false;
let failRead = false;
const clients = [];
function snapshot(metadata = { fromCache: false, hasPendingWrites: false }) {
  const copy = structuredClone(data);
  return { exists: () => copy !== null, data: () => copy, metadata };
}
function broadcast(metadata) { clients.forEach(client => client.emit(snapshot(metadata))); }
function device(uid, cached = false) {
  const auth = { currentUser: { uid } };
  let authChanged;
  let listener;
  let active = true;
  const state = { pacientesGlobal: [], camasLibresGlobal: [] };
  const firebase = {
    db: {}, auth, doc: () => 'settings/bedCatalog', serverTimestamp: () => 'TIME',
    onAuthStateChanged(_, fn) { authChanged = fn; fn(auth.currentUser); return () => {}; },
    onSnapshot(ref, options, next) {
      assert.equal(ref, 'settings/bedCatalog');
      assert.equal(options.includeMetadataChanges, true);
      listener = next;
      next(snapshot({ fromCache: cached, hasPendingWrites: false }));
      return () => { active = false; };
    },
    async getDocFromServer() { if (failRead) throw new Error('offline'); return snapshot(); },
    async runTransaction(_, fn) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const readEpoch = epoch;
        let staged;
        await fn({ get: async () => snapshot(), set: (_, next) => { staged = next; } });
        if (failWrite) throw Object.assign(new Error('denied'), { code: 'permission-denied' });
        if (readEpoch !== epoch) continue;
        if (staged) { data = structuredClone(staged); writes++; epoch++; broadcast(); }
        return;
      }
      throw new Error('Too many conflicts');
    }
  };
  const app = { state, firebase, bed: { ...bed, masterCamas: [] } };
  const admin = createBedAdminModule(app);
  const client = {
    admin, state,
    emit: value => { if (active) listener?.(value); },
    logout() { auth.currentUser = null; authChanged(null); },
    stale: () => listener(snapshot())
  };
  clients.push(client);
  admin.initBedCatalogAuthBridge();
  return client;
}

// La caché no inicia ni confirma un catálogo, incluso si está vacía.
const first = device('first', true);
await tick();
assert.equal(writes, 0);
assert.equal(first.admin.isBedCatalogReady(), false);
assert.deepEqual(first.state.camasLibresGlobal, []);
await assert.rejects(first.admin.requireSharedBed('OBSERVACIÓN', 'CAMA 6'), /SINCRONICEN/);
// Dos equipos inicializan a la vez: solo una escritura gana y ambos convergen.
first.emit(snapshot());
const second = device('second');
await tick();
assert.equal(writes, 1);
assert.equal(data.revision, 1);
assert.ok(model.isSharedDocument(data));
assert.equal(data.basalBeds.length, 22);
assert.equal(data.beds.length, 27);
assert.ok(!data.beds.some(b => b.area === 'EXTRAS'));
assert.deepEqual(first.admin.getBedCatalog(), second.admin.getBedCatalog());
assert.ok(first.admin.isBedCatalogReady() && second.admin.isBedCatalogReady());
await first.admin.requireSharedBed('OBSERVACIÓN', 'CAMA 6');

// Una baja aún no recibida por el listener se detecta en el servidor al asignar.
data = model.sharedDocument([], data, 'second', 'TIME'); epoch++;
await assert.rejects(first.admin.requireSharedBed('OBSERVACIÓN', 'CAMA 6'), /RETIRADA/);
broadcast();
assert.equal(first.admin.getBedCatalog().length, 22);
const beforeReconnect = writes;
broadcast({ fromCache: true, hasPendingWrites: false });
assert.equal(first.admin.isBedCatalogReady(), false);
assert.deepEqual(first.state.camasLibresGlobal, []);
assert.equal(first.admin.getBedCatalog().length, 22, 'Conservar el último catálogo confirmado.');
broadcast({ fromCache: false, hasPendingWrites: true });
assert.equal(first.admin.isBedCatalogReady(), false);
broadcast();
assert.equal(first.admin.isBedCatalogReady(), true);
assert.equal(first.state.camasLibresGlobal.length, 22);
assert.equal(writes, beforeReconnect, 'Reconectar no repone las temporales retiradas.');
failRead = true;
await assert.rejects(first.admin.requireSharedBed('OBSERVACIÓN', 'CAMA 1'), /offline/);
failRead = false;

// Reconocer esquemas futuros sin reescribirlos ni habilitar asignaciones.
const saved = structuredClone(data);
const originalError = console.error;
console.error = () => {};
data = { ...saved, catalogVersion: 'future-version' }; epoch++;
broadcast(); await tick();
assert.equal(writes, beforeReconnect);
assert.equal(first.admin.isBedCatalogReady(), false);
data = saved; epoch++; broadcast();

// Documento v2 vacío: completar la proyección sin restablecer camas 6–10.
data = { schemaVersion: 2, temporaryBeds: [] }; epoch++;
failWrite = true; broadcast(); await tick();
assert.equal(first.admin.isBedCatalogReady(), false);
assert.equal(writes, beforeReconnect);
failWrite = false; broadcast(); await tick();
assert.equal(writes, beforeReconnect + 1);
assert.equal(data.beds.length, 22);
assert.deepEqual(data.temporaryBeds, []);
console.error = originalError;

// Una sesión cerrada ignora notificaciones de un listener anterior.
first.logout(); first.stale();
assert.equal(first.admin.isBedCatalogReady(), false);
assert.deepEqual(first.state.camasLibresGlobal, []);
await assert.rejects(first.admin.requireSharedBed('OBSERVACIÓN', 'CAMA 1'));
// Las ampliaciones personalizadas en EXTRAS sobreviven a la migración antigua.
assert.ok(model.readTemporaryBeds({ beds: [{ area: 'EXTRAS', cama: 'CAMA 1' }] }).some(b => b.area === 'EXTRAS'));
assert.deepEqual(model.sharedDocument([obs(6)], null, 'test', 'TIME').beds, model.compose([obs(6)]));
console.log('OK: inicialización concurrente, catálogo completo, caché, confirmación, reconexión, permisos, versiones futuras y validación del destino en servidor.');
