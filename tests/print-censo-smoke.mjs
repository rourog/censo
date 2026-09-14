import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const printSource = readFileSync(resolve(root, 'modules/printModule.js'), 'utf8');
const appSource = readFileSync(resolve(root, 'modules/appModule.js'), 'utf8');
const interactionSource = readFileSync(resolve(root, 'modules/interactionModule.js'), 'utf8');
const mainSource = readFileSync(resolve(root, 'main.js'), 'utf8');

for (const campo of ['Cama', 'Ingreso', 'Paciente', 'Edad', 'Diagnóstico', 'Pendientes']) {
  assert.match(printSource, new RegExp(`>${campo}<`, 'u'), `La impresión debe incluir la columna ${campo}.`);
}

for (const campoExcluido of ['Destino', 'Observación', 'Acciones']) {
  assert.doesNotMatch(printSource, new RegExp(`<th[^>]*>${campoExcluido}<`, 'iu'), `La impresión no debe incluir ${campoExcluido}.`);
}

assert.match(printSource, /@page \{ size: landscape;/u, 'La impresión debe usar orientación horizontal.');
assert.match(printSource, /thead \{ display: table-header-group; \}/u, 'Los encabezados deben repetirse en páginas sucesivas.');
assert.match(printSource, /state\.pacientesGlobal/u, 'Debe imprimir directamente el censo cargado en memoria.');
assert.match(printSource, /id = 'printBtn'/u, 'Debe crear un botón de impresión.');
assert.match(appSource, /createPrintModule/u, 'appModule debe integrar printModule.');
assert.match(appSource, /app\.initPrintUi\(\)/u, 'La UI de impresión debe inicializarse antes de enlazar eventos.');
assert.match(interactionSource, /getElementById\('printBtn'\)/u, 'El botón debe tener su evento enlazado.');
assert.match(interactionSource, /app\.imprimirCenso\(\)/u, 'El botón debe disparar la impresión del censo.');
assert.match(mainSource, /print-censo-v1-20260914/u, 'El build debe invalidar caché para cargar la función nueva.');

console.log('OK: impresión del censo verificada.');
