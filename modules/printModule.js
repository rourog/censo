/*
  MÓDULO: printModule.js

  RESPONSABILIDAD:
  - Generar una vista de impresión independiente del censo.
  - Imprimir únicamente: cama, ingreso, paciente, edad, diagnóstico y pendientes.
  - No hablar con Firebase.
*/

export function createPrintModule(app) {
  const { state } = app;
  const { escapeHtml } = app.utils;
  const { agruparPorArea } = app.bed;

  const ORDEN_AREAS = [
    'SALA DE CHOQUE',
    'OBSERVACIÓN', 'OBSERVACION',
    'TRAUMA MENOR',
    'PEDIATRÍA', 'PEDIATRIA',
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

  function generarFilas(lista) {
    const grupos = agruparPorArea(lista);
    const areas = ordenarAreas(Object.keys(grupos));
    const filas = [];

    areas.forEach((area) => {
      filas.push(`<tr class="area-row"><td colspan="6">${escapeHtml(area)}</td></tr>`);

      grupos[area].forEach((p) => {
        filas.push(`
          <tr>
            <td class="cama">${escapeHtml(p.cama || '-')}</td>
            <td class="ingreso">${escapeHtml(limpiarIngreso(p.fechaIngresoFormateada))}</td>
            <td class="paciente">${escapeHtml(p.nombre || '-')}</td>
            <td class="edad">${escapeHtml(p.edad || '-')}</td>
            <td class="diagnostico">${escapeHtml(p.diagnostico || '-')}</td>
            <td class="pendientes">${escapeHtml(p.pendientes || '-')}</td>
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
    .cama { width: 9%; text-align: center; font-weight: 700; }
    .ingreso { width: 10%; text-align: center; font-size: 8pt; }
    .paciente { width: 18%; font-weight: 700; }
    .edad { width: 7%; text-align: center; }
    .diagnostico { width: 28%; }
    .pendientes { width: 28%; }
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
    </tr></thead>
    <tbody>${generarFilas(lista)}</tbody>
  </table>` : '<div class="empty">NO HAY PACIENTES EN EL CENSO.</div>'}
</body>
</html>`;
  }

  function imprimirCenso() {
    const lista = Array.isArray(state.pacientesGlobal) ? state.pacientesGlobal : [];
    const ventana = window.open('', '_blank', 'noopener,noreferrer');

    if (!ventana) {
      window.alert('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para este sitio e inténtalo de nuevo.');
      return;
    }

    ventana.document.open();
    ventana.document.write(construirDocumentoImpresion(lista));
    ventana.document.close();

    const lanzarImpresion = () => {
      ventana.focus();
      ventana.print();
    };

    if (ventana.document.readyState === 'complete') lanzarImpresion();
    else ventana.addEventListener('load', lanzarImpresion, { once: true });
  }

  return {
    initPrintUi,
    construirDocumentoImpresion,
    imprimirCenso
  };
}
