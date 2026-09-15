const PARTS = 8;
const FETCH_TIMEOUT_MS = 8000;

const GROUPS = [
  ['transport','Accidentes de transporte'],
  ['falls','Caídas'],
  ['mechanical','Golpes, objetos y herramientas'],
  ['animals','Mordeduras y animales'],
  ['burns','Quemaduras, fuego y calor'],
  ['poison','Intoxicación accidental'],
  ['selfharm','Lesión autoinfligida'],
  ['assault','Agresión'],
  ['resp','Ahogamiento y otros riesgos respiratorios'],
  ['undetermined','Intención no determinada'],
  ['iatro','Atención médica y quirúrgica'],
  ['other','Otros mecanismos']
];

const SUBS = {
  transport:[['ped','Peatón'],['bike','Bicicleta'],['moto','Motocicleta'],['three','Vehículo de tres ruedas'],['car','Automóvil'],['pickup','Camioneta / furgoneta'],['heavy','Transporte pesado'],['bus','Autobús'],['other','Otros transportes']],
  falls:[['level','Mismo nivel'],['furniture','Cama, silla o muebles'],['stairs','Escaleras'],['height','Caída desde altura'],['unspec','Caída no especificada']],
  mechanical:[['hit','Golpe contra / por objeto'],['caught','Atrapamiento o aplastamiento'],['cut','Cortantes y herramientas'],['foreign','Cuerpo extraño / otros']],
  animals:[['dog','Perro'],['mammal','Otros mamíferos'],['insect','Insectos / no venenosos'],['venom','Animales o plantas venenosos']],
  burns:[['fire','Humo, fuego y llamas'],['liquid','Líquidos calientes'],['steam','Vapor, aire o gases calientes'],['object','Objetos o sustancias calientes']],
  poison:[['meds','Medicamentos'],['alcohol','Alcohol / solventes'],['chem','Gases / sustancias químicas'],['other','Otros / no especificados']],
  selfharm:[['meds','Medicamentos'],['hang','Ahorcamiento / estrangulación / sofocación'],['firearm','Arma de fuego'],['sharp','Objeto cortante'],['jump','Salto / objeto en movimiento / vehículo'],['other','Otros / no especificados']],
  assault:[['body','Fuerza corporal / riña'],['blunt','Objeto romo'],['sharp','Objeto cortante / arma blanca'],['firearm','Arma de fuego'],['other','Otros / no especificados']],
  resp:[['drown','Ahogamiento / sumersión'],['obstruct','Obstrucción / aspiración / sofocación'],['other','Otros riesgos respiratorios']],
  undetermined:[['poison','Envenenamiento'],['injury','Otros mecanismos']],
  iatro:[['drug','Fármacos / sustancias biológicas'],['procedure','Procedimientos médicos / quirúrgicos'],['device','Dispositivos / otras complicaciones']],
  other:[['all','Otros mecanismos']]
};

const PLACE_TAILS = [
  'VIVIENDA','INSTITUCION RESIDENCIAL','ESCUELAS, OTRAS INSTITUCIONES Y AREAS ADMINISTRATIVAS PUBLICAS',
  'AREAS DE DEPORTE Y ATLETISMO','CALLES Y CARRETERAS','COMERCIO Y AREA DE SERVICIOS',
  'AREA INDUSTRIAL Y DE LA CONSTRUCCION','GRANJA','OTRO LUGAR ESPECIFICADO','LUGAR NO ESPECIFICADO'
];

const SYN = {
  Y04:'RINA RIÑA PELEA GOLPES PUNETAZOS PUÑETAZOS PATADAS',
  Y00:'OBJETO ROMO CONTUNDENTE PALO TUBO PIEDRA',
  X99:'ARMA BLANCA CUCHILLO NAVAJA MACHETE PUNZOCORTANTE',
  X95:'ARMA DE FUEGO BALAZO DISPARO PAF',
  W01:'CAIDA PROPIA ALTURA TROPIEZO RESBALON',
  W10:'ESCALERA ESCALERAS ESCALONES',
  W19:'CAIDA NO ESPECIFICADA',
  W54:'MORDEDURA PERRO CANINO',
  V29:'MOTO MOTOCICLETA MOTOCICLISTA DERRAPE',
  V03:'ATROPELLO ATROPELLADO PEATON',
  X12:'QUEMADURA AGUA CALIENTE LIQUIDO CALIENTE',
  X64:'INTENTO SUICIDA MEDICAMENTOS SOBREDOSIS',
  X70:'INTENTO SUICIDA AHORCAMIENTO ESTRANGULAMIENTO',
  X78:'INTENTO SUICIDA CORTES OBJETO CORTANTE',
  X84:'INTENTO SUICIDA NO ESPECIFICADO'
};

