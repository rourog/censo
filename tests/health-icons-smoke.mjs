import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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

// Esta lista fija la selección visual confirmada, no solo los nombres locales.
// Evita que una actualización sustituya silenciosamente un SVG por otro parecido.
const selectedIconHashes = {
  'admission.svg': '003ae3fd61538fc27a4e17e1fbe11950b5669db7184ccb63a98f93b5de29ba6f',
  'assessment.svg': '3d5d8281ba58de7487fbe3c2633b2ff6f447dce54f4b1f12acb979dd4848f0e6',
  'cardiology.svg': 'c43eb3e9f3eb53ddba4b5508d002d3c57d7d69b33ca8b078360282880d6bb89c',
  'death.svg': '416b31b4b5ee2170899c46d330c6a921ee6ab44dbd8775cb8c88d87b48cb8444',
  'discharge.svg': '7406f51b0fce37f374a5bc354fbf45e1ee43afc5be25c006e6658f6f6b055b68',
  'efe.svg': 'e9e5b2ca475814201913cdef2c52f70916f59bb0523a08b3e2cb3b29f0e9659c',
  'extras.svg': '8fcd7ff560ed035a548addd9c23eb7aedb327987f548586a75ed22a2662656a6',
  'gastroenterology.svg': 'b0aa0f8eedb762647c20bd23636cc5b335705baf60ef2aa3d716a62eb845f526',
  'general-surgery.svg': 'd782c1340577d06f3feb2b6f1b404fc6b1f155b8e0dcc70b4be8293b8040a370',
  'gynecology.svg': '94b92b22795010faab6f9a49a5bd5f11aa0bfc4b0694cac1b719384ddafdf552',
  'home.svg': 'fc154e42ecf14aa5a650c55399da8b06d0a19e66c5c305a8a5e51e69ec3cc3ed',
  'intensive-care.svg': 'e4047637abe8ba0e9114cde133a5f41d5c5c7dcb1f6abd3b559f0d3a8269b97d',
  'internal-medicine.svg': '1bc994464691e2c3012b059ec82c24888734be625ceadb32d00e5121ff7c88eb',
  'minor-trauma.svg': 'cbc3f3e4b4f8d70d1875321c78a856ce7aeb5e2e7aa7a49dfe1c123d48cc7f5d',
  'observation.svg': 'a340bd371b2fd4fdd8e63ca3df00aae5a5f4c56c7fc196a0c8e96762bdc4fa07',
  'obstetrics.svg': '323fd3ad52997882c5e05fd1ebf5f5032b6ca3a5763efa567b33ed3e5a6ff747',
  'ophthalmology.svg': 'c9325fef32fbb9acf602a7dfd129e47b32b5f6d5166b34396e4428be6b38b1ef',
  'orthopaedics.svg': '6bdefb7f405daab668d45e68c4b384c99c33f4ca9c6d52390d5e6bdb4a69c13c',
  'pediatric-area.svg': '41cbe10b31f037c0bc8d5f2ae4b18ac523aa6e9d1ccf22ad55734b69ce6c97d4',
  'pediatrics.svg': '41cbe10b31f037c0bc8d5f2ae4b18ac523aa6e9d1ccf22ad55734b69ce6c97d4',
  'pediluvio.svg': 'bf82bbb8fed562751fa3dd10eb85e77712d0daeb450c13d233c9cda58aa18846',
  'plastic-surgery.svg': '85c7c8685cda64fbe86e16241de067721e16612a90e1bb456b483b819cfbcd26',
  'psychiatry.svg': 'd7a62c85880557381d478b94c1c71d68eb030d0ec446f84cb9b9d0d7aa9cd4f0',
  'psychology.svg': 'c4627700c929e528f3818b37bf5ad37f0b2caedff0295b005684f5eb5c391304',
  'shock-room.svg': 'cd819543e4731e8570fc349dda6ecd28ae1a70a5adfd657d402fe29aebc15ece',
  'unassigned.svg': '077f4304d2e647a7f38f973f7f52815d42a28f52e131949f7ee0476201611a3b',
  'urology.svg': '9f1b0ea05fa09ac5a3f789e9bb72e983142460507b9e1758e3f45fbf11af1857',
};

for (const [filename, expectedHash] of Object.entries(selectedIconHashes)) {
  const bytes = readFileSync(resolve(root, 'assets/icons/healthicons', filename));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expectedHash, `Cambió la selección visual de ${filename}.`);
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

console.log('OK: 27 Health Icons seleccionados, hashes, compatibilidad histórica, animaciones y selectores verificados.');
