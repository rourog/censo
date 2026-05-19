/*
  MÓDULO: stateModule.js

  RESPONSABILIDAD:
  - Mantener el estado compartido del censo en un solo objeto.
  - Evitar variables globales sueltas en módulos nuevos.

  NOTA:
  - window.isInlineEditing y window.pendingSnapshotList se conservan por compatibilidad
    con la edición inline ya existente.
*/

export const state = {
  pacientesGlobal: [],
  camasLibresGlobal: [],
  currentViewMode: localStorage.getItem('censo-view') || 'kanban',
  isFetchingData: true,
  selectedNavIndex: -1,
  unsubscribe: null,
  rolUsuario: 'INTERNO'
};

window.isInlineEditing = false;
window.pendingSnapshotList = null;
