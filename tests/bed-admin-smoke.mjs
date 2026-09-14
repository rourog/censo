import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');

const app = read('modules/appModule.js');
const beds = read('modules/bedAdminModule.js');
const patients = read('modules/patientModule.js');
const version = JSON.parse(read('version.json'));

assert.match(app, /import\(moduleUrl\('bedAdminModule'\)\)/u, 'appModule debe cargar el administrador de camas con el build actual.');
assert.match(app, /createBedAdminModule/u);
assert.match(app, /initBedCatalogAuthBridge\(\)/u);
assert.match(app, /initBedAdminUiBridge\(\)/u);

assert.match(beds, /SETTINGS_COLLECTION = 'settings'/u);
assert.match(beds, /SETTINGS_DOC = 'bedCatalog'/u);
assert.match(beds, /masterCamas\.splice/u, 'El catálogo compartido debe mutarse in-place para conservar referencias existentes.');
assert.match(beds, /isOccupied\(bed\)/u, 'Debe comprobar ocupación antes de retirar una cama.');
assert.match(beds, /No se puede retirar una cama mientras tenga un paciente asignado/u);
assert.match(beds, /censoAdminBedsTab/u, 'Debe crear la pestaña Camas dentro de Administración.');
assert.match(beds, /insertBefore\(bedTab, soundsTab\)/u, 'Camas debe convivir con Avisos y Sonidos.');
assert.match(beds, /runTransaction/u, 'Los cambios del catálogo deben ser transaccionales.');
assert.match(beds, /defaultBeds/u, 'Debe conservar un catálogo predeterminado de respaldo.');

assert.match(patients, /normalizeBedKey\(a\.area, a\.cama\)/u, 'El orden debe distinguir área y cama.');
assert.match(patients, /calcularCamasLibres\(masterCamas, nextPatients\)/u);

assert.equal(version.displayVersion, '2.48');
console.log('OK: administrador dinámico de camas verificado.');
