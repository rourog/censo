import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const app = read('modules/appModule.js');
const tool = read('modules/cie10LesionesModule.js');
const consult = read('modules/cie10ConsultOnlyModule.js');
const loader = read('modules/cie10LesionesData.js');
const css = read('modules/cie10Lesiones.css');
const version = JSON.parse(read('version.json'));

assert(app.includes("import(moduleUrl('cie10LesionesModule'))"), 'appModule no carga cie10LesionesModule');
assert(app.includes("import(moduleUrl('cie10ConsultOnlyModule'))"), 'appModule no carga el modo consulta');
assert(app.includes('modules.createCie10LesionesModule(app)'), 'appModule no instancia CIE-10');
assert(app.includes('modules.createCie10ConsultOnlyModule(app)'), 'appModule no instancia el modo consulta');
assert(app.includes('app.initCie10Ui()'), 'appModule no inicializa CIE-10');
assert(app.includes('app.initCie10ConsultOnly()'), 'appModule no activa CIE-10 solo consulta');
assert(tool.includes("historyBtn.insertAdjacentElement('afterend', button)"), 'El botón CIE-10 no se coloca después de Historial');
assert(tool.includes("button.id = 'cie10Btn'"), 'Falta botón cie10Btn');
assert(tool.includes('medical_information'), 'Falta icono CIE-10');
assert(tool.includes("import(moduleUrl('cie10LesionesData'))"), 'El catálogo no se carga de forma perezosa');
assert(!tool.includes('firebase'), 'El módulo CIE-10 no debe acceder a Firebase');
assert(consult.includes("overlay.dataset.mode = 'consultation'"), 'Falta marcar el modal como consulta');
assert(consult.includes('.cie10-actions, .cie10-detail-actions'), 'No se retiran las acciones del prototipo');
assert(consult.includes("document.getElementById('cie10Toast')?.remove()"), 'El modo consulta debe retirar el toast de copiado');
assert(consult.includes("event.key !== 'Enter'"), 'Falta neutralizar el atajo Enter de copiado');
assert(!consult.includes('navigator.clipboard'), 'El modo consulta no debe usar portapapeles');
assert(loader.includes('DecompressionStream'), 'Falta descompresión local del catálogo');
assert(css.includes('.cie10-dialog'), 'Faltan estilos del diálogo CIE-10');
assert(css.includes('var(--accent)'), 'El modal CIE-10 no hereda el tema del Censo');

const parts = Array.from({ length: 8 }, (_, i) => {
  const source = read(`modules/cie10DataPart${i + 1}.js`);
  const match = source.match(/^export default '([^']*)';\s*$/s);
  assert(match, `Parte ${i + 1} del catálogo inválida`);
  return match[1];
});
const encoded = parts.join('');
const decoded = JSON.parse(zlib.gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));
assert(Array.isArray(decoded), 'El catálogo reconstruido no es una lista');
assert(decoded.length === 3700, `Se esperaban 3700 códigos y se obtuvieron ${decoded.length}`);
assert(decoded.some(x => x.code === 'Y04'), 'Falta Y04');
assert(decoded.some(x => x.code === 'X64'), 'Falta X64');
assert(decoded.some(x => x.code === 'V299'), 'Falta V299');
assert(version.displayVersion === '2.53', 'La preview debe ser v2.53');
assert(version.build === '20260914-cie10-consulta', 'Build de CIE-10 consulta incorrecto');

console.log(`CIE-10 consulta smoke OK · ${decoded.length} códigos · ${version.displayVersion}`);
