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
const { capitalizarNombreSubrogada, formatoOracionSubrogada } = await import('../modules/subrogadaModule.js');
assert.equal(capitalizarNombreSubrogada('  MARÍA   JOSÉ DE LA PEÑA  '), 'María José de la Peña');
assert.equal(capitalizarNombreSubrogada("ANA-MARÍA O'NEILL"), "Ana-María O'Neill");
assert.equal(formatoOracionSubrogada('DM2 DESCONTROLADA. ERC ESTADIO IV\nDOLOR ABDOMINAL EN ESTUDIO'), 'DM2 descontrolada. ERC estadio IV\nDolor abdominal en estudio');
assert.equal(formatoOracionSubrogada('COVID-19. SPO2 89%. HBA1C 8.5'), 'COVID-19. SpO2 89%. HbA1c 8.5');
assert.equal(formatoOracionSubrogada(''), '');
assert.ok(html.includes('bottom:0') && html.includes('footer-space{height:40mm'));
console.log('OK: nombres con partículas/acentos, oraciones, siglas, decimales y espacio reservado para firmas.');
