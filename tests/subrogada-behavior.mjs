import assert from 'node:assert/strict';
import { construirSolicitudSubrogada, separarEdadSubrogada, justificacionSubrogada, SERVICIOS_SUBROGADOS } from '../modules/subrogadaModule.js';
for (const [raw, age, unit] of [[0,'0','años'],['56','56','años'],['8 MESES','8','meses'],['15 DÍAS','15','días'],['1 año 6 meses','1 año 6 meses',''],['','', '']]) {
  assert.deepEqual(separarEdadSubrogada(raw), { age, unit });
}
const data = { patient:'<img src=x onerror=alert(1)>', age:'0', unit:'días', diagnosis:'A & B\nC', service:'Tomografía de cráneo simple', details:'<script>x</script>', doctor:'Dr. Prueba', date:'07/10/2026', reason:'Motivo', prognosis:'Reservado' };
const html = construirSolicitudSubrogada(data);
assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
assert.ok(html.includes('A &amp; B<br>C'));
assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt;'));
assert.ok(html.includes('Edad: 0 días'));
assert.ok(html.includes('chihuahua.png') && html.includes('ichisal.png'));
assert.ok(html.includes('Arial Narrow') && html.includes('size:letter'));
assert.equal(SERVICIOS_SUBROGADOS.Ambulancia.length, 2);
assert.ok(SERVICIOS_SUBROGADOS['Resonancia magnética'].includes('Otro'));
assert.notEqual(justificacionSubrogada('Ambulancia'), justificacionSubrogada('Tomografía'));
console.log('OK: edades pediátricas, texto libre, escape HTML, logos, impresión carta y catálogos subrogados.');