let RAW = [];
let FAMILIES = [];
let selectedGroup = '';
let selectedSub = '';
let selectedFamily = '';
let selectedCode = '';
let selectedSearchCode = '';
let loadingPromise = null;
let searchTimer = null;

const $ = id => document.getElementById(id);
const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const famCode = code => (String(code).toUpperCase().match(/^([VWXY]\d{2})/) || [])[1] || String(code).slice(0,3);
const n2 = code => { const m = String(code).match(/^[VWXY](\d{2})/); return m ? +m[1] : -1; };
const letter = code => String(code)[0] || '';

function applySavedTheme() {
  const base = localStorage.getItem('censo-base') || 'base-dark';
  const accentRaw = localStorage.getItem('censo-accent') || 'accent-blue';
  const accent = accentRaw === 'accent-slate' ? 'accent-silver' : accentRaw;
  document.body.className = `${base} ${accent} cie10-page-body`;
}

function setStatus(text) { $('cie10Status').textContent = text; }
function setLoading(text) {
  $('cie10LoadingText').textContent = text;
  $('cie10Loading').hidden = false;
  $('cie10Error').hidden = true;
  $('cie10Explorer').hidden = true;
  $('cie10SearchResults').hidden = true;
  setStatus(text);
}

function showError(error) {
  console.error('[CENSO][CIE10-PAGE]', error);
  $('cie10Loading').hidden = true;
  $('cie10Explorer').hidden = true;
  $('cie10SearchResults').hidden = true;
  $('cie10ErrorText').textContent = error?.message || String(error);
  $('cie10Error').hidden = false;
  setStatus('Error al cargar el catálogo');
}

async function fetchPart(index) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = new URL(`./modules/cie10DataPart${index}.js`, import.meta.url);
    url.searchParams.set('v', 'standalone-20260914');
    const response = await fetch(url.href, { cache:'no-store', credentials:'same-origin', signal:controller.signal });
    if (!response.ok) throw new Error(`Fragmento ${index}: HTTP ${response.status}`);
    const source = await response.text();
    const match = source.match(/^\s*export\s+default\s+'([^']*)';\s*$/s);
    if (!match?.[1]) throw new Error(`Fragmento ${index} inválido`);
    return match[1];
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`Tiempo agotado al cargar el fragmento ${index}`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function inflateCatalog(encoded) {
  const bytes = base64ToBytes(encoded);
  if (window.pako?.ungzip) return window.pako.ungzip(bytes, { to:'string' });
  if (typeof DecompressionStream === 'function') {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }
  throw new Error('El navegador no dispone de un descompresor compatible.');
}

function groupFor(code) {
  const l = letter(code), n = n2(code);
  if (l === 'V') return 'transport';
  if (l === 'W' && n <= 19) return 'falls';
  if (l === 'W' && n >= 20 && n <= 49) return 'mechanical';
  if ((l === 'W' && n >= 50 && n <= 64) || (l === 'X' && n >= 20 && n <= 29)) return 'animals';
  if (l === 'W' && n >= 65 && n <= 84) return 'resp';
  if (l === 'X' && n >= 0 && n <= 19) return 'burns';
  if (l === 'X' && n >= 40 && n <= 59) return 'poison';
  if (l === 'X' && n >= 60 && n <= 84) return 'selfharm';
  if ((l === 'X' && n >= 85 && n <= 99) || (l === 'Y' && n >= 0 && n <= 9)) return 'assault';
  if (l === 'Y' && n >= 10 && n <= 34) return 'undetermined';
  if (l === 'Y' && n >= 40 && n <= 84) return 'iatro';
  return 'other';
}

