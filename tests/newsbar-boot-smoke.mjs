import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const read = name => readFileSync(resolve(root, name), 'utf8');
const nodes = new Map();
function element() {
  const listeners = new Map();
  const classes = new Set();
  let html = ''; 
  return {
    hidden: true, style: {}, dataset: {}, textContent: '', value: '',
    set innerHTML(value) { html = value; for (const m of value.matchAll(/id="([^"]+)"/g)) if (!nodes.has(m[1])) nodes.set(m[1], element()); },
    get innerHTML() { return html; },
    classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
    dispatch(type, event) { for (const fn of listeners.get(type) || []) fn(event); },
    appendChild(child) { if (child.id) nodes.set(child.id, child); },
    setAttribute() {}, focus() {}, select() {}, querySelectorAll: () => [],
    insertAdjacentHTML(_, html) {
      for (const match of html.matchAll(/id="([^"]+)"/g)) nodes.set(match[1], element());
    }
  };
}
const media = { matches: true, addEventListener(_, fn) { this.change = fn; }, removeEventListener() {} };
const authCallbacks = [];
const pendingAuth = [];
let snapshotCallback;
let subscriptions = 0;
let unsubscriptions = 0;
let requests = 0;
const body = element();
const doc = element();
Object.assign(doc, {
  body, head: element(), visibilityState: 'visible',
  getElementById: id => nodes.get(id) || null,
  createElement: () => element(),
  querySelector: () => ({ textContent: 'v2.46' })
});
globalThis.document = doc;
globalThis.window = { matchMedia: () => media, addEventListener() {}, setTimeout: fn => pendingAuth.push(fn) };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
globalThis.setInterval = () => 1;
function storage() {
  const map = new Map();
  return { getItem: k => map.get(k) || null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) };
}
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
const today = Date.now();
localStorage.setItem('censo-newsbar-external-cache-v2', JSON.stringify({ fetchedAt: today, items: [
  { id: 'hoy', kind: 'external', text: 'NOTICIA DE HOY', createdAt: today, url: 'https://example.com/hoy', regionCode: 'DEL', region: 'Delicias' },
  { id: 'ayer', kind: 'external', text: 'NOTICIA DE AYER', createdAt: today - 86400000, url: 'https://example.com/ayer', regionCode: 'DEL', region: 'Delicias' }
] }));
globalThis.fetch = async () => { requests++; throw new Error('No debe consultarse la red durante esta prueba.'); };
globalThis.__newsbarBootMocks = {
  db: {}, auth: { currentUser: null },
  collection: (_, name) => name,
  onSnapshot: (name, fn) => {
    if (name === 'soundboards') { fn({ docs: [] }); return () => {}; }
    assert.equal(name, 'announcements');
    subscriptions++;
    snapshotCallback = fn;
    return () => { unsubscriptions++; };
  },
  onAuthStateChanged: (_, fn) => { authCallbacks.push(fn); return () => {}; },
  addDoc() { throw new Error('No escribir datos.'); },
  doc() {}, deleteDoc() { throw new Error('No borrar datos.'); },
  serverTimestamp() {}, signInWithEmailAndPassword() {}, runTransaction() { throw new Error('No escribir configuración en esta prueba.'); }
};

