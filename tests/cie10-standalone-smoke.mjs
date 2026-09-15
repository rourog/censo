import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const app = read('modules/appModule.js');
const interaction = read('modules/interactionModule.js');
const html = read('cie10.html');
const js = read('cie10.js');
const css = read('cie10.css');
const version = JSON.parse(read('version.json'));

assert(!app.includes('cie10LesionesModule'), 'El Censo todavía importa el modal CIE-10');
assert(!app.includes('cie10ConsultOnlyModule'), 'El Censo todavía importa el parche consult-only');
assert(!app.includes('initCie10Ui'), 'El Censo todavía inicializa CIE-10 embebido');
assert(interaction.includes("button.id = 'cie10PageBtn'"), 'Falta botón CIE-10 junto a Historial');
assert(interaction.includes("historyBtn.insertAdjacentElement('afterend', button)"), 'CIE-10 no se coloca después de Historial');
assert(interaction.includes("window.open('cie10.html', '_blank'"), 'CIE-10 no abre página independiente');
assert(html.includes('cie10.js'), 'Falta script de la página CIE-10');
assert(html.includes('Solo consulta'), 'La página no declara su modo de consulta');
assert(!html.toLowerCase().includes('firebase'), 'La página CIE-10 no debe usar Firebase');
assert(!html.includes('COPIAR'), 'La página CIE-10 no debe ofrecer copiar');
assert(!html.includes('INSERTAR'), 'La página CIE-10 no debe ofrecer insertar');
assert(js.includes('cie10DataPart${index}.js'), 'La página no carga los fragmentos del catálogo');
assert(js.includes('parsed.length!==3700'), 'Falta validación exacta de 3,700 códigos');
assert(js.includes("slice(0,100)"), 'La búsqueda debe limitar el render de resultados');
assert(css.includes('[hidden]{display:none!important}'), 'Falta respeto explícito del atributo hidden');
assert(version.displayVersion === '2.57', 'La preview debe ser v2.57');
assert(version.build === '20260914-cie10-standalone', 'Build standalone incorrecto');

console.log('CIE-10 standalone smoke OK · Censo desacoplado · v2.57');
