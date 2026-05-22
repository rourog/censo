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

console.info('[CENSO] renderModule.js cargado. BUILD: alerta-observacion-v5-20260522');

export function createRenderModule(app) {
  const { state } = app;
  const { areaVisuals, chipPalette, getEmojiOnly, agruparPorArea } = app.bed;
  const { escapeHtml } = app.utils;

  function getChipColor(text) {
    if (!text) return { bg: 'var(--chip-bg)', text: 'var(--chip-text)' };
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
    return chipPalette[Math.abs(hash) % chipPalette.length];
  }

  function getColorfulChipHtml(destino) {
    if (!destino) return '';
    const isColorful = document.body.className.includes('base-light') ||
                       document.body.className.includes('base-pure-white') ||
                       document.body.className.includes('base-gray-light') ||
                       document.body.className.includes('base-sand') ||
                       document.body.className.includes('base-rose') ||
                       document.body.className.includes('base-mint') ||
                       document.body.className.includes('base-lavender');
    if (isColorful) {
      const colors = getChipColor(destino);
      return `<div class="chip" style="background-color: ${colors.bg}; color: ${colors.text}; border-color: rgba(0,0,0,0.1); font-weight: 700;">${escapeHtml(destino)}</div>`;
    }
    return `<div class="chip">${escapeHtml(destino)}</div>`;
  }

  function crearCampo(label, value, extraClass = '') {
    if (!value || !String(value).trim()) return '';
    return `<div class="field field-fade-in ${extraClass}"><span class="label">${label}</span><div class="value">${escapeHtml(value)}</div></div>`;
  }

  function getObservacion(p) {
    return String(p?.observacionAlerta || p?.observacion || '').trim();
  }

  function getAlertIconFill(isActive) {
    return isActive ? "font-variation-settings: 'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 24;" : '';
  }

  function ensureAlertStyles() {
    if (document.getElementById('censo-alert-styles')) return;

    const style = document.createElement('style');
    style.id = 'censo-alert-styles';
    style.textContent = `
      @keyframes censoAlertPulse {
        0%, 100% { box-shadow: 0 0 0 1px var(--accent-border), 0 0 12px var(--accent-soft); }
        50% { box-shadow: 0 0 0 2px rgba(255,255,255,0.7), 0 0 30px var(--accent); }
      }

      @keyframes censoAlertShine {
        0% { transform: translateX(-140%) skewX(-18deg); opacity: 0; }
        18% { opacity: 0.75; }
        45% { opacity: 0.18; }
        100% { transform: translateX(140%) skewX(-18deg); opacity: 0; }
      }

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
        animation: censoAlertPulse 1.6s ease-in-out infinite;
      }

      .alert-star-btn.alert-active .material-symbols-outlined,
      .obs-note-btn.obs-active .material-symbols-outlined {
        color: #fff !important;
        font-variation-settings: 'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 24;
      }

      .row-action-cell {
        padding: 2px 5px !important;
        text-align: center;
        vertical-align: middle;
        white-space: nowrap;
      }

      .row-action-grid {
        display: grid;
        grid-template-columns: repeat(2, 18px);
        grid-auto-rows: 18px;
        gap: 2px;
        justify-content: center;
        align-items: center;
        width: max-content;
        margin: 0 auto;
      }

      .row-action-grid .btn-table {
        width: 18px !important;
        height: 18px !important;
        min-width: 18px !important;
        min-height: 18px !important;
        padding: 0 !important;
        margin: 0 !important;
        border-radius: 5px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        line-height: 1 !important;
      }

      .row-action-grid .material-symbols-outlined {
        font-size: 0.78rem !important;
        line-height: 1 !important;
      }

      .card-action-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
        margin: 10px 0 8px 0;
      }

      .card-action-grid .btn-editar-tarjeta {
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

      .card-action-grid .material-symbols-outlined {
        font-size: 1rem !important;
      }

      .patient-observation-field .value {
        color: var(--text);
        background: var(--accent-soft);
        border: 1px solid var(--accent-border);
        border-left: 4px solid var(--accent);
        border-radius: var(--radius-sm);
      }

      .patient-observation-row td {
        padding: 0 10px 5px 10px !important;
        border-top: 0 !important;
        background: var(--panel);
      }

      .patient-observation-line {
        min-height: 18px;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px 8px;
        border-radius: 0 0 var(--radius-sm) var(--radius-sm);
        border-left: 4px solid var(--accent);
        background: var(--accent-soft);
        color: var(--text);
        font-size: 0.68rem;
        line-height: 1.22;
        letter-spacing: 0.02em;
        box-shadow: inset 0 1px 0 var(--accent-border);
      }

      .patient-observation-line .material-symbols-outlined {
        font-size: 0.82rem;
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
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,0.34),
          0 0 0 1px var(--accent-border),
          0 0 32px var(--accent) !important;
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
        text-shadow: 0 0 14px rgba(255,255,255,0.24);
      }

      .card.patient-alert .field,
      .card.patient-alert .patient-observation-field .value {
        background: rgba(255,255,255,0.14) !important;
        border-color: rgba(255,255,255,0.35) !important;
      }

      .patient-row.patient-alert td {
        background: var(--accent) !important;
        color: #fff !important;
        border-bottom-color: rgba(255,255,255,0.18) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -1px 0 rgba(0,0,0,0.08);
      }

      .patient-row.patient-alert td:first-child {
        box-shadow:
          inset 5px 0 0 rgba(255,255,255,0.70),
          inset 0 1px 0 rgba(255,255,255,0.20),
          -10px 0 28px var(--accent);
      }

      .patient-row.patient-alert td:last-child {
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.20),
          10px 0 28px var(--accent);
      }

      .patient-row.patient-alert,
      .patient-row.patient-alert * {
        color: #fff !important;
        text-shadow: 0 0 12px rgba(255,255,255,0.18);
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
        box-shadow: 0 0 14px rgba(255,255,255,0.42) !important;
      }

      .patient-observation-row.patient-alert-observation td {
        background: var(--accent) !important;
        padding-top: 0 !important;
      }

      .patient-observation-row.patient-alert-observation .patient-observation-line {
        background: rgba(255,255,255,0.18);
        border-left-color: rgba(255,255,255,0.74);
        color: #fff;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.22), 0 8px 22px rgba(0,0,0,0.08);
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

  function renderCardActions(p) {
    return `
      <div class="card-action-grid">
        <button class="btn-editar-tarjeta" type="button" data-fila="${escapeHtml(p.fila)}" onclick="event.stopPropagation(); abrirModal(this.dataset.fila);">
          <span class="material-symbols-outlined">edit_square</span> EDITAR
        </button>
        <button class="btn-editar-tarjeta delete" type="button" data-fila="${escapeHtml(p.fila)}" data-nombre="${escapeHtml(p.nombre)}" onclick="event.stopPropagation(); borrarPacienteDirecto(this.dataset.fila, this.dataset.nombre);">
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

  function render(lista)  function render(lista) {
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
      if (typeof app.syncPlexusPatients === 'function') app.syncPlexusPatients(lista);
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
          <th style="width: 19%;">PACIENTE</th>
          <th style="width: 3.5%;">EDAD</th>
          <th style="width: 26%;">DIAGNÓSTICO</th>
          <th style="width: 25%;">PENDIENTES</th>
          <th style="width: 9%; text-align: center;">DESTINO</th>
          <th style="width: 6.5%; text-align: center;"><span class="material-symbols-outlined" style="font-size: 1.2rem;">settings</span></th>
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
              <td style="padding: 6px 10px; text-align: center;"><span style="color: var(--accent); font-weight: 700; font-size: 0.85rem;">${escapeHtml(p.cama || '-')}</span></td>
              <td style="padding: 6px 10px; font-size: 0.7rem; color: var(--muted); font-family: 'Fira Code', monospace; line-height: 1.3; text-align: center;">${p.fechaIngresoFormateada || '-'}</td>

              <td style="padding: 6px 10px; font-family: 'Space Mono', monospace; font-weight: 700; font-size: 0.9rem; line-height: 1.3;" class="patient-name editable-cell" data-campo="nombre" data-original="${escapeHtml(p.nombre)}" contenteditable="true" onfocus="iniciarEdicionSubtle(this)" onblur="finalizarEdicionSubtle(this)" onkeydown="manejarTeclasSubtle(this, event)" onclick="event.stopPropagation()">
                <div class="truncate-text" title="${escapeHtml(p.nombre)}">${alertaActiva ? '<span class="material-symbols-outlined" style="font-size:.9rem; color:var(--accent); vertical-align:-2px; margin-right:3px; font-variation-settings: \'FILL\' 1, \'wght\' 700, \'GRAD\' 0, \'opsz\' 24;">star</span>' : ''}${escapeHtml(p.nombre)}</div>
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
      if (typeof app.syncPlexusPatients === 'function') app.syncPlexusPatients(lista);
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
              const camaHtml = p.cama ? `<div class="patient-bed">${escapeHtml(p.cama)}</div>` : '';

              const emojiSolo = p.destino ? getEmojiOnly(p.destino) : '';
              const destinoEmojiHtml = emojiSolo ? `<div class="chip-emoji" title="${escapeHtml(p.destino)}">${emojiSolo}</div>` : '';

              const fechaLimpia = p.fechaIngresoFormateada ? p.fechaIngresoFormateada.replace(/<[^>]*>?/gm, ' ') : '-';
              const detailsHtml = [
                crearCampo('INGRESO', fechaLimpia),
                crearCampo('EDAD', p.edad),
                crearCampo('DIAGNÓSTICO', p.diagnostico),
                crearCampo('PENDIENTES', p.pendientes),
                crearCampo('OBSERVACIÓN / ALERTA', observacion, 'patient-observation-field'),
                crearCampo('DESTINO', p.destino)
              ].filter(Boolean).join('');

              const delayPatient = delayBase + (indexPatient * 50);

              return `<div class="card animate-in ${alertaActiva ? 'patient-alert' : ''}" data-fila="${escapeHtml(p.fila)}" data-nombre="${escapeHtml(p.nombre)}" data-alerta="${alertaActiva ? '1' : '0'}" style="animation-delay: ${delayPatient}ms;">
                <div class="swipe-bg"><div class="swipe-action swipe-delete"><span class="material-symbols-outlined">delete</span></div><div class="swipe-action swipe-edit"><span class="material-symbols-outlined">edit</span></div></div>
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
                  <div class="details"><div class="details-content">${detailsHtml}${renderCardActions(p)}</div></div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </section>`;
    });

    content.innerHTML = sections.join('');
    setTimeout(app.initSwipe, 50);
    if (typeof app.syncPlexusPatients === 'function') app.syncPlexusPatients(lista);
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