function subFor(code, group) {
  const l = letter(code), n = n2(code);
  if (group === 'transport') {
    if (n <= 9) return 'ped'; if (n <= 19) return 'bike'; if (n <= 29) return 'moto';
    if (n <= 39) return 'three'; if (n <= 49) return 'car'; if (n <= 59) return 'pickup';
    if (n <= 69) return 'heavy'; if (n <= 79) return 'bus'; return 'other';
  }
  if (group === 'falls') {
    if (n <= 3 || n === 18) return 'level'; if (n >= 5 && n <= 9) return 'furniture';
    if (n >= 10 && n <= 12) return 'stairs'; if (n >= 13 && n <= 17) return 'height'; return 'unspec';
  }
  if (group === 'mechanical') {
    if (n >= 20 && n <= 22) return 'hit'; if (n === 23) return 'caught'; if (n >= 24 && n <= 31) return 'cut'; return 'foreign';
  }
  if (group === 'animals') {
    if (l === 'W' && n === 54) return 'dog'; if (l === 'W' && (n === 53 || n === 55)) return 'mammal';
    if (l === 'W') return 'insect'; return 'venom';
  }
  if (group === 'burns') { if (n <= 9) return 'fire'; if (n <= 12) return 'liquid'; if (n <= 14) return 'steam'; return 'object'; }
  if (group === 'poison') { if (n <= 44) return 'meds'; if (n === 45) return 'alcohol'; if (n <= 49) return 'chem'; return 'other'; }
  if (group === 'selfharm') {
    if (n <= 64) return 'meds'; if (n === 70 || n === 71) return 'hang'; if (n >= 72 && n <= 74) return 'firearm';
    if (n === 78 || n === 79) return 'sharp'; if (n >= 80 && n <= 82) return 'jump'; return 'other';
  }
  if (group === 'assault') {
    if (l === 'Y' && n === 4) return 'body'; if (l === 'Y' && n === 0) return 'blunt';
    if (l === 'X' && n === 99) return 'sharp'; if (l === 'X' && n >= 93 && n <= 95) return 'firearm'; return 'other';
  }
  if (group === 'resp') { if (n <= 74) return 'drown'; if (n <= 83) return 'obstruct'; return 'other'; }
  if (group === 'undetermined') return n <= 19 ? 'poison' : 'injury';
  if (group === 'iatro') { if (n <= 59) return 'drug'; if (n <= 69) return 'procedure'; return 'device'; }
  return 'all';
}

function cleanFamilyDesc(code, desc) {
  let text = String(desc || '').replace(new RegExp(`^${code}\\s*[A-Z0-9]?\\s*-\\s*`,'i'),'').trim();
  for (const tail of PLACE_TAILS) {
    const suffix = `, ${tail}`;
    if (norm(text).endsWith(norm(suffix))) { text = text.slice(0, -suffix.length).trim(); break; }
  }
  return text || desc || code;
}

function buildFamilies(raw) {
  const map = new Map();
  raw.forEach(item => {
    const family = famCode(item.code);
    if (!map.has(family)) map.set(family, []);
    map.get(family).push(item);
  });
  FAMILIES = [...map.entries()].map(([code, items]) => {
    const base = items.find(item => item.code === code) || items[0];
    const group = groupFor(code);
    return {
      code,
      desc: cleanFamilyDesc(code, base?.desc || ''),
      group,
      sub: subFor(code, group),
      items: items.slice().sort((a,b) => a.code.localeCompare(b.code,'es',{numeric:true}))
    };
  }).sort((a,b) => a.code.localeCompare(b.code,'es',{numeric:true}));
}

function groupLabel(id) { return GROUPS.find(([key]) => key === id)?.[1] || ''; }
function subLabel(group,id) { return (SUBS[group] || []).find(([key]) => key === id)?.[1] || ''; }

