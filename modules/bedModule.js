/*
  MÓDULO: bedModule.js

  RESPONSABILIDAD:
  - Catálogos clínicos fijos: destinos, camas maestras, visuales de área y paleta de chips.
  - Normalizar nombres de camas.
  - Agrupar listas por área.
  - Calcular camas libres a partir de pacientes ocupantes.

  NO DEBE:
  - Tocar Firebase.
  - Tocar el DOM.
  - Abrir modales.
*/

const ICONO_INGRESO = "⬆️";
const ICONO_VALORACION = "🔎";

function destinoIngreso(emoji, especialidad) {
  return `${ICONO_INGRESO} ${emoji} ${especialidad}`;
}

function destinoValoracion(emoji, especialidad) {
  return `${ICONO_VALORACION} ${emoji} ${especialidad}`;
}

export const destinosGlobal = [
  "🟡 Observación",
  "🟢 Alta a domicilio",
  "⭕ Alta Voluntaria",
  "⚫ Defunción",

  destinoIngreso("🏥", "Medicina Interna"),
  destinoValoracion("🏥", "Medicina Interna"),

  destinoIngreso("🔪", "Cirugía General"),
  destinoValoracion("🔪", "Cirugía General"),

  destinoIngreso("✂️", "Cirugía Plástica"),
  destinoValoracion("✂️", "Cirugía Plástica"),

  destinoIngreso("🤰", "Ginecología"),
  destinoValoracion("🤰", "Ginecología"),

  destinoIngreso("❤️", "Cardiología"),
  destinoValoracion("❤️", "Cardiología"),

  destinoIngreso("🫁", "Terapia Intensiva"),
  destinoValoracion("🫁", "Terapia Intensiva"),

  destinoIngreso("👶", "Pediatría"),
  destinoValoracion("👶", "Pediatría"),

  destinoIngreso("🦴", "Traumatología y Ortopedia"),
  destinoValoracion("🦴", "Traumatología y Ortopedia"),

  destinoIngreso("🧠", "Psiquiatría"),
  destinoValoracion("🧠", "Psiquiatría"),

  destinoValoracion("🗣️", "Psicología"),
  destinoIngreso("🤱", "Tococirugía"),

  destinoIngreso("💧", "Urología"),
  destinoValoracion("💧", "Urología"),

  destinoIngreso("👁️", "Oftalmología"),
  destinoValoracion("👁️", "Oftalmología"),

  destinoIngreso("🍎", "Gastroenterología"),
  destinoValoracion("🍎", "Gastroenterología")
];

export const masterCamas = [
  { area: "SALA DE CHOQUE", cama: "CHOQUE 1" }, { area: "SALA DE CHOQUE", cama: "CHOQUE 2" },
  { area: "OBSERVACIÓN", cama: "CAMA 1" }, { area: "OBSERVACIÓN", cama: "CAMA 1-2" }, { area: "OBSERVACIÓN", cama: "SILLA 1" },
  { area: "OBSERVACIÓN", cama: "CAMA 2" }, { area: "OBSERVACIÓN", cama: "CAMA 2-2" }, { area: "OBSERVACIÓN", cama: "SILLA 2" },
  { area: "OBSERVACIÓN", cama: "CAMA 3" }, { area: "OBSERVACIÓN", cama: "CAMA 3-2" }, { area: "OBSERVACIÓN", cama: "SILLA 3" },
  { area: "OBSERVACIÓN", cama: "CAMA 4" }, { area: "OBSERVACIÓN", cama: "CAMA 4-2" }, { area: "OBSERVACIÓN", cama: "SILLA 4" },
  { area: "OBSERVACIÓN", cama: "CAMA 5" }, { area: "OBSERVACIÓN", cama: "CAMA 5-2" }, { area: "OBSERVACIÓN", cama: "SILLA 5" },
  { area: "TRAUMA MENOR", cama: "CAMA 1" }, { area: "TRAUMA MENOR", cama: "CAMA 2" }, { area: "TRAUMA MENOR", cama: "CAMA 3" }, { area: "TRAUMA MENOR", cama: "CAMA 4" },
  { area: "TRAUMA MENOR", cama: "SILLA 1" }, { area: "TRAUMA MENOR", cama: "SILLA 2" }, { area: "TRAUMA MENOR", cama: "SILLA 3" },
  { area: "PEDIATRÍA", cama: "CUNA 1" }, { area: "PEDIATRÍA", cama: "CUNA 2" }, { area: "PEDIATRÍA", cama: "CUNA 3" }, 
  { area: "PEDIATRÍA", cama: "SILLA 1" }, { area: "PEDIATRÍA", cama: "SILLA 2" },
  { area: "EXTRAS", cama: "EXTRA 1" }, { area: "EXTRAS", cama: "EXTRA 2" }, { area: "EXTRAS", cama: "EXTRA 3" }, { area: "EXTRAS", cama: "EXTRA 4" }, { area: "EXTRAS", cama: "EXTRA 5" }
];

export const areaVisuals = {
  'SALA DE CHOQUE': { emoji: '❤️', class: 'icon-heartbeat' },
  'OBSERVACION': { emoji: '👀', class: 'icon-look' },
  'OBSERVACIÓN': { emoji: '👀', class: 'icon-look' },
  'TRAUMA MENOR': { emoji: '🦴', class: 'icon-spin' },
  'PEDIATRIA': { emoji: '🧸', class: 'icon-wiggle' },
  'PEDIATRÍA': { emoji: '🧸', class: 'icon-wiggle' },
  'EXTRAS': { emoji: '✨', class: 'icon-twinkle' },
  'SIN ÁREA ASIGNADA': { emoji: '🏥', class: '' }
};

export const chipPalette = [
  { bg: '#ffe4e6', text: '#9f1239' }, { bg: '#dcfce7', text: '#166534' }, 
  { bg: '#fef9c3', text: '#854d0e' }, { bg: '#dbeafe', text: '#1e40af' }, 
  { bg: '#ffedd5', text: '#9a3412' }, { bg: '#f3e8ff', text: '#6b21a8' }, { bg: '#e0f7fa', text: '#006064' }  
];


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
  const partes = t.split(/\s+/).filter(Boolean);

  // Destinos nuevos: "⬆️ 🫁 Terapia Intensiva" / "🔎 🫁 Terapia Intensiva".
  // En vista compacta mostramos acción + especialidad, no solo la flecha.
  if ((partes[0] === '⬆️' || partes[0] === '🔎') && partes[1]) {
    return `${partes[0]} ${partes[1]}`;
  }

  const firstSpace = t.indexOf(' ');
  return firstSpace > -1 ? t.substring(0, firstSpace) : t.substring(0, 2);
}

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

export function calcularCamasLibres(masterCamasList, pacientes) {
  const occupiedBeds = [];

  (pacientes || []).forEach((p) => {
    if (!p.cama) return;
    const areaName = String(p.area || '').toUpperCase().trim();
    const camaName = limpiarNombreCama(p.cama).toUpperCase().trim();
    occupiedBeds.push(`${areaName}|${camaName}`);
  });

  return (masterCamasList || [])
    .filter(c => {
      const areaName = c.area.toUpperCase().trim();
      const camaName = c.cama.toUpperCase().trim();
      return !occupiedBeds.includes(`${areaName}|${camaName}`);
    })
    .map((c, i) => ({ ...c, fila: 'cama_libre_' + i }));
}
