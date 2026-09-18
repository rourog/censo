import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const app = read('modules/appModule.js');
const interaction = read('modules/interactionModule.js');
const page = read('cie10.html');
const controller = read('cie10.js');

assert(!app.includes('cie10LesionesModule'), 'El catálogo no debe volver a cargarse dentro del Censo.');
assert(interaction.includes("window.open('cie10.html', '_blank'"), 'El acceso CIE-10 debe abrir la página independiente.');
assert(page.includes('cie10.js'), 'La página independiente debe cargar su controlador.');
assert(controller.includes('cie10DataPart${index}.js'), 'La página debe cargar los ocho fragmentos del catálogo.');

const parts = Array.from({ length: 8 }, (_, i) => {
  const source = read(`modules/cie10DataPart${i + 1}.js`);
  const match = source.match(/^export default '([^']*)';\s*$/s);
  assert(match, `Parte ${i + 1} del catálogo inválida`);
  return match[1];
});

const decoded = JSON.parse(zlib.gunzipSync(Buffer.from(parts.join(''), 'base64')).toString('utf8'));
assert(Array.isArray(decoded), 'El catálogo reconstruido no es una lista.');
assert(decoded.length === 3700, `Se esperaban 3700 códigos y se obtuvieron ${decoded.length}.`);
for (const code of ['Y04', 'X64', 'V299']) assert(decoded.some(item => item.code === code), `Falta ${code}.`);

console.log(`CIE-10 catálogo smoke OK · ${decoded.length} códigos · carga independiente.`);
