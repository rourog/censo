/* Solicitudes locales: no escribe pacientes ni envía sus datos a servicios externos. */
const ASSET_BASE = new URL('../assets/subrogada/', import.meta.url);
const logos = { left: new URL('chihuahua.png', ASSET_BASE).href, right: new URL('ichisal.png', ASSET_BASE).href };
const legal = ["LEY DE ADQUISICIONES, ARRENDAMIENTOS Y CONTRATACIÓN DE SERVICIOS DEL ESTADO DE CHIHUAHUA", "Art 73.- los entes públicos podrán contratar a través de los procedimientos de invitación a cuando menos tres proveedores o de adjudicación directa cuando se presente alguno de los siguientes supuestos:", "…", "II. Peligre o se altere la vida de las personas, el orden social, la economía, los servicios públicos, la salubridad, la seguridad o el ambiente de alguna zona o región del Estado, como consecuencia de caso fortuito o de fuerza mayor, o que por estas mismas causas no sea posible obtener bienes o servicios mediante el procedimiento de licitación pública en el tiempo requerido para atender la eventualidad de que se trate.", "En esta lógica, tenemos que, como ente público, es inherente la obligación de realización progresiva (continua realización de acciones para la consecución del pleno goce de los derechos humanos) la cual prohíbe la inactividad del estado en su tarea de implementar acciones para lograr la protección integral de los derechos, sobre todo en aquellas materias donde la ausencia total de protección estatal coloca a las personas ante la inminencia de sufrir daño a su vida o su integridad personal. Este riesgo ocurre en relación con personas que no reciben atención médica adecuada."];
const printCSS = `
@page{size:letter;margin:13mm 25mm 18mm}
*{box-sizing:border-box}body{margin:0;background:white;color:black;font-family:"Arial Narrow","Nimbus Sans Narrow",Arial,sans-serif;font-stretch:condensed;font-size:11pt;line-height:1.12}
header{display:table;width:100%;table-layout:fixed;margin-bottom:17mm}header>div{display:table-cell;vertical-align:middle;text-align:center}header .left{width:32mm}header .right{width:29mm}header img{width:100%;height:auto;display:block}header .hospital{padding:0 2mm;font-size:10pt}header strong{display:block;font-size:11pt;margin-bottom:2mm}
h1{text-align:center;font-size:15pt;margin:0 0 8mm;font-weight:bold}
table.fields{border-collapse:collapse;width:100%;table-layout:fixed}table.fields td{border:0.5pt solid #777;padding:2mm;vertical-align:top;overflow-wrap:anywhere}td.label{width:35mm;font-weight:bold}tr{break-inside:avoid}table.fields .name{width:auto}.fields .age{width:34mm}.fields .date{text-align:right}.fields .service{min-height:10mm}.fields p{margin:0}.fields .details{margin-top:2mm}
.legal{margin-top:9mm;font-size:8pt;text-align:justify;line-height:1.12}.legal h2{font-size:8pt;margin:0 0 4mm}.legal p{margin:0 0 2mm}.legal p:first-of-type{font-weight:bold}.signatures{margin-top:9mm;border-top:0.7pt solid black;break-inside:avoid;display:table;width:100%;table-layout:fixed;text-align:center}.signature{display:table-cell;vertical-align:top;padding:2mm 1mm 0;font-size:10pt}.signature strong{display:block;font-size:10pt}.signature small{display:block;font-size:8pt;min-height:7mm}.signature .person{padding-top:9mm;overflow-wrap:anywhere}p{orphans:3;widows:3}
@media screen{body{max-width:216mm;margin:0 auto;padding:13mm 25mm 18mm}.print-actions{font-family:Arial,sans-serif;padding:12px 0 24px;display:flex;gap:12px}.print-actions button{padding:10px 16px}.print-actions span{font-size:12px}}
.print-flow{width:100%;border-collapse:collapse}.print-flow>tbody>tr{break-inside:auto}.print-content{padding:0}.print-flow>tfoot{display:table-footer-group}.footer-space{height:40mm;padding:0}
@media print{.print-actions{display:none}.signatures{display:flex;position:fixed;bottom:0;left:0;right:0;height:30mm;margin:0}.signature{display:block;position:relative;width:33.333%;height:30mm}.signature .person{padding-top:0;position:absolute;bottom:0;left:0;width:100%;padding-left:1mm;padding-right:1mm}}

`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])).replace(/\n/g,'<br>');
function sheet(data){return `<table class="print-flow"><tbody><tr><td class="print-content"><header><div class="left"><img src="${logos.left}" alt="Gobierno del Estado de Chihuahua"></div><div class="hospital"><strong>INSTITUTO CHIHUAHUENSE DE LA SALUD</strong>HOSPITAL REGIONAL DE DELICIAS</div><div class="right"><img src="${logos.right}" alt="ICHISAL"></div></header>
<h1>SOLICITUD DE SERVICIO SUBROGADO</h1>
<table class="fields"><colgroup><col style="width:35mm"><col><col style="width:34mm"></colgroup><tbody>
<tr><td class="label">Fecha:</td><td colspan="2" class="date">${esc(data.date)}</td></tr>
<tr><td class="label">Paciente:</td><td class="name">${esc(data.patient)}</td><td class="age">Edad: ${esc(data.age)} ${esc(data.unit)}</td></tr>
<tr><td class="label">Diagnóstico:</td><td colspan="2">${esc(data.diagnosis)}</td></tr>
<tr><td class="label">Servicio solicitado:</td><td colspan="2"><div class="service">${esc(data.service)}${data.details?'<p class="details">'+esc(data.details)+'</p>':''}</div></td></tr>
<tr><td class="label">Pronóstico con el servicio subrogado:</td><td colspan="2">${esc(data.prognosis)}</td></tr>
<tr><td class="label">Justificación:</td><td colspan="2">${esc(data.reason)}</td></tr></tbody></table>
<section class="legal"><h2>FUNDAMENTACIÓN:</h2>${legal.map(p=>'<p>'+esc(p)+'</p>').join('')}</section>
</td></tr></tbody><tfoot><tr><td class="footer-space"></td></tr></tfoot></table><div class="signatures"><div class="signature"><strong>MÉDICO TRATANTE</strong><small>&nbsp;</small><div class="person">${esc(data.doctor)}</div></div><div class="signature"><strong>ADMINISTRADOR</strong><small>HOSPITAL REGIONAL DE DELICIAS</small><div class="person">Ing. Carlos Antonio Lara hidalgo</div></div><div class="signature"><strong>DIRECTOR MÉDICO</strong><small>HOSPITAL REGIONAL DE DELICIAS</small><div class="person">Dr. Luis Chávez Guaderrama</div></div></div>`}

