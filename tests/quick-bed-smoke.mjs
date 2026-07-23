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

const { masterCamas, calcularCamasLibres } = await importLocalModule('modules/bedModule.js');

const pediluvio = masterCamas.find(cama => cama.area === 'EXTRAS' && cama.cama === 'PEDILUVIO');
const efes = masterCamas.find(cama => cama.area === 'EXTRAS' && cama.cama === "EFE'S");

assert.ok(pediluvio, 'PEDILUVIO debe existir en el pool de EXTRAS.');
assert.ok(efes, "EFE'S debe existir en el pool de EXTRAS.");
assert.equal(efes.descripcion, 'ENFERMEDADES FEBRILES EXANTEMÁTICAS');

const libres = calcularCamasLibres(masterCamas, [
  { fila: 'p-efe', area: 'EXTRAS', cama: "EFE'S" }
]);

assert.ok(libres.some(cama => cama.cama === 'PEDILUVIO'), 'PEDILUVIO debe permanecer disponible si no está ocupado.');
assert.ok(!libres.some(cama => cama.cama === "EFE'S"), "EFE'S no debe aparecer libre mientras tenga un paciente.");

const renderSource = readFileSync(resolve(root, 'modules/renderModule.js'), 'utf8');
const modalSource = readFileSync(resolve(root, 'modules/modalModule.js'), 'utf8');
const firebaseSource = readFileSync(resolve(root, 'modules/firebaseModule.js'), 'utf8');

assert.match(renderSource, /abrirCamaFlotante\(this, this\.dataset\.fila, event\)/u, 'Las camas renderizadas deben abrir el selector rápido.');
assert.match(renderSource, /patient-bed quick-bed-trigger/u, 'La cama móvil debe ser un control táctil independiente.');
assert.doesNotMatch(renderSource, /swap_horiz/u, 'La cama debe conservar todo su ancho sin icono de cambio.');
assert.match(renderSource, /quick-bed-label--pediluvio/u, 'PEDILUVIO debe usar una tipografía compacta exclusiva.');
assert.match(renderSource, /getCamaLabelClass\(p\.cama\)/u, 'El ajuste de PEDILUVIO debe aplicarse en las vistas renderizadas.');
assert.match(modalSource, /function abrirCamaFlotante/u);
assert.match(modalSource, /if \(mismaCama\) return;/u, 'Elegir la cama actual no debe escribir en Firestore.');
assert.match(modalSource, /where\('cama', '==', nuevaCama\)/u, 'El cambio debe volver a verificar la ocupación en el servidor.');
assert.match(modalSource, /updateDoc\(doc\(db, 'pacientes', filaId\), \{ cama: nuevaCama, area: nuevaArea \}\)/u);
assert.match(firebaseSource, /\bwhere\b/u, 'Firebase debe exportar where para la revalidación de cama.');

console.log('OK: camas extra y cambio rápido de cama verificados.');
