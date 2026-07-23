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

const { getMobileSwipeAction, MOBILE_SWIPE_THRESHOLD } = await importLocalModule('modules/interactionModule.js');
const { getEmojiOnly, getDestinoTextLabel } = await importLocalModule('modules/bedModule.js');

assert.equal(
  getMobileSwipeAction(-MOBILE_SWIPE_THRESHOLD),
  'edit',
  'Deslizar a la izquierda debe editar, que es la acción revelada a la derecha.'
);
assert.equal(
  getMobileSwipeAction(MOBILE_SWIPE_THRESHOLD),
  'delete',
  'Deslizar a la derecha debe borrar, que es la acción revelada a la izquierda.'
);
assert.equal(
  getMobileSwipeAction(MOBILE_SWIPE_THRESHOLD - 1),
  null,
  'Un gesto corto no debe disparar una acción destructiva.'
);

const renderSource = readFileSync(resolve(root, 'modules/renderModule.js'), 'utf8');

for (const action of ['toggle-alerta', 'editar-observacion']) {
  assert.match(
    renderSource,
    new RegExp(`card-action-grid[\\s\\S]*data-censo-action="${action}"`, 'u'),
    `La tarjeta móvil debe incluir la acción ${action}.`
  );
}

assert.match(renderSource, /renderCardActions\(p, alertaActiva, observacion\)/u);
assert.match(renderSource, /swipe-action-label">BORRAR/u);
assert.match(renderSource, /swipe-action-label">EDITAR/u);
assert.match(
  renderSource,
  /if \(mode === 'compact'\)[\s\S]*getEmojiOnly\(destino\)[\s\S]*destino-specialty-emoji/u,
  'Los destinos simples deben renderizar sólo su icono en la cabecera móvil.'
);
assert.equal(getEmojiOnly('👀 Observación'), '👀');
assert.equal(getEmojiOnly('OBSERVACIÓN'), '👀', 'Los registros antiguos de Observación deben conservar un icono.');
assert.equal(getEmojiOnly('🏠 Alta a domicilio'), '🏠');
assert.equal(getEmojiOnly('DESTINO ANTIGUO DESCONOCIDO'), '📍', 'Un destino desconocido no debe mostrar texto en móvil.');

assert.equal(getDestinoTextLabel('INGRESO 🔪 Cirugía General'), 'INGRESO A CIRUGÍA GENERAL');
assert.equal(getDestinoTextLabel('VALORACIÓN 🔪 Cirugía General'), 'VALORACIÓN POR CIRUGÍA GENERAL');
assert.equal(getDestinoTextLabel('👀 Observación'), 'OBSERVACIÓN');
assert.equal(getDestinoTextLabel('🏥 Ingreso a Medicina Interna'), 'INGRESO A MEDICINA INTERNA');

const modalSource = readFileSync(resolve(root, 'modules/modalModule.js'), 'utf8');
assert.match(modalSource, /const textLabel = getDestinoTextLabel\(destino\)/u);
assert.match(modalSource, /const search = getDestinoTextLabel\(value\)/u);
assert.doesNotMatch(
  modalSource,
  /destino-action-icon|destino-specialty-emoji/u,
  'Los selectores de destino no deben volver a mostrar iconos.'
);
assert.match(
  renderSource,
  /title="\$\{escapeHtml\(textLabel\)\}" aria-label="\$\{escapeHtml\(textLabel\)\}"/u,
  'Los tooltips de destino deben usar la misma etiqueta textual del selector.'
);

console.log('OK: acciones móviles y etiquetas de destino verificadas.');