function makeItem({title, subtitle='', code='', meta='', selected=false, onClick}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `cie10-item${selected ? ' selected' : ''}`;
  const left = document.createElement('span');
  const main = document.createElement('div'); main.className = 'cie10-item-main';
  if (code) {
    const codeNode = document.createElement('span'); codeNode.className = 'cie10-item-code'; codeNode.textContent = `${code} · `;
    main.append(codeNode, document.createTextNode(title));
  } else main.textContent = title;
  left.appendChild(main);
  if (subtitle) { const sub = document.createElement('div'); sub.className = 'cie10-item-sub'; sub.textContent = subtitle; left.appendChild(sub); }
  const right = document.createElement('span'); right.className = 'cie10-item-meta'; right.textContent = meta || '›';
  button.append(left,right); button.addEventListener('click',onClick); return button;
}

function placeholder(text) { const node = document.createElement('div'); node.className = 'cie10-placeholder'; node.textContent = text; return node; }

function renderBrowse() {
  const l1=$('cie10List1'),l2=$('cie10List2'),l3=$('cie10List3'),l4=$('cie10List4');
  l1.replaceChildren(); l2.replaceChildren(); l3.replaceChildren(); l4.replaceChildren();

  GROUPS.forEach(([id,label]) => {
    const count = FAMILIES.filter(f => f.group === id).length;
    l1.appendChild(makeItem({title:label,subtitle:`${count} familias`,selected:selectedGroup===id,onClick:()=>{selectedGroup=id;selectedSub='';selectedFamily='';selectedCode='';renderBrowse();}}));
  });

  if (!selectedGroup) l2.appendChild(placeholder('Selecciona un grupo.'));
  else (SUBS[selectedGroup] || []).forEach(([id,label]) => {
    const count = FAMILIES.filter(f => f.group===selectedGroup && f.sub===id).length;
    l2.appendChild(makeItem({title:label,subtitle:`${count} familias`,selected:selectedSub===id,onClick:()=>{selectedSub=id;selectedFamily='';selectedCode='';renderBrowse();}}));
  });

  if (!selectedSub) l3.appendChild(placeholder('Selecciona un subtipo.'));
  else {
    const families = FAMILIES.filter(f => f.group===selectedGroup && f.sub===selectedSub);
    families.forEach(f => l3.appendChild(makeItem({title:f.desc,code:f.code,meta:String(f.items.length),selected:selectedFamily===f.code,onClick:()=>{selectedFamily=f.code;selectedCode='';renderBrowse();}})));
    if (!families.length) l3.appendChild(placeholder('No hay familias en este subtipo.'));
  }

  const family = FAMILIES.find(f => f.code===selectedFamily);
  if (!family) l4.appendChild(placeholder('Selecciona una familia.'));
  else family.items.forEach(item => l4.appendChild(makeItem({title:item.desc,code:item.code,selected:selectedCode===item.code,onClick:()=>{selectedCode=item.code;renderBrowse();renderFooter(item);}})));

  $('cie10Title1').textContent = selectedGroup ? groupLabel(selectedGroup) : 'Grupo';
  $('cie10Title2').textContent = selectedSub ? subLabel(selectedGroup,selectedSub) : 'Subtipo';
  $('cie10Title3').textContent = selectedFamily || 'Familia';
  if (!selectedCode) renderFooter(null);
}

function renderFooter(item) {
  $('cie10SelectedCode').textContent = item?.code || 'Sin selección';
  $('cie10SelectedDesc').textContent = item?.desc || 'Selecciona una variante para consultar su código.';
}

function scoreItem(item, q) {
  const code = item._codeNorm;
  if (code === q) return 120;
  if (code.startsWith(q)) return 105;
  if (item._synNorm.includes(q)) return 90;
  if (item._searchNorm.includes(q)) return 70;
  return 0;
}

