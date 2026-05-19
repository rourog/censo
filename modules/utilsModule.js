/*
  MÓDULO: utilsModule.js

  RESPONSABILIDAD:
  - Helpers generales puros o casi puros.
  - No contiene lógica clínica ni Firebase.
*/

export function vibrar(patron) { if (navigator.vibrate) { navigator.vibrate(patron); } }

export function escapeHtml(texto) { return String(texto || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

export function normalizar(texto) { return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
