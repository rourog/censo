import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');

const index = read('index.html');
const main = read('main.js');
const app = read('modules/appModule.js');
const soundboard = read('modules/soundboardModule.js');
const version = JSON.parse(read('version.json'));

assert.ok(version.build && typeof version.build === 'string', 'version.json debe declarar build.');
assert.ok(version.displayVersion && typeof version.displayVersion === 'string', 'version.json debe declarar displayVersion.');

assert.match(index, /version\.json\?ts=\$\{Date\.now\(\)\}/u, 'El manifiesto de versión debe consultarse con URL única.');
assert.match(index, /cache:\s*'no-store'/u, 'version.json debe ignorar caché HTTP.');
assert.match(index, /style\.css\?v=\$\{encodeURIComponent\(build\)\}/u, 'style.css debe recibir el build en runtime.');
assert.match(index, /import\(`\.\/main\.js\?v=\$\{encodeURIComponent\(build\)\}`\)/u, 'main.js debe cargarse con el build actual.');
assert.doesNotMatch(index, /main\.js\?v=[A-Za-z0-9_-]+/u, 'index.html no debe contener una versión fija de main.js.');
assert.doesNotMatch(index, /style\.css\?v=[A-Za-z0-9_-]+/u, 'index.html no debe contener una versión fija de style.css.');

assert.match(main, /window\.CensoBuild\?\.version/u, 'main.js debe usar la versión inyectada por bootstrap.');
assert.match(main, /MutationObserver/u, 'main.js debe versionar hojas locales añadidas dinámicamente.');
assert.match(main, /searchParams\.set\('v', BUILD\)/u, 'Las hojas CSS dinámicas deben recibir BUILD.');
assert.doesNotMatch(main, /const BUILD = ['"][^'"]+['"]/u, 'main.js no debe volver a fijar BUILD manualmente.');

assert.match(app, /url\.searchParams\.set\('v', BUILD\)/u, 'appModule debe versionar todos los módulos locales.');
assert.match(app, /import\(moduleUrl\('firebaseModule'\)\)/u);
assert.match(app, /import\(moduleUrl\('soundCatalog'\)\)/u);
assert.doesNotMatch(app, /\.js\?v=[A-Za-z0-9_-]+/u, 'appModule no debe contener versiones fijas.');

assert.doesNotMatch(soundboard, /from ['"]\.\/soundCatalog\.js\?v=/u, 'soundboard no debe saltarse el versionado central.');
assert.match(soundboard, /app\.soundCatalog/u, 'soundboard debe recibir el catálogo ya versionado desde appModule.');

console.log(`OK: versionado central y anti-caché verificados (${version.build}).`);
