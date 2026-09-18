import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const printSource = readFileSync(resolve(root, 'modules/printModule.js'), 'utf8');
const appSource = readFileSync(resolve(root, 'modules/appModule.js'), 'utf8');
const interactionSource = readFileSync(resolve(root, 'modules/interactionModule.js'), 'utf8');
const mainSource = readFileSync(resolve(root, 'main.js'), 'utf8');

for (const campo of ['Cama', 'Ingreso', 'Paciente', 'Edad', 'Diagnóstico', 'Pendientes', 'Destino']) {
  assert.match(printSource, new RegExp(`>${campo}<`, 'u'), `La impresión debe incluir la columna ${campo}.`);
}

for (const campoExcluido of ['Observación', 'Acciones']) {
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
assert.match(printSource, /getDestinoIconPath/u, 'La impresión debe incluir el Health Icon del destino.');
assert.match(printSource, /getDestinoActionIconPath/u, 'Ingreso y valoración deben conservar un icono de acción.');
assert.match(printSource, /esperarImagenes/u, 'La impresión debe esperar la carga de los SVG.');
assert.match(mainSource, /window\.CensoBuild\?\.version/u, 'El build runtime debe invalidar la caché de la función nueva.');

const dataModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const bed = await import(dataModule(readFileSync(resolve(root, 'modules/bedModule.js'), 'utf8')));
const { createPrintModule } = await import(dataModule(printSource));
globalThis.window = { location: { href: 'https://rourog.github.io/censo/index.html' } };
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const printHtml = createPrintModule({
  state: { pacientesGlobal: [] },
  bed,
  utils: { escapeHtml }
}).construirDocumentoImpresion([{
  area: 'OBSERVACIÓN', cama: 'CAMA 1', nombre: 'PACIENTE', edad: '35',
  diagnostico: 'PRUEBA', pendientes: 'NINGUNO', fechaIngresoFormateada: '18 SEP 12:00',
  destino: 'INGRESO 🔪 Cirugía General'
}]);
assert.match(printHtml, /https:\/\/rourog\.github\.io\/censo\/assets\/icons\/healthicons\/observation\.svg/u);
assert.match(printHtml, /general-surgery\.svg/u);
assert.match(printHtml, /INGRESO A CIRUGÍA GENERAL/u);
assert.doesNotMatch(printHtml, /🔪/u, 'La impresión no debe filtrar el emoji histórico almacenado.');

console.log('OK: impresión del censo verificada.');
