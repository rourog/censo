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

const {
  PLEXUS_DEFAULTS,
  getPlexusPatientId,
  normalizePlexusArea
} = await importLocalModule('modules/plexus.js');

assert.deepEqual(
  {
    cohesion: PLEXUS_DEFAULTS.cohesion,
    affinity: PLEXUS_DEFAULTS.affinity,
    waveAmplitude: PLEXUS_DEFAULTS.waveAmplitude,
    independence: PLEXUS_DEFAULTS.independence,
    speed: PLEXUS_DEFAULTS.speed,
    maxConnectionDistance: PLEXUS_DEFAULTS.maxConnectionDistance,
    bannerHeight: PLEXUS_DEFAULTS.bannerHeight
  },
  {
    cohesion: 0.25,
    affinity: 0.80,
    waveAmplitude: 20,
    independence: 0.65,
    speed: 0.70,
    maxConnectionDistance: 80,
    bannerHeight: 168
  },
  'Los valores aprobados del standalone deben permanecer intactos.'
);

assert.equal(normalizePlexusArea(' Observación '), 'OBSERVACION');
assert.equal(normalizePlexusArea('Pediatría'), 'PEDIATRIA');
assert.equal(getPlexusPatientId({ fila: 'abc-123' }, 7), 'abc-123');
assert.equal(getPlexusPatientId({}, 7), 'plexus-index-7');

const plexusSource = readFileSync(resolve(root, 'modules/plexus.js'), 'utf8');
const effectsSource = readFileSync(resolve(root, 'modules/effectsModule.js'), 'utf8');
const renderSource = readFileSync(resolve(root, 'modules/renderModule.js'), 'utf8');
const styleSource = readFileSync(resolve(root, 'style.css'), 'utf8');

assert.match(plexusSource, /connectionTarget: 3 \+ Math\.floor\(Math\.random\(\) \* 4\)/u);
assert.match(plexusSource, /sparkleDuration: 380 \+ Math\.random\(\) \* 300/u);
assert.match(plexusSource, /mode: 'breaking'/u);
assert.match(plexusSource, /mode: 'connecting'/u);
assert.match(plexusSource, /countComponents\(currentNodes, currentLinks, oldKey\) > initialComponents/u);
assert.match(plexusSource, /createEventWave\(node\.x, node\.y, 'admission'/u);
assert.match(plexusSource, /createEventWave\(node\.x, node\.y, 'discharge'/u);
assert.match(effectsSource, /createPlexusController\(canvas\)/u);

assert.equal(
  [...renderSource.matchAll(/syncPlexusPatients\(state\.pacientesGlobal\)/gu)].length,
  3,
  'Búsquedas y cambios de vista no deben reducir los nodos del plexus.'
);
assert.match(styleSource, /\.header\s*\{[\s\S]*?height:\s*168px;[\s\S]*?min-height:\s*168px;/u);

console.log('OK: configuración e integración del plexus verificadas.');
