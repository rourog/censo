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

const ICONO_INGRESO = "INGRESO";
const ICONO_VALORACION = "VALORACIÓN";

export const destinoIconos = {
  observacion: "👀",
  altaDomicilio: "🏠",
  altaVoluntaria: "✍️",
  defuncion: "✝️",
  medicinaInterna: "🩺",
  cirugiaGeneral: "🔪",
  cirugiaPlastica: "✂️",
  ginecologia: "🤰",
  cardiologia: "❤️",
  pediatria: "👶",
  traumatologia: "🦴",
  psiquiatria: "🧠",
  psicologia: "💬",
  tococirugia: "🤰",
  urologia: "💧",
  oftalmologia: "👁️",
  gastroenterologia: "🍎",
  terapiaIntensiva: "🚨"
};

function normalizarEspecialidad(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function getIconoEspecialidad(especialidad) {
  const key = normalizarEspecialidad(especialidad);

  if (key.includes('MEDICINA INTERNA')) return destinoIconos.medicinaInterna;
  if (key.includes('CIRUGIA PLASTICA')) return destinoIconos.cirugiaPlastica;
  if (key.includes('CIRUGIA GENERAL')) return destinoIconos.cirugiaGeneral;
  if (key.includes('GINECOLOGIA')) return destinoIconos.ginecologia;
  if (key.includes('CARDIOLOGIA')) return destinoIconos.cardiologia;
  if (key.includes('PEDIATRIA')) return destinoIconos.pediatria;
  if (key.includes('TRAUMATOLOGIA')) return destinoIconos.traumatologia;
  if (key.includes('PSIQUIATRIA')) return destinoIconos.psiquiatria;
  if (key.includes('PSICOLOGIA')) return destinoIconos.psicologia;
  if (key.includes('TOCOCIRUGIA')) return destinoIconos.tococirugia;
  if (key.includes('UROLOGIA')) return destinoIconos.urologia;
  if (key.includes('OFTALMOLOGIA')) return destinoIconos.oftalmologia;
  if (key.includes('GASTROENTEROLOGIA')) return destinoIconos.gastroenterologia;
  if (key.includes('TERAPIA INTENSIVA')) return destinoIconos.terapiaIntensiva;

  return '';
}

function destinoIngreso(emoji, especialidad) {
  return `${ICONO_INGRESO} ${emoji} ${especialidad}`;
}

function destinoValoracion(emoji, especialidad) {
  return `${ICONO_VALORACION} ${emoji} ${especialidad}`;
}

export const destinosGlobal = [
  `${destinoIconos.observacion} Observación`,
  `${destinoIconos.altaDomicilio} Alta a domicilio`,
  `${destinoIconos.altaVoluntaria} Alta voluntaria`,
  `${destinoIconos.defuncion} Defunción`,

  destinoIngreso(destinoIconos.medicinaInterna, "Medicina Interna"),
  destinoValoracion(destinoIconos.medicinaInterna, "Medicina Interna"),

  destinoIngreso(destinoIconos.cirugiaGeneral, "Cirugía General"),
  destinoValoracion(destinoIconos.cirugiaGeneral, "Cirugía General"),

  destinoIngreso(destinoIconos.cirugiaPlastica, "Cirugía Plástica"),
  destinoValoracion(destinoIconos.cirugiaPlastica, "Cirugía Plástica"),

  destinoIngreso(destinoIconos.ginecologia, "Ginecología"),
  destinoValoracion(destinoIconos.ginecologia, "Ginecología"),

  destinoIngreso(destinoIconos.cardiologia, "Cardiología"),
  destinoValoracion(destinoIconos.cardiologia, "Cardiología"),

  destinoIngreso(destinoIconos.pediatria, "Pediatría"),
  destinoValoracion(destinoIconos.pediatria, "Pediatría"),

  destinoIngreso(destinoIconos.traumatologia, "Traumatología y Ortopedia"),
  destinoValoracion(destinoIconos.traumatologia, "Traumatología y Ortopedia"),

  destinoIngreso(destinoIconos.psiquiatria, "Psiquiatría"),
  destinoValoracion(destinoIconos.psiquiatria, "Psiquiatría"),

  destinoValoracion(destinoIconos.psicologia, "Psicología"),
  destinoIngreso(destinoIconos.tococirugia, "Tococirugía"),

  destinoIngreso(destinoIconos.urologia, "Urología"),
  destinoValoracion(destinoIconos.urologia, "Urología"),

  destinoIngreso(destinoIconos.oftalmologia, "Oftalmología"),
  destinoValoracion(destinoIconos.oftalmologia, "Oftalmología"),

  destinoIngreso(destinoIconos.gastroenterologia, "Gastroenterología"),
  destinoValoracion(destinoIconos.gastroenterologia, "Gastroenterología"),

  destinoIngreso(destinoIconos.terapiaIntensiva, "Terapia Intensiva"),
  destinoValoracion(destinoIconos.terapiaIntensiva, "Terapia Intensiva")
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
  { area: "EXTRAS", cama: "EXTRA 1" }, { area: "EXTRAS", cama: "EXTRA 2" }, { area: "EXTRAS", cama: "EXTRA 3" }, { area: "EXTRAS", cama: "EXTRA 4" }, { area: "EXTRAS", cama: "EXTRA 5" },
  { area: "EXTRAS", cama: "PEDILUVIO" },
  { area: "EXTRAS", cama: "EFE'S", descripcion: "ENFERMEDADES FEBRILES EXANTEMÁTICAS" }
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

export function parseDestinoClinico(texto) {
  if (!texto) return null;
  const raw = String(texto).trim();
  const partes = raw.split(/\s+/).filter(Boolean);
  if (partes.length < 2) return null;

  const accionRaw = partes[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  let tipo = null;
  if (accionRaw === 'INGRESO' || partes[0] === '⬆️') tipo = 'ingreso';
  if (accionRaw === 'VALORACION' || accionRaw === 'VALORACIÓN' || partes[0] === '🔎') tipo = 'valoracion';
  if (!tipo) return null;

  const emojiOriginal = partes[1] || '';
  const especialidad = partes.slice(2).join(' ').trim();
  const emojiActual = getIconoEspecialidad(especialidad) || emojiOriginal;

  return { tipo, emoji: emojiActual, especialidad, raw, emojiOriginal };
}

export function getDestinoMaterialIcon(texto) {
  const parsed = parseDestinoClinico(texto);
  if (!parsed) return '';
  return parsed.tipo === 'ingreso' ? 'login' : 'search';
}

export function getDestinoActionLabel(texto) {
  const parsed = parseDestinoClinico(texto);
  if (!parsed) return '';
  return parsed.tipo === 'ingreso' ? 'Ingreso' : 'Valoración';
}

export function getDestinoTextLabel(texto) {
  if (!texto) return '';

  const parsed = parseDestinoClinico(texto);
  if (parsed) {
    const accion = parsed.tipo === 'ingreso' ? 'INGRESO A' : 'VALORACIÓN POR';
    return `${accion} ${parsed.especialidad || ''}`.replace(/\s+/g, ' ').trim().toLocaleUpperCase('es-MX');
  }

  // Los destinos simples y los registros heredados pueden comenzar con emoji.
  // La etiqueta de selección y el tooltip deben ser texto clínico, nunca pictogramas.
  return String(texto)
    .trim()
    .replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('es-MX');
}

export function getEmojiOnly(texto) {
  if (!texto) return '';
  const parsed = parseDestinoClinico(texto);
  if (parsed) return parsed.emoji || '';

  const t = String(texto).trim();
  const key = normalizarEspecialidad(t);

  // Compatibilidad con registros antiguos que guardaron sólo el texto.
  if (key.includes('OBSERVACION')) return destinoIconos.observacion;
  if (key.includes('ALTA A DOMICILIO')) return destinoIconos.altaDomicilio;
  if (key.includes('ALTA VOLUNTARIA')) return destinoIconos.altaVoluntaria;
  if (key.includes('DEFUNCION')) return destinoIconos.defuncion;

  const firstSpace = t.indexOf(' ');
  const firstToken = firstSpace > -1 ? t.substring(0, firstSpace) : t;
  if (/\p{Extended_Pictographic}/u.test(firstToken)) return firstToken;

  // Un destino desconocido no debe filtrar texto a la cabecera móvil.
  return '📍';
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
