/*
  MÓDULO: patientModule.js

  RESPONSABILIDAD:
  - Escuchar Firestore.
  - Normalizar pacientes entrantes.
  - Ordenar pacientes.
  - Calcular camas libres usando bedModule.

  NO DEBE:
  - Construir HTML.
  - Abrir modales.
  - Manejar login.
*/

export function createPatientModule(app) {
  const { state } = app;
  const { db, collection, onSnapshot } = app.firebase;
  const { masterCamas, limpiarNombreCama } = app.bed;
  const { escapeHtml } = app.utils;

  const PATIENT_TEXT_FIELDS = [
    'nombre',
    'edad',
    'diagnostico',
    'pendientes',
    'destino',
    'cama',
    'area',
    'observacion',
    'observacionAlerta'
  ];

  function toSafeText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;

    try {
      return String(value);
    } catch (error) {
      console.warn('[CENSO] No se pudo convertir un campo de paciente a texto:', error);
      return '';
    }
  }

  function toValidDate(value) {
    if (!value) return null;

    try {
      const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.warn('[CENSO] Fecha de ingreso inválida:', value, error);
      return null;
    }
  }

  function normalizePatient(docSnapshot) {
    const rawData = docSnapshot.data() || {};
    const data = { ...rawData, fila: docSnapshot.id };

    PATIENT_TEXT_FIELDS.forEach((field) => {
      data[field] = toSafeText(data[field]);
    });

    const fechaObj = toValidDate(data.creado);
    if (fechaObj) {
      const dStr = fechaObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).toUpperCase();
      const tStr = fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
      data.fechaIngresoFormateada = `${escapeHtml(dStr)}<br><span style="opacity:0.65; font-size:0.9em;">${escapeHtml(tStr)}</span>`;

      const tzOffset = fechaObj.getTimezoneOffset() * 60000;
      data.fechaIngresoISO = new Date(fechaObj.getTime() - tzOffset).toISOString().slice(0, 16);
    } else {
      data.fechaIngresoFormateada = '-';
      data.fechaIngresoISO = '';
    }

    if (data.cama) data.cama = limpiarNombreCama(data.cama);
    return data;
  }

  function setReloadState({ loading = false, error = null } = {}) {
    const reloadIcon = document.getElementById('reloadIcon');
    const reloadBtn = document.getElementById('reloadBtn');

    reloadIcon?.classList.toggle('spin', loading);

    if (reloadIcon) reloadIcon.style.color = error ? 'var(--error-text)' : '';
    if (reloadBtn) {
      reloadBtn.title = error
        ? 'SIN CONEXIÓN: se conservan los últimos datos recibidos. Presiona para reintentar.'
        : 'Recargar censo';
      reloadBtn.setAttribute('aria-label', error ? 'Sin conexión. Reintentar' : 'Recargar');
    }
  }

  function handleListenerError(error) {
    state.isFetchingData = false;
    setReloadState({ error });
    console.error('[CENSO] Error en la escucha de pacientes:', error);

    if (state.pacientesGlobal.length === 0) app.mostrarError(error);
  }

  function initFirebaseListener() {
    if (state.unsubscribe) {
      state.unsubscribe();
      state.unsubscribe = null;
    }

    state.isFetchingData = true;
    setReloadState({ loading: true });

    try {
      state.unsubscribe = onSnapshot(collection(db, 'pacientes'), (snapshot) => {
        try {
          const nextPatients = [];
          const occupiedBeds = new Set();

          snapshot.forEach((docSnapshot) => {
            try {
              const data = normalizePatient(docSnapshot);

              if (data.cama) {
                const areaName = data.area.toUpperCase().trim();
                occupiedBeds.add(`${areaName}|${data.cama}`);
              }

              nextPatients.push(data);
            } catch (error) {
              console.error(`[CENSO] Se omitió el paciente ${docSnapshot.id} por datos inválidos:`, error);
            }
          });

          const ordenCamas = masterCamas.map(c => c.cama.toUpperCase().trim());

          nextPatients.sort((a, b) => {
            let idxA = ordenCamas.indexOf(a.cama.toUpperCase().trim());
            let idxB = ordenCamas.indexOf(b.cama.toUpperCase().trim());

            idxA = idxA === -1 ? 9999 : idxA;
            idxB = idxB === -1 ? 9999 : idxB;

            if (idxA !== idxB) return idxA - idxB;

            const dateA = toValidDate(a.creado)?.getTime() || 0;
            const dateB = toValidDate(b.creado)?.getTime() || 0;
            return dateB - dateA;
          });

          state.pacientesGlobal = nextPatients;
          state.camasLibresGlobal = masterCamas
            .filter((c) => {
              const areaName = c.area.toUpperCase().trim();
              const camaName = c.cama.toUpperCase().trim();
              return !occupiedBeds.has(`${areaName}|${camaName}`);
            })
            .map((c, i) => ({ ...c, fila: `cama_libre_${i}` }));

          state.isFetchingData = false;
          setReloadState();

          if (window.isInlineEditing) {
            window.pendingSnapshotList = [...state.pacientesGlobal];
            return;
          }

          app.filtrar();
        } catch (error) {
          handleListenerError(error);
        }
      }, handleListenerError);
    } catch (error) {
      handleListenerError(error);
    }
  }

  return { initFirebaseListener };
}
