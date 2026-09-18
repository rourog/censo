import fs from 'node:fs';
import assert from 'node:assert/strict';

const theme = fs.readFileSync(new URL('../modules/themeModule.js', import.meta.url), 'utf8');
const effects = fs.readFileSync(new URL('../modules/themeEffectsV3.css', import.meta.url), 'utf8');
const version = JSON.parse(fs.readFileSync(new URL('../version.json', import.meta.url), 'utf8'));

for (const id of [
  'accent-gold',
  'accent-silver',
  'accent-bronze',
  'accent-copper',
  'accent-pure-red',
  'accent-scarlet'
]) {
  assert.ok(theme.includes(id), `Falta ${id} en el catálogo de temas`);
  assert.ok(effects.includes(`body.${id}`), `Falta ${id} en CSS v3`);
}

for (const effect of [
  'effect-waves',
  'effect-aurora',
  'effect-grid',
  'effect-radar',
  'effect-none'
]) {
  assert.ok(theme.includes(effect), `Falta ${effect} en el selector`);
  assert.ok(effects.includes(effect), `Falta CSS para ${effect}`);
}

assert.ok(theme.includes("localStorage.setItem('censo-effect'"), 'La animación debe persistirse localmente');
assert.ok(theme.includes("value === 'accent-slate'"), 'Debe migrarse el ID antiguo de Plata');
assert.ok(theme.includes("themeEffectsV3.css"), 'Theme Engine debe cargar el CSS v3');
assert.ok(effects.includes('@media (prefers-reduced-motion: reduce)'), 'Los efectos deben respetar reduced motion');
assert.equal(version.displayVersion, '2.66');
assert.match(version.build, /health-icons-v2\.66/u);

console.log('Theme v3 effects smoke test: OK');
