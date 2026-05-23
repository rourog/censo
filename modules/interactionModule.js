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

console.info('[CENSO] interactionModule.js cargado. BUILD: destinos-iconos-v11-20260522');

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
    document.querySelectorAll('.card-content-wrapper').forEach(cw => cw.style.transform = 'translateX(0)');
  }

  function initSwipe() {
    let xDown = null, yDown = null, activeCard = null;
    document.querySelectorAll('.card-content-wrapper').forEach(el => {
      el.addEventListener('touchstart', e => { 
        if (e.target.closest('.btn-editar-tarjeta') || e.target.closest('.header-right')) return;
        xDown = e.touches[0].clientX; yDown = e.touches[0].clientY; activeCard = el; 
      }, {passive: true});
    
      el.addEventListener('touchmove', e => {
        if(!xDown || !activeCard) return;
        let xDiff = xDown - e.touches[0].clientX;
        let yDiff = yDown - e.touches[0].clientY;
      
        if (Math.abs(xDiff) > Math.abs(yDiff)) {
          if(Math.abs(xDiff) > 30) {
            activeCard.style.transform = `translateX(${-xDiff * 0.4}px)`;
            if(xDiff > 110) { activeCard.closest('.card').classList.add('swipe-ready-delete'); }
            else if(xDiff < -110) { activeCard.closest('.card').classList.add('swipe-ready-edit'); }
            else { activeCard.closest('.card').classList.remove('swipe-ready-delete', 'swipe-ready-edit'); }
          }
        }
      }, {passive: true});
    
      el.addEventListener('touchend', e => {
        if(!xDown || !activeCard) return;
        let xDiff = xDown - e.changedTouches[0].clientX;
        const fila = activeCard.closest('.card').getAttribute('data-fila');
        const nombre = activeCard.closest('.card').getAttribute('data-nombre');
      
        activeCard.style.transform = 'translateX(0)';
        activeCard.closest('.card').classList.remove('swipe-ready-delete', 'swipe-ready-edit');
      
        if(xDiff > 110) { setTimeout(() => app.borrarPacienteDirecto(fila, nombre), 100); }
        else if(xDiff < -110) { setTimeout(() => app.abrirModal(fila), 100); }
      
        xDown = null; activeCard = null;
      });
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
        document.getElementById('reloadIcon')?.classList.add('spin');
        app.render(state.pacientesGlobal);
        setTimeout(() => document.getElementById('reloadIcon')?.classList.remove('spin'), 800);
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
