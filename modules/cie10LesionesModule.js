/*
  MÓDULO: cie10LesionesModule.js

  RESPONSABILIDAD:
  - Añadir el acceso CIE-10 junto al historial.
  - Cargar el catálogo local solo cuando se necesita.
  - Navegar/buscar causas externas CIE-10 V-Y.
  - Copiar una selección sin escribir datos clínicos automáticamente.

  NO DEBE:
  - Leer o escribir Firebase.
  - Elegir por sí mismo un paciente o campo del censo.
*/

export function createCie10LesionesModule(app) {
  const BUILD = String(window.CensoBuild?.version || `runtime-${Date.now()}`);
  const GROUPS = [
    { id: 'transport', label: 'Accidentes de transporte' },
    { id: 'falls', label: 'Caídas' },
    { id: 'mechanical', label: 'Golpes, objetos y herramientas' },
    { id: 'animals', label: 'Mordeduras y animales' },
    { id: 'burns', label: 'Quemaduras, fuego y calor' },
    { id: 'poison', label: 'Intoxicación accidental' },
    { id: 'selfharm', label: 'Lesión autoinfligida' },
    { id: 'assault', label: 'Agresión' },
    { id: 'resp', label: 'Ahogamiento y otros riesgos respiratorios' },
    { id: 'undetermined', label: 'Intención no determinada' },
    { id: 'iatro', label: 'Atención médica y quirúrgica' },
    { id: 'other', label: 'Otros mecanismos' }
  ];

  const SUBS = {
    transport: [['ped','Peatón'],['bike','Bicicleta'],['moto','Motocicleta'],['three','Vehículo de tres ruedas'],['car','Automóvil'],['pickup','Camioneta / furgoneta'],['heavy','Transporte pesado'],['bus','Autobús'],['other','Otros transportes']],
    falls: [['level','Mismo nivel'],['furniture','Cama, silla o muebles'],['stairs','Escaleras'],['height','Caída desde altura'],['unspec','Caída no especificada']],
    mechanical: [['hit','Golpe contra / por objeto'],['caught','Atrapamiento o aplastamiento'],['cut','Cortantes y herramientas'],['foreign','Cuerpo extraño / otros']],
    animals: [['dog','Perro'],['mammal','Otros mamíferos'],['insect','Insectos / no venenosos'],['venom','Animales o plantas venenosos']],
    burns: [['fire','Humo, fuego y llamas'],['liquid','Líquidos calientes'],['steam','Vapor, aire o gases calientes'],['object','Objetos o sustancias calientes']],
    poison: [['meds','Medicamentos'],['alcohol','Alcohol / solventes'],['chem','Gases / sustancias químicas'],['other','Otros / no especificados']],
    selfharm: [['meds','Medicamentos'],['hang','Ahorcamiento / estrangulación / sofocación'],['firearm','Arma de fuego'],['sharp','Objeto cortante'],['jump','Salto / objeto en movimiento / vehículo'],['other','Otros / no especificados']],
    assault: [['body','Fuerza corporal / riña'],['blunt','Objeto romo'],['sharp','Objeto cortante / arma blanca'],['firearm','Arma de fuego'],['other','Otros / no especificados']],
    resp: [['drown','Ahogamiento / sumersión'],['obstruct','Obstrucción / aspiración / sofocación'],['other','Otros riesgos respiratorios']],
    undetermined: [['poison','Envenenamiento'],['injury','Otros mecanismos']],
    iatro: [['drug','Fármacos / sustancias biológicas'],['procedure','Procedimientos médicos / quirúrgicos'],['device','Dispositivos / otras complicaciones']],
    other: [['all','Otros mecanismos']]
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
  let catalogReady = false;
  let catalogLoading = null;
  let previousFocus = null;
  let toastTimer = null;
  let searchTimer = null;

  let selectedGroup = '';
  let selectedSub = '';
  let selectedFamily = '';
  let selectedCode = '';
  let searchSelectedCode = '';

  const $ = id => document.getElementById(id);
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const famCode = code => (String(code).toUpperCase().match(/^([VWXY]\d{2})/) || [])[1] || String(code).slice(0, 3);
  const n2 = code => { const m = String(code).match(/^[VWXY](\d{2})/); return m ? +m[1] : -1; };
  const letter = code => String(code)[0] || '';

  function moduleUrl(name) {
    const url = new URL(`./${name}.js`, import.meta.url);
    url.searchParams.set('v', BUILD);
    return url.href;
  }

  function ensureStylesheet() {
    if ($('censo-cie10-lesiones-styles')) return;
    const link = document.createElement('link');
    link.id = 'censo-cie10-lesiones-styles';
    link.rel = 'stylesheet';
    link.href = moduleUrl('cie10Lesiones').replace(/\.js\?/, '.css?');
    document.head.appendChild(link);
  }

  function groupLabel(id) { return GROUPS.find(item => item.id === id)?.label || ''; }
  function subLabel(group, id) { return (SUBS[group] || []).find(item => item[0] === id)?.[1] || ''; }

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
      if (n <= 3 || n === 18) return 'level';
      if (n >= 5 && n <= 9) return 'furniture';
      if (n >= 10 && n <= 12) return 'stairs';
      if (n >= 13 && n <= 17) return 'height';
      return 'unspec';
    }
    if (group === 'mechanical') {
      if (n >= 20 && n <= 22) return 'hit';
      if (n === 23) return 'caught';
      if (n >= 24 && n <= 31) return 'cut';
      return 'foreign';
    }
    if (group === 'animals') {
      if (l === 'W' && n === 54) return 'dog';
      if (l === 'W' && (n === 53 || n === 55)) return 'mammal';
      if (l === 'W') return 'insect';
      return 'venom';
    }
    if (group === 'burns') {
      if (n <= 9) return 'fire';
      if (n >= 10 && n <= 12) return 'liquid';
      if (n === 13 || n === 14) return 'steam';
      return 'object';
    }
    if (group === 'poison') {
      if (n >= 40 && n <= 44) return 'meds';
      if (n === 45) return 'alcohol';
      if (n >= 46 && n <= 49) return 'chem';
      return 'other';
    }
    if (group === 'selfharm') {
      if (n >= 60 && n <= 64) return 'meds';
      if (n === 70 || n === 71) return 'hang';
      if (n >= 72 && n <= 74) return 'firearm';
      if (n === 78 || n === 79) return 'sharp';
      if (n >= 80 && n <= 82) return 'jump';
      return 'other';
    }
    if (group === 'assault') {
      if (l === 'Y' && n === 4) return 'body';
      if (l === 'Y' && n === 0) return 'blunt';
      if (l === 'X' && n === 99) return 'sharp';
      if (l === 'X' && n >= 93 && n <= 95) return 'firearm';
      return 'other';
    }
    if (group === 'resp') {
      if (n <= 74) return 'drown';
      if (n <= 83) return 'obstruct';
      return 'other';
    }
    if (group === 'undetermined') return n <= 19 ? 'poison' : 'injury';
    if (group === 'iatro') {
      if (n <= 59) return 'drug';
      if (n <= 69) return 'procedure';
      return 'device';
    }
    return 'all';
  }

  function cleanFamilyDesc(code, desc) {
    let text = String(desc || '').replace(new RegExp(`^${code}\\s*[A-Z0-9]?\\s*-\\s*`, 'i'), '').trim();
    for (const tail of PLACE_TAILS) {
      const suffix = `, ${tail}`;
      if (norm(text).endsWith(norm(suffix))) {
        text = text.slice(0, Math.max(0, text.length - suffix.length)).trim();
        break;
      }
    }
    return text || desc || code;
  }

  function buildFamilies(raw) {
    const map = new Map();
    for (const item of raw) {
      const familyCode = famCode(item.code);
      if (!map.has(familyCode)) map.set(familyCode, []);
      map.get(familyCode).push(item);
    }
    FAMILIES = [...map.entries()].map(([code, items]) => {
      const base = items.find(item => item.code === code) || items[0];
      const group = groupFor(code);
      return {
        code,
        desc: cleanFamilyDesc(code, base?.desc || ''),
        group,
        sub: subFor(code, group),
        items: items.slice().sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }))
      };
    }).sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }));
  }

  function familyObj() { return FAMILIES.find(item => item.code === selectedFamily) || null; }
  function selectedItem() { return familyObj()?.items.find(item => item.code === selectedCode) || null; }
  function searchItem() { return RAW.find(item => item.code === searchSelectedCode) || null; }
  function currentItem() { return $('cie10Search')?.value.trim() ? searchItem() : selectedItem(); }

  function ensureModal() {
    if ($('cie10Overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'cie10Overlay';
    overlay.className = 'cie10-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <section class="cie10-dialog" role="dialog" aria-modal="true" aria-labelledby="cie10Title" tabindex="-1">
        <header class="cie10-head">
          <div>
            <div class="cie10-title" id="cie10Title">CIE-10 · CERTIFICADO DE LESIONES</div>
            <div class="cie10-subtitle">Explora por mecanismo o busca directamente por código o descripción.</div>
          </div>
          <button class="cie10-close" id="cie10Close" type="button" aria-label="Cerrar CIE-10"><span class="material-symbols-outlined">close</span></button>
        </header>
        <div class="cie10-search-zone">
          <div class="cie10-search-wrap">
            <span class="material-symbols-outlined cie10-search-icon" aria-hidden="true">search</span>
            <input class="cie10-search" id="cie10Search" autocomplete="off" placeholder="Buscar código o descripción: riña, motocicleta, perro, quemadura, X64…">
            <button class="cie10-clear" id="cie10Clear" type="button" aria-label="Limpiar búsqueda"><span class="material-symbols-outlined">close</span></button>
          </div>
        </div>
        <div class="cie10-main" id="cie10Main">
          <div class="cie10-loading" id="cie10Loading"><div><span class="material-symbols-outlined">progress_activity</span>Cargando catálogo CIE-10…</div></div>
          <div class="cie10-explorer" id="cie10Explorer" hidden>
            <section class="cie10-level expanded" id="cie10Level1">
              <div class="cie10-level-head"><div><span class="cie10-kicker">1</span><div class="cie10-level-title" id="cie10Title1">Grupo</div></div><button class="cie10-change" data-reset="1" type="button" hidden>Cambiar</button></div>
              <div class="cie10-level-list" id="cie10List1"></div>
            </section>
            <section class="cie10-level" id="cie10Level2" hidden>
              <div class="cie10-level-head"><div><span class="cie10-kicker">2</span><div class="cie10-level-title" id="cie10Title2">Subtipo</div></div><button class="cie10-change" data-reset="2" type="button" hidden>Cambiar</button></div>
              <div class="cie10-level-list" id="cie10List2"></div>
            </section>
            <section class="cie10-level" id="cie10Level3" hidden>
              <div class="cie10-level-head"><div><span class="cie10-kicker">3</span><div class="cie10-level-title" id="cie10Title3">Familia</div></div><button class="cie10-change" data-reset="3" type="button" hidden>Cambiar</button></div>
              <div class="cie10-level-list" id="cie10List3"></div>
            </section>
            <section class="cie10-level" id="cie10Level4" hidden>
              <div class="cie10-level-head"><div><span class="cie10-kicker">4</span><div class="cie10-level-title">Variante exacta</div></div></div>
              <div class="cie10-level-list" id="cie10List4"></div>
            </section>
          </div>
          <div class="cie10-search-results" id="cie10SearchResults">
            <section class="cie10-search-list">
              <div class="cie10-search-head"><strong>Resultados</strong><span id="cie10SearchCount"></span></div>
              <div class="cie10-search-scroll" id="cie10SearchList"></div>
            </section>
            <section class="cie10-search-detail">
              <div class="cie10-search-head"><strong>Selección</strong><span>Búsqueda directa</span></div>
              <div class="cie10-detail-box" id="cie10SearchDetail"></div>
            </section>
          </div>
        </div>
        <footer class="cie10-footer">
          <div class="cie10-selection">
            <div class="cie10-selection-code" id="cie10SelCode">Sin selección</div>
            <div class="cie10-selection-desc" id="cie10SelDesc">Selecciona una variante exacta.</div>
          </div>
          <div class="cie10-actions">
            <button class="cie10-btn" id="cie10CopyBtn" type="button" disabled>COPIAR</button>
            <button class="cie10-btn primary" id="cie10CopyCloseBtn" type="button" disabled>COPIAR Y CERRAR</button>
          </div>
        </footer>
      </section>`;
    document.body.appendChild(overlay);

    const toast = document.createElement('div');
    toast.id = 'cie10Toast';
    toast.className = 'cie10-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);

    $('cie10Close')?.addEventListener('click', closeCie10);
    $('cie10Clear')?.addEventListener('click', clearSearch);
    $('cie10CopyBtn')?.addEventListener('click', () => copyCurrent(false));
    $('cie10CopyCloseBtn')?.addEventListener('click', () => copyCurrent(true));
    $('cie10Search')?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(renderSearch, 70);
    });
    overlay.querySelectorAll('[data-reset]').forEach(button => {
      button.addEventListener('click', () => resetToLevel(Number(button.dataset.reset)));
    });
    overlay.addEventListener('pointerdown', event => {
      if (event.target === overlay) closeCie10();
    });
    overlay.querySelector('.cie10-dialog')?.addEventListener('keydown', handleDialogKeydown);
  }

  function createRow({ main, sub = '', code = '', count = '', selected = false, onClick }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `cie10-row${selected ? ' selected' : ''}`;
    const left = document.createElement('span');
    const mainNode = document.createElement('div');
    mainNode.className = 'cie10-row-main';
    if (code) {
      const codeNode = document.createElement('span');
      codeNode.className = 'cie10-row-code';
      codeNode.textContent = `${code} · `;
      mainNode.appendChild(codeNode);
      mainNode.append(document.createTextNode(main));
    } else {
      mainNode.textContent = main;
    }
    left.appendChild(mainNode);
    if (sub) {
      const subNode = document.createElement('div');
      subNode.className = 'cie10-row-sub';
      subNode.textContent = sub;
      left.appendChild(subNode);
    }
    const right = document.createElement('span');
    if (count) {
      right.className = 'cie10-count';
      right.textContent = count;
    } else {
      right.className = 'cie10-chev';
      right.textContent = '›';
    }
    button.append(left, right);
    button.addEventListener('click', onClick);
    return button;
  }

  function setLevelState() {
    const l1 = $('cie10Level1'), l2 = $('cie10Level2'), l3 = $('cie10Level3'), l4 = $('cie10Level4');
    if (!l1 || !l2 || !l3 || !l4) return;
    l1.hidden = false;
    l2.hidden = !selectedGroup;
    l3.hidden = !selectedSub;
    l4.hidden = !selectedFamily;
    [l1,l2,l3,l4].forEach(level => { level.className = 'cie10-level'; });

    if (!selectedGroup) l1.classList.add('expanded');
    else if (!selectedSub) { l1.classList.add('compact'); l2.classList.add('expanded'); }
    else if (!selectedFamily) { l1.classList.add('compact'); l2.classList.add('compact','l2'); l3.classList.add('expanded'); }
    else { l1.classList.add('compact'); l2.classList.add('compact','l2'); l3.classList.add('compact','l3'); l4.classList.add('expanded'); }

    $('cie10Title1').textContent = selectedGroup ? groupLabel(selectedGroup) : 'Grupo';
    $('cie10Title2').textContent = selectedSub ? subLabel(selectedGroup, selectedSub) : 'Subtipo';
    $('cie10Title3').textContent = selectedFamily || 'Familia';
    l1.querySelector('.cie10-change').hidden = !selectedGroup;
    l2.querySelector('.cie10-change').hidden = !selectedSub;
    l3.querySelector('.cie10-change').hidden = !selectedFamily;
  }

  function renderGroups() {
    const root = $('cie10List1');
    root.replaceChildren();
    GROUPS.forEach(group => {
      const count = FAMILIES.filter(family => family.group === group.id).length;
      root.appendChild(createRow({
        main: group.label,
        sub: `${count} familias`,
        selected: selectedGroup === group.id,
        onClick: () => {
          selectedGroup = group.id; selectedSub = ''; selectedFamily = ''; selectedCode = '';
          renderAll();
        }
      }));
    });
  }

  function renderSubs() {
    const root = $('cie10List2');
    root.replaceChildren();
    for (const [id, label] of (SUBS[selectedGroup] || [])) {
      const count = FAMILIES.filter(family => family.group === selectedGroup && family.sub === id).length;
      root.appendChild(createRow({
        main: label, sub: `${count} familias`, selected: selectedSub === id,
        onClick: () => { selectedSub = id; selectedFamily = ''; selectedCode = ''; renderAll(); }
      }));
    }
  }

  function renderFamilies() {
    const root = $('cie10List3');
    root.replaceChildren();
    const rows = FAMILIES.filter(family => family.group === selectedGroup && family.sub === selectedSub);
    if (!rows.length) {
      root.innerHTML = '<div class="cie10-empty">No hay familias en este subtipo.</div>';
      return;
    }
    rows.forEach(family => root.appendChild(createRow({
      main: family.desc,
      code: family.code,
      count: `${family.items.length}`,
      selected: selectedFamily === family.code,
      onClick: () => { selectedFamily = family.code; selectedCode = ''; renderAll(); }
    })));
  }

  function renderVariants() {
    const root = $('cie10List4');
    root.replaceChildren();
    const family = familyObj();
    if (!family) return;
    family.items.forEach(item => root.appendChild(createRow({
      main: item.desc,
      code: item.code,
      selected: selectedCode === item.code,
      onClick: () => { selectedCode = item.code; renderVariants(); renderFooter(); }
    })));
  }

  function renderAll() {
    if (!catalogReady) return;
    setLevelState();
    renderGroups();
    if (selectedGroup) renderSubs();
    if (selectedSub) renderFamilies();
    if (selectedFamily) renderVariants();
    renderFooter();
  }

  function searchResults(query) {
    const q = norm(query).trim();
    if (!q) return [];
    return RAW.map(item => {
      const code = norm(item.code);
      const desc = norm(item.desc);
      const syn = norm(SYN[famCode(item.code)] || '');
      let score = 0;
      if (code === q) score = 100;
      else if (code.startsWith(q)) score = 90;
      else if (syn.includes(q)) score = 75;
      else if (`${code} ${desc}`.includes(q)) score = 60;
      return score ? { item, score } : null;
    }).filter(Boolean)
      .sort((a, b) => b.score - a.score || a.item.code.localeCompare(b.item.code, 'es', { numeric: true }))
      .slice(0, 80)
      .map(result => result.item);
  }

  function renderSearch() {
    if (!catalogReady) return;
    const q = $('cie10Search').value.trim();
    const resultsRoot = $('cie10SearchResults');
    const explorer = $('cie10Explorer');
    if (!q) {
      resultsRoot.classList.remove('active');
      explorer.hidden = false;
      searchSelectedCode = '';
      renderFooter();
      return;
    }

    explorer.hidden = true;
    resultsRoot.classList.add('active');
    const results = searchResults(q);
    $('cie10SearchCount').textContent = `${results.length} resultados`;
    const list = $('cie10SearchList');
    list.replaceChildren();

    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'cie10-empty';
      empty.textContent = 'No encontré coincidencias.';
      list.appendChild(empty);
      searchSelectedCode = '';
      renderSearchDetail(); renderFooter();
      return;
    }

    if (!results.some(item => item.code === searchSelectedCode)) searchSelectedCode = results[0].code;
    results.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `cie10-search-item${searchSelectedCode === item.code ? ' selected' : ''}`;
      const code = document.createElement('span'); code.className = 'cie10-search-code'; code.textContent = item.code;
      const desc = document.createElement('span'); desc.className = 'cie10-search-desc'; desc.textContent = item.desc;
      button.append(code, desc);
      button.addEventListener('click', () => { searchSelectedCode = item.code; renderSearch(); });
      list.appendChild(button);
    });
    renderSearchDetail(); renderFooter();
  }

  function renderSearchDetail() {
    const root = $('cie10SearchDetail');
    root.replaceChildren();
    const item = searchItem();
    if (!item) {
      const empty = document.createElement('div'); empty.className = 'cie10-empty'; empty.textContent = 'Selecciona un resultado.'; root.appendChild(empty); return;
    }
    const family = FAMILIES.find(entry => entry.code === famCode(item.code));
    const code = document.createElement('div'); code.className = 'cie10-detail-code'; code.textContent = item.code;
    const desc = document.createElement('div'); desc.className = 'cie10-detail-desc'; desc.textContent = item.desc;
    const meta = document.createElement('div'); meta.className = 'cie10-detail-meta';
    meta.textContent = family ? `Grupo: ${groupLabel(family.group)} · Subtipo: ${subLabel(family.group, family.sub)} · Familia: ${family.code}` : '';
    const actions = document.createElement('div'); actions.className = 'cie10-detail-actions';
    const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'cie10-btn'; copy.textContent = 'COPIAR'; copy.addEventListener('click', () => copyCurrent(false));
    const close = document.createElement('button'); close.type = 'button'; close.className = 'cie10-btn primary'; close.textContent = 'COPIAR Y CERRAR'; close.addEventListener('click', () => copyCurrent(true));
    actions.append(copy, close);
    root.append(code, desc, meta, actions);
  }

  function renderFooter() {
    const item = currentItem();
    $('cie10SelCode').textContent = item?.code || 'Sin selección';
    $('cie10SelDesc').textContent = item?.desc || 'Selecciona una variante exacta.';
    $('cie10CopyBtn').disabled = !item;
    $('cie10CopyCloseBtn').disabled = !item;
  }

  function resetToLevel(level) {
    if (level <= 1) { selectedGroup = ''; selectedSub = ''; selectedFamily = ''; selectedCode = ''; }
    else if (level === 2) { selectedSub = ''; selectedFamily = ''; selectedCode = ''; }
    else if (level === 3) { selectedFamily = ''; selectedCode = ''; }
    renderAll();
  }

  function clearSearch() {
    const input = $('cie10Search');
    input.value = '';
    searchSelectedCode = '';
    renderSearch();
    input.focus();
  }

  async function writeClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    }
  }

  async function copyCurrent(shouldClose) {
    const item = currentItem();
    if (!item) return;
    const ok = await writeClipboard(`${item.code} - ${item.desc}`);
    showToast(ok ? 'Código CIE-10 copiado' : 'No fue posible copiar');
    app.utils?.vibrar?.(ok ? 15 : [30,40,30]);
    if (ok && shouldClose) window.setTimeout(closeCie10, 180);
  }

  function showToast(message) {
    const toast = $('cie10Toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1300);
  }

  async function ensureCatalog() {
    if (catalogReady) return;
    if (catalogLoading) return catalogLoading;
    $('cie10Loading').hidden = false;
    $('cie10Explorer').hidden = true;
    catalogLoading = import(moduleUrl('cie10LesionesData'))
      .then(module => module.loadCie10LesionesRaw())
      .then(raw => {
        RAW = raw;
        buildFamilies(raw);
        catalogReady = true;
        $('cie10Loading').hidden = true;
        $('cie10Explorer').hidden = false;
        renderAll();
      })
      .catch(error => {
        console.error('[CENSO][CIE10] No fue posible cargar el catálogo:', error);
        const loading = $('cie10Loading');
        loading.innerHTML = '';
        const box = document.createElement('div');
        box.textContent = `No fue posible cargar el catálogo CIE-10. ${error?.message || ''}`;
        loading.appendChild(box);
        throw error;
      })
      .finally(() => { catalogLoading = null; });
    return catalogLoading;
  }

  function resetForOpen() {
    selectedGroup = ''; selectedSub = ''; selectedFamily = ''; selectedCode = ''; searchSelectedCode = '';
    const input = $('cie10Search');
    if (input) input.value = '';
    $('cie10SearchResults')?.classList.remove('active');
  }

  async function openCie10() {
    ensureModal();
    previousFocus = document.activeElement;
    resetForOpen();
    const overlay = $('cie10Overlay');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    app.utils?.vibrar?.(15);
    try { await ensureCatalog(); } catch (_) {}
    if (catalogReady) renderAll();
    window.setTimeout(() => $('cie10Search')?.focus(), 40);
  }

  function closeCie10() {
    const overlay = $('cie10Overlay');
    if (!overlay?.classList.contains('active')) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    app.utils?.vibrar?.(10);
    const fallback = $('cie10Btn');
    const focusTarget = previousFocus && document.contains(previousFocus) ? previousFocus : fallback;
    window.setTimeout(() => focusTarget?.focus?.(), 0);
  }

  function handleDialogKeydown(event) {
    event.stopPropagation();
    const overlay = $('cie10Overlay');
    if (!overlay?.classList.contains('active')) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      if ($('cie10Search')?.value) clearSearch(); else closeCie10();
      return;
    }
    if (event.key === '/' && document.activeElement !== $('cie10Search')) {
      event.preventDefault(); $('cie10Search')?.focus(); return;
    }
    if (event.key === 'Enter' && document.activeElement === $('cie10Search') && currentItem()) {
      event.preventDefault(); copyCurrent(true); return;
    }
    if (event.key !== 'Tab') return;
    const dialog = overlay.querySelector('.cie10-dialog');
    const focusable = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(node => !node.hidden && node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function initCie10Ui() {
    ensureStylesheet();
    ensureModal();
    if ($('cie10Btn')) return;
    const historyBtn = $('historyBtn');
    if (!historyBtn) return;
    const button = document.createElement('button');
    button.id = 'cie10Btn';
    button.className = 'icon-btn';
    button.type = 'button';
    button.setAttribute('aria-label', 'CIE-10 lesiones');
    button.title = 'CIE-10 · Lesiones';
    button.innerHTML = '<span class="material-symbols-outlined">medical_information</span>';
    button.addEventListener('click', openCie10);
    historyBtn.insertAdjacentElement('afterend', button);
  }

  return {
    initCie10Ui,
    openCie10,
    closeCie10
  };
}
