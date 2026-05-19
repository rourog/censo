// utils.js
// Funciones puras y helpers generales. No deberían depender de Firebase ni del render.

export function limpiarNombreCama(camaStr) {
  if (!camaStr) return '';
  let c = String(camaStr).toUpperCase().replace('🔴', '').replace('🟢', '').replace('🟡', '').replace('🔵', '').replace('🟠', '').trim();
  if (c.startsWith('OBSERVACION SILLA')) return c.replace('OBSERVACION SILLA', 'SILLA').trim();
  if (c.startsWith('OBSERVACION')) return c.replace('OBSERVACION', 'CAMA').trim();
  if (c.startsWith('TRAUMA SILLA')) return c.replace('TRAUMA SILLA', 'SILLA').trim();
  if (c.startsWith('TRAUMA') && !c.includes('MENOR')) return c.replace('TRAUMA', 'CAMA').trim();
  if (c.startsWith('PEDIATRIA CUNA')) return c.replace('PEDIATRIA CUNA', 'CUNA').trim();
  if (c.startsWith('PEDIATRIA SILLA')) return c.replace('PEDIATRIA SILLA', 'SILLA').trim();
  return c;
}

export function getEmojiOnly(texto) {
  if (!texto) return '';
  const t = String(texto).trim();
  const firstSpace = t.indexOf(' ');
  return firstSpace > -1 ? t.substring(0, firstSpace) : t.substring(0, 2);
}

export function vibrar(patron) { if (navigator.vibrate) { navigator.vibrate(patron); } }

export function escapeHtml(texto) { return String(texto || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

export function agruparPorArea(lista) {
  const grupos = {};
  lista.forEach(p => { 
    const areaRaw = p.area || 'SIN ÁREA ASIGNADA';
    const area = String(areaRaw).trim(); 
    if (!grupos[area]) grupos[area] = []; 
    grupos[area].push(p); 
  }); 
  return grupos;
}

export function normalizar(texto) { return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
