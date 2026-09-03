import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const read = path => readFileSync(resolve(root, path), 'utf8');
const bed = await import(asModule(read('modules/bedModule.js')));
const constants = await import(asModule(read('modules/constants.js')));
assert.deepEqual(constants.masterCamas, bed.masterCamas);
const obs = bed.masterCamas.filter(c => c.area === 'OBSERVACIÓN');
assert.equal(obs.length, 20);
assert.equal(new Set(bed.masterCamas.map(c => `${c.area}|${c.cama}`)).size, bed.masterCamas.length);
for (let n = 1; n <= 10; n++) assert.ok(obs.some(c => c.cama === `CAMA ${n}`));
for (let n = 1; n <= 5; n++) {
  assert.ok(obs.some(c => c.cama === `CAMA ${n}-2`));
  assert.ok(obs.some(c => c.cama === `SILLA ${n}`));
}
const patients = [{ area: 'OBSERVACIÓN', cama: 'CAMA 1-2' }, { area: 'OBSERVACIÓN', cama: 'CAMA 10' }];
const libres = bed.calcularCamasLibres(bed.masterCamas, patients);
assert.ok(!libres.some(c => c.area === 'OBSERVACIÓN' && ['CAMA 1-2', 'CAMA 10'].includes(c.cama)));
assert.ok(libres.some(c => c.area === 'OBSERVACIÓN' && c.cama === 'CAMA 6'));
assert.equal(patients[0].cama, 'CAMA 1-2');

const elements = new Map();
function element() {
  return {
    style: {}, dataset: {}, attributes: {}, children: [], listeners: {},
    replaceChildren() { this.children = []; },
    setAttribute(name, value) { this.attributes[name] = value; },
    appendChild(child) { this.children.push(child); child.parentElement = this; if (child.id) elements.set(child.id, child); },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    click() { this.listeners.click?.({ stopPropagation() {} }); }
  };
}
const host = element();
const alf = element();
alf.id = 'alfrojasSoundboard';
alf.style.display = 'none';
host.appendChild(alf);
globalThis.document = {
  getElementById: id => elements.get(id) || null,
  createElement: () => element(),
  querySelector: () => host
};
const audioInstances = [];
let nextPlay = () => Promise.resolve();
globalThis.Audio = class {
  constructor() { this.events = {}; this.currentTime = 0; audioInstances.push(this); }
  addEventListener(name, callback) { this.events[name] = callback; }
  play() { return nextPlay(); }
  pause() { this.paused = true; }
};
const plexusUrl = asModule(read('modules/plexus.js'));
const source = read('modules/effectsModule.js').replace(/\.\/plexus\.js\?v=[^']+/, plexusUrl);
const { createEffectsModule } = await import(asModule(source));
const catalogUrl = 'data:text/javascript;base64,' + Buffer.from(read('modules/soundCatalog.js')).toString('base64');
const soundSource = read('modules/soundboardModule.js').replace(/\.\/soundCatalog\.js\?v=[^']+/, catalogUrl);
const { createSoundboardModule } = await import('data:text/javascript;base64,' + Buffer.from(soundSource).toString('base64'));
const context = { utils: { vibrar() {} }, state: { pacientesGlobal: [] }, firebase: {} };
Object.assign(context, createSoundboardModule(context));
const app = createEffectsModule(context);
assert.equal(app.checkEasterEggs('otro usuario'), false);
assert.equal(elements.has('rodrrodriguezSoundboard'), false);
assert.equal(app.checkEasterEggs(' RODRRODRIGUEZ '), true);
const board = elements.get('rodrrodriguezSoundboard');
assert.equal(board.children.length, 7);
assert.equal(audioInstances.length, 0, 'Activar el nombre no debe descargar ni reproducir audio.');
assert.equal(alf.style.display, 'none');
assert.equal(app.checkEasterEggs('rodrrodriguez'), false);
assert.equal(host.children.length, 2, 'No duplicar botones al repetir la búsqueda.');
const [first, second] = board.children;
first.click();
assert.ok(audioInstances[0].src.endsWith('/fahhhhhhhhhhhhhh.mp3'));
first.click();
assert.equal(audioInstances[0].paused, true);
assert.equal(first.attributes['aria-pressed'], 'false');
assert.equal(audioInstances.length, 1);
first.click();
second.click();
assert.equal(audioInstances[1].paused, true, 'Cambiar de sonido debe detener el anterior.');
assert.ok(audioInstances[2].src.endsWith('/anime-wow-sound-effect.mp3'));
audioInstances[2].events.ended();
assert.equal(second.attributes['aria-pressed'], 'false');
nextPlay = () => Promise.reject(new Error('Audio no disponible'));
first.click();
await Promise.resolve();
assert.equal(first.attributes['aria-pressed'], 'false');
assert.match(first.title, /reintentar/);
let rejectOld;
nextPlay = () => new Promise((_, reject) => { rejectOld = reject; });
first.click();
nextPlay = () => Promise.resolve();
second.click();
rejectOld(new Error('AbortError'));
await Promise.resolve();
assert.equal(second.attributes['aria-pressed'], 'true', 'Un error anterior no debe detener el nuevo sonido.');
assert.equal(app.checkEasterEggs('ALFROJAS'), true);
assert.equal(alf.style.display, 'flex');
assert.equal(elements.get('rodrrodriguezSoundboard'), board);
assert.equal(host.children.length, 2);
console.log('OK: camas existentes + 6–10; activación independiente, siete botones, reproducción bajo demanda, detener y recuperación de errores.');
