import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const catalogURL = url(read('modules/soundCatalog.js'));
const catalog = await import(catalogURL);
const { createSoundboardModule } = await import(url(read('modules/soundboardModule.js').replace(/\.\/soundCatalog\.js\?v=[^']+/, catalogURL)));
const { parseMyinstantsLink, defaultSounds, validateSounds } = catalog;
assert.equal(defaultSounds('alfrojas').length, 8);
assert.equal(defaultSounds('rodrrodriguez').length, 7);
assert.deepEqual(defaultSounds('iharo'), []);
assert.equal(parseMyinstantsLink('https://myinstants.com/media/sounds/test.mp3?utm_source=copy').audioUrl, 'https://www.myinstants.com/media/sounds/test.mp3');
assert.ok(parseMyinstantsLink('https://www.myinstants.com/es/instant/anime-wow/?utm_source=copy').audioUrl.endsWith('/anime-wow-sound-effect.mp3'));
assert.equal(parseMyinstantsLink('https://www.myinstants.com/es/instant/nuevo-123/').audioUrl, '');
for (const bad of ['javascript:alert(1)', 'https://evil.test/test.mp3', 'https://www.myinstants.com.evil.test/media/sounds/test.mp3', 'https://evil@www.myinstants.com/media/sounds/test.mp3', 'https://www.myinstants.com/media/sounds/a%2Fb.mp3']) assert.throws(() => parseMyinstantsLink(bad));
assert.throws(() => validateSounds(Array.from({ length: 9 }, (_, i) => ({ id: `s${i}`, name: 'X', icon: 'music_note', url: `https://www.myinstants.com/media/sounds/${i}.mp3` }))));

const nodes = new Map();
function element() {
  const listeners = new Map();
  let html = '';
  return {
    hidden: true, disabled: false, value: '', style: {}, dataset: {}, children: [], attributes: {}, textContent: '',
    set innerHTML(value) {
      html = value;
      for (const m of value.matchAll(/id="([^"]+)"/g)) if (!nodes.has(m[1])) nodes.set(m[1], element());
    },
    get innerHTML() { return html; },
    setAttribute(k, v) { this.attributes[k] = v; },
    appendChild(child) { this.children.push(child); child.parentElement = this; if (child.id) nodes.set(child.id, child); },
    replaceChildren() { this.children = []; },
    addEventListener(type, fn) { listeners.set(type, fn); },
    async fire(type, event = {}) { await listeners.get(type)?.({ preventDefault() {}, stopPropagation() {}, ...event }); },
    reset() { for (const suffix of ['Name', 'Link', 'Direct']) nodes.get(`censoSound${suffix}`).value = ''; nodes.get('censoSoundIcon').value = 'music_note'; }
  };
}
const host = element();
const alf = element(); alf.id = 'alfrojasSoundboard'; host.appendChild(alf);
globalThis.document = { getElementById: id => nodes.get(id) || null, createElement: () => element(), querySelector: () => host };
const storage = new Map();
globalThis.sessionStorage = { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) };
let downloads = 0;
globalThis.fetch = async () => { downloads++; throw new Error('No descargar páginas de Myinstants.'); };
let audios = 0;
globalThis.Audio = class { constructor() { audios++; } addEventListener() {} pause() {} play() { return Promise.resolve(); } };
const records = new Map();
const observers = [];
const authObservers = [];
let writes = 0;
let conflict = null;
let failWrite = false;
const snapshot = () => ({ docs: [...records].map(([id, data]) => ({ id, data: () => structuredClone(data) })) });
const broadcast = () => observers.filter(o => o.active).forEach(o => o.next(snapshot()));
const auth = { currentUser: { uid: 'test-user' } };
const firebase = {
  db: {}, auth, collection: (_, name) => name, doc: (_, collectionName, id) => ({ collectionName, id }), serverTimestamp: () => 'SERVER_TIME',
  onAuthStateChanged(_, fn) { authObservers.push(fn); fn(auth.currentUser); return () => {}; },
  onSnapshot(name, next, error) { assert.equal(name, 'soundboards'); const observer = { next, error, active: true }; observers.push(observer); next(snapshot()); return () => { observer.active = false; }; },
  async runTransaction(_, fn) {
    if (failWrite) throw Object.assign(new Error('denied'), { code: 'permission-denied' });
    for (let attempt = 0; attempt < 2; attempt++) {
      let staged;
      await fn({
        async get(ref) { const data = structuredClone(records.get(ref.id)); return { exists: () => Boolean(data), data: () => data }; },
        set(ref, data) { staged = { id: ref.id, data: structuredClone(data) }; }
      });
      if (conflict) { const action = conflict; conflict = null; action(); broadcast(); continue; }
      if (staged) { records.set(staged.id, staged.data); writes++; broadcast(); }
      return;
    }
  }
};
const module = createSoundboardModule({ firebase });
module.initSoundboardAuthBridge();
module.mountSoundAdmin(element());
const field = name => nodes.get(`censoSound${name}`);
field('User').value = 'alfrojas'; field('Icon').value = 'music_note';
sessionStorage.setItem('censo-newsbar-admin-session-v1', '1');
module.setSoundAdminUnlocked(true);
assert.equal(writes, 0, 'Abrir administración no debe migrar ni escribir valores iniciales.');
assert.equal(field('Count').textContent, '8 / 8');
assert.equal(field('Add').disabled, true);
async function choose(user) { field('User').value = user; await field('User').fire('change'); }
async function add(name, link, direct = '') {
  field('Name').value = name; field('Link').value = link; await field('Link').fire('input');
  field('Direct').value = direct;
  await field('Form').fire('submit');
}
async function remove(id) { await field('List').fire('click', { target: { closest: () => ({ dataset: { soundAction: 'remove', soundId: id } }) } }); }
module.activateSoundboard('alfrojas');
await remove(defaultSounds('alfrojas')[0].id);
assert.equal(records.get('alfrojas').sounds.length, 7);
assert.equal(nodes.get('alfrojasSoundboard').children.length, 7, 'La barra activa debe actualizarse sin recargar.');
await choose('rodrrodriguez');
await add('Octavo', 'https://www.myinstants.com/media/sounds/eight.mp3');
assert.equal(records.get('rodrrodriguez').sounds.length, 8);
assert.equal(field('Add').disabled, true);
const beforeNinth = writes;
await add('Noveno', 'https://www.myinstants.com/media/sounds/nine.mp3');
assert.equal(writes, beforeNinth);
assert.match(field('Message').textContent, /ocho/);
await choose('iharo');
assert.equal(field('Count').textContent, '0 / 8');
await add('Nuevo', 'https://www.myinstants.com/es/instant/nuevo-123/');
assert.equal(field('Help').hidden, false);
assert.equal(field('Direct').required, true);
assert.equal(records.has('iharo'), false, 'No tratar el slug de la página como nombre de MP3.');
await add('<img src=x>', 'https://www.myinstants.com/es/instant/nuevo-123/', 'https://www.myinstants.com/media/sounds/cat.mp3');
assert.equal(records.get('iharo').sounds.length, 1);
assert.match(field('List').innerHTML, /&lt;img src=x&gt;/);
assert.doesNotMatch(field('List').innerHTML, /<img src=x>/);
await add('Duplicado', 'https://www.myinstants.com/media/sounds/cat.mp3?utm_source=copy');
assert.equal(records.get('iharo').sounds.length, 1);
assert.match(field('Message').textContent, /ya está agregado/);
await remove(records.get('iharo').sounds[0].id);
assert.deepEqual(records.get('iharo').sounds, []);
const secondDevice = createSoundboardModule({ firebase });
secondDevice.initSoundboardAuthBridge();
assert.equal(secondDevice.getUserSounds('alfrojas').length, 7);
assert.deepEqual(secondDevice.getUserSounds('iharo'), [], 'Una lista vacía guardada debe seguir vacía en otro equipo.');
await choose('yehernandez');
failWrite = true;
await add('Fallido', 'https://www.myinstants.com/media/sounds/fail.mp3');
assert.equal(records.has('yehernandez'), false);
assert.match(field('Message').textContent, /No se pudo guardar/);
failWrite = false;
await add('Válido', 'https://www.myinstants.com/media/sounds/new.mp3');
assert.equal(secondDevice.getUserSounds('yehernandez').length, 1, 'Los cambios deben llegar a otros equipos.');
// Emular reintento de Firestore: otro equipo ocupa el octavo lugar entre lectura y commit.
records.set('rodrrodriguez', { sounds: defaultSounds('rodrrodriguez') }); broadcast();
await choose('rodrrodriguez');
const otherSound = { id: 'other', name: 'Otro equipo', icon: 'music_note', url: 'https://www.myinstants.com/media/sounds/other.mp3' };
conflict = () => records.set('rodrrodriguez', { sounds: [...defaultSounds('rodrrodriguez'), otherSound] });
await add('Nuestro intento', 'https://www.myinstants.com/media/sounds/ours.mp3');
assert.equal(records.get('rodrrodriguez').sounds.length, 8);
assert.ok(records.get('rodrrodriguez').sounds.some(s => s.id === 'other'));
assert.ok(!records.get('rodrrodriguez').sounds.some(s => s.name === 'Nuestro intento'));
assert.match(field('Message').textContent, /ocho/);
const beforeLock = writes;
module.setSoundAdminUnlocked(false);
await choose('yehernandez');
await add('Bloqueado', 'https://www.myinstants.com/media/sounds/locked.mp3');
assert.equal(writes, beforeLock);
auth.currentUser = null; authObservers.forEach(fn => fn(null));
assert.equal(nodes.get('alfrojasSoundboard').style.display, 'none');
assert.equal(sessionStorage.getItem('censo-newsbar-admin-session-v1'), undefined);
assert.equal(downloads, 0);
assert.equal(audios, 0, 'Guardar y sincronizar no debe reproducir audio.');
console.log('OK: enlaces, cuatro usuarios, agregar/quitar, límite 8, conflicto entre equipos, lista vacía persistente, sincronización, errores y bloqueo.');
