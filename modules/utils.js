// constants.js
// Catálogos y valores fijos del censo. Aquí se agregan camas, destinos y paletas.

export const destinosGlobal = [
  "🟡 Observación", "🟢 Alta a domicilio", "⭕ Alta Voluntaria", "⚫ Defunción",
  "🏥 Ingreso a Medicina Interna", "🩺 Interconsulta a Medicina Interna",
  "🔪 Ingreso a Cirugía General", "🧵 Interconsulta a Cirugía General",
  "✂️ Ingreso a Cirugía Plástica", "💄 Interconsulta a Cirugía Plástica",
  "🤰 Ingreso a Ginecología", "🌸 Interconsulta a Ginecología",
  "❤️ Ingreso a Cardiología", "💓 Interconsulta a Cardiología",
  "👶 Ingreso a Pediatría", "🧸 Interconsulta a Pediatría",
  "🦴 Ingreso a Traumatología y Ortopedia", "📋 Interconsulta a Traumatología y Ortopedia",
  "🧠 Ingreso a Psiquiatría", "💭 Interconsulta a Psiquiatría",
  "🗣️ Interconsulta a Psicología", "🤱 Ingreso a Tococirugía",
  "💧 Interconsulta a Urologia", "🧪 Ingreso a Urologia",
  "👓 Interconsulta a Oftalmologia", "👁️ Ingreso a Oftalmologia",
  "🍎 Ingreso a Gastroenterologia"
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
