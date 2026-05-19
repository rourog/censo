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

  function initFirebaseListener() {
    state.isFetchingData = true;
    document.getElementById('reloadIcon').classList.add('spin');
  
    state.unsubscribe = onSnapshot(collection(db, "pacientes"), (snapshot) => {
      state.pacientesGlobal = [];
      let occupiedBeds = []; 

      snapshot.forEach((doc) => {
        let data = doc.data();
        data.fila = doc.id; 

        if (data.creado) {
          let fechaObj;
          if (typeof data.creado.toDate === 'function') {
            fechaObj = data.creado.toDate();
          } else {
            fechaObj = new Date(data.creado);
          }
        
          let dStr = fechaObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).toUpperCase();
          let tStr = fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
          data.fechaIngresoFormateada = `${escapeHtml(dStr)}<br><span style="opacity:0.65; font-size:0.9em;">${escapeHtml(tStr)}</span>`;

          const tzOffset = fechaObj.getTimezoneOffset() * 60000;
          data.fechaIngresoISO = (new Date(fechaObj - tzOffset)).toISOString().slice(0, 16);
        } else {
          data.fechaIngresoFormateada = '-';
          data.fechaIngresoISO = '';
        }

        if(data.cama) {
          data.cama = limpiarNombreCama(data.cama);
          let areaName = String(data.area || '').toUpperCase().trim();
          occupiedBeds.push(`${areaName}|${data.cama}`); 
        }

        state.pacientesGlobal.push(data);
      });

      const ordenCamas = masterCamas.map(c => c.cama.toUpperCase().trim());

      state.pacientesGlobal.sort((a, b) => {
          let idxA = ordenCamas.indexOf((a.cama || '').toUpperCase().trim());
          let idxB = ordenCamas.indexOf((b.cama || '').toUpperCase().trim());
        
          idxA = idxA === -1 ? 9999 : idxA;
          idxB = idxB === -1 ? 9999 : idxB;

          if (idxA !== idxB) {
              return idxA - idxB; 
          }

          let dateA = a.creado && typeof a.creado.toDate === 'function' ? a.creado.toDate().getTime() : 0;
          let dateB = b.creado && typeof b.creado.toDate === 'function' ? b.creado.toDate().getTime() : 0;
          return dateB - dateA; 
      });

      state.camasLibresGlobal = masterCamas.filter(c => {
          let areaName = c.area.toUpperCase().trim();
          let camaName = c.cama.toUpperCase().trim();
          return !occupiedBeds.includes(`${areaName}|${camaName}`);
      });

      state.camasLibresGlobal = state.camasLibresGlobal.map((c, i) => ({ ...c, fila: 'cama_libre_'+i }));

      state.isFetchingData = false;
    
      if (window.isInlineEditing) {
        window.pendingSnapshotList = [...state.pacientesGlobal];
        document.getElementById('reloadIcon').classList.remove('spin');
        return;
      }

      app.filtrar(); 
      document.getElementById('reloadIcon').classList.remove('spin');
    }, (error) => {
      state.isFetchingData = false;
      app.mostrarError(error);
      document.getElementById('reloadIcon').classList.remove('spin');
    });
  }

  return { initFirebaseListener };
}
