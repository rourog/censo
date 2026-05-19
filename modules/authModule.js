/*
  MÓDULO: authModule.js

  RESPONSABILIDAD:
  - Login con un solo usuario operativo Firebase.
  - Logout.
  - Pantalla de login y arranque seguro de Auth.

  NO DEBE:
  - Contener contraseñas.
  - Renderizar tarjetas/tabla.
  - Tocar reglas clínicas de camas.
*/

export function createAuthModule(app) {
  const { state } = app;
  const {
    auth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
  } = app.firebase;
  const { vibrar } = app.utils;

  const AUTH_EMAIL_INTERNO = 'interno@hrd.censo';
  let authInitialResponded = false;

  function setLoginLoading(texto = 'CARGANDO...') {
    const inputNip = document.getElementById('nipInput');
    const btn = document.getElementById('btnEnter');

    if (inputNip) inputNip.disabled = true;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spin material-symbols-outlined" style="margin-right: 6px;">sync</span> ${texto}`;
    }
  }

  function enableLoginControls() {
    const inputNip = document.getElementById('nipInput');
    const btn = document.getElementById('btnEnter');

    if (inputNip) {
      inputNip.disabled = false;
      inputNip.value = '';
    }

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'ENTRAR';
    }
  }

  function showMainApp() {
    const loginScreen = document.getElementById('loginScreen');
    const mainAppContainer = document.getElementById('mainAppContainer');
    const mainFabBtn = document.getElementById('mainFabBtn');

    if (loginScreen) loginScreen.classList.remove('active');
    if (mainAppContainer) mainAppContainer.style.display = 'flex';
    if (mainFabBtn) {
      mainFabBtn.style.display = state.currentViewMode === 'table' && window.innerWidth >= 768 ? 'none' : 'flex';
    }

    if (!state.unsubscribe) app.initFirebaseListener();
    setTimeout(app.initPlexus, 100);
  }

  function showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const mainAppContainer = document.getElementById('mainAppContainer');
    const mainFabBtn = document.getElementById('mainFabBtn');

    if (loginScreen) loginScreen.classList.add('active');
    if (mainAppContainer) mainAppContainer.style.display = 'none';
    if (mainFabBtn) mainFabBtn.style.display = 'none';

    enableLoginControls();

    if (state.unsubscribe) {
      state.unsubscribe();
      state.unsubscribe = null;
    }

    state.pacientesGlobal = [];
    state.camasLibresGlobal = [];
    state.isFetchingData = false;
    app.render([]);
  }

  function bindAuthEvents() {
    const btnEnter = document.getElementById('btnEnter');
    const nipInput = document.getElementById('nipInput');
    const btnLogout = document.getElementById('btnLogoutBtn');

    if (btnEnter) {
      btnEnter.addEventListener('click', async () => {
        const nip = nipInput ? nipInput.value.trim() : '';

        if (!nip) {
          vibrar([50, 50, 50]);
          alert('Por favor ingresa el código.');
          return;
        }

        try {
          btnEnter.disabled = true;
          btnEnter.innerHTML = '<span class="spin material-symbols-outlined">sync</span> CARGANDO...';

          // No se compara la contraseña en el frontend.
          // Firebase Auth valida el password real del usuario interno@hrd.censo.
          await signInWithEmailAndPassword(auth, AUTH_EMAIL_INTERNO, nip);
        } catch (error) {
          console.error('Error de login:', error);
          vibrar([50, 50, 50]);
          alert('Código incorrecto o error de red. Intenta de nuevo.');
          enableLoginControls();
        }
      });
    }

    if (nipInput) {
      nipInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnEnter?.click();
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        vibrar(15);
        if (!confirm('¿Seguro que deseas cerrar la sesión?')) return;

        try {
          await signOut(auth);
        } catch (error) {
          console.error('Error al cerrar sesión:', error);
          alert('No se pudo cerrar sesión: ' + error.message);
        }
      });
    }
  }

  async function bootAuth() {
    setLoginLoading('CARGANDO...');

    try {
      await Promise.race([
        setPersistence(auth, browserLocalPersistence),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout configurando persistencia local')), 3000))
      ]);
    } catch (error) {
      console.warn('No se pudo fijar persistencia local. Se continúa con la persistencia disponible:', error);
    }

    const fallbackTimer = setTimeout(() => {
      if (authInitialResponded) return;
      authInitialResponded = true;
      console.warn('Firebase Auth no respondió a tiempo. Se habilita login manual para evitar pantalla congelada.');
      showLoginScreen();
    }, 8000);

    onAuthStateChanged(auth, (user) => {
      if (!authInitialResponded) {
        authInitialResponded = true;
        clearTimeout(fallbackTimer);
      }

      if (user) {
        state.rolUsuario = 'INTERNO';
        showMainApp();
      } else {
        showLoginScreen();
      }
    }, (error) => {
      if (!authInitialResponded) {
        authInitialResponded = true;
        clearTimeout(fallbackTimer);
      }

      console.error('Error inicializando Firebase Auth:', error);
      showLoginScreen();
    });
  }

  return {
    setLoginLoading,
    enableLoginControls,
    showMainApp,
    showLoginScreen,
    bindAuthEvents,
    bootAuth
  };
}
