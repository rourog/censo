/*
  MÓDULO: interactionModule.js

  RESPONSABILIDAD:
  - Búsqueda.
  - Swipe en tarjetas.
  - Guía de scroll de tabla.
  - Navegación por teclado.
  - Botones globales de UI.

  NO DEBE:
  - Inicializar Firebase.
  - Definir HTML de tarjetas/tabla.
  - Guardar pacientes directamente.
*/

console.info('[CENSO] interactionModule.js cargado. BUILD: quick-bed-v19-20260722');

export const MOBILE_SWIPE_THRESHOLD = 110;

export function getMobileSwipeAction(deltaX, threshold = MOBILE_SWIPE_THRESHOLD) {
  if (deltaX <= -threshold) return 'edit';
  if (deltaX >= threshold) return 'delete';
  return null;
}

export function createInteractionModule(app) {
  const { state } = app;
  const { normalizar, escapeHtml } = app.utils;

  let scrollGuiderHandler = null;

  function initScrollGuider() {
    const wrapper = document.getElementById('scrollTableWrapper');
    const guider = document.getElementById('scrollGuiderObj');
    if (!wrapper || !guider) return;

    if (scrollGuiderHandler) {
      wrapper.removeEventListener('scroll', scrollGuiderHandler);
    }

    let isScrolling = false;
    const checkScrollPosition = () => {
      const atBottom = wrapper.scrollHeight - wrapper.scrollTop <= wrapper.clientHeight + 20;
      const atTop = wrapper.scrollTop <= 20;
      const isScrollable = wrapper.scrollHeight > wrapper.clientHeight;

      if (!isScrollable) {
        guider.className = 'scroll-guider'; 
        return;
      }

      if (!atBottom) {
        guider.innerHTML = '<span class="material-symbols-outlined">arrow_downward</span>';
        guider.className = 'scroll-guider active-down';
        guider.title = "Ir al final del censo";
      } else if (atBottom && !atTop) {
        guider.innerHTML = '<span class="material-symbols-outlined">arrow_upward</span>';
        guider.className = 'scroll-guider active-up';
        guider.title = "Volver arriba";
      } else {
        guider.className = 'scroll-guider';
      }
    };

    scrollGuiderHandler = () => {
      if (!isScrolling) {
        window.requestAnimationFrame(() => {
          checkScrollPosition();
          isScrolling = false;
        });
        isScrolling = true;
      }
    };

    wrapper.addEventListener('scroll', scrollGuiderHandler, { passive: true });
  
    guider.onclick = (e) => {
      e.stopPropagation();
      app.utils.vibrar(15);
      const goesDown = guider.classList.contains('active-down');
      wrapper.scrollTo({
        top: goesDown ? wrapper.scrollHeight : 0,
        behavior: 'smooth'
      });
    };

    checkScrollPosition();
  }

  // ==========================================================
  // NAVEGACIÓN POR TECLADO OCULTA Y AGREGADA A "NUEVO INGRESO"
  // ==========================================================
  document.addEventListener('keydown', (e) => {
    if (state.currentViewMode !== 'table' || window.innerWidth < 768 || window.isInlineEditing) return;
  
    const elements = Array.from(document.querySelectorAll('.patient-row, .btn-add-table'));
    if (!elements.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.selectedNavIndex = Math.min(state.selectedNavIndex + 1, elements.length - 1);
      updateNavHighlight(elements);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.selectedNavIndex = Math.max(state.selectedNavIndex - 1, 0);
      updateNavHighlight(elements);
    } else if (e.key === 'Enter' && state.selectedNavIndex !== -1) {
      e.preventDefault();
      const el = elements[state.selectedNavIndex];
    
      if (el.classList.contains('btn-add-table')) {
        app.abrirModalAgregar();
      } else {
        const filaId = el.getAttribute('data-fila');
        app.abrirModal(filaId);
      }
    }
  });

  function updateNavHighlight(elements) {
    elements.forEach(r => r.classList.remove('selected-nav'));
    if (elements[state.selectedNavIndex]) {
      const el = elements[state.selectedNavIndex];
      el.classList.add('selected-nav');
    
      if (el.classList.contains('patient-row')) {
        const yaEstaAbierta = el.classList.contains('expanded-row');
        document.querySelectorAll('.patient-row').forEach(tr => tr.classList.remove('expanded-row'));
        el.classList.add('expanded-row');
      }
    
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function resetAllSwipes() {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('swipe-ready-delete', 'swipe-ready-edit'));
    document.querySelectorAll('.card-content-wrapper').forEach(cw => {
      cw.classList.remove('swiping');
      cw.style.transform = 'translateX(0)';
    });
  }

  function initSwipe() {
    let gesture = null;

    const finishGesture = (el) => {
      const card = el?.closest('.card');
      if (el) {
        el.classList.remove('swiping');
        el.style.transform = 'translateX(0)';
      }
      card?.classList.remove('swipe-ready-delete', 'swipe-ready-edit');
      gesture = null;
    };

    document.querySelectorAll('.card-content-wrapper').forEach(el => {
      let suppressNextClick = false;

      el.addEventListener('click', (event) => {
        if (!suppressNextClick) return;
        event.preventDefault();
        event.stopPropagation();
        suppressNextClick = false;
      }, true);

      el.addEventListener('touchstart', e => {
        if (e.target.closest('button, a, input, textarea, select, [contenteditable="true"], .header-right')) return;
        const touch = e.touches[0];
        if (!touch) return;

        gesture = {
          el,
          startX: touch.clientX,
          startY: touch.clientY,
          axis: null
        };
      }, { passive: true });
    
      el.addEventListener('touchmove', e => {
        if (gesture?.el !== el) return;
        const touch = e.touches[0];
        if (!touch) return;

        const deltaX = touch.clientX - gesture.startX;
        const deltaY = touch.clientY - gesture.startY;

        if (!gesture.axis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= 10) {
          gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
        }
        if (gesture.axis !== 'horizontal') return;

        const card = el.closest('.card');
        const action = getMobileSwipeAction(deltaX);
        const translatedX = Math.max(-72, Math.min(72, deltaX * 0.4));

        el.classList.add('swiping');
        el.style.transform = `translateX(${translatedX}px)`;
        card?.classList.toggle('swipe-ready-edit', action === 'edit');
        card?.classList.toggle('swipe-ready-delete', action === 'delete');
      }, { passive: true });
    
      el.addEventListener('touchend', e => {
        if (gesture?.el !== el) return;
        const touch = e.changedTouches[0];
        const card = el.closest('.card');
        const deltaX = touch ? touch.clientX - gesture.startX : 0;
        const action = gesture.axis === 'horizontal' ? getMobileSwipeAction(deltaX) : null;
        const fila = card?.getAttribute('data-fila');
        const nombre = card?.getAttribute('data-nombre');

        finishGesture(el);

        if (!action || !fila) return;
        suppressNextClick = true;
        setTimeout(() => { suppressNextClick = false; }, 400);

        if (action === 'edit') setTimeout(() => app.abrirModal(fila), 100);
        if (action === 'delete') setTimeout(() => app.borrarPacienteDirecto(fila, nombre), 100);
      });

      el.addEventListener('touchcancel', () => {
        if (gesture?.el === el) finishGesture(el);
      }, { passive: true });
    });
  }

  function filtrar() {
    const searchInput = document.getElementById('search');
    const q = normalizar(searchInput.value);
    const eggFound = app.checkEasterEggs(q); 
  
    if (eggFound) {
      searchInput.value = ''; searchInput.blur();
      document.getElementById('searchWrapper').classList.add('collapsed');
      app.utils.vibrar([40, 60, 40]);
      app.render(state.pacientesGlobal); return;
    }
    if (state.isFetchingData) return; 
    if (!q) { app.render(state.pacientesGlobal); return; }
  
    const filtrados = state.pacientesGlobal.filter(p => { 
      return normalizar([p.nombre, p.cama, p.area || '', p.edad, p.diagnostico, p.pendientes, p.destino, p.observacionAlerta || '', p.observacion || ''].join(' ')).includes(q); 
    });
    app.render(filtrados);
    document.querySelectorAll('.animate-in').forEach(el => { el.classList.remove('animate-in'); el.style.animationDelay = '0ms'; el.style.opacity = '1'; });
  }


  function bindUiEvents() {
    const search = document.getElementById('search');
    if (search) {
      search.addEventListener('input', filtrar);
      search.addEventListener('search', (e) => { if (e.target.value === '') app.render(state.pacientesGlobal); });
    }

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        app.utils.vibrar(15);
        document.getElementById('themeModal')?.classList.add('active');
      });
    }

    const viewToggleBtn = document.getElementById('viewToggleBtn');
    if (viewToggleBtn) {
      viewToggleBtn.addEventListener('click', () => {
        app.utils.vibrar(15);
        state.currentViewMode = state.currentViewMode === 'kanban' ? 'table' : 'kanban';
        localStorage.setItem('censo-view', state.currentViewMode);
        const viewIcon = document.getElementById('viewIcon');
        if (viewIcon) viewIcon.textContent = state.currentViewMode === 'kanban' ? 'table_rows' : 'grid_view';
        app.render(state.pacientesGlobal);
      });
    }

    const searchToggleBtn = document.getElementById('searchToggleBtn');
    if (searchToggleBtn) {
      searchToggleBtn.addEventListener('click', () => {
        app.utils.vibrar(15);
        const wrapper = document.getElementById('searchWrapper');
        const searchInput = document.getElementById('search');
        if (!wrapper || !searchInput) return;
        wrapper.classList.toggle('collapsed');
        if (!wrapper.classList.contains('collapsed')) {
          setTimeout(() => searchInput.focus(), 300);
        } else {
          searchInput.value = '';
          app.render(state.pacientesGlobal);
        }
      });
    }

    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
      historyBtn.addEventListener('click', () => {
        app.utils.vibrar(15);
        window.open('https://rourog.github.io/censo/historial.html', '_blank');
      });
    }

    const reloadBtn = document.getElementById('reloadBtn');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        app.utils.vibrar(15);
        app.initFirebaseListener();
      });
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (!state.isFetchingData) app.render(state.pacientesGlobal); }, 200);
    });
  }


  return {
    initScrollGuider,
    resetAllSwipes,
    initSwipe,
    filtrar,
    bindUiEvents
  };
}
