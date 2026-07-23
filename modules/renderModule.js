/*
  MÓDULO: renderModule.js

  RESPONSABILIDAD:
  - Pintar el censo: skeleton, vacío, vista kanban/tarjetas y vista tabla.
  - Generar HTML de pacientes.
  - Pintar alerta visual y observación de escritorio.

  NO DEBE:
  - Hablar directamente con Firebase.
  - Validar contraseñas.
  - Calcular reglas de camas fuera de lo necesario para mostrar.
*/

console.info('[CENSO] renderModule.js cargado. BUILD: quick-bed-v20-20260722');

export function createRenderModule(app) {
  const { state } = app;
  const { areaVisuals, getEmojiOnly, agruparPorArea, parseDestinoClinico, getDestinoMaterialIcon, getDestinoTextLabel } = app.bed;
  const { escapeHtml } = app.utils;

  function renderDestinoHtml(destino, mode = 'chip') {
    if (!destino) return '';
    const parsed = parseDestinoClinico(destino);
    const modeClass = mode === 'compact' ? 'destino-chip destino-chip-compact' : 'chip destino-chip';
    const textLabel = getDestinoTextLabel(destino);

    if (parsed) {
      const icon = getDestinoMaterialIcon(destino);
      const especialidad = parsed.especialidad || '';
      return `<div class="${modeClass}" title="${escapeHtml(textLabel)}" aria-label="${escapeHtml(textLabel)}">
        <span class="material-symbols-outlined destino-action-icon" aria-hidden="true">${escapeHtml(icon)}</span>
        <span class="destino-specialty-emoji" aria-hidden="true">${escapeHtml(parsed.emoji)}</span>
        ${mode === 'compact' ? '' : `<span class="destino-specialty-text">${escapeHtml(especialidad)}</span>`}
      </div>`;
    }

    if (mode === 'compact') {
      const icono = getEmojiOnly(destino);
      return `<div class="${modeClass}" title="${escapeHtml(textLabel)}" aria-label="${escapeHtml(textLabel)}">
        <span class="destino-specialty-emoji" aria-hidden="true">${escapeHtml(icono)}</span>
      </div>`;
    }

    return `<div class="${modeClass}" title="${escapeHtml(textLabel)}">${escapeHtml(destino)}</div>`;
  }

  function getColorfulChipHtml(destino) {
    return renderDestinoHtml(destino, 'chip');
  }

  function crearCampo(label, value, extraClass = '') {
    if (!value || !String(value).trim()) return '';
    return `<div class="field field-fade-in ${extraClass}"><span class="label">${label}</span><div class="value">${escapeHtml(value)}</div></div>`;
  }

  function getObservacion(p) {
    return String(p?.observacionAlerta || p?.observacion || '').trim();
  }

  function getCamaLabelClass(cama) {
    return String(cama || '').trim().toUpperCase() === 'PEDILUVIO'
      ? ' quick-bed-label--pediluvio'
      : '';
  }

  function getAlertIconFill(isActive) {
    return isActive ? "font-variation-settings: 'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 24;" : '';
  }

  function ensureAlertStyles() {
    if (document.getElementById('censo-alert-styles')) return;

    const style = document.createElement('style');
    style.id = 'censo-alert-styles';
    style.textContent = `
      #content.view-table-mode {
        padding-left: 0 !important;
        padding-right: 0 !important;
      }

      #content.view-table-mode .table-wrapper {
        width: 100% !important;
        max-width: none !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        border-radius: 0 !important;
      }

      #content > .section {
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      #content .patient-list {
        padding-left: 0 !important;
        padding-right: 0 !important;
      }


      #content.view-table-mode {
        padding-bottom: 32px !important;
      }

      #content.view-table-mode .censo-table {
        min-width: 1080px !important;
      }

      .table-is-active .footer,
      .footer {
        padding: 3px 8px !important;
        font-size: 0.62rem !important;
        line-height: 1.05 !important;
        min-height: 0 !important;
      }

      .footer span {
        line-height: 1.05 !important;
      }

      .btn-add-table {
        position: sticky !important;
        bottom: 0 !important;
        z-index: 45 !important;
        margin: 4px auto 0 auto !important;
        min-height: 32px !important;
        padding: 6px 14px !important;
        border-radius: 999px !important;
        box-shadow: 0 -6px 18px rgba(0,0,0,0.18), 0 0 0 1px var(--accent-border) !important;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }

      #mainFabBtn {
        bottom: calc(8px + env(safe-area-inset-bottom, 0px)) !important;
      }

      @keyframes censoAlertReflection {
        0% { background-position: 220% 0; }
        100% { background-position: -220% 0; }
      }


      @keyframes censoAlertShine {
        0% { transform: translateX(-140%) skewX(-18deg); opacity: 0; }
        18% { opacity: 0.75; }
        45% { opacity: 0.18; }
        100% { transform: translateX(140%) skewX(-18deg); opacity: 0; }
      }

      .destino-chip {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 5px !important;
        max-width: 100% !important;
        min-height: 24px !important;
        padding: 4px 8px !important;
        border-radius: 999px !important;
        border: 1px solid var(--accent-border) !important;
        background: var(--chip-bg, var(--accent-soft)) !important;
        color: var(--chip-text, var(--text)) !important;
        font-weight: 700 !important;
        line-height: 1.1 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      .destino-chip .destino-action-icon {
        font-size: 1rem !important;
        line-height: 1 !important;
        color: var(--accent) !important;
        font-variation-settings: 'FILL' 0, 'wght' 650, 'GRAD' 0, 'opsz' 24;
        flex-shrink: 0;
      }

      .destino-chip .destino-specialty-emoji {
        flex-shrink: 0;
      }

      .destino-chip .destino-specialty-text {
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .destino-chip-compact {
        width: 42px !important;
        height: 28px !important;
        padding: 3px 5px !important;
        gap: 3px !important;
        border-radius: 999px !important;
      }

      .destino-chip-compact .destino-action-icon {
        font-size: 0.96rem !important;
      }

      .quick-bed-trigger {
        appearance: none;
        -webkit-appearance: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        max-width: 100%;
        margin: 0;
        padding: 3px 2px;
        border: 1px solid transparent;
        border-radius: 7px;
        background: transparent;
        color: var(--accent);
        font: inherit;
        font-weight: 700;
        line-height: 1.15;
        text-transform: uppercase;
        cursor: pointer;
        touch-action: manipulation;
        transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
      }

      .quick-bed-trigger:hover,
      .quick-bed-trigger:focus-visible {
        background: var(--accent-soft);
        border-color: var(--accent-border);
        outline: none;
      }

      .quick-bed-trigger:active { transform: scale(0.95); }
      .quick-bed-trigger .quick-bed-label {
        display: block;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .quick-bed-trigger .quick-bed-label--pediluvio {
        font-size: 0.66rem;
        letter-spacing: -0.045em;
      }
      .patient-bed.quick-bed-trigger { margin-top: 6px; color: var(--muted); font-size: 0.8rem; font-weight: 600; }
      .patient-bed.quick-bed-trigger .quick-bed-label--pediluvio { font-size: 0.68rem; }
      .patient-alert .quick-bed-trigger { color: #fff !important; }

      .alert-star-btn,
      .obs-note-btn {
        position: relative;
        overflow: hidden;
        color: var(--muted);
        border-color: var(--line);
        background: transparent;
        transition: transform 150ms ease, background 150ms ease, color 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
      }

      .alert-star-btn:active,
      .obs-note-btn:active {
        transform: scale(0.92);
      }

      .alert-star-btn.alert-active,
      .obs-note-btn.obs-active {
        color: #fff !important;
        background: var(--accent) !important;
        border-color: rgba(255,255,255,0.62) !important;
      }

      .alert-star-btn.alert-active .material-symbols-outlined,
      .obs-note-btn.obs-active .material-symbols-outlined {
        color: #fff !important;
        font-variation-settings: 'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 24;
      }

      .row-action-cell {
        padding: 2px 4px !important;
        text-align: center;
        vertical-align: middle;
        white-space: nowrap;
      }

      .row-action-grid {
        display: inline-flex;
        flex-direction: row;
        gap: 3px;
        justify-content: center;
        align-items: center;
        width: max-content;
        max-width: 100%;
        margin: 0 auto;
        flex-wrap: nowrap;
      }

      .row-action-grid .btn-table {
        width: 24px !important;
        height: 24px !important;
        min-width: 24px !important;
        min-height: 24px !important;
        padding: 0 !important;
        margin: 0 !important;
        border-radius: var(--radius-sm) !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        line-height: 1 !important;
      }

      .row-action-grid .btn-table,
      .row-action-grid .btn-table.edit,
      .row-action-grid .btn-table.delete {
        background: var(--toggle-bg, var(--field)) !important;
        border: 1px solid var(--accent-border) !important;
        color: var(--text) !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      }

      .row-action-grid .btn-table:hover,
      .row-action-grid .btn-table.edit:hover,
      .row-action-grid .btn-table.delete:hover {
        background: var(--accent-soft) !important;
        border-color: var(--accent) !important;
        color: var(--accent) !important;
        transform: scale(1.06);
      }

      .row-action-grid .btn-table.alert-active,
      .row-action-grid .btn-table.obs-active {
        background: var(--accent) !important;
        border-color: var(--accent) !important;
        color: #fff !important;
      }

      .row-action-grid .material-symbols-outlined {
        font-size: 1.04rem !important;
        line-height: 1 !important;
      }

      .card-action-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
        margin: 10px 0 8px 0;
      }

      .card-action-grid .btn-editar-tarjeta {
        background: var(--toggle-bg, var(--field)) !important;
        border-color: var(--accent-border) !important;
        color: var(--text) !important;
        margin: 0 !important;
        min-height: 34px;
        padding: 7px 8px !important;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        font-size: 0.72rem;
        line-height: 1.1;
      }

      .card-action-grid .btn-editar-tarjeta:hover,
      .card-action-grid .btn-editar-tarjeta.delete:hover {
        background: var(--accent-soft) !important;
        border-color: var(--accent) !important;
        color: var(--accent) !important;
      }

      .card-action-grid .material-symbols-outlined {
        font-size: 1rem !important;
      }

      .card.patient-alert .card-action-grid .btn-editar-tarjeta {
        background: rgba(255,255,255,0.16) !important;
        border-color: rgba(255,255,255,0.42) !important;
        color: #fff !important;
      }

      .card.patient-alert .card-action-grid .btn-editar-tarjeta.alert-active,
      .card.patient-alert .card-action-grid .btn-editar-tarjeta.obs-active {
        background: rgba(255,255,255,0.30) !important;
        border-color: rgba(255,255,255,0.72) !important;
      }

      .patient-observation-field .value {
        color: var(--text);
        background: var(--accent-soft);
        border: 1px solid var(--accent-border);
        border-left: 4px solid var(--accent);
        border-radius: var(--radius-sm);
      }

      .patient-observation-row td {
        padding: 0 0 6px 0 !important;
        border-top: 0 !important;
        background: var(--panel);
      }

      .patient-observation-line {
        min-height: 24px;
        display: flex;
        width: 100%;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        border-radius: 0;
        border-left: 4px solid var(--accent);
        background: var(--accent-soft);
        color: var(--text);
        font-size: 0.8rem;
        line-height: 1.3;
        letter-spacing: 0.02em;
        box-shadow: inset 0 1px 0 var(--accent-border);
      }

      .patient-observation-line .material-symbols-outlined {
        font-size: 0.95rem;
        color: var(--accent);
        flex: 0 0 auto;
      }

      .patient-observation-label {
        font-weight: 800;
        color: var(--accent);
        letter-spacing: 0.08em;
        white-space: nowrap;
      }

      .card.patient-alert .card-content-wrapper {
        position: relative;
        overflow: hidden;
        background: var(--accent) !important;
        color: #fff !important;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.34) !important;
      }

      .card.patient-alert .card-content-wrapper::after {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        left: -40%;
        width: 42%;
        pointer-events: none;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent);
        animation: censoAlertShine 2.8s ease-in-out infinite;
        z-index: 3;
      }

      .card.patient-alert .patient-name,
      .card.patient-alert .patient-bed,
      .card.patient-alert .label,
      .card.patient-alert .value,
      .card.patient-alert .caret,
      .card.patient-alert .material-symbols-outlined {
        color: #fff !important;
      }

      .card.patient-alert .field,
      .card.patient-alert .patient-observation-field .value {
        background: rgba(255,255,255,0.14) !important;
        border-color: rgba(255,255,255,0.35) !important;
      }

      .patient-row.patient-alert {
        background-color: var(--accent) !important;
        background-image: linear-gradient(
          105deg,
          transparent 0%,
          transparent 42%,
          rgba(255,255,255,0.16) 47%,
          rgba(255,255,255,0.58) 50%,
          rgba(255,255,255,0.16) 53%,
          transparent 58%,
          transparent 100%
        ) !important;
        background-size: 260% 100% !important;
        background-repeat: no-repeat !important;
        animation: censoAlertReflection 2.9s linear infinite;
        color: #fff !important;
      }

      .patient-row.patient-alert td {
        background: transparent !important;
        color: #fff !important;
        border-bottom-color: rgba(255,255,255,0.18) !important;
        box-shadow: none !important;
      }

      .patient-row.patient-alert td:first-child {
        box-shadow: inset 5px 0 0 rgba(255,255,255,0.70) !important;
      }

      .patient-row.patient-alert td:last-child {
        box-shadow: none !important;
      }

      .patient-row.patient-alert,
      .patient-row.patient-alert * {
        color: #fff !important;
      }

      .patient-row.patient-alert .chip,
      .patient-row.patient-alert .chip-emoji,
      .patient-row.patient-alert .btn-table,
      .patient-row.patient-alert .alert-star-btn,
      .patient-row.patient-alert .obs-note-btn {
        background: rgba(255,255,255,0.18) !important;
        border-color: rgba(255,255,255,0.38) !important;
        color: #fff !important;
      }

      .patient-row.patient-alert .alert-star-btn.alert-active,
      .patient-row.patient-alert .obs-note-btn.obs-active {
        background: rgba(255,255,255,0.28) !important;
      }

      .editable-cell.is-editing,
      .editable-cell[contenteditable="true"]:focus {
        background: var(--panel) !important;
        color: var(--text) !important;
        -webkit-text-fill-color: var(--text) !important;
        caret-color: var(--accent) !important;
        outline: 2px solid var(--accent) !important;
        outline-offset: -2px !important;
        box-shadow: inset 0 0 0 1px var(--accent-border) !important;
        text-shadow: none !important;
      }

      .editable-cell.is-editing *,
      .editable-cell[contenteditable="true"]:focus * {
        color: var(--text) !important;
        -webkit-text-fill-color: var(--text) !important;
        text-shadow: none !important;
      }

      .patient-row.patient-alert .editable-cell.is-editing,
      .patient-row.patient-alert .editable-cell[contenteditable="true"]:focus {
        background: var(--panel) !important;
        color: var(--text) !important;
        -webkit-text-fill-color: var(--text) !important;
      }

      .patient-row.patient-alert .editable-cell.is-editing *,
      .patient-row.patient-alert .editable-cell[contenteditable="true"]:focus * {
        color: var(--text) !important;
        -webkit-text-fill-color: var(--text) !important;
      }

      .patient-observation-row.patient-alert-observation td {
        background: var(--accent) !important;
        padding-top: 0 !important;
      }

      .patient-observation-row.patient-alert-observation .patient-observation-line {
        background-color: rgba(255,255,255,0.18);
        background-image: linear-gradient(
          105deg,
          transparent 0%,
          transparent 40%,
          rgba(255,255,255,0.16) 47%,
          rgba(255,255,255,0.42) 50%,
          rgba(255,255,255,0.16) 53%,
          transparent 60%,
          transparent 100%
        );
        background-size: 240% 100%;
        animation: censoAlertReflection 2.9s linear infinite;
        border-left-color: rgba(255,255,255,0.74);
        color: #fff;
        box-shadow: none;
      }

      .patient-observation-row.patient-alert-observation .patient-observation-label,
      .patient-observation-row.patient-alert-observation .material-symbols-outlined {
        color: #fff;
      }
    `;

    document.head.appendChild(style);
  }

  function generarSkeletonHtml() {
    const isDesktop = window.innerWidth >= 768;
    if (state.currentViewMode === 'table' && isDesktop) {
      let rows = '';
      for(let i=0; i<10; i++) rows += `<div class="skeleton-row"><div class="skeleton-block skeleton-cell" style="width: 5%"></div><div class="skeleton-block skeleton-cell" style="width: 10%"></div><div class="skeleton-block skeleton-cell" style="width: 20%"></div><div class="skeleton-block skeleton-cell" style="width: 30%"></div><div class="skeleton-block skeleton-cell" style="width: 20%"></div><div class="skeleton-block skeleton-cell" style="width: 15%"></div></div>`;
      return `<div class="table-wrapper animate-in" style="background: transparent;"><div class="section-header" style="background: var(--section-head); border-bottom: 2px solid var(--line);"><div class="skeleton-block" style="height: 1rem; width: 150px;"></div></div><div class="skeleton-loader">${rows}</div></div>`;
    }
    if (isDesktop) {
      let columnsHtml = '';
      ['SALA DE CHOQUE', 'OBSERVACIÓN', 'PEDIATRÍA'].forEach(titulo => {
        let cards = '';
        for(let i=0; i<3; i++) cards += `<div class="skeleton-card" style="margin-bottom: 12px; border-radius: var(--radius-md); border: 1px solid var(--line);"><div class="skeleton-main"><div class="skeleton-block skeleton-name" style="width: 80%"></div><div class="skeleton-block skeleton-bed" style="width: 40%"></div></div><div class="skeleton-right"><div class="skeleton-block skeleton-chip"></div><div class="skeleton-block skeleton-caret"></div></div></div>`;
        columnsHtml += `<div class="section" style="min-width: 450px; flex: 1;"><div class="section-header"><div class="section-title">${titulo}</div></div><div class="patient-list" style="padding: 16px;">${cards}</div></div>`;
      });
      return `<div style="display: flex; flex-direction: row; gap: 24px; padding: 10px 16px;">${columnsHtml}</div>`;
    }
    let mobileCards = '';
    for(let i=0; i<6; i++) mobileCards += `<div class="skeleton-card"><div class="skeleton-main"><div class="skeleton-block skeleton-name"></div><div class="skeleton-block skeleton-bed"></div></div><div class="skeleton-right"><div class="skeleton-block skeleton-chip"></div><div class="skeleton-block skeleton-caret"></div></div></div>`;
    return `<div class="section animate-in" style="margin-top:0; border-top:none;"><div class="section-header"><div class="section-title">CARGANDO CENSO...</div></div><div class="skeleton-loader">${mobileCards}</div></div>`;
  }

  function renderTableActions(p, alertaActiva, observacion) {
    const alertBtnTitle = alertaActiva ? 'Quitar alerta' : 'Marcar alerta';
    const obsTitle = observacion ? `Observación: ${observacion}` : 'Agregar observación / alerta';
    const alertBtnClass = alertaActiva ? 'alert-star-btn alert-active' : 'alert-star-btn';
    const obsBtnClass = observacion ? 'obs-note-btn obs-active' : 'obs-note-btn';
    const alertIconFill = getAlertIconFill(alertaActiva);
    const obsIconFill = getAlertIconFill(Boolean(observacion));

    return `
      <td class="row-action-cell">
        <div class="row-action-grid">
          <button class="btn-table ${alertBtnClass}" type="button" data-censo-action="toggle-alerta" data-fila="${escapeHtml(p.fila)}" onclick="event.stopPropagation(); toggleAlertaPaciente(this.dataset.fila, event);" title="${escapeHtml(alertBtnTitle)}" aria-label="${escapeHtml(alertBtnTitle)}">
            <span class="material-symbols-outlined" style="${alertIconFill}">star</span>
          </button>
          <button class="btn-table ${obsBtnClass}" type="button" data-censo-action="editar-observacion" data-fila="${escapeHtml(p.fila)}" onclick="event.stopPropagation(); editarObservacionPaciente(this.dataset.fila, event);" title="${escapeHtml(obsTitle)}" aria-label="${escapeHtml(obsTitle)}">
            <span class="material-symbols-outlined" style="${obsIconFill}">sticky_note_2</span>
          </button>
          <button class="btn-table edit" type="button" data-fila="${escapeHtml(p.fila)}" onclick="event.stopPropagation(); abrirModal(this.dataset.fila);" title="Editar" aria-label="Editar">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="btn-table delete" type="button" data-fila="${escapeHtml(p.fila)}" data-nombre="${escapeHtml(p.nombre)}" onclick="event.stopPropagation(); borrarPacienteDirecto(this.dataset.fila, this.dataset.nombre);" title="Borrar" aria-label="Borrar">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </td>`;
  }

  function renderCardActions(p, alertaActiva, observacion) {
    const alertBtnTitle = alertaActiva ? 'Quitar destacado' : 'Destacar paciente';
    const obsTitle = observacion ? `Editar observación: ${observacion}` : 'Agregar observación';
    const alertBtnClass = alertaActiva ? 'alert-star-btn alert-active' : 'alert-star-btn';
    const obsBtnClass = observacion ? 'obs-note-btn obs-active' : 'obs-note-btn';

    return `
      <div class="card-action-grid">
        <button class="btn-editar-tarjeta ${alertBtnClass}" type="button" data-censo-action="toggle-alerta" data-fila="${escapeHtml(p.fila)}" onclick="event.stopPropagation(); toggleAlertaPaciente(this.dataset.fila, event);" title="${escapeHtml(alertBtnTitle)}" aria-label="${escapeHtml(alertBtnTitle)}">
          <span class="material-symbols-outlined" style="${getAlertIconFill(alertaActiva)}">star</span> ${alertaActiva ? 'DESTACADO' : 'DESTACAR'}
        </button>
        <button class="btn-editar-tarjeta ${obsBtnClass}" type="button" data-censo-action="editar-observacion" data-fila="${escapeHtml(p.fila)}" onclick="event.stopPropagation(); editarObservacionPaciente(this.dataset.fila, event);" title="${escapeHtml(obsTitle)}" aria-label="${escapeHtml(obsTitle)}">
          <span class="material-symbols-outlined" style="${getAlertIconFill(Boolean(observacion))}">sticky_note_2</span> ${observacion ? 'EDITAR NOTA' : 'OBSERVACIÓN'}
        </button>
        <button class="btn-editar-tarjeta" type="button" data-fila="${escapeHtml(p.fila)}" onclick="event.stopPropagation(); abrirModal(this.dataset.fila);" title="Editar paciente" aria-label="Editar paciente">
          <span class="material-symbols-outlined">edit_square</span> EDITAR
        </button>
        <button class="btn-editar-tarjeta delete" type="button" data-fila="${escapeHtml(p.fila)}" data-nombre="${escapeHtml(p.nombre)}" onclick="event.stopPropagation(); borrarPacienteDirecto(this.dataset.fila, this.dataset.nombre);" title="Borrar paciente" aria-label="Borrar paciente">
          <span class="material-symbols-outlined">delete</span> BORRAR
        </button>
      </div>`;
  }

  function renderObservationRow(p, observacion, alertaActiva) {
    if (!observacion) return '';
    return `<tr class="patient-observation-row ${alertaActiva ? 'patient-alert-observation' : ''}" data-fila="${escapeHtml(p.fila)}">
      <td colspan="8">
        <div class="patient-observation-line" title="${escapeHtml(observacion)}">
          <span class="material-symbols-outlined">sticky_note_2</span>
          <span class="patient-observation-label">OBSERVACIÓN</span>
          <span>${escapeHtml(observacion)}</span>
        </div>
      </td>
    </tr>`;
  }

  function render(lista) {
    ensureAlertStyles();
    const content = document.getElementById('content');
    const metaText = document.getElementById('meta-text');
    const mainAppContainer = document.getElementById('mainAppContainer');
    const fabBtn = document.getElementById('mainFabBtn');
    state.selectedNavIndex = -1;

    if(metaText) metaText.innerHTML = `${lista.length} PACIENTES`;
    content.classList.remove('view-table-mode');
    mainAppContainer.classList.remove('table-is-active');
    if(fabBtn && mainAppContainer.style.display !== 'none') fabBtn.style.display = 'flex';

    if (!lista.length) {
      if (state.isFetchingData) content.innerHTML = generarSkeletonHtml();
      else content.innerHTML = `<div class="empty animate-in">NO HAY PACIENTES EN EL CENSO.</div>`;
      if (typeof app.syncPlexusPatients === 'function') app.syncPlexusPatients(state.pacientesGlobal);
      return;
    }

    const grupos = agruparPorArea(lista);
    let areas = Object.keys(grupos);
    const isDesktop = window.innerWidth >= 768;

    const ordenEstricto = [
      'SALA DE CHOQUE',
      'OBSERVACIÓN', 'OBSERVACION',
      'TRAUMA MENOR',
      'PEDIATRÍA', 'PEDIATRIA',
      'EXTRAS',
      'SIN ÁREA ASIGNADA'
    ];

    areas.sort((a, b) => {
      const indexA = ordenEstricto.indexOf(a.toUpperCase().trim());
      const indexB = ordenEstricto.indexOf(b.toUpperCase().trim());
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      return posA - posB;
    });

    if (state.currentViewMode === 'table' && isDesktop) {
      content.classList.add('view-table-mode');
      mainAppContainer.classList.add('table-is-active');
      if(fabBtn) fabBtn.style.display = 'none';

      let htmlArr = [];
      htmlArr.push(`<div class="table-wrapper animate-in" id="scrollTableWrapper">
        <div id="scrollGuiderObj" class="scroll-guider" title="Ir al extremo"><span class="material-symbols-outlined">arrow_downward</span></div>
        <table class="censo-table"><thead><tr>
          <th style="width: 5%; text-align: center;">CAMA</th>
          <th style="width: 6%; text-align: center;">INGRESO</th>
          <th style="width: 18%;">PACIENTE</th>
          <th style="width: 3.5%;">EDAD</th>
          <th style="width: 25%;">DIAGNÓSTICO</th>
          <th style="width: 23.5%;">PENDIENTES</th>
          <th style="width: 9%; text-align: center;">DESTINO</th>
          <th style="width: 10%; text-align: center;"><span class="material-symbols-outlined" style="font-size: 1.2rem;">settings</span></th>
        </tr></thead><tbody>`);

      areas.forEach((area) => {
        const areaNormalizada = String(area).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
        const visual = areaVisuals[areaNormalizada] || areaVisuals[area.toUpperCase()] || { emoji: '🏥', class: '' };

        htmlArr.push(`<tr style="background: rgba(128, 128, 128, 0.15);"><td colspan="8" style="padding: 6px 10px; font-weight: 800; font-size: 0.85rem; color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--line);"><span class="area-icon ${visual.class}">${visual.emoji}</span> ${escapeHtml(area)}</td></tr>`);

        grupos[area].forEach((p) => {
          const destinoChip = getColorfulChipHtml(p.destino);
          const alertaActiva = Boolean(p.alerta);
          const observacion = getObservacion(p);
          htmlArr.push(`<tr class="patient-row ${alertaActiva ? 'patient-alert' : ''}" data-fila="${escapeHtml(p.fila)}" data-alerta="${alertaActiva ? '1' : '0'}" onclick="toggleTableRow(this)">
              <td class="quick-bed-cell" style="padding: 6px 10px; text-align: center;">
                <button class="quick-bed-trigger" type="button" data-fila="${escapeHtml(p.fila)}" onclick="abrirCamaFlotante(this, this.dataset.fila, event)" title="Cambiar cama: ${escapeHtml(p.cama || 'SIN CAMA')}" aria-label="Cambiar cama de ${escapeHtml(p.nombre)}. Cama actual: ${escapeHtml(p.cama || 'sin cama')}">
                  <span class="quick-bed-label${getCamaLabelClass(p.cama)}">${escapeHtml(p.cama || '-')}</span>
                </button>
              </td>
              <td style="padding: 6px 10px; font-size: 0.7rem; color: var(--muted); font-family: 'Fira Code', monospace; line-height: 1.3; text-align: center;">${p.fechaIngresoFormateada || '-'}</td>

              <td style="padding: 6px 10px; font-family: 'Space Mono', monospace; font-weight: 700; font-size: 0.9rem; line-height: 1.3;" class="patient-name editable-cell" data-campo="nombre" data-original="${escapeHtml(p.nombre)}" contenteditable="true" onfocus="iniciarEdicionSubtle(this)" onblur="finalizarEdicionSubtle(this)" onkeydown="manejarTeclasSubtle(this, event)" onclick="event.stopPropagation()">
                <div class="truncate-text" title="${escapeHtml(p.nombre)}">${escapeHtml(p.nombre)}</div>
              </td>

              <td style="padding: 6px 10px;" class="editable-cell" data-campo="edad" data-original="${escapeHtml(p.edad)}" contenteditable="true" onfocus="iniciarEdicionSubtle(this)" onblur="finalizarEdicionSubtle(this)" onkeydown="manejarTeclasSubtle(this, event)" onclick="event.stopPropagation()">
                <span style="color: var(--muted); font-size: 0.85rem;" class="value">${escapeHtml(p.edad || '-')}</span>
              </td>

              <td style="padding: 6px 10px;" class="editable-cell" data-campo="diagnostico" data-original="${escapeHtml(p.diagnostico)}" contenteditable="true" onfocus="iniciarEdicionSubtle(this)" onblur="finalizarEdicionSubtle(this)" onkeydown="manejarTeclasSubtle(this, event)" onclick="event.stopPropagation()">
                <div class="truncate-text" style="font-size: 0.8rem; line-height: 1.3;" title="${escapeHtml(p.diagnostico)}">${escapeHtml(p.diagnostico || '-')}</div>
              </td>

              <td style="padding: 6px 10px;" class="editable-cell" data-campo="pendientes" data-original="${escapeHtml(p.pendientes)}" contenteditable="true" onfocus="iniciarEdicionSubtle(this)" onblur="finalizarEdicionSubtle(this)" onkeydown="manejarTeclasSubtle(this, event)" onclick="event.stopPropagation()">
                <div class="truncate-text" style="font-size: 0.8rem; line-height: 1.3;" title="${escapeHtml(p.pendientes)}">${escapeHtml(p.pendientes || '-')}</div>
              </td>

              <td style="padding: 6px 10px; position: relative; text-align: center;" onclick="abrirDestinoFlotante(this, '${p.fila}', '${escapeHtml(p.destino)}', event)">
                ${destinoChip || '<span style="color:var(--muted); opacity:0.4;">-</span>'}
              </td>

              ${renderTableActions(p, alertaActiva, observacion)}
          </tr>${renderObservationRow(p, observacion, alertaActiva)}`);
        });
      });

      htmlArr.push(`</tbody></table><button class="btn-add-table" onclick="abrirModalAgregar()"><span class="material-symbols-outlined" style="margin-right: 8px;">person_add</span> NUEVO INGRESO</button></div>`);
      content.innerHTML = htmlArr.join('');

      setTimeout(app.initScrollGuider, 100);
      if (typeof app.syncPlexusPatients === 'function') app.syncPlexusPatients(state.pacientesGlobal);
      return;
    }

    const sections = areas.map((area, indexArea) => {
      const pacientes = grupos[area];
      const delayBase = indexArea * 150;
      const areaNormalizada = String(area).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
      const visual = areaVisuals[areaNormalizada] || areaVisuals[area.toUpperCase()] || { emoji: '🏥', class: '' };

      return `
        <section class="section animate-in" style="animation-delay: ${delayBase}ms;">
          <div class="section-header">
            <div class="section-title">
              <span class="area-icon ${visual.class}">${visual.emoji}</span> ${escapeHtml(area)}
            </div>
          </div>
          <div class="patient-list">
            ${pacientes.map((p, indexPatient) => {
              const alertaActiva = Boolean(p.alerta);
              const observacion = getObservacion(p);
              const camaHtml = p.cama ? `<button class="patient-bed quick-bed-trigger" type="button" data-fila="${escapeHtml(p.fila)}" onclick="abrirCamaFlotante(this, this.dataset.fila, event)" title="Cambiar cama: ${escapeHtml(p.cama)}" aria-label="Cambiar cama de ${escapeHtml(p.nombre)}. Cama actual: ${escapeHtml(p.cama)}"><span class="quick-bed-label${getCamaLabelClass(p.cama)}">${escapeHtml(p.cama)}</span></button>` : '';

              const destinoEmojiHtml = p.destino ? renderDestinoHtml(p.destino, 'compact') : '';

              const fechaLimpia = p.fechaIngresoFormateada ? p.fechaIngresoFormateada.replace(/<[^>]*>?/gm, ' ') : '-';
              const detailsHtml = [
                crearCampo('INGRESO', fechaLimpia),
                crearCampo('EDAD', p.edad),
                crearCampo('DIAGNÓSTICO', p.diagnostico),
                crearCampo('PENDIENTES', p.pendientes),
                crearCampo('OBSERVACIÓN', observacion, 'patient-observation-field'),
                crearCampo('DESTINO', p.destino)
              ].filter(Boolean).join('');

              const delayPatient = delayBase + (indexPatient * 50);

              return `<div class="card animate-in ${alertaActiva ? 'patient-alert' : ''}" data-fila="${escapeHtml(p.fila)}" data-nombre="${escapeHtml(p.nombre)}" data-alerta="${alertaActiva ? '1' : '0'}" style="animation-delay: ${delayPatient}ms;">
                <div class="swipe-bg" aria-hidden="true"><div class="swipe-action swipe-delete"><span class="material-symbols-outlined">delete</span><span class="swipe-action-label">BORRAR</span></div><div class="swipe-action swipe-edit"><span class="swipe-action-label">EDITAR</span><span class="material-symbols-outlined">edit</span></div></div>
                <div class="card-content-wrapper">
                  <div class="card-header" onclick="toggleCard(this)">
                    <div class="patient-main">
                      <div class="patient-name">${escapeHtml(p.nombre)}</div>
                      ${camaHtml}
                    </div>
                    <div class="header-right">
                      ${destinoEmojiHtml}
                      <div class="caret"><span class="material-symbols-outlined">expand_more</span></div>
                    </div>
                  </div>
                  <div class="details"><div class="details-content">${detailsHtml}${renderCardActions(p, alertaActiva, observacion)}</div></div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </section>`;
    });

    content.innerHTML = sections.join('');
    setTimeout(app.initSwipe, 50);
    if (typeof app.syncPlexusPatients === 'function') app.syncPlexusPatients(state.pacientesGlobal);
  }

  function mostrarError(error) {
    document.getElementById('content').innerHTML = `<div class="error animate-in">ERROR:\n${escapeHtml(error && error.message ? error.message : error)}</div>`;
    if(document.getElementById('meta-text')) document.getElementById('meta-text').innerHTML = `ERROR DE CONEXIÓN`;
  }

  return {
    render,
    mostrarError,
    getColorfulChipHtml
  };
}
