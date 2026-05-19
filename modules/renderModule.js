/*
  MÓDULO: renderModule.js

  RESPONSABILIDAD:
  - Pintar el censo: skeleton, vacío, vista kanban/tarjetas y vista tabla.
  - Generar HTML de pacientes.

  NO DEBE:
  - Hablar directamente con Firebase.
  - Validar contraseñas.
  - Calcular reglas de camas fuera de lo necesario para mostrar.
*/

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
    } else { return `<div class="chip">${escapeHtml(destino)}</div>`; }
  }

  function crearCampo(label, value) {
    if (!value || !String(value).trim()) return '';
    return `<div class="field field-fade-in"><span class="label">${label}</span><div class="value">${escapeHtml(value)}</div></div>`;
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

  function render(lista) {
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
      if (state.isFetchingData) { content.innerHTML = generarSkeletonHtml(); } 
      else { content.innerHTML = `<div class="empty animate-in">NO HAY PACIENTES EN EL CENSO.</div>`; }
      if (typeof app.syncPlexusPatients === 'function') app.syncPlexusPatients(lista);
      return; 
    }

    const grupos = agruparPorArea(lista);
    let areas = Object.keys(grupos);
    const isDesktop = window.innerWidth >= 768;

    const ordenEstricto = [
      "SALA DE CHOQUE",
      "OBSERVACIÓN", "OBSERVACION", 
      "TRAUMA MENOR",
      "PEDIATRÍA", "PEDIATRIA",
      "EXTRAS",
      "SIN ÁREA ASIGNADA"
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
          <th style="width: 20%;">PACIENTE</th>
          <th style="width: 3.5%;">EDAD</th>
          <th style="width: 26%;">DIAGNÓSTICO</th>
          <th style="width: 26%;">PENDIENTES</th>
          <th style="width: 9%; text-align: center;">DESTINO</th>
          <th style="width: 4.5%; text-align: center;"><span class="material-symbols-outlined" style="font-size: 1.2rem;">settings</span></th>
        </tr></thead><tbody>`);
    
      areas.forEach((area) => {
        const areaNormalizada = String(area).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
        const visual = areaVisuals[areaNormalizada] || areaVisuals[area.toUpperCase()] || { emoji: '🏥', class: '' };

        htmlArr.push(`<tr style="background: rgba(128, 128, 128, 0.15);"><td colspan="8" style="padding: 6px 10px; font-weight: 800; font-size: 0.85rem; color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--line);"><span class="area-icon ${visual.class}">${visual.emoji}</span> ${escapeHtml(area)}</td></tr>`);

        grupos[area].forEach((p) => {
          const destinoChip = getColorfulChipHtml(p.destino);
          htmlArr.push(`<tr class="patient-row" data-fila="${p.fila}" onclick="toggleTableRow(this)">
              <td style="padding: 6px 10px; text-align: center;"><span style="color: var(--accent); font-weight: 700; font-size: 0.85rem;">${escapeHtml(p.cama || '-')}</span></td>
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
            
              <td style="padding: 4px 10px; text-align: center; white-space: nowrap;"><button class="btn-table edit" style="padding: 4px; font-size: 0.9rem; margin-right: 2px;" onclick="abrirModal('${p.fila}'); event.stopPropagation();" title="Editar"><span class="material-symbols-outlined" style="font-size: 1.1rem;">edit</span></button><button class="btn-table delete" style="padding: 4px; font-size: 0.9rem;" onclick="borrarPacienteDirecto('${p.fila}', '${escapeHtml(p.nombre)}'); event.stopPropagation();" title="Borrar"><span class="material-symbols-outlined" style="font-size: 1.1rem;">delete</span></button></td>
          </tr>`);
        });
      });

      htmlArr.push(`</tbody></table><button class="btn-add-table" onclick="abrirModalAgregar()"><span class="material-symbols-outlined" style="margin-right: 8px;">person_add</span> NUEVO INGRESO</button></div>`);
      content.innerHTML = htmlArr.join('');
    
      setTimeout(app.initScrollGuider, 100);

      if (typeof app.syncPlexusPatients === 'function') app.syncPlexusPatients(lista);
      return;
    }

    content.innerHTML = '';
    areas.forEach((area, indexArea) => {
      const pacientes = grupos[area];
      const delayBase = indexArea * 150; 
      const areaNormalizada = String(area).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
      const visual = areaVisuals[areaNormalizada] || areaVisuals[area.toUpperCase()] || { emoji: '🏥', class: '' };

      const sectionHtml = `
        <section class="section animate-in" style="animation-delay: ${delayBase}ms;">
          <div class="section-header">
            <div class="section-title">
              <span class="area-icon ${visual.class}">${visual.emoji}</span> ${escapeHtml(area)}
            </div>
          </div>
          <div class="patient-list">
            ${pacientes.map((p, indexPatient) => {
              const camaHtml = p.cama ? `<div class="patient-bed">${escapeHtml(p.cama)}</div>` : '';
            
              // MODO TARJETA: Solo Emoji para Destino
              const emojiSolo = p.destino ? getEmojiOnly(p.destino) : '';
              const destinoEmojiHtml = emojiSolo ? `<div class="chip-emoji" title="${escapeHtml(p.destino)}">${emojiSolo}</div>` : '';
            
              const fechaLimpia = p.fechaIngresoFormateada ? p.fechaIngresoFormateada.replace(/<[^>]*>?/gm, ' ') : '-';

              const detailsHtml = [ 
                  crearCampo('INGRESO', fechaLimpia),
                  crearCampo('EDAD', p.edad), 
                  crearCampo('DIAGNÓSTICO', p.diagnostico), 
                  crearCampo('PENDIENTES', p.pendientes), 
                  crearCampo('DESTINO', p.destino) 
              ].filter(Boolean).join('');
              const delayPatient = delayBase + (indexPatient * 50);
            
              return `<div class="card animate-in" data-fila="${p.fila}" data-nombre="${escapeHtml(p.nombre)}" style="animation-delay: ${delayPatient}ms;"><div class="swipe-bg"><div class="swipe-action swipe-delete"><span class="material-symbols-outlined">delete</span></div><div class="swipe-action swipe-edit"><span class="material-symbols-outlined">edit</span></div></div><div class="card-content-wrapper"><div class="card-header" onclick="toggleCard(this)"><div class="patient-main"><div class="patient-name">${escapeHtml(p.nombre)}</div>${camaHtml}</div><div class="header-right">${destinoEmojiHtml}<div class="caret"><span class="material-symbols-outlined">expand_more</span></div></div></div><div class="details"><div class="details-content">${detailsHtml}<button class="btn-editar-tarjeta" onclick="abrirModal('${p.fila}'); event.stopPropagation();"><span class="material-symbols-outlined" style="font-size: 1.1rem; margin-right: 4px;">edit_square</span> EDITAR PACIENTE</button></div></div></div></div>`;
            }).join('')}
          </div>
        </section>
      `;
      content.innerHTML += sectionHtml;
    });
  
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
