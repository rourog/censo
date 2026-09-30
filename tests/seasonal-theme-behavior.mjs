import assert from 'node:assert/strict';
import { resolveSeasonalProfile, registerSeasonalConfetti, launchSeasonalConfetti } from '../modules/seasonalTheme.js';
assert.equal(resolveSeasonalProfile('auto', new Date('2026-10-01T05:59:59Z')), null);
assert.equal(resolveSeasonalProfile('auto', new Date('2026-10-01T06:00:00Z')).id, 'halloween');
assert.equal(resolveSeasonalProfile('auto', new Date('2026-11-01T06:00:00Z')), null);
assert.equal(resolveSeasonalProfile('off'), null);
assert.equal(resolveSeasonalProfile('halloween', new Date('2026-01-01')).id, 'halloween');
let mode = 'halloween', received;
globalThis.localStorage = { getItem: () => mode };
globalThis.window = { confetti: options => { received = options; } };
launchSeasonalConfetti({ particleCount: 150, colors: ['original'] });
assert.deepEqual(received.colors, ['#ff6500', '#fb923c', '#a855f7', '#6d28d9']);
assert.equal(received.particleCount, 150);
mode = 'off';
launchSeasonalConfetti({ colors: ['original'] });
assert.deepEqual(received.colors, ['original']);
const dispose = registerSeasonalConfetti('future', () => {});
assert.equal(typeof dispose, 'function'); dispose();
console.log('OK: seasonal dates, manual selection and confetti fallback.');

// Exercise the actual ambient controller with a minimal DOM and deterministic RAF.
const { createSeasonalAmbient } = await import('../modules/seasonalAmbient.js');
const { SEASONAL_PROFILES } = await import('../modules/seasonalTheme.js');
let nextFrame, appendedLayer;
function makeElement() {
  return { style: {}, children: [], appendChild(child) { this.children.push(child); },
    setAttribute(key, value) { this[key] = value; }, remove() { this.removed = true; } };
}
let floorTop = 700, newsVisible = true;
const newsBar = { getClientRects: () => newsVisible ? [1] : [], getBoundingClientRect: () => ({ top: floorTop }) };
const footer = { getClientRects: () => [1], getBoundingClientRect: () => ({ top: 760 }) };
const events = {};
const fab = { getClientRects: () => [1], getBoundingClientRect: () => ({ bottom: floorTop - 108 }) };
const appElement = { getClientRects: () => [1], querySelector: () => footer, appendChild(layer) { appendedLayer = layer; } };
globalThis.document = { body: { style: {setProperty(){},removeProperty(){}} }, hidden: false, createElement: makeElement, getElementById: id => id === 'censoNewsBar' ? newsBar : id === 'mainFabBtn' ? fab : appElement, addEventListener: (type, fn) => { events[type] = fn; }, removeEventListener: type => { delete events[type]; } };
globalThis.innerWidth = 1000; globalThis.innerHeight = 800;
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
globalThis.requestAnimationFrame = fn => { nextFrame = fn; return 1; };
globalThis.cancelAnimationFrame = () => {};
const ambient = createSeasonalAmbient();
ambient.sync(SEASONAL_PROFILES.halloween, 'effect-halloween');
assert.equal(appendedLayer.children.length, 6);
assert.equal(appendedLayer.children.filter(b => b['aria-label'].includes('rojos')).length, 1);
nextFrame(1000);
for (const item of appendedLayer.children) {
  const y = Number(item.style.transform.match(/,([^p]+)px/)[1]);
  assert.ok(y >= fab.getBoundingClientRect().bottom + 6);
  assert.ok(y + parseFloat(item.style.height) <= floorTop - 4);
}
const bat = appendedLayer.children[0], sprite = bat.children[0];
events.pointerdown({target: {closest: selector => selector === '#mainAppContainer' ? appElement : true}, clientX: 0, clientY: 0});
assert.equal(bat.disabled, undefined, 'Clinical content must not trigger bat interactions');
bat.onclick();
for (let i = 1; i <= 5; i++) nextFrame(1000 + i * 50);
assert.notEqual(sprite.style.backgroundPosition, '-64px -48px', 'The impact frame must not appear during descent');
for (let i = 6; i <= 35; i++) nextFrame(1000 + i * 50);
assert.equal(sprite.style.backgroundPosition, '-64px -48px', 'The impact frame appears on the ground');
const height = parseFloat(bat.style.height);
const landedY = Number(bat.style.transform.match(/,([^p]+)px/)[1]);
assert.equal(landedY + height, floorTop, 'The visible news bar is the floor');
newsVisible = false; nextFrame(2800);
assert.equal(Number(bat.style.transform.match(/,([^p]+)px/)[1]) + height, 760, 'The footer becomes the floor when news is hidden');
for (let i = 36; i <= 120; i++) nextFrame(1000 + i * 50);
assert.equal(bat.removed, true, 'The fallen bat disappears');
ambient.stop();
assert.equal(appendedLayer.removed, true);
console.log('OK: six bats, one red, delayed impact frame and disappearance.');

const { drawPlexusPumpkin } = await import('../modules/plexus.js');
const colors = [];
const ctx = {save(){},restore(){},translate(){},fillRect(){},beginPath(){},ellipse(){},fill(){colors.push(this.fillStyle)},stroke(){},moveTo(){},lineTo(){},closePath(){}};
for (const color of ['#ef4444','#eab308','#fb923c','#10b981','#3b82f6']) drawPlexusPumpkin(ctx, 10, 10, 7, color);
for (const color of ['#ef4444','#eab308','#fb923c','#10b981','#3b82f6']) assert.ok(colors.includes(color));
console.log('OK: pumpkin markers preserve distinct area colors.');
