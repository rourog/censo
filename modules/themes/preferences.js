/* Seasonal Engine 2.0 - local, non-clinical preferences only. */
const ENABLED_KEY='censo-seasonal-decorations';
const PREVIEW_KEY='censo-beta-season-preview';

export function isDecorationEnabled(id) {
  if (localStorage.getItem(ENABLED_KEY)==='off') return false;
  // Migrate the original November switch without deleting the preference.
  if (id==='november' && localStorage.getItem('censo-november-theme')==='off') return false;
  return true;
}

export function setDecorationEnabled(enabled) {
  localStorage.setItem(ENABLED_KEY,enabled?'on':'off');
  // Keep existing November preference and legacy clients consistent.
  localStorage.setItem('censo-november-theme',enabled?'on':'off');
}

export function getPreviewSeason() {
  return sessionStorage.getItem(PREVIEW_KEY) || 'auto';
}

export function setPreviewSeason(id='auto') {
  sessionStorage.setItem(PREVIEW_KEY,id);
}
