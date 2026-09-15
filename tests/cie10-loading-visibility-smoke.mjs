import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const css = read('modules/cie10Lesiones.css');
const tool = read('modules/cie10LesionesModule.js');
const version = JSON.parse(read('version.json'));

assert(css.includes('.cie10-dialog [hidden]'), 'Falta regla para respetar hidden dentro del modal CIE-10');
assert(css.includes('display: none !important'), 'La regla hidden debe prevalecer sobre display:grid/flex del módulo');
assert(tool.includes("$('cie10Loading').hidden = true"), 'El loader no oculta el estado de carga al completar');
assert(tool.includes("$('cie10Explorer').hidden = false"), 'El loader no muestra el explorador al completar');
assert(version.displayVersion === '2.54', 'El hotfix CIE-10 debe ser v2.54');
assert(version.build === '20260914-cie10-loading-hotfix', 'Build del hotfix CIE-10 incorrecto');

console.log(`CIE-10 loading visibility smoke OK · ${version.displayVersion}`);
