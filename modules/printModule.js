/*
  MÓDULO: printModule.js

  RESPONSABILIDAD:
  - Generar una vista de impresión independiente del censo.
  - Imprimir: cama, ingreso, paciente, edad, diagnóstico, pendientes y destino.
  - Esperar la carga de los SVG antes de abrir el diálogo de impresión.
  - No hablar con Firebase.
*/

export function createPrintModule(app) {
  const { state } = app;
  const { escapeHtml } = app.utils;
  const {
    agruparPorArea,
    areaVisuals,
    healthIcons,
    getDestinoActionIconPath,
    getDestinoIconPath,
    getDestinoTextLabel
  } = app.bed;

  const ORDEN_AREAS = [
    'SALA DE CHOQUE',
    'OBSERVACIÓN', 'OBSERVACION',
    'TRAUMA MENOR',
    'PEDIATRÍA', 'PEDIATRIA',
    'PEDILUVIO', "EFE'S",
    'EXTRAS',
    'SIN ÁREA ASIGNADA'
  ];

  function initPrintUi() {
    if (document.getElementById('printBtn')) return;
    const headerRight = document.querySelector('.header-right');
    const viewBtn = document.getElementById('viewToggleBtn');
    if (!headerRight) return;

    const button = document.createElement('button');
    button.id = 'printBtn';
    button.className = 'icon-btn hide-on-mobile';
    button.type = 'button';
    button.setAttribute('aria-label', 'Imprimir censo');
    button.title = 'Imprimir censo';
    button.innerHTML = '<span class="material-symbols-outlined">print</span>';

    if (viewBtn) headerRight.insertBefore(button, viewBtn);
    else headerRight.prepend(button);
  }

  function ordenarAreas(areas) {
    return [...areas].sort((a, b) => {
      const indexA = ORDEN_AREAS.indexOf(String(a).toUpperCase().trim());
      const indexB = ORDEN_AREAS.indexOf(String(b).toUpperCase().trim());
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      if (posA !== posB) return posA - posB;
      return String(a).localeCompare(String(b), 'es', { sensitivity: 'base' });
    });
  }

  function limpiarIngreso(value) {
    const texto = String(value || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    return texto || '-';
  }

  function normalizarClave(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }

  function iconUrl(path) {
    if (!path) return '';
    try {
      return new URL(path, window.location.href).href;
    } catch {
      return '';
    }
  }

  function iconImg(path, className = '') {
    const src = iconUrl(path);
    return src ? `<img class="print-icon ${className}" src="${escapeHtml(src)}" alt="">` : '';
  }

  function renderDestino(destino) {
    if (!destino) return '-';
    const label = getDestinoTextLabel(destino);
    const action = iconImg(getDestinoActionIconPath(destino), 'print-icon--action');
    const specialty = iconImg(getDestinoIconPath(destino));
    return `<span class="print-destination-icons">${action}${specialty}</span><span>${escapeHtml(label)}</span>`;
  }

  function generarFilas(lista) {
    const grupos = agruparPorArea(lista);
    const areas = ordenarAreas(Object.keys(grupos));
    const filas = [];

    areas.forEach((area) => {
      const key = normalizarClave(area);
      const visual = areaVisuals[key] || areaVisuals[String(area).toUpperCase()] || { icon: healthIcons.sinArea };
      filas.push(`<tr class="area-row"><td colspan="7">${iconImg(visual.icon, 'print-area-icon')}${escapeHtml(area)}</td></tr>`);

      grupos[area].forEach((p) => {
        filas.push(`
          <tr>
            <td class="cama">${escapeHtml(p.cama || '-')}</td>
            <td class="ingreso">${escapeHtml(limpiarIngreso(p.fechaIngresoFormateada))}</td>
            <td class="paciente">${escapeHtml(p.nombre || '-')}</td>
            <td class="edad">${escapeHtml(p.edad || '-')}</td>
            <td class="diagnostico">${escapeHtml(p.diagnostico || '-')}</td>
            <td class="pendientes">${escapeHtml(p.pendientes || '-')}</td>
            <td class="destino">${renderDestino(p.destino)}</td>
          </tr>`);
      });
    });

    return filas.join('');
  }

  function construirDocumentoImpresion(lista) {
    const fecha = new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date());

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Censo de Urgencias</title>
  <style>
    @page { size: landscape; margin: 9mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; }
    .print-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 7mm; }
    .print-header h1 { margin: 0; font-size: 16pt; letter-spacing: .04em; text-transform: uppercase; }
    .print-meta { text-align: right; font-size: 8pt; color: #444; line-height: 1.35; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { border: 1px solid #777; padding: 4px 5px; vertical-align: top; overflow-wrap: anywhere; word-break: normal; white-space: normal; }
    th { background: #e7e7e7; font-size: 8pt; text-transform: uppercase; text-align: left; }
    .area-row td { background: #d6d6d6; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 3px 5px; }
    .print-icon { width: 4.2mm; height: 4.2mm; object-fit: contain; vertical-align: -1.1mm; margin-right: 1.2mm; }
    .print-area-icon { width: 4.6mm; height: 4.6mm; vertical-align: -1.25mm; }
    .print-destination-icons { display: inline-flex; align-items: center; gap: .5mm; margin-right: 1mm; }
    .print-destination-icons .print-icon { margin-right: 0; }
    .print-icon--action { width: 3.7mm; height: 3.7mm; }
    .cama { width: 8%; text-align: center; font-weight: 700; }
    .ingreso { width: 9%; text-align: center; font-size: 8pt; }
    .paciente { width: 16%; font-weight: 700; }
    .edad { width: 6%; text-align: center; }
    .diagnostico { width: 24%; }
    .pendientes { width: 24%; }
    .destino { width: 13%; font-size: 7.5pt; font-weight: 600; }
    .empty { border: 1px solid #999; padding: 12mm; text-align: center; font-weight: 700; }
  </style>
</head>
<body>
  <header class="print-header">
    <div><h1>Censo de Urgencias</h1><div>Hospital Regional de Delicias</div></div>
    <div class="print-meta"><div>${lista.length} paciente${lista.length === 1 ? '' : 's'}</div><div>Impreso: ${escapeHtml(fecha)}</div></div>
  </header>
  ${lista.length ? `
  <table>
    <thead><tr>
      <th class="cama">Cama</th>
      <th class="ingreso">Ingreso</th>
      <th class="paciente">Paciente</th>
      <th class="edad">Edad</th>
      <th class="diagnostico">Diagnóstico</th>
      <th class="pendientes">Pendientes</th>
      <th class="destino">Destino</th>
    </tr></thead>
    <tbody>${generarFilas(lista)}</tbody>
  </table>` : '<div class="empty">NO HAY PACIENTES EN EL CENSO.</div>'}
</body>
</html>`;
  }

  function esperarImagenes(doc, timeoutMs = 3000) {
    const images = [...doc.images];
    if (!images.length) return Promise.resolve();

    return Promise.all(images.map(image => {
      if (image.complete) return Promise.resolve();
      return new Promise(resolve => {
        const finish = () => resolve();
        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });
        setTimeout(finish, timeoutMs);
      });
    }));
  }

  function imprimirCenso() {
    const lista = Array.isArray(state.pacientesGlobal) ? state.pacientesGlobal : [];
    const ventana = window.open('', '_blank');

    if (!ventana) {
      window.alert('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para este sitio e inténtalo de nuevo.');
      return;
    }

    ventana.document.open();
    ventana.document.write(construirDocumentoImpresion(lista));
    ventana.document.close();

    const lanzarImpresion = async () => {
      await esperarImagenes(ventana.document);
      ventana.focus();
      ventana.print();
    };

    if (ventana.document.readyState === 'complete') void lanzarImpresion();
    else ventana.addEventListener('load', () => void lanzarImpresion(), { once: true });
  }

  return {
    initPrintUi,
    construirDocumentoImpresion,
    imprimirCenso
  };
}
