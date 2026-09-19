import assert from 'node:assert/strict';
import fs from 'node:fs';

const theme = fs.readFileSync(new URL('../modules/themeModule.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../modules/themePaletteV2.css', import.meta.url), 'utf8');
const version = JSON.parse(fs.readFileSync(new URL('../version.json', import.meta.url), 'utf8'));

assert.match(theme, /THEME ENGINE V3/i);
assert.match(theme, /base-ocean/);
assert.match(theme, /base-teal-dark/);
assert.match(theme, /base-burgundy/);
assert.match(theme, /base-ice/);
assert.match(theme, /base-sage/);
assert.match(theme, /base-peach/);
assert.match(theme, /accent-sky/);
assert.match(theme, /accent-fuchsia/);
assert.match(theme, /accent-violet/);
assert.match(theme, /accent-slate/);
assert.match(theme, /RESTABLECER APARIENCIA/);
assert.match(theme, /themeSelectionLabel/);
assert.match(theme, /aria-pressed/);
assert.match(theme, /localStorage\.setItem\('censo-base'/);
assert.match(theme, /localStorage\.setItem\('censo-accent'/);

assert.match(css, /--accent-on-light/);
assert.match(css, /--accent-on-dark/);
assert.match(css, /--on-accent/);
assert.match(css, /color-mix\(/);
assert.match(css, /--danger:/);
assert.match(css, /--success:/);
assert.match(css, /theme-picker-grid/);
assert.match(css, /theme-preview/);

assert.match(version.displayVersion, /^\d+\.\d+$/u);
assert.ok(version.build.endsWith(`v${version.displayVersion}`), 'El build debe corresponder con displayVersion.');

console.log('Theme Engine v2 smoke test: OK');
