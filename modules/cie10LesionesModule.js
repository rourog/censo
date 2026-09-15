/*
  CENSO · Consulta CIE-10 de lesiones
  Herramienta estrictamente de consulta. No modifica pacientes ni Firebase.
*/

export function createCie10LesionesModule(app) {
  const BUILD = String(window.CensoBuild?.version || `runtime-${Date.now()}`);
  const PARTS = 8;
  const FETCH_TIMEOUT_MS = 8000;
  const DECOMPRESS_TIMEOUT_MS = 8000;
  const TOTAL_TIMEOUT_MS = 18000;

  const GROUPS = [
    ['transport','Accidentes de transporte'],['falls','Caídas'],['mechanical','Golpes, objetos y herramientas'],
    ['animals','Mordeduras y animales'],['burns','Quemaduras, fuego y calor'],['poison','Intoxicación accidental'],
    ['selfharm','Lesión autoinfligida'],['assault','Agresión'],['resp','Ahogamiento y otros riesgos respiratorios'],
    ['undetermined','Intención no determinada'],['iatro','Atención médica y quirúrgica'],['other','Otros mecanismos']
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

  const SYN = {
    Y04:'RINA RIÑA PELEA GOLPES PUNETAZOS PUÑETAZOS PATADAS',Y00:'OBJETO ROMO CONTUNDENTE PALO TUBO PIEDRA',
    X99:'ARMA BLANCA CUCHILLO NAVAJA MACHETE PUNZOCORTANTE',X95:'ARMA DE FUEGO BALAZO DISPARO PAF',
    W01:'CAIDA PROPIA ALTURA TROPIEZO RESBALON',W10:'ESCALERA ESCALERAS ESCALONES',W19:'CAIDA NO ESPECIFICADA',
    W54:'MORDEDURA PERRO CANINO',V29:'MOTO MOTOCICLETA MOTOCICLISTA DERRAPE',V03:'ATROPELLO ATROPELLADO PEATON',
    X12:'QUEMADURA AGUA CALIENTE LIQUIDO CALIENTE',X64:'INTENTO SUICIDA MEDICAMENTOS SOBREDOSIS',
    X70:'INTENTO SUICIDA AHORCAMIENTO ESTRANGULAMIENTO',X78:'INTENTO SUICIDA CORTES OBJETO CORTANTE',X84:'INTENTO SUICIDA NO ESPECIFICADO'
  };

  let RAW = [];
  let FAMILIES = [];
  let catalogReady = false;
  let catalogPromise = null;
  let previousFocus = null;
  let searchTimer = null;
  let selectedGroup = '';
  let selectedSub = '';
  let selectedFamily = '';
  let selectedCode = '';
  let searchSelectedCode = '';

  const $ = id => document.getElementById(id);
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const famCode = code => (String(code).toUpperCase().match(/^([VWXY]\d{2})/) || [])[1] || String(code).slice(0,3);
  const n2 = code => { const m=String(code).match(/^[VWXY](\d{2})/); return m ? +m[1] : -1; };
  const letter = code => String(code)[0] || '';

  function assetUrl(name, ext='js') {
    const url = new URL(`./${name}.${ext}`, import.meta.url);
    url.searchParams.set('v', BUILD);
    return url.href;
  }

  function ensureStylesheet() {
    if ($('censo-cie10-lesiones-styles')) return;
    const link=document.createElement('link');
    link.id='censo-cie10-lesiones-styles'; link.rel='stylesheet'; link.href=assetUrl('cie10Lesiones','css');
    document.head.appendChild(link);
  }

  function groupLabel(id){ return GROUPS.find(x=>x[0]===id)?.[1] || ''; }
  function subLabel(group,id){ return (SUBS[group]||[]).find(x=>x[0]===id)?.[1] || ''; }

  function groupFor(code) {
    const l=letter(code), n=n2(code);
    if(l==='V') return 'transport';
    if(l==='W'&&n<=19) return 'falls';
    if(l==='W'&&n>=20&&n<=49) return 'mechanical';
    if((l==='W'&&n>=50&&n<=64)||(l==='X'&&n>=20&&n<=29)) return 'animals';
    if(l==='W'&&n>=65&&n<=84) return 'resp';
    if(l==='X'&&n>=0&&n<=19) return 'burns';
    if(l==='X'&&n>=40&&n<=59) return 'poison';
    if(l==='X'&&n>=60&&n<=84) return 'selfharm';
    if((l==='X'&&n>=85&&n<=99)||(l==='Y'&&n>=0&&n<=9)) return 'assault';
    if(l==='Y'&&n>=10&&n<=34) return 'undetermined';
    if(l==='Y'&&n>=40&&n<=84) return 'iatro';
    return 'other';
  }

  function subFor(code,group) {
    const l=letter(code), n=n2(code);
    if(group==='transport'){ if(n<=9)return'ped'; if(n<=19)return'bike'; if(n<=29)return'moto'; if(n<=39)return'three'; if(n<=49)return'car'; if(n<=59)return'pickup'; if(n<=69)return'heavy'; if(n<=79)return'bus'; return'other'; }
    if(group==='falls'){ if(n<=3||n===18)return'level'; if(n>=5&&n<=9)return'furniture'; if(n>=10&&n<=12)return'stairs'; if(n>=13&&n<=17)return'height'; return'unspec'; }
    if(group==='mechanical'){ if(n>=20&&n<=22)return'hit'; if(n===23)return'caught'; if(n>=24&&n<=31)return'cut'; return'foreign'; }
    if(group==='animals'){ if(l==='W'&&n===54)return'dog'; if(l==='W'&&(n===53||n===55))return'mammal'; if(l==='W')return'insect'; return'venom'; }
    if(group==='burns'){ if(n<=9)return'fire'; if(n>=10&&n<=12)return'liquid'; if(n===13||n===14)return'steam'; return'object'; }
    if(group==='poison'){ if(n>=40&&n<=44)return'meds'; if(n===45)return'alcohol'; if(n>=46&&n<=49)return'chem'; return'other'; }
    if(group==='selfharm'){ if(n>=60&&n<=64)return'meds'; if(n===70||n===71)return'hang'; if(n>=72&&n<=74)return'firearm'; if(n===78||n===79)return'sharp'; if(n>=80&&n<=82)return'jump'; return'other'; }
    if(group==='assault'){ if(l==='Y'&&n===4)return'body'; if(l==='Y'&&n===0)return'blunt'; if(l==='X'&&n===99)return'sharp'; if(l==='X'&&n>=93&&n<=95)return'firearm'; return'other'; }
    if(group==='resp'){ if(n<=74)return'drown'; if(n<=83)return'obstruct'; return'other'; }
    if(group==='undetermined') return n<=19?'poison':'injury';
    if(group==='iatro'){ if(n<=59)return'drug'; if(n<=69)return'procedure'; return'device'; }
    return'all';
  }

  function buildFamilies(raw) {
    const map=new Map();
    raw.forEach(item=>{ const f=famCode(item.code); if(!map.has(f))map.set(f,[]); map.get(f).push(item); });
    FAMILIES=[...map.entries()].map(([code,items])=>{
      const base=items.find(x=>x.code===code)||items[0]; const group=groupFor(code);
      return {code,desc:String(base?.desc||code).replace(new RegExp(`^${code}\\s*[A-Z0-9]?\\s*-\\s*`,'i'),'').trim(),group,sub:subFor(code,group),items:items.slice().sort((a,b)=>a.code.localeCompare(b.code,'es',{numeric:true}))};
    }).sort((a,b)=>a.code.localeCompare(b.code,'es',{numeric:true}));
  }

  function setLoadStatus(text, isError=false) {
    const loading=$('cie10Loading'); if(!loading)return;
    loading.hidden=false; loading.replaceChildren();
    const box=document.createElement('div');
    const icon=document.createElement('span'); icon.className='material-symbols-outlined'; icon.textContent=isError?'error':'progress_activity';
    const label=document.createElement('div'); label.textContent=text;
    box.append(icon,label); loading.appendChild(box);
  }

  function withTimeout(promise,ms,message){
    let timer; const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);});
    return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
  }

  async function fetchPart(index) {
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),FETCH_TIMEOUT_MS);
    try {
      const response=await fetch(assetUrl(`cie10DataPart${index}`),{cache:'no-store',credentials:'same-origin',signal:controller.signal});
      if(!response.ok) throw new Error(`HTTP ${response.status} en fragmento ${index}`);
      const source=await response.text();
      const match=source.match(/^\s*export\s+default\s+'([^']*)';\s*$/s);
      if(!match?.[1]) throw new Error(`Fragmento ${index} inválido`);
      return match[1];
    } catch(error) {
      if(error?.name==='AbortError') throw new Error(`Tiempo agotado al descargar fragmento ${index}`);
      throw error;
    } finally { clearTimeout(timer); }
  }

  function base64ToBytes(value){ const binary=atob(value); const bytes=new Uint8Array(binary.length); for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i); return bytes; }

  async function loadCatalogDirect() {
    setLoadStatus('Descargando catálogo CIE-10…');
    const encodedParts=await Promise.all(Array.from({length:PARTS},(_,i)=>fetchPart(i+1)));
    const encoded=encodedParts.join('');
    if(encoded.length<40000) throw new Error('El catálogo descargado está incompleto');
    if(typeof DecompressionStream!=='function') throw new Error('Este navegador no permite descomprimir el catálogo local');

    setLoadStatus('Descomprimiendo catálogo CIE-10…');
    const bytes=base64ToBytes(encoded);
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const json=await withTimeout(new Response(stream).text(),DECOMPRESS_TIMEOUT_MS,'Tiempo agotado al descomprimir el catálogo');

    setLoadStatus('Validando 3,700 códigos…');
    const parsed=JSON.parse(json);
    if(!Array.isArray(parsed)||parsed.length!==3700) throw new Error(`Catálogo inválido: ${Array.isArray(parsed)?parsed.length:0} registros`);
    return parsed;
  }

  async function ensureCatalog() {
    if(catalogReady)return;
    if(catalogPromise)return catalogPromise;
    $('cie10Explorer').hidden=true;
    catalogPromise=withTimeout(loadCatalogDirect(),TOTAL_TIMEOUT_MS,'La carga total del catálogo excedió 18 segundos')
      .then(raw=>{
        RAW=raw; buildFamilies(raw); catalogReady=true;
        $('cie10Loading').hidden=true; $('cie10Explorer').hidden=false; renderAll();
      })
      .catch(error=>{
        console.error('[CENSO][CIE10]',error); setLoadStatus(`No fue posible cargar el catálogo. ${error?.message||''}`,true); throw error;
      })
      .finally(()=>{catalogPromise=null;});
    return catalogPromise;
  }

  function ensureModal() {
    if($('cie10Overlay'))return;
    const overlay=document.createElement('div'); overlay.id='cie10Overlay'; overlay.className='cie10-overlay'; overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML=`<section class="cie10-dialog" role="dialog" aria-modal="true" aria-labelledby="cie10Title" tabindex="-1">
      <header class="cie10-head"><div><div class="cie10-title" id="cie10Title">CIE-10 · CERTIFICADO DE LESIONES</div><div class="cie10-subtitle">Consulta de referencia. Busca o navega hasta el código que necesitas; no modifica datos del Censo.</div></div><button class="cie10-close" id="cie10Close" type="button" aria-label="Cerrar CIE-10"><span class="material-symbols-outlined">close</span></button></header>
      <div class="cie10-search-zone"><div class="cie10-search-wrap"><span class="material-symbols-outlined cie10-search-icon">search</span><input class="cie10-search" id="cie10Search" autocomplete="off" placeholder="Buscar código o descripción: riña, motocicleta, perro, quemadura, X64…"><button class="cie10-clear" id="cie10Clear" type="button" aria-label="Limpiar búsqueda"><span class="material-symbols-outlined">close</span></button></div></div>
      <div class="cie10-main"><div class="cie10-loading" id="cie10Loading"><div><span class="material-symbols-outlined">progress_activity</span><div>Preparando catálogo CIE-10…</div></div></div>
        <div class="cie10-explorer" id="cie10Explorer" hidden>
          <section class="cie10-level expanded" id="cie10Level1"><div class="cie10-level-head"><div><span class="cie10-kicker">1</span><div class="cie10-level-title" id="cie10Title1">Grupo</div></div><button class="cie10-change" data-reset="1" type="button" hidden>Cambiar</button></div><div class="cie10-level-list" id="cie10List1"></div></section>
          <section class="cie10-level" id="cie10Level2" hidden><div class="cie10-level-head"><div><span class="cie10-kicker">2</span><div class="cie10-level-title" id="cie10Title2">Subtipo</div></div><button class="cie10-change" data-reset="2" type="button" hidden>Cambiar</button></div><div class="cie10-level-list" id="cie10List2"></div></section>
          <section class="cie10-level" id="cie10Level3" hidden><div class="cie10-level-head"><div><span class="cie10-kicker">3</span><div class="cie10-level-title" id="cie10Title3">Familia</div></div><button class="cie10-change" data-reset="3" type="button" hidden>Cambiar</button></div><div class="cie10-level-list" id="cie10List3"></div></section>
          <section class="cie10-level" id="cie10Level4" hidden><div class="cie10-level-head"><div><span class="cie10-kicker">4</span><div class="cie10-level-title">Variante exacta</div></div></div><div class="cie10-level-list" id="cie10List4"></div></section>
        </div>
        <div class="cie10-search-results" id="cie10SearchResults"><section class="cie10-search-list"><div class="cie10-search-head"><strong>Resultados</strong><span id="cie10SearchCount"></span></div><div class="cie10-search-scroll" id="cie10SearchList"></div></section><section class="cie10-search-detail"><div class="cie10-search-head"><strong>Selección</strong><span>Solo consulta</span></div><div class="cie10-detail-box" id="cie10SearchDetail"></div></section></div>
      </div>
      <footer class="cie10-footer"><div class="cie10-selection"><div class="cie10-selection-code" id="cie10SelCode">Sin selección</div><div class="cie10-selection-desc" id="cie10SelDesc">Selecciona una variante exacta.</div></div></footer>
    </section>`;
    document.body.appendChild(overlay);
    $('cie10Close').addEventListener('click',closeCie10); $('cie10Clear').addEventListener('click',clearSearch);
    $('cie10Search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(renderSearch,70);});
    overlay.querySelectorAll('[data-reset]').forEach(btn=>btn.addEventListener('click',()=>resetToLevel(Number(btn.dataset.reset))));
    overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)closeCie10();});
    overlay.querySelector('.cie10-dialog').addEventListener('keydown',handleKeydown);
  }

  function row({main,sub='',code='',count='',selected=false,onClick}) {
    const b=document.createElement('button'); b.type='button'; b.className=`cie10-row${selected?' selected':''}`;
    const left=document.createElement('span'); const m=document.createElement('div'); m.className='cie10-row-main';
    if(code){const c=document.createElement('span');c.className='cie10-row-code';c.textContent=`${code} · `;m.append(c,document.createTextNode(main));}else m.textContent=main;
    left.appendChild(m); if(sub){const s=document.createElement('div');s.className='cie10-row-sub';s.textContent=sub;left.appendChild(s);}
    const r=document.createElement('span'); r.className=count?'cie10-count':'cie10-chev'; r.textContent=count||'›'; b.append(left,r); b.addEventListener('click',onClick); return b;
  }

  function familyObj(){return FAMILIES.find(x=>x.code===selectedFamily)||null;}
  function currentItem(){return $('cie10Search')?.value.trim()?RAW.find(x=>x.code===searchSelectedCode):familyObj()?.items.find(x=>x.code===selectedCode);}

  function setLevels(){
    const a=[$('cie10Level1'),$('cie10Level2'),$('cie10Level3'),$('cie10Level4')]; a.forEach(x=>x.className='cie10-level');
    a[0].hidden=false;a[1].hidden=!selectedGroup;a[2].hidden=!selectedSub;a[3].hidden=!selectedFamily;
    if(!selectedGroup)a[0].classList.add('expanded'); else if(!selectedSub){a[0].classList.add('compact');a[1].classList.add('expanded');} else if(!selectedFamily){a[0].classList.add('compact');a[1].classList.add('compact','l2');a[2].classList.add('expanded');} else {a[0].classList.add('compact');a[1].classList.add('compact','l2');a[2].classList.add('compact','l3');a[3].classList.add('expanded');}
    $('cie10Title1').textContent=selectedGroup?groupLabel(selectedGroup):'Grupo'; $('cie10Title2').textContent=selectedSub?subLabel(selectedGroup,selectedSub):'Subtipo'; $('cie10Title3').textContent=selectedFamily||'Familia';
    a[0].querySelector('.cie10-change').hidden=!selectedGroup;a[1].querySelector('.cie10-change').hidden=!selectedSub;a[2].querySelector('.cie10-change').hidden=!selectedFamily;
  }

  function renderAll(){
    if(!catalogReady)return; setLevels();
    const l1=$('cie10List1');l1.replaceChildren();GROUPS.forEach(([id,label])=>{const count=FAMILIES.filter(f=>f.group===id).length;l1.append(row({main:label,sub:`${count} familias`,selected:selectedGroup===id,onClick:()=>{selectedGroup=id;selectedSub='';selectedFamily='';selectedCode='';renderAll();}}));});
    if(selectedGroup){const l2=$('cie10List2');l2.replaceChildren();(SUBS[selectedGroup]||[]).forEach(([id,label])=>{const count=FAMILIES.filter(f=>f.group===selectedGroup&&f.sub===id).length;l2.append(row({main:label,sub:`${count} familias`,selected:selectedSub===id,onClick:()=>{selectedSub=id;selectedFamily='';selectedCode='';renderAll();}}));});}
    if(selectedSub){const l3=$('cie10List3');l3.replaceChildren();FAMILIES.filter(f=>f.group===selectedGroup&&f.sub===selectedSub).forEach(f=>l3.append(row({main:f.desc,code:f.code,count:String(f.items.length),selected:selectedFamily===f.code,onClick:()=>{selectedFamily=f.code;selectedCode='';renderAll();}})));}
    if(selectedFamily){const l4=$('cie10List4');l4.replaceChildren();familyObj().items.forEach(item=>l4.append(row({main:item.desc,code:item.code,selected:selectedCode===item.code,onClick:()=>{selectedCode=item.code;renderAll();}})));}
    renderFooter();
  }

  function searchResults(q){const needle=norm(q).trim();if(!needle)return[];return RAW.map(item=>{const code=norm(item.code),desc=norm(item.desc),syn=norm(SYN[famCode(item.code)]||'');let score=0;if(code===needle)score=100;else if(code.startsWith(needle))score=90;else if(syn.includes(needle))score=75;else if(`${code} ${desc}`.includes(needle))score=60;return score?{item,score}:null;}).filter(Boolean).sort((a,b)=>b.score-a.score||a.item.code.localeCompare(b.item.code,'es',{numeric:true})).slice(0,80).map(x=>x.item);}

  function renderSearch(){
    if(!catalogReady)return;const q=$('cie10Search').value.trim(),resultsRoot=$('cie10SearchResults'),explorer=$('cie10Explorer');
    if(!q){resultsRoot.classList.remove('active');explorer.hidden=false;searchSelectedCode='';renderFooter();return;}
    explorer.hidden=true;resultsRoot.classList.add('active');const results=searchResults(q);$('cie10SearchCount').textContent=`${results.length} resultados`;const list=$('cie10SearchList');list.replaceChildren();
    if(!results.length){const e=document.createElement('div');e.className='cie10-empty';e.textContent='No encontré coincidencias.';list.appendChild(e);searchSelectedCode='';renderDetail();renderFooter();return;}
    if(!results.some(x=>x.code===searchSelectedCode))searchSelectedCode=results[0].code;
    results.forEach(item=>{const b=document.createElement('button');b.type='button';b.className=`cie10-search-item${searchSelectedCode===item.code?' selected':''}`;const c=document.createElement('span');c.className='cie10-search-code';c.textContent=item.code;const d=document.createElement('span');d.className='cie10-search-desc';d.textContent=item.desc;b.append(c,d);b.addEventListener('click',()=>{searchSelectedCode=item.code;renderSearch();});list.appendChild(b);});renderDetail();renderFooter();
  }

  function renderDetail(){const root=$('cie10SearchDetail');root.replaceChildren();const item=RAW.find(x=>x.code===searchSelectedCode);if(!item){const e=document.createElement('div');e.className='cie10-empty';e.textContent='Selecciona un resultado.';root.appendChild(e);return;}const fam=FAMILIES.find(f=>f.code===famCode(item.code));const c=document.createElement('div');c.className='cie10-detail-code';c.textContent=item.code;const d=document.createElement('div');d.className='cie10-detail-desc';d.textContent=item.desc;const m=document.createElement('div');m.className='cie10-detail-meta';m.textContent=fam?`Grupo: ${groupLabel(fam.group)} · Subtipo: ${subLabel(fam.group,fam.sub)} · Familia: ${fam.code}`:'';root.append(c,d,m);}
  function renderFooter(){const item=currentItem();$('cie10SelCode').textContent=item?.code||'Sin selección';$('cie10SelDesc').textContent=item?.desc||'Selecciona una variante exacta.';}
  function resetToLevel(level){if(level<=1){selectedGroup='';selectedSub='';selectedFamily='';selectedCode='';}else if(level===2){selectedSub='';selectedFamily='';selectedCode='';}else{selectedFamily='';selectedCode='';}renderAll();}
  function clearSearch(){const i=$('cie10Search');i.value='';searchSelectedCode='';renderSearch();i.focus();}

  async function openCie10(){ensureModal();previousFocus=document.activeElement;selectedGroup='';selectedSub='';selectedFamily='';selectedCode='';searchSelectedCode='';$('cie10Search').value='';$('cie10SearchResults').classList.remove('active');const o=$('cie10Overlay');o.classList.add('active');o.setAttribute('aria-hidden','false');app.utils?.vibrar?.(15);try{await ensureCatalog();}catch(_){}if(catalogReady)renderAll();setTimeout(()=>$('cie10Search')?.focus(),40);}
  function closeCie10(){const o=$('cie10Overlay');if(!o?.classList.contains('active'))return;o.classList.remove('active');o.setAttribute('aria-hidden','true');app.utils?.vibrar?.(10);const target=previousFocus&&document.contains(previousFocus)?previousFocus:$('cie10Btn');setTimeout(()=>target?.focus?.(),0);}
  function handleKeydown(e){e.stopPropagation();if(e.key==='Escape'){e.preventDefault();if($('cie10Search')?.value)clearSearch();else closeCie10();return;}if(e.key==='/'&&document.activeElement!==$('cie10Search')){e.preventDefault();$('cie10Search').focus();}}

  function initCie10Ui(){ensureStylesheet();ensureModal();if($('cie10Btn'))return;const history=$('historyBtn');if(!history)return;const b=document.createElement('button');b.id='cie10Btn';b.className='icon-btn';b.type='button';b.setAttribute('aria-label','Consultar CIE-10 lesiones');b.title='Consultar CIE-10 · Lesiones';b.innerHTML='<span class="material-symbols-outlined">medical_information</span>';b.addEventListener('click',openCie10);history.insertAdjacentElement('afterend',b);}

  return {initCie10Ui,openCie10,closeCie10};
}
