import assert from 'node:assert/strict';
import {launchSeasonalConfetti,registerSeasonalConfetti} from '../modules/seasonalTheme.js';
const prefs=new Map([['censo-season','halloween']]);
globalThis.localStorage={getItem:key=>prefs.get(key)};globalThis.document={hidden:false};
let effect;for(const kind of ['confetti','fireworks','balloons','bats'])registerSeasonalConfetti(kind,()=>effect=kind);
launchSeasonalConfetti();assert.equal(effect,'bats');
prefs.set('censo-celebration-mode','all');
const random=Math.random;
for(const [n,expected] of [[0,'confetti'],[.3,'fireworks'],[.6,'balloons'],[.99,'bats']]){Math.random=()=>n;launchSeasonalConfetti();assert.equal(effect,expected);}
prefs.set('censo-season','off');Math.random=()=>.99;launchSeasonalConfetti();assert.equal(effect,'balloons');
prefs.set('censo-celebration-mode','seasonal');prefs.set('censo-celebration','fireworks');launchSeasonalConfetti();assert.equal(effect,'fireworks');Math.random=random;
console.log('OK: all celebrations include seasonal effect only during active theme; seasonal mode preserves normal preference.');
