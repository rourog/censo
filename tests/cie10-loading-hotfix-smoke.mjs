import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const css = read('modules/cie10Lesiones.css');
const tool = read('modules/cie10LesionesModule.js');
const version = JSON.parse(read('version.json'));

assert(css.includes('.cie10-dialog [hidden]'), 'Falta regla scoped para respetar hidden');
assert(css.includes('display: none !important'), 'La regla hidden debe imponerse a display grid/flex');
assert(tool.includes('TOTAL_TIMEOUT_MS = 18000'), 'Falta timeout total de carga');
assert(tool.includes('FETCH_TIMEOUT_MS = 8000'), 'Falta timeout por fragmento');
assert(tool.includes('DECOMPRESS_TIMEOUT_MS = 8000'), 'Falta timeout de descompresión');
assert(tool.includes('fetchPart(index)'), 'El módulo debe cargar fragmentos directamente');
assert(tool.includes('Descargando catálogo CIE-10'), 'Falta estado visible de descarga');
assert(tool.includes('Descomprimiendo catálogo CIE-10'), 'Falta estado visible de descompresión');
assert(tool.includes('Validando 3,700 códigos'), 'Falta estado visible de validación');
assert(!tool.includes("import(moduleUrl('cie10LesionesData'))"), 'No debe quedar el import dinámico sin timeout del cargador');
assert(!tool.includes('COPIAR Y CERRAR'), 'El modal es solo consulta');
assert(!tool.includes('navigator.clipboard'), 'El modal no debe copiar datos');
assert(version.displayVersion === '2.56', 'La preview debe ser v2.56');
assert(version.build === '20260914-cie10-loading-v3', 'Build hotfix incorrecto');

console.log('CIE-10 loading hotfix smoke OK');
