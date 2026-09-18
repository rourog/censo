import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const bed = await import(moduleUrl(read('modules/bedModule.js')));

const paths = Object.values(bed.healthIcons);
assert.equal(paths.length, 27, 'La integración debe conservar exactamente 27 SVG locales.');
assert.equal(new Set(paths).size, 27, 'Cada entrada debe apuntar a un recurso semántico propio.');
for (const path of paths) {
  assert.match(path, /^\.\/assets\/icons\/healthicons\/[a-z-]+\.svg$/u);
  assert.ok(existsSync(resolve(root, path)), `Falta ${path}`);
}

assert.match(bed.getDestinoIconPath('OBSERVACIÓN'), /observation\.svg$/u);
assert.match(bed.getDestinoIconPath('ALTA A DOMICILIO'), /home\.svg$/u);
assert.match(bed.getDestinoIconPath('VALORACIÓN 🤰 Ginecología'), /gynecology\.svg$/u);
assert.match(bed.getDestinoIconPath('INGRESO 👶 Pediatría'), /pediatrics\.svg$/u);
assert.match(bed.getDestinoIconPath('VALORACIÓN 🦴 Traumatología y Ortopedia'), /orthopaedics\.svg$/u);
assert.match(bed.getDestinoIconPath('VALORACIÓN 💬 Psicología'), /psychology\.svg$/u);
assert.match(bed.getDestinoIconPath('INGRESO 🤰 Tococirugía'), /obstetrics\.svg$/u);
assert.match(bed.getDestinoIconPath('VALORACIÓN 💧 Urología'), /urology\.svg$/u);
assert.match(bed.getDestinoIconPath('INGRESO 👁️ Oftalmología'), /ophthalmology\.svg$/u);
assert.match(bed.getDestinoIconPath('INGRESO 🍎 Gastroenterología'), /gastroenterology\.svg$/u);

for (const className of ['icon-heartbeat', 'icon-look', 'icon-spin', 'icon-wiggle', 'icon-twinkle']) {
  assert.ok(Object.values(bed.areaVisuals).some(visual => visual.class === className), `Falta conservar ${className}.`);
}

const render = read('modules/renderModule.js');
const modal = read('modules/modalModule.js');
const styles = read('style.css');
assert.match(render, /healthIconHtml/u);
assert.doesNotMatch(render, /visual\.emoji|getEmojiOnly\(destino\)|destino-specialty-emoji/u);
assert.match(modal, /health-icon destino-option-icon/u);
assert.match(styles, /mask-image:\s*var\(--health-icon\)/u);
assert.ok(existsSync(resolve(root, 'assets/icons/healthicons/LICENSE')), 'Debe conservarse la licencia MIT de Health Icons.');

const { createRenderModule } = await import(moduleUrl(render));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const renderer = createRenderModule({ state: {}, bed, utils: { escapeHtml } });
for (const destino of ['👀 Observación', 'INGRESO 🔪 Cirugía General', 'VALORACIÓN 👁️ Oftalmología']) {
  const html = renderer.getColorfulChipHtml(destino);
  assert.match(html, /health-icon/u);
  assert.match(html, /assets\/icons\/healthicons/u);
  assert.doesNotMatch(html, /[👀🔪👁️]/u, 'Los emojis históricos no deben llegar al HTML visible.');
}

console.log('OK: 27 Health Icons locales, compatibilidad histórica, animaciones y selectores verificados.');