// Ejecutar el appModule real; simular servicios y los módulos ajenos a la regresión.
const lifecycles = { createEffectsModule: [], createRenderModule: [], createPatientModule: [], createThemeModule: ['initTheme'], createModalModule: ['bindModalBaseEvents'], createMaintenanceModule: ['bindMaintenanceEvents'], createInteractionModule: ['exposeWindowActions', 'bindUiEvents'], createAuthModule: ['bindAuthEvents', 'bootAuth'] };
let bootSource = read('modules/appModule.js');
bootSource = bootSource.replace(/import ([^;]+?) from '([^']+)';/g, (_, clause, specifier) => {
  let source;
  if (specifier.includes('newsBarModule.js')) {
    source = read('modules/newsBarModule.js').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(resolve(root, 'modules/newsBarModule.js')).href));
  } else if (specifier.includes('soundboardModule.js')) {
    source = read('modules/soundboardModule.js').replace(/\.\/soundCatalog\.js\?v=[^']+/, dataModule(read('modules/soundCatalog.js')));
  } else if (specifier.includes('firebaseModule.js')) {
    source = 'export const { db, auth, collection, onSnapshot, onAuthStateChanged, addDoc, doc, deleteDoc, serverTimestamp, signInWithEmailAndPassword, runTransaction } = globalThis.__newsbarBootMocks;';
  } else if (specifier.includes('stateModule.js')) {
    source = 'export const state = {};';
  } else if (clause.startsWith('*')) {
    source = 'export const placeholder = true;';
  } else {
    const factory = clause.match(/\{\s*(\w+)/)[1];
    source = `export function ${factory}() { return { ${lifecycles[factory].map(name => `${name}() {}`).join(',')} }; }`;
  }
  return `import ${clause} from '${dataModule(source)}';`;
});
const { bootApp } = await import(dataModule(bootSource));
await bootApp();
assert.equal(typeof window.CensoApp.startNewsBar, 'function', 'bootApp debe componer el módulo de noticias.');
assert.equal(authCallbacks.length, 2, 'bootApp debe iniciar los puentes de noticias y sonidos.');
assert.equal(window.CensoApp.getUserSounds('rodrrodriguez').length, 7);
assert.equal(nodes.has('censoNewsBar'), false, 'No mostrar avisos antes del inicio de sesión.');
const emitAuth = user => { globalThis.__newsbarBootMocks.auth.currentUser = user; authCallbacks.forEach(fn => fn(user)); while (pendingAuth.length) pendingAuth.shift()(); };
emitAuth({ uid: 'prueba' });
assert.ok(body.classList.contains('censo-newsbar-visible'));
assert.equal(subscriptions, 1);
assert.equal(nodes.get('censoNewsBar').dataset.feedMode, 'external');
assert.match(nodes.get('censoNewsTrack').innerHTML, /NOTICIA DE HOY/);
assert.doesNotMatch(nodes.get('censoNewsTrack').innerHTML, /NOTICIA DE AYER/);
assert.match(nodes.get('censoNewsTrack').innerHTML, /target="_blank"/);
snapshotCallback({ docs: [{ id: 'aviso-prueba', data: () => ({ text: 'AVISO INTERNO DE PRUEBA', createdAtMs: today, displayTime: '12:00' }) }] });
assert.equal(nodes.get('censoNewsBar').dataset.feedMode, 'internal');
assert.match(nodes.get('censoNewsTrack').innerHTML, /AVISO INTERNO DE PRUEBA/);
nodes.get('censoNewsBar').dispatch('click', { target: { closest: selector => selector === '.censo-newsbar__link' ? null : {} } });
assert.equal(nodes.get('censoNewsDrawer').hidden, false);
doc.dispatch('keydown', { ctrlKey: true, altKey: true, key: 'n', preventDefault() {} });
assert.equal(nodes.get('censoNewsAdminModal').hidden, false);
assert.equal(nodes.get('censoNewsAuthView').hidden, false, 'La administración debe pedir contraseña.');
sessionStorage.setItem('censo-newsbar-admin-session-v1', '1');
doc.dispatch('keydown', { ctrlKey: true, altKey: true, key: 'n', preventDefault() {} });
nodes.get('censoAdminSoundsTab').dispatch('click', {});
assert.equal(nodes.get('censoAdminSoundsPanel').hidden, false);
assert.equal(nodes.get('censoAdminNoticesPanel').hidden, true);
assert.match(nodes.get('censoSoundList').innerHTML, /Anime Ahh/);
nodes.get('censoAdminNoticesTab').dispatch('click', {});
assert.equal(nodes.get('censoAdminSoundsPanel').hidden, true);
assert.equal(nodes.get('censoAdminNoticesPanel').hidden, false);

media.matches = false;
media.change();
assert.ok(!body.classList.contains('censo-newsbar-visible'));
assert.equal(nodes.get('censoNewsDrawer').hidden, true);
assert.equal(unsubscriptions, 1);
const previousRequests = requests;
doc.dispatch('pointerdown', {});
assert.equal(requests, previousRequests, 'La actividad móvil no debe cargar noticias.');
media.matches = true;
media.change();
assert.equal(subscriptions, 2);
emitAuth(null);
assert.ok(!body.classList.contains('censo-newsbar-visible'));
assert.equal(unsubscriptions, 2);
assert.equal(requests, 0);
console.log('OK: arranque real, puente Auth, noticias de hoy, avisos, lista, administración, escritorio/móvil y cierre de sesión.');
