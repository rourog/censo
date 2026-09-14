import fs from 'node:fs';

const theme = fs.readFileSync(new URL('../modules/themeModule.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../modules/themeEffectsV4.css', import.meta.url), 'utf8');
const version = JSON.parse(fs.readFileSync(new URL('../version.json', import.meta.url), 'utf8'));

const expectedEffects = [
  'effect-waves',
  'effect-aurora',
  'effect-grid',
  'effect-radar',
  'effect-particles',
  'effect-pulse',
  'effect-scan',
  'effect-nebula',
  'effect-none'
];

for (const effect of expectedEffects) {
  if (!theme.includes(effect)) throw new Error(`Falta ${effect} en themeModule.js`);
}

if (!theme.includes("themeEffectsV4.css")) throw new Error('themeModule.js no carga themeEffectsV4.css');
if (!theme.includes("localStorage.setItem('censo-effect'")) throw new Error('No se persiste la animación');
if (!css.includes('max-width: 920px !important')) throw new Error('El modal no tiene ancho de escritorio ampliado');
if (!css.includes('position: sticky')) throw new Error('La cabecera del modal no permanece fija');
if (!css.includes('#baseColorPicker.theme-picker-section')) throw new Error('No existe layout paralelo de fondos');
if (!css.includes('body.effect-particles')) throw new Error('Falta efecto Partículas');
if (!css.includes('body.effect-pulse')) throw new Error('Falta efecto Pulso');
if (!css.includes('body.effect-scan')) throw new Error('Falta efecto Escáner');
if (!css.includes('body.effect-nebula')) throw new Error('Falta efecto Nebulosa');
if (!css.includes('prefers-reduced-motion')) throw new Error('Los efectos no respetan reducir movimiento');
if (version.displayVersion !== '2.51') throw new Error('La preview debe indicar versión 2.51');

console.log('theme v3.1 modal/effects smoke: OK');
