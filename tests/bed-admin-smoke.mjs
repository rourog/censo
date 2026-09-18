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
assert.match(beds, /La cama está ocupada y no puede retirarse/u);
assert.match(beds, /censoBedModal/u, 'Debe crear el administrador compacto de camas.');
assert.match(beds, /adminSettingsBtn/u, 'El engrane visible debe abrir Camas y sillas.');
assert.doesNotMatch(beds, /censoAdminBedsTab/u, 'Camas ya no debe mezclarse con Avisos y Sonidos.');
assert.match(beds, /runTransaction/u, 'Los cambios del catálogo deben ser transaccionales.');
assert.match(beds, /basalBeds/u, 'Debe conservar un nivel basal protegido.');
assert.match(beds, /model.sharedDocument\(next, data, uid, serverTimestamp\(\)\)/u, 'Debe guardar el catálogo completo en la misma transacción.');
assert.doesNotMatch(beds, /censoBedDescription/u, 'La descripción opcional debe desaparecer del formulario.');
assert.doesNotMatch(beds, /Restaurar catálogo predeterminado/u, 'El basal ya no necesita restaurarse.');

assert.match(patients, /normalizeBedKey\(a\.area, a\.cama\)/u, 'El orden debe distinguir área y cama.');
assert.match(patients, /calcularCamasLibres\(masterCamas, nextPatients\)/u);

assert.match(version.displayVersion, /^\d+\.\d+$/u, 'La versión visible debe tener un formato vN.N válido.');
console.log('OK: administrador dinámico de camas verificado.');
