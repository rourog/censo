/*
  MÓDULO: modalModule.js

  RESPONSABILIDAD:
  - Abrir/cerrar modales.
  - Selects personalizados.
  - Edición inline en tabla.
  - Agregar, editar, mover y borrar pacientes.

  NO DEBE:
  - Inicializar Auth.
  - Renderizar el censo completo.
  - Definir camas maestras.
*/

console.info('[CENSO] modalModule.js cargado. BUILD: alerta-observacion-v4-20260522');

export function createModalModule(app) {
  const { state } = app;
  const { db, collection, addDoc, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } = app.firebase;
  const { destinosGlobal, agruparPorArea } = app.bed;
  const { escapeHtml, normalizar, vibrar } = app.utils;

  const closeAllPopovers = (e) => {
    if (e && e.type === 'scroll' && e.target.closest && e.target.closest('.custom-select-popover')) return;
    if (e && e.type === 'click' && e.target.closest && (e.target.closest('.custom-select-wrapper') || e.target.closest('.custom-select-popover'))) return;
  
    document.querySelectorAll('.custom-select-popover.active').forEach(p => {
      p.classList.remove('active');
      const pid = p.getAttribute('data-parent');
      if(pid && document.getElementById(pid)) document.getElementById(pid).appendChild(p);
    });
  };
  function bindModalBaseEvents() {
    document.addEventListener('click', handleCensoActionButtonClick, true);
    document.addEventListener('click', closeAllPopovers);
    document.addEventListener('scroll', closeAllPopovers, true);
  }

  function handleCensoActionButtonClick(e) {
    const btn = e.target.closest('[data-censo-action]');
    if (!btn) return;

    const action = btn.dataset.censoAction;
    const fila = btn.dataset.fila;
    if (!fila) return;

    if (action === 'toggle-alerta') {
      e.preventDefault();
      e.stopPropagation();
      toggleAlertaPaciente(fila, e);
      return;
    }

    if (action === 'editar-observacion') {
      e.preventDefault();
      e.stopPropagation();
      editarObservacionPaciente(fila, e);
    }
  }


  function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
    closeAllPopovers(null);
  }

  function cerrarModalBorrado() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.classList.remove('active');
    if (iconoAlertaInterval) {
      clearInterval(iconoAlertaInterval);
      iconoAlertaInterval = null;
    }
    filaABorrar = null;
  }

  // ==========================================================
  // SELECTOR PERSONALIZADO TIPO COMBOBOX (MODALES)
  // ==========================================================
  function initCustomSelect(wrapperId, optionsHtml) {
    const wrapper = document.getElementById(wrapperId);
    if(!wrapper) return;
    const display = wrapper.querySelector('.custom-select-display');
    let popover = wrapper.querySelector('.custom-select-popover');
  
    if (!popover) popover = document.getElementById(wrapperId + '-popover');
    if (!popover) return;
  
    popover.id = wrapperId + '-popover';
    popover.setAttribute('data-parent', wrapperId);

    const search = popover.querySelector('.custom-select-search input');
    const list = popover.querySelector('.custom-select-options');
    list.innerHTML = optionsHtml;

    display.onclick = (e) => {
      e.stopPropagation();
      const isActive = popover.classList.contains('active');
    
      closeAllPopovers(null);

      if (!isActive) {
        document.body.appendChild(popover); 
      
        const rect = display.getBoundingClientRect();
        popover.style.position = 'fixed';
        popover.style.width = rect.width + 'px';
        popover.style.left = rect.left + 'px';
        popover.style.zIndex = '999999';
      
        const dropdownHeight = 250;
        if (rect.bottom + dropdownHeight > window.innerHeight) {
          popover.style.top = 'auto';
          popover.style.bottom = (window.innerHeight - rect.top) + 'px';
          popover.style.boxShadow = '0 -10px 25px rgba(0,0,0,0.5)';
        } else {
          popover.style.top = rect.bottom + 'px';
          popover.style.bottom = 'auto';
          popover.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
        }

        popover.classList.add('active');
        search.value = '';
        Array.from(list.children).forEach(c => c.style.display = 'block');
        setTimeout(() => search.focus(), 50);
      }
    };

    search.oninput = (e) => {
      const q = normalizar(e.target.value);
      Array.from(list.children).forEach(opt => {
        if (opt.classList.contains('custom-select-optgroup')) return;
        const text = normalizar(opt.innerText);
        opt.style.display = text.includes(q) ? 'block' : 'none';
      });
    };

    list.onclick = (e) => {
      const opt = e.target.closest('.custom-select-option');
      if(opt) { 
        display.innerText = opt.innerText; 
        display.dataset.value = opt.getAttribute('data-value'); 
        popover.classList.remove('active'); 
        wrapper.appendChild(popover); 
      }
    };
  }

  // ==========================================================
  // EDICIÓN ULTRA SUTIL EN LÍNEA
  // ==========================================================
  function iniciarEdicionSubtle(el) {
    const tr = el.closest('tr');
    if (!tr.classList.contains('expanded-row')) { toggleTableRow(tr); }
  
    window.isInlineEditing = true;
    el.classList.add('is-editing');
  
    const trunc = el.querySelector('.truncate-text');
    if (trunc) { el.innerText = trunc.innerText; }
  
    if (el.innerText.trim() === '-') { el.innerText = ''; }
  
    const range = document.createRange(); const sel = window.getSelection();
    range.selectNodeContents(el); range.collapse(false); sel.removeAllRanges(); sel.addRange(range);
  }

  async function finalizarEdicionSubtle(el) {
    el.classList.remove('is-editing');
    window.isInlineEditing = false;
  
    const campo = el.getAttribute('data-campo');
    const filaId = el.closest('tr').getAttribute('data-fila');
    const valorOriginal = el.getAttribute('data-original').toUpperCase().trim();
    const nuevoValorRaw = el.innerText.toUpperCase().normalize('NFC').trim();
  
    const nuevoValorFinal = nuevoValorRaw === '' ? '-' : nuevoValorRaw;
  
    const campoEstilizado = (campo === 'diagnostico' || campo === 'pendientes') ? 
      `<div class="truncate-text" style="font-size: 0.8rem; line-height: 1.3;" title="${escapeHtml(nuevoValorFinal)}">${escapeHtml(nuevoValorFinal)}</div>` : 
      (campo === 'nombre') ? `<div class="truncate-text" title="${escapeHtml(nuevoValorFinal)}">${escapeHtml(nuevoValorFinal)}</div>` : escapeHtml(nuevoValorFinal);
  
    el.innerHTML = campoEstilizado;

    if (window.pendingSnapshotList) {
      state.pacientesGlobal = window.pendingSnapshotList;
      window.pendingSnapshotList = null;
      app.filtrar();
    }

    if (nuevoValorRaw !== valorOriginal && nuevoValorFinal !== valorOriginal) {
      el.style.opacity = '0.3';
      try {
        const valorBD = nuevoValorFinal === '-' ? '' : nuevoValorFinal;
        await updateDoc(doc(db, "pacientes", filaId), { [campo]: valorBD });
        el.setAttribute('data-original', nuevoValorFinal);
        const pLocal = state.pacientesGlobal.find(p => p.fila === filaId);
        if (pLocal) pLocal[campo] = valorBD;
        vibrar(15);
      } catch (e) {
        alert("Error al guardar campo: " + e.message);
        el.setAttribute('data-original', valorOriginal);
        el.innerHTML = valorOriginal;
      } finally { el.style.opacity = '1'; }
    }
  
    setTimeout(() => {
      const trRestaurado = document.querySelector(`tr[data-fila="${filaId}"]`);
      if (trRestaurado && !trRestaurado.classList.contains('expanded-row')) { trRestaurado.classList.add('expanded-row'); }
    }, 40);
  }

  function manejarTeclasSubtle(el, event) {
    const campo = el.getAttribute('data-campo');
    if (event.key === 'Enter') {
      if (campo === 'nombre' || campo === 'edad') {
        event.preventDefault(); el.blur();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      el.innerText = el.getAttribute('data-original');
      el.blur();
    }
  }

  // ==========================================================
  // DESTINO SUPERPUESTO MINIMALISTA EN EL BODY (EN LÍNEA)
  // ==========================================================
  function abrirDestinoFlotante(tdEl, filaId, destinoActual, event) {
    event.stopPropagation();
    const tr = tdEl.closest('tr');
    if (!tr.classList.contains('expanded-row')) { toggleTableRow(tr); return; }
    if (document.querySelector('.inline-destino-container')) return; 

    window.isInlineEditing = true; 

    const container = document.createElement('div');
    container.className = 'inline-destino-container animate-in';
  
    let opcionesHtml = `
      <div style="padding: 6px; background: var(--panel); border-bottom: 1px solid var(--line);">
        <input type="text" class="inline-search-input input-control" placeholder="Buscar destino..." autocomplete="off" style="width: 100%; padding: 6px 10px; font-size: 0.8rem; margin: 0; outline: none;">
      </div>
      <div class="inline-options-wrapper">
        <div class="inline-destino-option ${!destinoActual ? 'selected' : ''}" data-value="">(SIN DESTINO)</div>
    `;
    destinosGlobal.forEach(d => {
      const dStr = d.toUpperCase().trim();
      const sel = dStr === destinoActual.toUpperCase().trim() ? 'selected' : '';
      opcionesHtml += `<div class="inline-destino-option ${sel}" data-value="${escapeHtml(dStr)}">${escapeHtml(dStr)}</div>`;
    });
    opcionesHtml += `</div>`;
  
    container.innerHTML = opcionesHtml;
    document.body.appendChild(container);
  
    const rect = tdEl.getBoundingClientRect();
    container.style.position = 'fixed';
    container.style.width = Math.max(220, rect.width) + 'px';
    container.style.left = rect.left + 'px';
    container.style.zIndex = '99999';

    const dropdownHeight = 250; 
    if (rect.bottom + dropdownHeight > window.innerHeight) {
      container.style.top = 'auto';
      container.style.bottom = (window.innerHeight - rect.top) + 'px';
      container.style.boxShadow = '0 -10px 25px rgba(0,0,0,0.5)';
    } else {
      container.style.top = rect.bottom + 'px';
      container.style.bottom = 'auto';
    }

    const inputBuscador = container.querySelector('.inline-search-input');
    const wrapperOptions = container.querySelector('.inline-options-wrapper');

    inputBuscador.addEventListener('input', (e) => {
        const q = normalizar(e.target.value);
        wrapperOptions.querySelectorAll('.inline-destino-option').forEach(opt => {
            const text = normalizar(opt.innerText);
            opt.style.display = text.includes(q) ? 'block' : 'none';
        });
    });

    const cerrarDirecto = (e) => {
      if (e && e.type === 'scroll' && container.contains(e.target)) return;
      window.isInlineEditing = false;
      if (container.parentNode) container.remove();
      if (window.pendingSnapshotList) { state.pacientesGlobal = window.pendingSnapshotList; window.pendingSnapshotList = null; app.filtrar(); }
      document.removeEventListener('scroll', cerrarDirecto, true);
    };

    container.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (e.target.classList.contains('inline-search-input')) return;

      const opcionEl = e.target.closest('.inline-destino-option');
      if (!opcionEl) return;
    
      const nuevoDestino = opcionEl.getAttribute('data-value');
      cerrarDirecto();
    
      if (nuevoDestino !== destinoActual.toUpperCase().trim()) {
        tdEl.innerHTML = '<span class="spin material-symbols-outlined" style="font-size:1.2rem;">sync</span>';
        try {
          await updateDoc(doc(db, "pacientes", filaId), { destino: nuevoDestino });
          vibrar(15);
          const pLocal = state.pacientesGlobal.find(p => p.fila === filaId);
          if (pLocal) pLocal.destino = nuevoDestino;
        } catch (e) { alert("Error destino: " + e.message); }
        app.filtrar();
      }
    });

    const closeHandler = (e) => {
      if (container && !container.contains(e.target)) { 
          cerrarDirecto(); 
          document.removeEventListener('click', closeHandler); 
      }
    };
    setTimeout(() => {
        document.addEventListener('click', closeHandler);
        document.addEventListener('scroll', cerrarDirecto, true);
        inputBuscador.focus();
    }, 10);
  }

  function toggleCard(headerEl) {
    vibrar(15); 
    const card = headerEl.closest('.card'); 
    card.classList.toggle('open');
    app.resetAllSwipes();
    if (card.classList.contains('open')) { setTimeout(() => { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 350); }
  }

  function toggleTableRow(row) {
    const yaEstaAbierta = row.classList.contains('expanded-row');
    document.querySelectorAll('.patient-row').forEach(tr => { tr.classList.remove('expanded-row'); });
    if (!yaEstaAbierta) { row.classList.add('expanded-row'); }
  }

  function refrescarDespuesDeAlerta() {
    if (typeof app.filtrar === 'function') {
      app.filtrar();
      return;
    }

    if (typeof app.render === 'function') {
      app.render(state.pacientesGlobal);
    }
  }

  async function toggleAlertaPaciente(fila, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const paciente = state.pacientesGlobal.find(p => String(p.fila) === String(fila));
    if (!paciente) {
      console.warn('[CENSO] No se encontró paciente para alerta:', fila);
      vibrar([30, 30, 30]);
      return;
    }

    const alertaAnterior = Boolean(paciente.alerta);
    const alertaNueva = !alertaAnterior;

    // Actualización optimista: el cambio debe sentirse inmediato.
    paciente.alerta = alertaNueva;
    refrescarDespuesDeAlerta();
    vibrar(alertaNueva ? [20, 30, 20] : 15);

    try {
      await updateDoc(doc(db, "pacientes", fila), { alerta: alertaNueva });
    } catch (error) {
      paciente.alerta = alertaAnterior;
      refrescarDespuesDeAlerta();
      vibrar([80, 40, 80]);
      alert('ERROR AL CAMBIAR ALERTA: ' + error.message);
    }
  }

  async function editarObservacionPaciente(fila, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const paciente = state.pacientesGlobal.find(p => String(p.fila) === String(fila));
    if (!paciente) {
      console.warn('[CENSO] No se encontró paciente para observación:', fila);
      vibrar([30, 30, 30]);
      return;
    }

    const observacionAnterior = String(paciente.observacionAlerta || paciente.observacion || '').trim();
    const alertaAnterior = Boolean(paciente.alerta);

    const textoIngresado = window.prompt(
      'OBSERVACIÓN / ALERTA DEL PACIENTE\n\nDeja el campo vacío para borrar la observación.',
      observacionAnterior
    );

    if (textoIngresado === null) return;

    const observacionNueva = String(textoIngresado).trim().toUpperCase();
    const activaAlerta = observacionNueva.length > 0 ? true : alertaAnterior;

    // Actualización optimista.
    paciente.observacionAlerta = observacionNueva;
    if (observacionNueva.length > 0) paciente.alerta = true;
    refrescarDespuesDeAlerta();
    vibrar(observacionNueva.length > 0 ? [20, 30, 20] : 15);

    try {
      const updateData = { observacionAlerta: observacionNueva };
      if (observacionNueva.length > 0) updateData.alerta = true;
      await updateDoc(doc(db, "pacientes", fila), updateData);
    } catch (error) {
      paciente.observacionAlerta = observacionAnterior;
      paciente.alerta = alertaAnterior;
      refrescarDespuesDeAlerta();
      vibrar([80, 40, 80]);
      alert('ERROR AL GUARDAR OBSERVACIÓN: ' + error.message);
    }
  }


  function abrirModal(fila) {
    vibrar(30); 
    const paciente = state.pacientesGlobal.find(p => p.fila === fila);
    if(!paciente) return;
  
    document.getElementById('modalFila').value = paciente.fila;
    document.getElementById('modalFechaIngreso').value = paciente.fechaIngresoISO || '';
    document.getElementById('modalNombre').value = (paciente.nombre || '').toUpperCase();
    document.getElementById('modalEdad').value = (paciente.edad || '').toUpperCase();
    document.getElementById('modalDiagnostico').value = (paciente.diagnostico || '').toUpperCase();
    document.getElementById('modalPendientes').value = (paciente.pendientes || '').toUpperCase();

    const pDestinoStr = String(paciente.destino || '').toUpperCase().trim();
    let htmlDestino = `<div class="custom-select-option" data-value="">(SIN DESTINO)</div>`;
    destinosGlobal.forEach(d => { htmlDestino += `<div class="custom-select-option" data-value="${escapeHtml(d.toUpperCase())}">${escapeHtml(d.toUpperCase())}</div>`; });
    initCustomSelect('editDestinoWrapper', htmlDestino);
    const destinoDisplay = document.querySelector('#editDestinoWrapper .custom-select-display');
    destinoDisplay.innerText = pDestinoStr || '(SIN DESTINO)';
    destinoDisplay.dataset.value = pDestinoStr;

    let htmlMover = `<div class="custom-select-option" data-value="">NO MOVER (MANTENER EN CAMA ACTUAL)</div>`;
    const gruposLibres = agruparPorArea(state.camasLibresGlobal);
    for (const [area, camas] of Object.entries(gruposLibres)) {
      htmlMover += `<div class="custom-select-optgroup">${escapeHtml(area.toUpperCase())}</div>`;
      camas.forEach(c => { htmlMover += `<div class="custom-select-option" data-value="${c.fila}">${escapeHtml(c.cama.toUpperCase())}</div>`; });
    }
    initCustomSelect('editMoverWrapper', htmlMover);
    const moverDisplay = document.querySelector('#editMoverWrapper .custom-select-display');
    moverDisplay.innerText = 'NO MOVER (MANTENER EN CAMA ACTUAL)';
    moverDisplay.dataset.value = '';
  
    document.getElementById('editModal').classList.add('active');
  }

  async function guardarEdicion() {
    const btnGuardar = document.getElementById('btnGuardarEdit');
    const filaId = document.getElementById('modalFila').value;
    const destinoVal = document.querySelector('#editDestinoWrapper .custom-select-display').dataset.value || '';
    const moverAFila = document.querySelector('#editMoverWrapper .custom-select-display').dataset.value || '';
    const fechaInput = document.getElementById('modalFechaIngreso').value;

    btnGuardar.disabled = true; btnGuardar.innerHTML = '<span class="spin material-symbols-outlined">sync</span> GUARDANDO...';
  
    try {
      let updateData = {
          nombre: document.getElementById('modalNombre').value.toUpperCase(),
          edad: document.getElementById('modalEdad').value.toUpperCase(),
          diagnostico: document.getElementById('modalDiagnostico').value.toUpperCase(),
          pendientes: document.getElementById('modalPendientes').value.toUpperCase(),
          destino: destinoVal
      };

      if (fechaInput) updateData.creado = new Date(fechaInput);

      if (moverAFila && moverAFila !== "") {
          const nuevaCamaObj = state.camasLibresGlobal.find(c => c.fila === moverAFila);
          if (nuevaCamaObj) {
              updateData.cama = nuevaCamaObj.cama.toUpperCase();
              updateData.area = nuevaCamaObj.area.toUpperCase();
          }
      }

      await updateDoc(doc(db, "pacientes", filaId), updateData);
      vibrar(20); 
      cerrarModal('editModal');
    } catch (error) {
      vibrar([100, 50, 100]); 
      alert('ERROR AL GUARDAR: ' + error.message);
    } finally {
      btnGuardar.disabled = false; btnGuardar.innerHTML = '<span class="material-symbols-outlined">save</span> GUARDAR';
    }
  }

  let filaABorrar = null;
  let iconoAlertaInterval = null;

  function mostrarModalBorrar(fila, nombre) {
    vibrar([60, 50, 60]);
    filaABorrar = fila; 
    document.getElementById('deleteTargetName').innerText = nombre;
    document.getElementById('deleteConfirmModal').classList.add('active');
  
    const iconEl = document.getElementById('warningIconObj');
    let esSirena = true; 
    iconEl.innerHTML = '<span class="material-symbols-outlined" style="font-size: inherit;">warning</span>'; 
    if(iconoAlertaInterval) clearInterval(iconoAlertaInterval);
    iconoAlertaInterval = setInterval(() => { 
      esSirena = !esSirena; 
      iconEl.innerHTML = esSirena ? '<span class="material-symbols-outlined" style="font-size: inherit; color: var(--error-text);">warning</span>' : '<span class="material-symbols-outlined" style="font-size: inherit; color: var(--accent);">error</span>'; 
    }, 400); 
  }

  function borrarPacienteDialog() {
    const fila = document.getElementById('modalFila').value;
    const nom = document.getElementById('modalNombre').value;
    cerrarModal('editModal'); mostrarModalBorrar(fila, nom); 
  }

  function borrarPacienteDirecto(fila, nombre) { mostrarModalBorrar(fila, nombre); }

  async function ejecutarBorrado() {
    const btnBorrar = document.getElementById('btnConfirmDelete');
    if (!filaABorrar) return;

    btnBorrar.disabled = true; 
    btnBorrar.innerHTML = '<span class="spin material-symbols-outlined">sync</span>...';
    vibrar(20);
  
    try {
      const pacienteData = state.pacientesGlobal.find(p => p.fila === filaABorrar);
      if (pacienteData) {
        const { fila, fechaIngresoFormateada, fechaIngresoISO, ...datosParaArchivar } = pacienteData;
        await setDoc(doc(db, "historial", filaABorrar), {
          ...datosParaArchivar,
          fechaEgreso: serverTimestamp(),
          egresadoPor: state.rolUsuario
        });
      }

      await deleteDoc(doc(db, "pacientes", filaABorrar));
      vibrar([30, 50, 30]); 
      cerrarModalBorrado(); 
      if (typeof confetti === 'function') { confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#ef4444', '#10b981', '#3b82f6', '#fbbf24'] }); }
    } catch (error) {
      vibrar([100, 50, 100]); 
      alert('ERROR AL BORRAR: ' + error.message); 
      cerrarModalBorrado();
    } finally {
      btnBorrar.disabled = false; btnBorrar.innerHTML = '<span class="material-symbols-outlined">delete</span> SÍ, BORRAR';
    }
  }

  function abrirModalAgregar() {
    vibrar(30); 
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('addFechaIngreso').value = now.toISOString().slice(0,16);

    let htmlCamas = '';
    if (state.camasLibresGlobal.length === 0) { 
      htmlCamas = `<div class="custom-select-option" data-value="">NO HAY CAMAS DISPONIBLES 🛑</div>`; 
    } else {
      const gruposLibres = agruparPorArea(state.camasLibresGlobal);
      for (const [area, camas] of Object.entries(gruposLibres)) {
        htmlCamas += `<div class="custom-select-optgroup">${escapeHtml(area.toUpperCase())}</div>`;
        camas.forEach(c => { htmlCamas += `<div class="custom-select-option" data-value="${escapeHtml(c.cama.toUpperCase())}|${escapeHtml(c.area.toUpperCase())}">${escapeHtml(c.cama.toUpperCase())}</div>`; });
      }
    }
    initCustomSelect('addCamaWrapper', htmlCamas);
    const camaDisplay = document.querySelector('#addCamaWrapper .custom-select-display');
    camaDisplay.innerText = 'SELECCIONA UNA CAMA LIBRE...';
    camaDisplay.dataset.value = '';

    let htmlDestino = `<div class="custom-select-option" data-value="">(SIN DESTINO)</div>`;
    destinosGlobal.forEach(d => { htmlDestino += `<div class="custom-select-option" data-value="${escapeHtml(d.toUpperCase())}">${escapeHtml(d.toUpperCase())}</div>`; });
    initCustomSelect('addDestinoWrapper', htmlDestino);
    const destinoDisplay = document.querySelector('#addDestinoWrapper .custom-select-display');
    destinoDisplay.innerText = '(SIN DESTINO)';
    destinoDisplay.dataset.value = '';

    document.getElementById('addNombre').value = ''; 
    document.getElementById('addEdad').value = ''; 
    document.getElementById('addDiagnostico').value = ''; 
    document.getElementById('addPendientes').value = '';
  
    document.getElementById('addModal').classList.add('active');
  }

  async function guardarNuevo() {
    const btnGuardar = document.getElementById('btnGuardarAdd');
    const selectCamaVal = document.querySelector('#addCamaWrapper .custom-select-display').dataset.value;
    if(!selectCamaVal) { alert("POR FAVOR SELECCIONA UNA CAMA DISPONIBLE."); return; }
    const [nombreCamaReal, areaReal] = selectCamaVal.split('|');
  
    const nom = document.getElementById('addNombre').value.toUpperCase(); 
    if(!nom) { alert("EL NOMBRE ES OBLIGATORIO."); return; }

    const destinoVal = document.querySelector('#addDestinoWrapper .custom-select-display').dataset.value || '';
    const fechaInput = document.getElementById('addFechaIngreso').value;

    btnGuardar.disabled = true; 
    btnGuardar.innerHTML = '<span class="spin material-symbols-outlined">sync</span> PROCESANDO...';

    try {
      const fechaCreacion = fechaInput ? new Date(fechaInput) : new Date();

      await addDoc(collection(db, "pacientes"), {
          nombre: nom,
          edad: document.getElementById('addEdad').value.toUpperCase(),
          diagnostico: document.getElementById('addDiagnostico').value.toUpperCase(),
          pendientes: document.getElementById('addPendientes').value.toUpperCase(),
          destino: destinoVal,
          cama: nombreCamaReal,
          area: areaReal,
          creado: fechaCreacion,
          alerta: false,
          observacionAlerta: ''
      });
      vibrar(20); 
      cerrarModal('addModal');
    } catch (error) {
      vibrar([100, 50, 100]); 
      alert("ERROR: " + error.message); 
    } finally {
      btnGuardar.disabled = false; btnGuardar.innerHTML = '<span class="material-symbols-outlined">add</span> INGRESAR';
    }
  }

  function exposeWindowActions() {
    window.initCustomSelect = initCustomSelect;
    window.iniciarEdicionSubtle = iniciarEdicionSubtle;
    window.finalizarEdicionSubtle = finalizarEdicionSubtle;
    window.manejarTeclasSubtle = manejarTeclasSubtle;
    window.abrirDestinoFlotante = abrirDestinoFlotante;
    window.cerrarModal = cerrarModal;
    window.cerrarModalBorrado = cerrarModalBorrado;
    window.toggleCard = toggleCard;
    window.toggleTableRow = toggleTableRow;
    window.toggleAlertaPaciente = toggleAlertaPaciente;
    window.editarObservacionPaciente = editarObservacionPaciente;
    window.abrirModal = abrirModal;
    window.guardarEdicion = guardarEdicion;
    window.borrarPacienteDialog = borrarPacienteDialog;
    window.borrarPacienteDirecto = borrarPacienteDirecto;
    window.ejecutarBorrado = ejecutarBorrado;
    window.abrirModalAgregar = abrirModalAgregar;
    window.guardarNuevo = guardarNuevo;
  }

  return {
    bindModalBaseEvents,
    exposeWindowActions,
    closeAllPopovers,
    initCustomSelect,
    cerrarModal,
    cerrarModalBorrado,
    toggleCard,
    toggleTableRow,
    toggleAlertaPaciente,
    editarObservacionPaciente,
    abrirModal,
    guardarEdicion,
    borrarPacienteDialog,
    borrarPacienteDirecto,
    ejecutarBorrado,
    abrirModalAgregar,
    guardarNuevo,
    iniciarEdicionSubtle,
    finalizarEdicionSubtle,
    manejarTeclasSubtle,
    abrirDestinoFlotante
  };
}
