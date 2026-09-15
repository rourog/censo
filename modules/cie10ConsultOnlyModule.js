/*
  MÓDULO: cie10ConsultOnlyModule.js

  RESPONSABILIDAD:
  - Mantener CIE-10 como una herramienta estrictamente de consulta.
  - Retirar acciones de copiar/insertar del modal.
  - Evitar que Enter ejecute la antigua acción de copiado del prototipo.

  NO DEBE:
  - Escribir en Firebase.
  - Modificar pacientes.
  - Escribir al portapapeles.
*/

export function createCie10ConsultOnlyModule() {
  let observer = null;
  let boundDialog = null;

  function stripActions(root = document) {
    root.querySelectorAll?.('.cie10-actions, .cie10-detail-actions, #cie10CopyBtn, #cie10CopyCloseBtn')
      .forEach(node => node.remove());

    document.getElementById('cie10Toast')?.remove();

    const subtitle = document.querySelector('#cie10Overlay .cie10-subtitle');
    if (subtitle) subtitle.textContent = 'Consulta de referencia. Busca o navega hasta el código que necesitas; no modifica datos del Censo.';

    const detailTitle = document.querySelector('#cie10Overlay .cie10-search-detail .cie10-search-head strong');
    if (detailTitle) detailTitle.textContent = 'Detalle';
  }

  function blockLegacyCopyShortcut(event) {
    if (event.key !== 'Enter') return;
    if (document.activeElement?.id !== 'cie10Search') return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function initCie10ConsultOnly() {
    const overlay = document.getElementById('cie10Overlay');
    if (!overlay) return;

    overlay.dataset.mode = 'consultation';
    stripActions(overlay);

    const dialog = overlay.querySelector('.cie10-dialog');
    if (dialog && dialog !== boundDialog) {
      boundDialog?.removeEventListener('keydown', blockLegacyCopyShortcut, true);
      dialog.addEventListener('keydown', blockLegacyCopyShortcut, true);
      boundDialog = dialog;
    }

    observer?.disconnect();
    observer = new MutationObserver(() => stripActions(overlay));
    observer.observe(overlay, { childList: true, subtree: true });
  }

  return { initCie10ConsultOnly };
}
