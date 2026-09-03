// Catálogo inicial y validación compartida. Sin DOM, Firebase ni descargas.
export const SOUND_USERS = ['alfrojas', 'rodrrodriguez', 'yehernandez', 'iharo'];
export const MAX_SOUNDS = 8;
export const SOUND_ICONS = ['music_note', 'campaign', 'auto_awesome', 'favorite', 'pets', 'waving_hand', 'psychology', 'snooze', 'bug_report', 'smart_toy', 'record_voice_over', 'error', 'power_settings_new'];
const base = 'https://www.myinstants.com/media/sounds/';
const initial = {
  alfrojas: [
    ['Anime Ahh', 'music_note', 'anime-ahh.mp3'],
    ['Anime Ahhhh', 'campaign', 'anime-ahhhh.mp3'],
    ['Dad Snoring', 'snooze', 'my-dad-snoring.mp3'],
    ['Plankton', 'bug_report', 'plankton-augh.mp3'],
    ['Robot Processing', 'smart_toy', 'robot-processing.mp3'],
    ['Si o No', 'record_voice_over', 'si-o-no-pendejo.mp3'],
    ['XP Error', 'error', 'windows-xp-error.mp3'],
    ['XP Shutdown', 'power_settings_new', 'windows-xp-shutdown.mp3']
  ],
  rodrrodriguez: [
    ['FAHHHH', 'campaign', 'fahhhhhhhhhhhhhh.mp3'],
    ['Anime Wow', 'auto_awesome', 'anime-wow-sound-effect.mp3'],
    ['Spiderman meme song', 'music_note', 'spiderman-meme-song.mp3'],
    ['Romance', 'favorite', 'romanceeeeeeeeeeeeee.mp3'],
    ['M e o w', 'pets', 'm-e-o-w.mp3'],
    ['Hola muy buenas tardes', 'waving_hand', 'hola-muy-buenas-tardes.mp3'],
    ['Evil Morty', 'psychology', 'audio-cortado-2.mp3']
  ],
  yehernandez: [], iharo: []
};
const knownPages = {
  'fahhhhhhhhhhhhhh-3525': 'fahhhhhhhhhhhhhh.mp3',
  'anime-wow': 'anime-wow-sound-effect.mp3',
  'spiderman-meme-song-37638': 'spiderman-meme-song.mp3',
  'romanceeeeeeeeeeeeee-29042': 'romanceeeeeeeeeeeeee.mp3',
  'm-e-o-w-82698': 'm-e-o-w.mp3',
  'hola-muy-buenas-tardes-67281': 'hola-muy-buenas-tardes.mp3',
  'evil-morty-84511': 'audio-cortado-2.mp3'
};

export function defaultSounds(user) {
  if (!SOUND_USERS.includes(user)) throw new Error('Usuario no reconocido.');
  return initial[user].map(([name, icon, file], i) => ({ id: `${user}-default-${i + 1}`, name, icon, url: base + file }));
}

export function parseMyinstantsLink(value) {
  if (String(value).trim().length > 2048) throw new Error('El enlace es demasiado largo.');
  let url;
  try { url = new URL(String(value).trim()); } catch { throw new Error('Pega un enlace completo de Myinstants.'); }
  if (!['https:', 'http:'].includes(url.protocol) || !['www.myinstants.com', 'myinstants.com'].includes(url.hostname)
    || url.username || url.password || url.port) throw new Error('Usa un enlace de myinstants.com.');
  const path = url.pathname;
  if (/^\/media\/sounds\/[a-zA-Z0-9_.%-]+\.mp3$/.test(path)) {
    let filename;
    try { filename = decodeURIComponent(path.slice('/media/sounds/'.length)); } catch { throw new Error('El enlace MP3 no es válido.'); }
    if (/[\\/]/.test(filename) || filename.includes('..')) throw new Error('El enlace MP3 no es válido.');
    return { audioUrl: `https://www.myinstants.com${path}`, pageUrl: '' };
  }
  const page = path.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?instant\/([a-z0-9-]+)\/(?:embed\/)?$/i);
  if (!page) throw new Error('Usa la página de un sonido o su enlace «Descargar MP3».');
  return { audioUrl: knownPages[page[1]] ? base + knownPages[page[1]] : '', pageUrl: `https://www.myinstants.com/instant/${page[1]}/` };
}

export function validateSounds(sounds) {
  if (!Array.isArray(sounds) || sounds.length > MAX_SOUNDS) throw new Error('Solo se permiten ocho sonidos por usuario.');
  const ids = new Set();
  const urls = new Set();
  return sounds.map(item => {
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)
      || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 48
      || !SOUND_ICONS.includes(item.icon)) throw new Error('La configuración contiene un sonido inválido.');
    const { audioUrl } = parseMyinstantsLink(item.url);
    if (!audioUrl || audioUrl !== item.url) throw new Error('Guarda el enlace directo y completo al MP3.');
    if (ids.has(item.id) || urls.has(audioUrl)) throw new Error('Ese sonido ya está agregado a este usuario.');
    ids.add(item.id); urls.add(audioUrl);
    return { id: item.id, name: item.name.trim(), icon: item.icon, url: audioUrl };
  });
}

export function changeSounds(current, action) {
  const sounds = validateSounds(current);
  if (action.type === 'add') return validateSounds([...sounds, action.sound]);
  if (action.type === 'remove') {
    if (!sounds.some(s => s.id === action.id)) throw new Error('Ese sonido ya fue retirado. La lista se actualizará.');
    return sounds.filter(s => s.id !== action.id);
  }
  throw new Error('Operación desconocida.');
}
