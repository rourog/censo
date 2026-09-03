import { SOUND_USERS, SOUND_ICONS, MAX_SOUNDS, defaultSounds, parseMyinstantsLink, validateSounds, changeSounds } from './soundCatalog.js?v=admin-sonidos-v4-20260903';

const ADMIN_SESSION = 'censo-newsbar-admin-session-v1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function createSoundboardModule(app) {
  const { db, auth, collection, doc, onSnapshot, onAuthStateChanged, runTransaction, serverTimestamp } = app.firebase;
  const configs = new Map();
  const activated = new Set();
  const signatures = new Map();
  let authUnsubscribe = null;
  let dataUnsubscribe = null;
  let currentUid = null;
  let syncState = 'loading';
  let syncError = '';
  let unlocked = false;
  let busy = false;
  let currentAudio = null;
  let admin = null;

  const soundsFor = user => (configs.has(user) ? configs.get(user) : defaultSounds(user)).map(s => ({ ...s }));

  function stopSound() {
    const active = currentAudio;
    currentAudio = null;
    if (!active) return;
    active.audio.pause();
    active.audio.currentTime = 0;
    if (active.button) {
      active.button.setAttribute('aria-pressed', 'false');
      active.button.title = active.sound.name;
    }
  }

  function playSound(sound, button, scope = 'preview') {
    const same = currentAudio?.button === button;
    stopSound();
    if (same) return;
    const audio = new Audio();
    audio.preload = 'none';
    audio.src = sound.url;
    currentAudio = { audio, button, sound, scope };
    button?.setAttribute('aria-pressed', 'true');
    if (button) button.title = `${sound.name} · Pulsar para detener`;
    const failed = () => {
      if (currentAudio?.audio !== audio) return;
      stopSound();
      if (button) button.title = `${sound.name} · No se pudo reproducir; pulsa para reintentar`;
      if (scope === 'preview' && admin) admin.message.textContent = 'No se pudo reproducir. Comprueba el enlace MP3 y la conexión.';
    };
    audio.addEventListener('error', failed, { once: true });
    audio.addEventListener('ended', () => { if (currentAudio?.audio === audio) stopSound(); }, { once: true });
    try { Promise.resolve(audio.play()).catch(failed); } catch { failed(); }
  }

  function stopSoundPreview() { if (currentAudio?.scope === 'preview') stopSound(); }

  function renderBoard(user) {
    const sounds = soundsFor(user);
    const signature = JSON.stringify(sounds);
    if (signatures.get(user) === signature) return;
    const id = `${user}Soundboard`;
    let board = document.getElementById(id);
    if (!board && sounds.length) {
      const host = document.getElementById('alfrojasSoundboard')?.parentElement || document.querySelector('.header-top .header-left');
      if (!host) return;
      board = document.createElement('div');
      board.id = id;
      host.appendChild(board);
    }
    if (!board) return;
    if (currentAudio?.scope === user) stopSound();
    board.replaceChildren(); // Retira también los onclick antiguos de ALFROJAS.
    board.setAttribute('role', 'group');
    board.setAttribute('aria-label', `Sonidos de ${user.toUpperCase()}`);
    board.style.cssText = 'align-items: center; gap: 6px; margin-left: 4px; padding: 2px 4px; min-width: 0; max-width: min(260px, 34vw); overflow-x: auto; scrollbar-width: thin;';
    board.style.display = sounds.length ? 'flex' : 'none';
    sounds.forEach(sound => {
      const button = document.createElement('button');
      button.className = 'icon-btn sound-btn';
      button.type = 'button'; button.title = sound.name;
      button.setAttribute('aria-label', sound.name);
      button.setAttribute('aria-pressed', 'false');
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined'; icon.textContent = sound.icon;
      icon.setAttribute('aria-hidden', 'true');
      button.appendChild(icon);
      button.addEventListener('click', event => { event.stopPropagation(); playSound(sound, button, user); });
      board.appendChild(button);
    });
    signatures.set(user, signature);
  }

  function activateSoundboard(user) {
    if (!SOUND_USERS.includes(user)) return;
    activated.add(user);
    renderBoard(user);
  }

  function notify() {
    for (const user of activated) renderBoard(user);
    renderAdmin();
  }

  function listen() {
    dataUnsubscribe?.();
    dataUnsubscribe = null;
    syncState = 'loading'; syncError = ''; renderAdmin();
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    dataUnsubscribe = onSnapshot(collection(db, 'soundboards'), snapshot => {
      if (currentUid !== uid) return;
      try {
        const next = new Map();
        for (const entry of snapshot.docs) {
          if (SOUND_USERS.includes(entry.id)) next.set(entry.id, validateSounds(entry.data().sounds));
        }
        configs.clear(); next.forEach((value, key) => configs.set(key, value));
        syncState = 'ready'; syncError = ''; notify();
      } catch (error) { syncState = 'error'; syncError = error.message; renderAdmin(); }
    }, () => {
      if (currentUid !== uid) return;
      syncState = 'error';
      syncError = 'No se pudo sincronizar la configuración. Comprueba la conexión y que la actualización esté instalada por completo.';
      renderAdmin();
    });
  }

  function initSoundboardAuthBridge() {
    if (authUnsubscribe) return;
    authUnsubscribe = onAuthStateChanged(auth, user => {
      const uid = user?.uid || null;
      if (uid === currentUid) return;
      currentUid = uid;
      dataUnsubscribe?.(); dataUnsubscribe = null;
      configs.clear(); signatures.clear();
      if (user) listen();
      else {
        unlocked = false;
        sessionStorage.removeItem(ADMIN_SESSION);
        stopSound();
        for (const key of SOUND_USERS) {
          const board = document.getElementById(`${key}Soundboard`);
          if (board) board.style.display = 'none';
        }
        activated.clear();
        syncState = 'loading'; renderAdmin();
      }
    });
  }

  function setSoundAdminUnlocked(value) {
    unlocked = Boolean(value);
    if (!unlocked) stopSoundPreview();
    renderAdmin();
  }

  async function mutate(user, action) {
    if (!unlocked || !auth.currentUser || sessionStorage.getItem(ADMIN_SESSION) !== '1') throw new Error('Desbloquea la administración para guardar sonidos.');
    if (!SOUND_USERS.includes(user)) throw new Error('Usuario no reconocido.');
    if (syncState !== 'ready') throw new Error('Espera a que termine la sincronización.');
    const uid = auth.currentUser.uid;
    const ref = doc(db, 'soundboards', user);
    // La lista se lee y modifica en una transacción: dos equipos no pueden añadir un noveno sonido.
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      if (!unlocked || auth.currentUser?.uid !== uid || sessionStorage.getItem(ADMIN_SESSION) !== '1') throw new Error('La administración se bloqueó. Vuelve a entrar.');
      const current = snapshot.exists() ? validateSounds(snapshot.data().sounds) : defaultSounds(user);
      const sounds = changeSounds(current, action);
      transaction.set(ref, { sounds, updatedBy: uid, updatedAt: serverTimestamp() });
    });
  }

  function resolveFormAudio() {
    const parsed = parseMyinstantsLink(admin.link.value);
    if (parsed.audioUrl) return parsed.audioUrl;
    const direct = parseMyinstantsLink(admin.direct.value);
    if (!direct.audioUrl || direct.pageUrl) throw new Error('En el segundo campo pega la dirección de «Descargar MP3».');
    return direct.audioUrl;
  }

  function updateLinkHelp() {
    admin.direct.value = ''; admin.help.hidden = true; admin.direct.required = false;
    try {
      const parsed = parseMyinstantsLink(admin.link.value);
      if (parsed.pageUrl && !parsed.audioUrl) {
        admin.help.hidden = false; admin.direct.required = true;
        admin.open.href = parsed.pageUrl;
      }
    } catch { /* El error se presenta al probar o guardar. */ }
  }

  function mountSoundAdmin(container) {
    if (admin || !container) return;
    container.innerHTML = `
      <div class="censo-newsmodal__field"><label for="censoSoundUser">Usuario</label>
        <select id="censoSoundUser">${SOUND_USERS.map(u => `<option value="${u}">${u.toUpperCase()}</option>`).join('')}</select></div>
      <p id="censoSoundStatus" class="censo-newsmodal__copy" role="status"></p>
      <button id="censoSoundRetry" class="censo-newsmodal__button" type="button" hidden>Reintentar conexión</button>
      <div class="censo-sound-heading"><strong>Sonidos</strong><span id="censoSoundCount"></span></div>
      <div id="censoSoundList" class="censo-newsadmin-list"></div>
      <form id="censoSoundForm" class="censo-sound-form">
        <div class="censo-newsmodal__field"><label for="censoSoundName">Nombre del sonido</label><input id="censoSoundName" maxlength="48" required placeholder="Ej. Anime Wow"></div>
        <div class="censo-newsmodal__field"><label for="censoSoundLink">Enlace de Myinstants</label><input id="censoSoundLink" type="url" maxlength="2048" required placeholder="https://www.myinstants.com/…"></div>
        <div id="censoSoundHelp" hidden>
          <p class="censo-newsmodal__copy">Este enlace abre una página. <a id="censoSoundOpen" target="_blank" rel="noopener noreferrer">Abre el sonido</a>, copia la dirección del botón <strong>Descargar MP3</strong> y pégala aquí.</p>
          <div class="censo-newsmodal__field"><label for="censoSoundDirect">Enlace directo al MP3</label><input id="censoSoundDirect" type="url" maxlength="2048" placeholder="https://www.myinstants.com/media/sounds/….mp3"></div>
        </div>
        <div class="censo-newsmodal__field"><label for="censoSoundIcon">Icono</label><select id="censoSoundIcon">${SOUND_ICONS.map((i, n) => `<option value="${i}">${['🎵 Música', '📣 Grito', '✨ Sorpresa', '❤️ Corazón', '🐾 Animal', '👋 Saludo', '🧠 Mente', '💤 Sueño', '🐛 Bicho', '🤖 Robot', '🗣️ Voz', '⚠️ Error', '⏻ Apagar'][n]}</option>`).join('')}</select></div>
        <p id="censoSoundMessage" class="censo-newsmodal__copy" role="status" aria-live="polite"></p>
        <div class="censo-newsmodal__actions"><button id="censoSoundPreview" class="censo-newsmodal__button" type="button" aria-pressed="false">Probar / detener</button><button id="censoSoundAdd" class="censo-newsmodal__button censo-newsmodal__button--primary" type="submit">Agregar sonido</button></div>
      </form>`;
    const get = suffix => document.getElementById(`censoSound${suffix}`);
    admin = Object.fromEntries(['User', 'Status', 'Retry', 'Count', 'List', 'Form', 'Name', 'Link', 'Help', 'Open', 'Direct', 'Icon', 'Message', 'Preview', 'Add'].map(s => [s.toLowerCase(), get(s)]));
    admin.user.addEventListener('change', () => { stopSoundPreview(); admin.form.reset(); admin.help.hidden = true; admin.direct.required = false; admin.message.textContent = ''; renderAdmin(); });
    admin.link.addEventListener('input', updateLinkHelp);
    admin.retry.addEventListener('click', listen);
    admin.preview.addEventListener('click', () => {
      if (!unlocked) return;
      try { playSound({ name: admin.name.value.trim() || 'Vista previa', url: resolveFormAudio() }, admin.preview); }
      catch (error) { admin.message.textContent = error.message; }
    });
    admin.form.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return;
      const user = admin.user.value;
      try {
        const sound = { id: crypto.randomUUID(), name: admin.name.value.trim(), url: resolveFormAudio(), icon: admin.icon.value };
        validateSounds([sound]);
        busy = true; renderAdmin(); admin.message.textContent = 'Guardando…';
        await mutate(user, { type: 'add', sound });
        stopSoundPreview();
        if (admin.user.value === user) { admin.form.reset(); admin.help.hidden = true; admin.direct.required = false; }
        admin.message.textContent = `Sonido agregado a ${user.toUpperCase()}.`;
      } catch (error) { admin.message.textContent = saveError(error); }
      finally { busy = false; renderAdmin(); }
    });
    admin.list.addEventListener('click', async event => {
      const button = event.target.closest('[data-sound-action]');
      if (!button || busy || !unlocked) return;
      const user = admin.user.value;
      const sound = soundsFor(user).find(s => s.id === button.dataset.soundId);
      if (!sound) return;
      if (button.dataset.soundAction === 'play') { playSound(sound, button); return; }
      try {
        busy = true; renderAdmin(); admin.message.textContent = 'Quitando sonido…';
        await mutate(user, { type: 'remove', id: sound.id });
        stopSoundPreview();
        admin.message.textContent = `Sonido retirado de ${user.toUpperCase()}.`;
      } catch (error) { admin.message.textContent = saveError(error); }
      finally { busy = false; renderAdmin(); }
    });
    renderAdmin();
  }

  function saveError(error) {
    if (String(error.code || '').includes('permission-denied')) return 'No se pudo guardar: falta habilitar la configuración de sonidos en Firebase.';
    if (String(error.code || '').includes('unavailable')) return 'No se guardó el cambio. Comprueba la conexión e inténtalo de nuevo.';
    return error.message || 'No se pudo guardar el cambio.';
  }

  function renderAdmin() {
    if (!admin) return;
    const user = admin.user.value || SOUND_USERS[0];
    const sounds = soundsFor(user);
    admin.status.textContent = syncState === 'loading' ? 'Cargando configuración…' : syncState === 'error' ? syncError : 'Los cambios guardados se aplican en todos los equipos.';
    admin.retry.hidden = syncState !== 'error';
    admin.count.textContent = `${sounds.length} / ${MAX_SOUNDS}`;
    admin.user.disabled = busy;
    admin.add.disabled = busy || !unlocked || syncState !== 'ready' || sounds.length >= MAX_SOUNDS;
    admin.add.textContent = sounds.length >= MAX_SOUNDS ? 'Límite de 8 sonidos' : busy ? 'Guardando…' : 'Agregar sonido';
    admin.preview.disabled = !unlocked || busy;
    const signature = JSON.stringify([user, sounds, busy, unlocked, syncState]);
    if (admin.list.dataset.signature === signature) return;
    stopSoundPreview();
    admin.list.dataset.signature = signature;
    admin.list.innerHTML = sounds.length ? sounds.map(s => `<div class="censo-newsadmin-item censo-sound-item"><div><span class="material-symbols-outlined" aria-hidden="true">${esc(s.icon)}</span><strong>${esc(s.name)}</strong></div><div class="censo-sound-actions"><button type="button" class="censo-newsmodal__button" data-sound-action="play" data-sound-id="${esc(s.id)}" aria-label="Probar ${esc(s.name)}" aria-pressed="false" ${unlocked && !busy ? '' : 'disabled'}>▶</button><button type="button" class="censo-newsmodal__button censo-newsmodal__button--danger" data-sound-action="remove" data-sound-id="${esc(s.id)}" ${unlocked && !busy && syncState === 'ready' ? '' : 'disabled'}>Quitar</button></div></div>`).join('') : '<p class="censo-news-empty">Este usuario no tiene sonidos. Puedes agregar hasta ocho.</p>';
  }

  return { initSoundboardAuthBridge, activateSoundboard, mountSoundAdmin, setSoundAdminUnlocked, stopSoundPreview,
    getUserSounds: soundsFor };
}
