import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function walk(dir) {
  return readdirSync(dir)
    .filter((name) => name !== '.git' && name !== 'node_modules')
    .flatMap((name) => {
      const path = resolve(dir, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

function projectPath(path) {
  return relative(root, path).replaceAll('\\', '/');
}

function localTarget(importer, specifier) {
  if (!specifier.startsWith('.')) return null;
  const cleanSpecifier = specifier.split(/[?#]/, 1)[0];
  return resolve(dirname(importer), cleanSpecifier);
}

const requiredFiles = [
  'index.html',
  'style.css',
  'main.js',
  'modules/appModule.js',
  'modules/firebaseModule.js',
  'modules/authModule.js',
  'modules/patientModule.js',
  'modules/modalModule.js'
];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) errors.push(`Falta el archivo crítico: ${file}`);
}

const files = walk(root);
const jsFiles = files.filter((file) => extname(file) === '.js' || extname(file) === '.mjs');

for (const file of jsFiles) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (syntax.status !== 0) {
    errors.push(`Error de sintaxis en ${projectPath(file)}:\n${syntax.stderr.trim()}`);
  }

  const source = readFileSync(file, 'utf8');
  const importPattern = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g;

  for (const match of source.matchAll(importPattern)) {
    const target = localTarget(file, match[1]);
    if (target && !existsSync(target)) {
      errors.push(`${projectPath(file)} importa un archivo inexistente: ${match[1]}`);
    }
  }
}

for (const htmlFile of files.filter((file) => extname(file) === '.html')) {
  const html = readFileSync(htmlFile, 'utf8');
  const assetPattern = /<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(assetPattern)) {
    const ref = match[1];
    if (/^(?:https?:|data:|#)/i.test(ref)) continue;
    const cleanRef = ref.split(/[?#]/, 1)[0];
    const target = resolve(dirname(htmlFile), cleanRef);
    if (!existsSync(target)) {
      errors.push(`${projectPath(htmlFile)} referencia un recurso inexistente: ${ref}`);
    }
  }
}

const mainSource = readFileSync(resolve(root, 'main.js'), 'utf8');
const appSource = readFileSync(resolve(root, 'modules/appModule.js'), 'utf8');
const mainBuild = mainSource.match(/const BUILD = ['"]([^'"]+)['"]/u)?.[1];
const appBuild = appSource.match(/const BUILD = ['"]([^'"]+)['"]/u)?.[1];

if (!mainBuild || !appBuild) {
  errors.push('main.js y appModule.js deben declarar su identificador BUILD.');
} else if (mainBuild !== appBuild) {
  errors.push(`BUILD desalineado: main.js=${mainBuild}, appModule.js=${appBuild}`);
}

if (errors.length > 0) {
  console.error(`\nFallaron ${errors.length} verificaciones:\n`);
  errors.forEach((error, index) => console.error(`${index + 1}. ${error}\n`));
  process.exit(1);
}

console.log(`OK: ${jsFiles.length} archivos JavaScript y referencias locales verificadas.`);