export function construirSolicitudSubrogada(data) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Solicitud de servicio subrogado</title><style>${printCSS}</style></head><body><div class="print-actions"><button id="imprimirSolicitud" type="button">Imprimir</button><span id="printStatus" role="status">Preparando impresión…</span></div>${sheet(data)}</body></html>`;
}

export const SERVICIOS_SUBROGADOS = Object.freeze({
  'Ambulancia': ['Ambulancia de traslado', 'Ambulancia de traslado con médico'],
  'Tomografía': ['Tomografía de cráneo simple', 'Tomografía de cráneo con contraste', 'Tomografía de tórax simple', 'Tomografía de tórax con contraste', 'Tomografía de abdomen simple', 'Tomografía de abdomen con contraste', 'Urotomografía', 'Urotomografía contrastada', 'Otro'],
  'Resonancia magnética': ['Resonancia magnética de cráneo simple', 'Resonancia magnética de cráneo con contraste', 'Resonancia magnética de columna cervical', 'Resonancia magnética de columna dorsal', 'Resonancia magnética de columna lumbar', 'Otro'],
  'Radiografía': ['Radiografía de tórax', 'Radiografía de abdomen', 'Otro'],
  'Otro': []
});
const MEDICOS = ['Dr. Rodrigo Ulises Rodriguez Garcia', 'Dra. Yessica Hernandez Gonzalez', 'Dr. Alfredo Rojas de la Peña'];
const MEDICO_KEY = 'censo.subrogada.medico.v1';
const BASE_REASON = 'No se cuenta con el servicio en la unidad.';
export function justificacionSubrogada(grupo) {
  if (grupo === 'Ambulancia') return 'Se solicita traslado a otra unidad para continuar con estudios y manejo que no pueden realizarse en esta unidad, a fin de garantizar diagnóstico y tratamiento oportuno.';
  if (!grupo || grupo === 'Otro') return BASE_REASON;
  return `${BASE_REASON} Se solicita estudio de imagen debido a la necesidad de una evaluación diagnóstica precisa que no puede obtenerse con estudios convencionales, lo cual permitirá orientar el manejo adecuado y oportuno del paciente.`;
}

// Se normaliza la copia inicial; las correcciones manuales del médico se respetan al imprimir.
export function capitalizarNombreSubrogada(value) {
  const particles = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'das', 'do', 'dos', 'van', 'von']);
  return String(value ?? '').trim().toLocaleLowerCase('es-MX').split(/\s+/).map((word, index) => {
    if (index > 0 && particles.has(word)) return word;
    return word.replace(/(^|[-'’])(\p{L})/gu, (_, prefix, letter) => prefix + letter.toLocaleUpperCase('es-MX'));
  }).join(' ');
}

const SIGLAS_DIAGNOSTICO = new Map([
  ...'DM DM1 DM2 HAS HTA EVC ACV AIT ERC IRA LRA IRC EPOC VIH SIDA SICA SCA IAM IAMCEST IAMSEST TCE IVU ITU CAD EHH SIRS STDA STDB TVP TEP TSV FA FV TV IC ICC IVAS NAC NAV SDRA SAOS LLA LMA LMC LES AR TB PCR VSR COVID COVID-19 SARS-COV-2 KDIGO NYHA GOLD CIE-10 I II III IV V VI VII VIII IX X'.split(' ').map(word => [word.toLowerCase(), word]),
  ['hba1c', 'HbA1c'], ['spo2', 'SpO2'], ['pao2', 'PaO2'], ['paco2', 'PaCO2'], ['ph', 'pH']
]);
export function formatoOracionSubrogada(value) {
  let text = String(value ?? '').trim().toLocaleLowerCase('es-MX');
  text = text.replace(/(^|[.!?]\s+|\n\s*)([^\p{L}\p{N}]*)(\p{L})/gu,
    (_, prefix, punctuation, letter) => prefix + punctuation + letter.toLocaleUpperCase('es-MX'));
  return text.replace(/[\p{L}\p{N}]+(?:[-][\p{L}\p{N}]+)*/gu, word => SIGLAS_DIAGNOSTICO.get(word.toLowerCase()) || word);
}

export function separarEdadSubrogada(value) {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*(a(?:ños|nos)?|mes(?:es)?|m|d(?:ías|ias)?)?$/i);
  if (!match) return { age: raw, unit: '' };
  const suffix = (match[2] || 'años').toLowerCase();
  return { age: match[1], unit: suffix.startsWith('m') ? 'meses' : suffix.startsWith('d') ? 'días' : 'años' };
}

export function createSubrogadaModule(app) {
  let dialog, form, status, origin, lastReason = BASE_REASON;
  const fields = () => form.elements;

  function cerrarSubrogada() {
    if (dialog?.open) dialog.close();
  }

  function actualizarExtras() {
    const f = fields();
    const otroServicio = f.type.value === 'Otro' || f.service.value === 'Otro';
    const otroMedico = f.doctor.value === 'Otro';
    dialog.querySelector('[data-other-service]').hidden = !otroServicio;
    f.otherService.required = otroServicio;
    if (!otroServicio) f.otherService.setCustomValidity('');
    dialog.querySelector('[data-other-doctor]').hidden = !otroMedico;
    f.otherDoctor.required = otroMedico;
    if (!otroMedico) f.otherDoctor.setCustomValidity('');
  }

  function actualizarServicios() {
    const f = fields(), grupo = f.type.value;
    const other = grupo === 'Otro';
    f.service.replaceChildren(new Option(grupo ? 'Seleccionar…' : 'Primero selecciona un grupo', ''), ...(SERVICIOS_SUBROGADOS[grupo] || []).map(s => new Option(s, s)));
    f.service.disabled = !grupo || other;
    f.service.required = Boolean(grupo) && !other;
    dialog.querySelector('[data-service]').hidden = other;
    dialog.querySelector('[data-service-label]').textContent = grupo === 'Ambulancia' ? 'Tipo de traslado' : 'Estudio';
    // Un destino o un servicio libre del grupo anterior no debe pasar al siguiente.
    f.otherService.value = '';
    f.details.value = '';
    const nextReason = justificacionSubrogada(grupo);
    if (!f.reason.value.trim() || f.reason.value === lastReason) f.reason.value = nextReason;
    lastReason = nextReason;
    actualizarExtras();
  }

  function initSubrogadaUi() {
    if (dialog) return;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    const cssUrl = new URL('./subrogada.css', import.meta.url);
    cssUrl.searchParams.set('v', window.CensoBuild?.version || 'runtime');
    css.href = cssUrl.href;
    document.head.append(css);
    dialog = document.createElement('dialog');
    dialog.id = 'subrogadaModal';
    dialog.setAttribute('aria-labelledby', 'subrogadaTitle');
    dialog.innerHTML = `
      <header class="subrogada-head"><div><h2 id="subrogadaTitle">Solicitud subrogada</h2><p id="subrogadaPatient"></p></div><button type="button" data-close class="modal-close" aria-label="Cerrar solicitud"><span class="material-symbols-outlined" aria-hidden="true">close</span></button></header>
      <form id="subrogadaForm" autocomplete="off">
        <div class="subrogada-grid">
          <label class="subrogada-full">Nombre<input name="patient" required maxlength="180"></label>
          <label>Edad<input name="age" required maxlength="60" inputmode="decimal"></label>
          <label>Unidad<select name="unit"><option value="años">Años</option><option value="meses">Meses</option><option value="días">Días</option><option value="">Según captura</option></select></label>
          <label class="subrogada-full">Diagnóstico<textarea name="diagnosis" rows="2" required maxlength="2000"></textarea></label>
          <label>Servicio solicitado<select name="type" required><option value="">Seleccionar grupo…</option>${Object.keys(SERVICIOS_SUBROGADOS).map(s => `<option>${esc(s)}</option>`).join('')}</select></label>
          <label data-service><span data-service-label>Estudio</span><select name="service" required disabled></select></label>
          <label class="subrogada-full" data-other-service hidden>Especificar servicio<input name="otherService" maxlength="500"></label>
          <label class="subrogada-full">Detalles / destino (opcional)<input name="details" maxlength="600" placeholder="Región, especificaciones o unidad de destino"></label>
          <label class="subrogada-full">Médico tratante<select name="doctor" required><option value="">Seleccionar médico…</option>${MEDICOS.map(s => `<option>${esc(s)}</option>`).join('')}<option>Otro</option></select></label>
          <label class="subrogada-full" data-other-doctor hidden>Nombre del médico<input name="otherDoctor" maxlength="180"></label>
          <label class="subrogada-full">Justificación<textarea name="reason" rows="3" required maxlength="3000"></textarea></label>
          <label class="subrogada-full">Pronóstico<input name="prognosis" required maxlength="500" value="Reservado a evolución"></label>
        </div>
        <p class="subrogada-hint">Los cambios se aplican solo a esta solicitud.</p>
        <div class="subrogada-actions"><button type="button" data-close class="btn-cancelar">Cerrar</button><button type="submit" class="btn-guardar"><span class="material-symbols-outlined" aria-hidden="true">print</span> Imprimir solicitud</button></div>
        <p class="subrogada-status" role="status" aria-live="polite"></p>
      </form>`;
    document.body.append(dialog);
    form = dialog.querySelector('form');
    status = dialog.querySelector('[role="status"]');
    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', cerrarSubrogada));
    dialog.addEventListener('close', () => {
      // No conservar datos de pacientes fuera de una solicitud abierta.
      form.reset();
      status.textContent = '';
      dialog.querySelector('#subrogadaPatient').textContent = '';
      if (origin?.isConnected) origin.focus();
    });
    // Escape nativo y navegación de selects pertenecen a este diálogo.
    dialog.addEventListener('keydown', event => event.stopPropagation());
    form.addEventListener('input', event => { event.target.setCustomValidity?.(''); status.textContent = ''; });
    form.addEventListener('change', () => { status.textContent = ''; });
    fields().type.addEventListener('change', actualizarServicios);
    fields().service.addEventListener('change', actualizarExtras);
    fields().doctor.addEventListener('change', actualizarExtras);
    form.addEventListener('submit', imprimirSubrogada);
  }

  function abrirSubrogada(fila, trigger = document.activeElement) {
    const patient = app.state.pacientesGlobal.find(p => String(p.fila) === String(fila));
    if (!patient) { window.alert('Este paciente ya no está disponible en el censo. Actualiza la lista.'); return; }
    initSubrogadaUi();
    origin = trigger;
    form.reset();
    const f = fields(), edad = separarEdadSubrogada(patient.edad);
    f.patient.value = capitalizarNombreSubrogada(patient.nombre);
    f.age.value = edad.age;
    f.unit.value = edad.unit;
    f.diagnosis.value = formatoOracionSubrogada(patient.diagnostico);
    f.reason.value = BASE_REASON;
    lastReason = BASE_REASON;
    status.textContent = '';
    for (const element of form.elements) element.setCustomValidity?.('');
    try {
      const previous = localStorage.getItem(MEDICO_KEY);
      if (previous && previous.length <= 180) {
        f.doctor.value = MEDICOS.includes(previous) ? previous : 'Otro';
        if (f.doctor.value === 'Otro') f.otherDoctor.value = previous;
      }
    } catch { /* El bloqueo de almacenamiento no impide crear una solicitud. */ }
    actualizarServicios();
    dialog.querySelector('#subrogadaPatient').textContent = patient.cama || 'Sin cama';
    if (!dialog.open) dialog.showModal();
    f.patient.focus();
  }

  function imprimirSubrogada(event) {
    event.preventDefault();
    const f = fields();
    for (const element of form.elements) {
      if (element.required && typeof element.value === 'string') element.setCustomValidity(element.value.trim() ? '' : 'Completa este campo.');
    }
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    for (const key of Object.keys(data)) data[key] = data[key].trim();
    data.service = data.type === 'Otro' || data.service === 'Otro' ? data.otherService : data.service;
    data.doctor = data.doctor === 'Otro' ? data.otherDoctor : data.doctor;
    data.date = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Chihuahua' }).format(new Date());
    // Abrir dentro del gesto del usuario evita el bloqueo de ventanas emergentes.
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      status.textContent = 'El navegador bloqueó la hoja de impresión. Permite ventanas emergentes para este sitio y vuelve a intentarlo.';
      return;
    }
    try { localStorage.setItem(MEDICO_KEY, data.doctor); } catch { /* Preferencia opcional. */ }
    printWindow.document.open();
    printWindow.document.write(construirSolicitudSubrogada(data));
    printWindow.document.close();
    const printStatus = printWindow.document.getElementById('printStatus');
    const printButton = printWindow.document.getElementById('imprimirSolicitud');
    let preparing = false;
    const print = async () => {
      if (preparing || printWindow.closed) return;
      preparing = true;
      printButton.disabled = true;
      try {
        await esperarRecursosSubrogada(printWindow.document);
        if (printWindow.closed) return;
        printStatus.textContent = 'Para volver al censo, cierra esta pestaña. Puedes guardar como PDF desde el diálogo de impresión.';
        printWindow.focus();
        printWindow.print();
      } catch {
        if (!printWindow.closed) printStatus.textContent = 'No se cargaron todos los logotipos. Revisa la conexión y vuelve a generar la solicitud desde el censo.';
      } finally {
        preparing = false;
        if (!printWindow.closed) printButton.disabled = false;
      }
    };
    printButton.addEventListener('click', print);
    void print();
    status.textContent = '';
    // Ni cerrar, ni resetear el formulario: ambulancia y estudio se imprimen por separado.
  }

  return { initSubrogadaUi, abrirSubrogada, cerrarSubrogada };
}

async function esperarRecursosSubrogada(doc) {
  const imageLoads = [...doc.images].map(image => new Promise((resolve, reject) => {
    if (image.complete) { image.naturalWidth ? resolve() : reject(new Error('Logo no disponible')); return; }
    const timer = setTimeout(() => reject(new Error('Tiempo de carga agotado')), 6000);
    image.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
    image.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Logo no disponible')); }, { once: true });
  }));
  await Promise.all([...imageLoads, doc.fonts?.ready || Promise.resolve()]);
}