function renderSearch() {
  if (!RAW.length) return;
  const q = norm($('cie10Search').value).trim();
  if (!q) {
    $('cie10SearchResults').hidden = true;
    $('cie10Explorer').hidden = false;
    selectedSearchCode = '';
    setStatus(`${RAW.length.toLocaleString('es-MX')} códigos disponibles`);
    return;
  }

  $('cie10Explorer').hidden = true;
  $('cie10SearchResults').hidden = false;
  const results = RAW.map(item => ({item,score:scoreItem(item,q)})).filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score || a.item.code.localeCompare(b.item.code,'es',{numeric:true}))
    .slice(0,100).map(x=>x.item);

  $('cie10SearchCount').textContent = `${results.length} resultados`;
  setStatus(`Búsqueda: ${results.length} coincidencias`);
  const list = $('cie10SearchList'); list.replaceChildren();
  if (!results.length) {
    list.appendChild(placeholder('No encontré coincidencias.'));
    selectedSearchCode=''; renderSearchDetail(null); return;
  }
  if (!results.some(item => item.code===selectedSearchCode)) selectedSearchCode=results[0].code;
  const frag=document.createDocumentFragment();
  results.forEach(item=>{
    const btn=document.createElement('button'); btn.type='button'; btn.className=`cie10-result${item.code===selectedSearchCode?' selected':''}`;
    const c=document.createElement('span'); c.className='cie10-result-code'; c.textContent=item.code;
    const d=document.createElement('span'); d.className='cie10-result-desc'; d.textContent=item.desc;
    btn.append(c,d); btn.addEventListener('click',()=>{selectedSearchCode=item.code;renderSearch();}); frag.appendChild(btn);
  });
  list.appendChild(frag);
  renderSearchDetail(RAW.find(item=>item.code===selectedSearchCode) || null);
}

function renderSearchDetail(item) {
  const root=$('cie10SearchDetail'); root.replaceChildren();
  if (!item) { const e=document.createElement('div'); e.className='cie10-empty'; e.textContent='Selecciona un resultado.'; root.appendChild(e); return; }
  const family=FAMILIES.find(f=>f.code===famCode(item.code));
  const c=document.createElement('div'); c.className='cie10-detail-code'; c.textContent=item.code;
  const d=document.createElement('div'); d.className='cie10-detail-desc'; d.textContent=item.desc;
  const m=document.createElement('div'); m.className='cie10-detail-meta';
  m.textContent=family ? `Grupo: ${groupLabel(family.group)} · Subtipo: ${subLabel(family.group,family.sub)} · Familia: ${family.code}` : '';
  root.append(c,d,m); renderFooter(item);
}

async function loadCatalog(force=false) {
  if (loadingPromise && !force) return loadingPromise;
  loadingPromise=(async()=>{
    setLoading('Descargando catálogo local…');
    const parts=await Promise.all(Array.from({length:PARTS},(_,i)=>fetchPart(i+1)));
    const encoded=parts.join('');
    if (encoded.length<40000) throw new Error('El catálogo descargado está incompleto.');

    setLoading('Descomprimiendo catálogo…');
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const json=await inflateCatalog(encoded);

    setLoading('Organizando 3,700 códigos…');
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const parsed=JSON.parse(json);
    if (!Array.isArray(parsed) || parsed.length!==3700) throw new Error(`Se esperaban 3,700 códigos y se obtuvieron ${Array.isArray(parsed)?parsed.length:0}.`);

    RAW=parsed.map(item=>({
      code:String(item.code||''),
      desc:String(item.desc||''),
      _codeNorm:norm(item.code),
      _searchNorm:norm(`${item.code} ${item.desc}`),
      _synNorm:norm(SYN[famCode(item.code)]||'')
    }));
    buildFamilies(RAW);
    selectedGroup='';selectedSub='';selectedFamily='';selectedCode='';selectedSearchCode='';
    $('cie10Loading').hidden=true;$('cie10Error').hidden=true;$('cie10Explorer').hidden=false;
    renderBrowse();
    setStatus(`${RAW.length.toLocaleString('es-MX')} códigos disponibles`);
  })().catch(showError).finally(()=>{loadingPromise=null;});
  return loadingPromise;
}

applySavedTheme();
$('cie10Search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(renderSearch,70);});
$('cie10Clear').addEventListener('click',()=>{$('cie10Search').value='';selectedSearchCode='';renderSearch();$('cie10Search').focus();});
$('cie10Retry').addEventListener('click',()=>loadCatalog(true));
document.addEventListener('keydown',event=>{
  if (event.key==='/' && document.activeElement!==$('cie10Search')) { event.preventDefault(); $('cie10Search').focus(); }
  if (event.key==='Escape' && $('cie10Search').value) { $('cie10Search').value=''; renderSearch(); }
});

loadCatalog();
