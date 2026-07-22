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

console.log('OK: acciones y gestos móviles verificados.');
