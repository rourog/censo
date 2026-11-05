/*
  MÓDULO: themeModule.js
  THEME ENGINE V3

  RESPONSABILIDAD:
  - Catálogo accesible de fondos y acentos.
  - Adaptar el tono del acento a fondos claros/oscuros.
  - Aplicar y persistir tema y animación decorativa localmente.
  - Renderizar selector, vista previa y restablecimiento.
*/

const seasonUrl = new URL('./seasonalTheme.js', import.meta.url);
seasonUrl.searchParams.set('v', String(window.CensoBuild?.version || Date.now()));
const { getSeasonalProfile, SEASONAL_PROFILES, SEASONAL_ENABLED, getCelebrationChoice, setCelebrationChoice, launchSeasonalConfetti, initCelebrationAudio, unlockCelebrationAudio } = await import(seasonUrl.href);
const engineBuild=String(window.CensoBuild?.version || Date.now());
const registryUrl=new URL('./themes/registry.js',import.meta.url);
registryUrl.searchParams.set('v',engineBuild);
const {getSeasonalConfiguration,getRegisteredSeasons}=await import(registryUrl.href);
const prefsUrl=new URL('./themes/preferences.js',import.meta.url);
prefsUrl.searchParams.set('v',engineBuild);
const {isDecorationEnabled,getPreviewSeason}=await import(prefsUrl.href);
const ambientUrl = new URL('./seasonalAmbient.js', import.meta.url);
ambientUrl.searchParams.set('v', String(window.CensoBuild?.version || Date.now()));
// Keep the ambient implementation in Git, but avoid loading it outside the season.
const { createSeasonalAmbient } = SEASONAL_ENABLED
  ? await import(ambientUrl.href)
  : { createSeasonalAmbient: () => ({ sync() {}, stop() {} }) };

export function createThemeModule(app) {
  const { state } = app;
  const ambient = createSeasonalAmbient({ onHit: kind => {
    app.halloweenCounter?.record(kind);
    app.creatureHitAudio?.play(kind);
  } });

  const bases = [
    { id:'base-surface-graphite',name:'Grafito',color:'#101318',header:'#303741',mode:'surface' },
    { id:'base-surface-petrol',name:'Azul petróleo',color:'#081820',header:'#244854',mode:'surface' },
    { id:'base-surface-forest',name:'Verde bosque',color:'#0b1915',header:'#2a4d3d',mode:'surface' },
    { id:'base-surface-wine',name:'Vino',color:'#1a1017',header:'#583544',mode:'surface' },
    { id:'base-surface-purple',name:'Púrpura',color:'#16121e',header:'#453559',mode:'surface' },
    { id:'base-surface-carbon',name:'Carbono',color:'#0a1017',header:'#263747',card:'#202b37',mode:'surface' },
    { id:'base-surface-atlantic',name:'Atlántico',color:'#071b2b',header:'#25506b',card:'#202d38',mode:'surface' },
    { id:'base-surface-malachite',name:'Malaquita',color:'#0b2119',header:'#28644d',card:'#23332d',mode:'surface' },
    { id:'base-surface-copper',name:'Cobre',color:'#24170f',header:'#674530',card:'#332921',mode:'surface' },
    { id:'base-surface-aubergine',name:'Berenjena',color:'#1b1125',header:'#58365f',card:'#2d2736',mode:'surface' },
    { id:'base-surface-indigo',name:'Índigo',color:'#101528',header:'#354977',card:'#242e3e',mode:'surface' },
    { id:'base-surface-sienna',name:'Terracota',color:'#261816',header:'#704438',card:'#352b29',mode:'surface' },
    { id:'base-surface-lagoon',name:'Laguna',color:'#09242a',header:'#285d68',card:'#20333a',mode:'surface' },
    { id:'base-surface-ice-light',name:'Glaciar',color:'#e9f4fb',header:'#bfdcec',card:'#ffffff',mode:'surface-light' },
    { id:'base-surface-pearl-light',name:'Perla',color:'#f4f3ee',header:'#d8d9d3',card:'#ffffff',mode:'surface-light' },
    { id:'base-surface-mint-light',name:'Menta',color:'#edf9f1',header:'#c5e5d0',card:'#ffffff',mode:'surface-light' },
    { id:'base-surface-lilac-light',name:'Lila',color:'#f5f0ff',header:'#dccdef',card:'#ffffff',mode:'surface-light' },
    { id: 'base-dark', name: 'Slate', color: '#0f172a', mode: 'dark' },
    { id: 'base-midnight', name: 'OLED', color: '#000000', mode: 'dark' },
    { id: 'base-gray-dark', name: 'Grafito', color: '#27272a', mode: 'dark' },
    { id: 'base-navy', name: 'Navy', color: '#001529', mode: 'dark' },
    { id: 'base-ocean', name: 'Océano', color: '#082f49', mode: 'dark' },
    { id: 'base-teal-dark', name: 'Teal', color: '#042f2e', mode: 'dark' },
    { id: 'base-forest', name: 'Bosque', color: '#064e3b', mode: 'dark' },
    { id: 'base-plum', name: 'Ciruela', color: '#3b0764', mode: 'dark' },
    { id: 'base-burgundy', name: 'Borgoña', color: '#3f0a17', mode: 'dark' },
    { id: 'base-coffee', name: 'Café', color: '#451a03', mode: 'dark' },

    { id: 'base-light', name: 'Blanco frío', color: '#f8fafc', mode: 'light' },
    { id: 'base-pure-white', name: 'Blanco', color: '#ffffff', mode: 'light' },
    { id: 'base-gray-light', name: 'Gris', color: '#e2e8f0', mode: 'light' },
    { id: 'base-ice', name: 'Hielo', color: '#eff6ff', mode: 'light' },
    { id: 'base-sage', name: 'Salvia', color: '#f3f7f2', mode: 'light' },
    { id: 'base-sand', name: 'Arena', color: '#fefce8', mode: 'light' },
    { id: 'base-peach', name: 'Durazno', color: '#fff7ed', mode: 'light' },
    { id: 'base-rose', name: 'Rosa', color: '#fff1f2', mode: 'light' },
    { id: 'base-mint', name: 'Menta', color: '#f0fdf4', mode: 'light' },
    { id: 'base-lavender', name: 'Lavanda', color: '#faf5ff', mode: 'light' }
  ];

  const accents = [
    { id: 'accent-blue', name: 'Azul', light: '#1d4ed8', dark: '#60a5fa' },
    { id: 'accent-pure-blue', name: 'Royal', light: '#1e40af', dark: '#93c5fd' },
    { id: 'accent-sky', name: 'Celeste', light: '#0369a1', dark: '#38bdf8' },
    { id: 'accent-cyan', name: 'Cian', light: '#0e7490', dark: '#22d3ee' },
    { id: 'accent-teal', name: 'Turquesa', light: '#0f766e', dark: '#2dd4bf' },
    { id: 'accent-emerald', name: 'Esmeralda', light: '#047857', dark: '#34d399' },
    { id: 'accent-green', name: 'Verde', light: '#15803d', dark: '#4ade80' },
    { id: 'accent-lime', name: 'Lima', light: '#4d7c0f', dark: '#a3e635' },

    { id: 'accent-gold', name: 'Oro', light: '#8a6100', dark: '#ffd700', metallic: 'gold' },
    { id: 'accent-silver', name: 'Plata', light: '#475569', dark: '#d1d5db', metallic: 'silver' },
    { id: 'accent-bronze', name: 'Bronce', light: '#7c3f12', dark: '#d08a3e', metallic: 'bronze' },
    { id: 'accent-copper', name: 'Cobre', light: '#8f3f12', dark: '#f28c52', metallic: 'copper' },
    { id: 'accent-amber', name: 'Ámbar', light: '#b45309', dark: '#fbbf24' },
    { id: 'accent-orange', name: 'Naranja', light: '#c2410c', dark: '#fb923c' },

    { id: 'accent-red', name: 'Rojo', light: '#b91c1c', dark: '#ff5252' },
    { id: 'accent-pure-red', name: 'Rojo puro', light: '#a80000', dark: '#ff2d2d' },
    { id: 'accent-scarlet', name: 'Escarlata', light: '#c1121f', dark: '#ff375f' },
    { id: 'accent-crimson', name: 'Carmesí', light: '#be123c', dark: '#fb7185' },
    { id: 'accent-pink', name: 'Rosa', light: '#be185d', dark: '#f472b6' },
    { id: 'accent-fuchsia', name: 'Fucsia', light: '#a21caf', dark: '#e879f9' },
    { id: 'accent-purple', name: 'Púrpura', light: '#7e22ce', dark: '#c084fc' },
    { id: 'accent-violet', name: 'Violeta', light: '#6d28d9', dark: '#a78bfa' },
    { id: 'accent-indigo', name: 'Índigo', light: '#4338ca', dark: '#818cf8' }
  ];

  const effects = [
    ...(SEASONAL_ENABLED ? [{ id: 'effect-halloween', name: 'Murciélagos y niebla', icon: 'dark_mode' }] : []),
    { id: 'effect-waves', name: 'Olas', icon: 'waves' },
    { id: 'effect-aurora', name: 'Aurora', icon: 'blur_on' },
    { id: 'effect-grid', name: 'Rejilla', icon: 'grid_4x4' },
    { id: 'effect-radar', name: 'Radar', icon: 'radar' },
    { id: 'effect-particles', name: 'Partículas', icon: 'grain' },
    { id: 'effect-pulse', name: 'Pulso', icon: 'track_changes' },
    { id: 'effect-scan', name: 'Escáner', icon: 'document_scanner' },
    { id: 'effect-nebula', name: 'Nebulosa', icon: 'blur_circular' },
    { id: 'effect-none', name: 'Ninguna', icon: 'motion_photos_off' }
  ];

  // Complete appearance combinations. Personalizado preserves independent choices.
  const themePresets = [
    {id:'graphite-red',name:'Grafito Rojo',base:'base-surface-graphite',accent:'accent-red',family:'Oscuros',featured:true},
    {id:'graphite-green',name:'Grafito Verde',base:'base-surface-graphite',accent:'accent-green',family:'Oscuros',featured:true},
    {id:'graphite-cyan',name:'Grafito Cyan',base:'base-surface-graphite',accent:'accent-cyan',family:'Oscuros',featured:true},
    {id:'graphite-gold-v2',name:'Grafito Dorado',base:'base-gray-dark',accent:'accent-gold',family:'Oscuros',featured:true},
    {id:'oled-red',name:'OLED Rojo',base:'base-midnight',accent:'accent-pure-red',family:'OLED',featured:true},
    {id:'oled-cyan',name:'OLED Cyan',base:'base-midnight',accent:'accent-cyan',family:'OLED',featured:true},
    {id:'oled-green',name:'OLED Verde',base:'base-midnight',accent:'accent-green',family:'OLED',featured:true},
    {id:'oled-amber',name:'OLED Ámbar',base:'base-midnight',accent:'accent-amber',family:'OLED',featured:true},
    {id:'monitor-vital',name:'Monitor Vital',base:'base-midnight',accent:'accent-green',family:'Monitor',featured:true},
    {id:'ecg-green',name:'ECG Verde',base:'base-midnight',accent:'accent-lime',family:'Monitor',featured:true},
    {id:'uci-cyan',name:'UCI Cyan',base:'base-midnight',accent:'accent-cyan',family:'Monitor',featured:true},
    {id:'defib-yellow',name:'Desfibrilador',base:'base-midnight',accent:'accent-gold',family:'Monitor',featured:true},
    {id:'neon-cyan',name:'Neón Cyan',base:'base-surface-carbon',accent:'accent-cyan',family:'Neón',featured:true},
    {id:'cyber-red',name:'Cyber Red',base:'base-surface-carbon',accent:'accent-scarlet',family:'Neón',featured:true},
    {id:'ultraviolet',name:'Ultravioleta',base:'base-surface-aubergine',accent:'accent-violet',family:'Neón',featured:true},
    {id:'clinical-gold',name:'Oro Clínico',base:'base-surface-carbon',accent:'accent-gold',family:'Metálicos',featured:true},
    {id:'bronze',name:'Bronce',base:'base-surface-copper',accent:'accent-bronze',family:'Metálicos',featured:true},
    {id:'chrome',name:'Cromo',base:'base-gray-dark',accent:'accent-silver',family:'Metálicos',featured:true},
    {id:'clinical-white',name:'Blanco Clínico',base:'base-pure-white',accent:'accent-blue',family:'Claros',featured:true},
    {id:'ivory-gold',name:'Marfil Dorado',base:'base-surface-pearl-light',accent:'accent-gold',family:'Claros',featured:true},
    {id:'graphite',name:'Grafito',base:'base-surface-graphite',accent:'accent-blue'},
    {id:'petrol',name:'Azul petróleo',base:'base-surface-petrol',accent:'accent-teal'},
    {id:'forest',name:'Verde bosque',base:'base-surface-forest',accent:'accent-emerald'},
    {id:'wine',name:'Vino',base:'base-surface-wine',accent:'accent-crimson'},
    {id:'purple',name:'Púrpura',base:'base-surface-purple',accent:'accent-violet'},
    {id:'pine-red',name:'Pino y rojo',base:'base-surface-forest',accent:'accent-red'},
    {id:'oled',name:'OLED',base:'base-midnight',accent:'accent-silver'},
    {id:'ice',name:'Hielo',base:'base-ice',accent:'accent-sky'},
    {id:'light',name:'Blanco',base:'base-light',accent:'accent-blue'},
    {id:'carbon-gold',name:'Carbono y oro',base:'base-surface-carbon',accent:'accent-gold'},
    {id:'atlantic',name:'Atlántico',base:'base-surface-atlantic',accent:'accent-sky'},
    {id:'malachite',name:'Malaquita',base:'base-surface-malachite',accent:'accent-lime'},
    {id:'copper',name:'Cobre',base:'base-surface-copper',accent:'accent-copper'},
    {id:'aubergine',name:'Berenjena',base:'base-surface-aubergine',accent:'accent-fuchsia'},
    {id:'indigo',name:'Índigo',base:'base-surface-indigo',accent:'accent-indigo'},
    {id:'sienna',name:'Terracota',base:'base-surface-sienna',accent:'accent-amber'},
    {id:'lagoon',name:'Laguna',base:'base-surface-lagoon',accent:'accent-cyan'},
    {id:'glacier',name:'Glaciar',base:'base-surface-ice-light',accent:'accent-sky'},
    {id:'pearl',name:'Perla',base:'base-surface-pearl-light',accent:'accent-bronze'},
    {id:'mint',name:'Menta',base:'base-surface-mint-light',accent:'accent-emerald'},
    {id:'lilac',name:'Lila',base:'base-surface-lilac-light',accent:'accent-violet'},
    {id:'graphite-gold',name:'Grafito y oro',base:'base-surface-graphite',accent:'accent-gold'},
    {id:'petrol-amber',name:'Petróleo y ámbar',base:'base-surface-petrol',accent:'accent-amber'},
    {id:'wine-silver',name:'Vino y plata',base:'base-surface-wine',accent:'accent-silver'},
    {id:'forest-lime',name:'Bosque y lima',base:'base-surface-forest',accent:'accent-lime'}
  ];

  // Header colors are independent of the background and accent in Custom mode.
  // The first option keeps the selected base's natural header shade.
  const headerChoices = [
    {id:'auto',name:'Según fondo',color:null},
    {id:'graphite',name:'Grafito',color:'#303741'},
    {id:'slate',name:'Pizarra',color:'#40536a'},
    {id:'midnight',name:'Noche',color:'#233047'},
    {id:'marine',name:'Azul marino',color:'#204d68'},
    {id:'iceblue',name:'Azul hielo',color:'#bddbe9'},
    {id:'teal',name:'Petróleo',color:'#245663'},
    {id:'forest',name:'Bosque',color:'#285c47'},
    {id:'sage',name:'Salvia',color:'#c3dccb'},
    {id:'olive',name:'Oliva',color:'#566346'},
    {id:'wine',name:'Vino',color:'#633443'},
    {id:'ruby',name:'Rubí',color:'#832d40'},
    {id:'sienna',name:'Terracota',color:'#754737'},
    {id:'copper',name:'Cobre',color:'#745038'},
    {id:'aubergine',name:'Ciruela',color:'#553765'},
    {id:'lavender',name:'Lavanda',color:'#d5c4ee'},
    {id:'sand',name:'Arena',color:'#e3d5bf'},
    {id:'pearl',name:'Perla',color:'#e6e8e6'},
    {id:'white',name:'Blanco',color:'#f4f7fb'}
  ];
  const headerById=new Map(headerChoices.map(item=>[item.id,item]));
  const getHeaderChoice=()=>headerById.has(localStorage.getItem(preferenceKey('custom-header')))
    ?localStorage.getItem(preferenceKey('custom-header')):'auto';
  function readableInk(hex) {
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
    const lightness=rgb.map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
    const lum=.2126*lightness[0]+.7152*lightness[1]+.0722*lightness[2];
    // At the crossover (~0.179 luminance), white and black each exceed 4.5:1.
    return (1.05/(lum+.05)) >= ((lum+.05)/.05) ? '#ffffff' : '#000000';
  }

  const DEFAULT_BASE = 'base-surface-graphite';
  const DEFAULT_ACCENT = 'accent-blue';
  const DEFAULT_EFFECT = 'effect-waves';
  const baseIds = new Set(bases.map(item => item.id));
  const accentIds = new Set(accents.map(item => item.id));
  const effectIds = new Set(effects.map(item => item.id));

  function ensureStylesheet(id, filename) {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    const url = new URL(`./${filename}`, import.meta.url);
    url.searchParams.set('v', String(window.CensoBuild?.version || Date.now()));
    link.href = url.href;
    document.head.appendChild(link);
  }

  function ensureThemeStylesheets() {
    if (SEASONAL_ENABLED) ensureStylesheet('censo-seasonal-styles', 'seasonalTheme.css');
    ensureStylesheet('censo-theme-v2-styles', 'themePaletteV2.css');
    ensureStylesheet('censo-theme-v3-effects', 'themeEffectsV3.css');
    ensureStylesheet('censo-theme-v3-layout-effects', 'themeEffectsV4.css');
    // Load last: surface colors take precedence without changing clinical status classes.
    ensureStylesheet('censo-theme-v4-surfaces', 'themeSurfacesV4.css');
    ensureStylesheet('censo-theme-v5-compact', 'themeCompactV5.css');
  }

  function validBase(value) {
    return baseIds.has(value) ? value : DEFAULT_BASE;
  }

  function validAccent(value) {
    if (value === 'accent-slate') return 'accent-silver';
    return accentIds.has(value) ? value : DEFAULT_ACCENT;
  }

  function validEffect(value) {
    return effectIds.has(value) ? value : DEFAULT_EFFECT;
  }

  function preferenceKey(part) {
    // Independent preferences for Seasonal Engine themes. General user
    // preferences must not suppress Christmas defaults or be overwritten.
    const profile = getSeasonalProfile();
    const id = profile?.id || getSeasonalConfiguration()?.id;
    return id ? `censo-season-${id}-${part}` : `censo-${part}`;
  }
  function getCurrentTheme() {
    const defaults = getSeasonalProfile()?.defaults || getSeasonalConfiguration()?.palette ||
      { base: DEFAULT_BASE, accent: DEFAULT_ACCENT, effect: DEFAULT_EFFECT };
    return {
      base: validBase(localStorage.getItem(preferenceKey('base')) || defaults.base),
      accent: validAccent(localStorage.getItem(preferenceKey('accent')) || defaults.accent),
      effect: validEffect(localStorage.getItem(preferenceKey('effect')) || defaults.effect)
    };
  }
  let appearancePage='themes';
  function showAppearancePage(page){
    const available=['themes','custom','effects','season'];
    if(!available.includes(page))page='themes';
    appearancePage=page;
    const colorPanel=document.getElementById('themeAppearanceColors');
    const catalogue=document.getElementById('themePresetCatalogue');
    const custom=document.getElementById('themeCustomBasePanel');
    const effects=document.getElementById('themeAppearanceEffects');
    const season=document.getElementById('themeAppearanceSeason');
    if(colorPanel)colorPanel.hidden=!['themes','custom'].includes(page);
    if(catalogue)catalogue.hidden=page!=='themes';
    if(custom)custom.hidden=page!=='custom';
    if(effects)effects.hidden=page!=='effects';
    if(season)season.hidden=page!=='season';
    document.querySelectorAll('#themeModal .theme-appearance-tab')
      .forEach(tab=>{
        const active=tab.dataset.appearancePage===page;
        tab.setAttribute('aria-selected',String(active));
        tab.tabIndex=active?0:-1;
        tab.classList.toggle('is-active',active);
      });
  }
  function bindAppearanceTabs(){
    const tabs=Array.from(document.querySelectorAll('#themeModal .theme-appearance-tab'));
    if(!tabs.length||tabs[0].dataset.bound==='true')return;
    tabs[0].dataset.bound='true';
    tabs.forEach(tab=>{
      tab.addEventListener('click',()=>{
        const page=tab.dataset.appearancePage;
        if(page==='custom'&&getActivePreset()!=='custom'){
          choosePreset('custom');
        } else {
          showAppearancePage(page);
        }
      });
      tab.addEventListener('keydown',event=>{
        const names=['ArrowRight','ArrowLeft','Home','End'];
        if(!names.includes(event.key))return;
        event.preventDefault();
        const current=tabs.indexOf(tab);
        const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:
          (current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
        tabs[next].focus();
        tabs[next].click();
      });
    });
  }
  function getActivePreset() {
    const chosen=localStorage.getItem(preferenceKey('preset'));
    if(chosen==='custom')return 'custom';
    const theme=getCurrentTheme();
    // Same base+accent pair may have several intentional finishes (e.g. OLED
    // Verde versus Monitor Vital). Preserve the explicit preset ID first.
    const selected=themePresets.find(p=>p.id===chosen);
    if(selected&&selected.base===theme.base&&selected.accent===theme.accent)return selected.id;
    // Migrate older saved base+accent pairs without changing their colors.
    const matching=themePresets.find(p=>p.base===theme.base&&p.accent===theme.accent);
    return matching?.id||'custom';
  }
  function updatePresetPicker(){
    const chosen=getActivePreset();
    const legacyGallery=document.getElementById('themeLegacyPresets');
    if(legacyGallery && themePresets.some(p=>p.id===chosen&&!p.featured))legacyGallery.open=true;
    document.querySelectorAll('[data-theme-preset]').forEach(button=>{
      const active=button.dataset.themePreset===chosen;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    const customBase=document.getElementById('themeCustomBasePanel');
    if(customBase)customBase.hidden=appearancePage!=='custom';
    // All three compact controls are now inside Personalizado.
    const oldAccentPanel=document.getElementById('accentColorPicker')?.parentElement;
    if(oldAccentPanel)oldAccentPanel.hidden=true;
  }
  function choosePreset(id){
    if(id==='custom'){
      const current=getCurrentTheme();
      const base=validBase(localStorage.getItem(preferenceKey('custom-base'))||current.base);
      const accent=validAccent(localStorage.getItem(preferenceKey('custom-accent'))||current.accent);
      localStorage.setItem(preferenceKey('preset'),'custom');
      localStorage.setItem(preferenceKey('custom-base'),base);
      localStorage.setItem(preferenceKey('custom-accent'),accent);
      applyTheme(base,accent);
      showAppearancePage('custom');
      return;
    }
    const selected=themePresets.find(p=>p.id===id);
    if(!selected)return;
    if(getActivePreset()==='custom'){
      const current=getCurrentTheme();
      localStorage.setItem(preferenceKey('custom-base'),current.base);
      localStorage.setItem(preferenceKey('custom-accent'),current.accent);
    }
    localStorage.setItem(preferenceKey('preset'),id);
    applyTheme(selected.base,selected.accent);
    showAppearancePage('themes');
  }
  function chooseCustom(base=null,accent=null,headerId=null){
    const current=getCurrentTheme();
    const nextBase=validBase(base||current.base);
    const nextAccent=validAccent(accent||current.accent);
    localStorage.setItem(preferenceKey('preset'),'custom');
    localStorage.setItem(preferenceKey('custom-base'),nextBase);
    localStorage.setItem(preferenceKey('custom-accent'),nextAccent);
    if(headerId!==null && headerById.has(headerId)){
      localStorage.setItem(preferenceKey('custom-header'),headerId);
    }
    applyTheme(nextBase,nextAccent);
  }

  function applyHeaderOverride(){
    const id=getHeaderChoice();
    const entry=headerById.get(id);
    const enabled=getActivePreset()==='custom' && !!entry?.color;
    document.body.classList.toggle('theme-custom-header',enabled);
    if(enabled){
      document.body.style.setProperty('--custom-header-color',entry.color);
      document.body.style.setProperty('--custom-header-ink',readableInk(entry.color));
    }else{
      document.body.style.removeProperty('--custom-header-color');
      document.body.style.removeProperty('--custom-header-ink');
    }
  }

  function applySeasonalBanner() {
    const profile = getSeasonalProfile(), body = document.body;
    const props = { '--season-banner-bg': 'background', '--season-banner-text': 'text', '--season-banner-accent': 'accent', '--season-title-font': 'titleFont' };
    if (profile) body.dataset.season = profile.id;
    else delete body.dataset.season;
    for (const [css, key] of Object.entries(props)) {
      if (profile?.banner[key]) body.style.setProperty(css, profile.banner[key]);
      else body.style.removeProperty(css);
    }
    if (profile?.banner.nodeGlyph) body.dataset.seasonNodeGlyph = profile.banner.nodeGlyph;
    else delete body.dataset.seasonNodeGlyph;
    updateToggles();
    const ghostColor = document.getElementById('ghostColorPicker');
    if (ghostColor) ghostColor.value = localStorage.getItem('censo-ghost-color') || 'mixed';
    const celebration = document.getElementById('celebrationPicker');
    if (celebration) celebration.value = getSeasonalConfiguration()?.id==='christmas'
      ? (localStorage.getItem('censo-christmas-celebration') || 'fireworks')
      : getCelebrationChoice();
  }
  function updateToggles() {
    const values = {
      season: localStorage.getItem('censo-season') === 'off' ? 'off' : 'on',
      decorations: isDecorationEnabled('november') ? 'on' : 'off',
      celebrations: localStorage.getItem('censo-celebration-mode') === 'all' ? 'all' : 'seasonal',
      sound: localStorage.getItem('censo-celebration-sound') === 'on' ? 'on' : 'off'
    };
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const active = values[button.dataset.themeToggle] === button.dataset.value;
      button.setAttribute('aria-pressed', String(active));
    });
    const picker = document.getElementById('celebrationPicker');
    if (picker) picker.parentElement.hidden = values.celebrations === 'all' || !!getSeasonalProfile();
    const preview = document.getElementById('seasonalEnginePreview');
    if (preview) preview.value=getPreviewSeason();
  }
  function toggleGroup(id, label, choices) {
    return `<section class="theme-toggle-section"><div class="theme-picker-group__label">${label}</div>
      <div class="theme-toggle-group" role="group" aria-label="${label}">
        ${choices.map(([value, text]) => `<button type="button" data-theme-toggle="${id}" data-value="${value}" aria-pressed="false">${text}</button>`).join('')}
      </div></section>`;
  }
  function refreshSeason() {
    applySeasonalBanner();
    const theme = getCurrentTheme();
    applyTheme(theme.base, theme.accent, false);
    applyEffect(theme.effect, false);
    document.dispatchEvent?.(new Event('censo:seasonchange'));
  }

  function renderBaseGroup(mode, title) {
    const items = bases.filter(item => item.mode === mode);
    return `
      <section class="theme-picker-group" aria-label="${title}">
        <div class="theme-picker-group__label"><span>${title}</span><span>${items.length}</span></div>
        <div class="theme-picker-grid">
          ${items.map(item => `
            <button class="theme-swatch base-swatch ${item.header ? 'theme-swatch--duo' : ''}" type="button" data-val="${item.id}" aria-label="${item.header ? 'Paleta' : 'Fondo'} ${item.name}" title="${item.name}">
              ${item.header ? `<span class="theme-swatch__duo" style="--surface-dark:${item.color};--surface-light:${item.header}"></span>` : `<span class="theme-swatch__dot" style="background:${item.color}"></span>`}
              <span class="theme-swatch__name">${item.name}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }


  function renderThemePresetCard(p){
    const base=bases.find(item=>item.id===p.base);
    const accent=accents.find(item=>item.id===p.accent);
    const light=base?.mode==='light'||base?.mode==='surface-light';
    const extraHeaders={'base-midnight':'#242a31','base-ice':'#dbeafe','base-light':'#f1f5f9'};
    const head=base?.header||extraHeaders[p.base]||(light?'#e2e8f0':'#303a46');
    const card=base?.card||(light?'#ffffff':p.base==='base-midnight'?'#12191f':'#242c35');
    const foreground=light?'#253246':'#e7eef8';
    const accentColor=light?accent?.light:accent?.dark;
    return `<button type="button" class="theme-preset-button"
      data-theme-preset="${p.id}" data-theme-family="${p.family||'Legado'}"
      aria-label="Tema ${p.name}" aria-pressed="false" title="${p.name}"
      style="--preset-bg:${base?.color};--preset-head:${head};--preset-card:${card};
        --preset-accent:${accentColor};--preset-text:${foreground}">
      <span class="theme-preset-art" aria-hidden="true">
        <span class="theme-preset-art__header"></span>
        <span class="theme-preset-art__card"><i></i><b></b></span>
      </span>
      <span class="theme-preset-name">${p.name}</span>
    </button>`;
  }
  function renderThemePresets(){
    const families=['Oscuros','OLED','Monitor','Neón','Metálicos','Claros'];
    const featured=families.map(family=>{
      const options=themePresets.filter(item=>item.featured&&item.family===family);
      return `<section class="theme-preset-family" aria-label="${family}">
        <div class="theme-preset-family__name">${family}</div>
        <div class="theme-presets-grid">${options.map(renderThemePresetCard).join('')}</div>
      </section>`;
    }).join('');
    const previous=themePresets.filter(item=>!item.featured);
    return `<section class="theme-picker-group" aria-label="Temas completos">
      <div class="theme-picker-group__label"><span>Temas completos</span><span>20 principales</span></div>
      <div class="theme-preset-families">${featured}</div>
      <details id="themeLegacyPresets" class="theme-preset-legacy">
        <summary>Más temas · ${previous.length} anteriores</summary>
        <div class="theme-presets-grid">${previous.map(renderThemePresetCard).join('')}</div>
      </details>
    </section>`;
  }

  function renderCustomBaseGrid(){
    return `<section class="theme-custom-choice" aria-label="Fondo">
      <div class="theme-custom-choice__title">FONDO</div>
      <div class="theme-custom-swatches">
        ${bases.map(item=>`
          <button type="button" class="theme-color-chip base-swatch"
            data-val="${item.id}" aria-label="Fondo ${item.name}" aria-pressed="false"
            title="${item.name}" style="--chip-fill:${item.color}">
            <span class="theme-color-chip__fill" aria-hidden="true"></span>
          </button>`).join('')}
      </div>
    </section>`;
  }
  function renderCustomHeaderGrid(){
    return `<section class="theme-custom-choice" aria-label="Encabezados">
      <div class="theme-custom-choice__title">ENCABEZADOS</div>
      <div class="theme-custom-swatches">
        ${headerChoices.map(item=>`
          <button type="button" class="theme-color-chip theme-header-swatch"
            data-header="${item.id}" aria-label="Encabezados: ${item.name}"
            aria-pressed="false" title="${item.name}"
            style="--chip-fill:${item.color||'#465565'}">
            <span class="theme-color-chip__fill ${item.color?'':'theme-color-chip__fill--auto'}"
              aria-hidden="true"></span>
          </button>`).join('')}
      </div>
    </section>`;
  }
  function renderAccentGrid(){
    return `<section class="theme-custom-choice" aria-label="Acento">
      <div class="theme-custom-choice__title">ACENTO</div>
      <div class="theme-custom-swatches">
        ${accents.map(item=>`
          <button type="button" class="theme-color-chip accent-swatch"
            data-val="${item.id}" aria-label="Acento ${item.name}"
            aria-pressed="false" title="${item.name}"
            style="--chip-fill:${item.dark};--chip-fill-light:${item.light}">
            <span class="theme-color-chip__fill theme-color-chip__fill--accent"
              aria-hidden="true"></span>
          </button>`).join('')}
      </div>
    </section>`;
  }

  function renderEffectPicker() {
    return `
      <section class="theme-effect-picker" aria-label="Animación decorativa">
        <div class="theme-picker-group__label"><span>Animación</span><span>Escritorio</span></div>
        <div class="theme-effect-grid">
          ${effects.map(item => `
            <button class="theme-effect-option" type="button" data-effect="${item.id}" aria-label="Animación ${item.name}">
              <span class="material-symbols-outlined" aria-hidden="true">${item.icon}</span>
              <span>${item.name}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function ensureExtras() {
    if (document.getElementById('themeV2Extras')) return;
    const modalContent = document.querySelector('#themeModal .modal-content');
    if (!modalContent) return;

    const extras = document.createElement('div');
    extras.id = 'themeV2Extras';
    extras.innerHTML = `
      <section id="themeAppearanceEffects" class="theme-appearance-page" role="tabpanel" aria-label="Efectos visuales" hidden>
        ${renderEffectPicker()}
      </section>
      <section id="themeAppearanceSeason" class="theme-appearance-page theme-appearance-season" role="tabpanel" aria-label="Opciones de temporada" hidden>
        ${toggleGroup('decorations','Decoración de temporada',[['on','Activada'],['off','Desactivada']])}
        <section class="season-picker" aria-label="Laboratorio estacional beta">
          <label for="seasonalEnginePreview">Tema estacional</label>
          <select id="seasonalEnginePreview">
            <option value="auto">Automático (calendario)</option>
            ${getRegisteredSeasons().map(item=>`<option value="${item.id}">Vista previa: ${item.name}</option>`).join('')}
          </select>
        </section>
        ${toggleGroup('celebrations','Celebraciones',[['all','Aleatoria'],['seasonal','Elegida']])}
        ${toggleGroup('sound','Sonidos',[['on','ON'],['off','OFF']])}
        <section class="season-picker theme-season-celebration" aria-label="Celebración">
          <div class="theme-season-choice">
            <label for="celebrationPicker">Efecto de celebración</label>
            <select id="celebrationPicker"><option value="confetti">Confeti</option><option value="fireworks">Fuegos artificiales</option><option value="balloons">Globos</option></select>
          </div>
          <button id="celebrationPreview" type="button" class="theme-reset">PROBAR</button>
        </section>
        ${SEASONAL_ENABLED ? '<section class="season-picker"><label for="ghostColorPicker">Fantasmas</label><select id="ghostColorPicker"><option value="mixed">Azules y rosas</option><option value="cyan">Azules</option><option value="pink">Rosas</option></select></section>' : ''}
      </section>
      <div class="theme-appearance-footer">
        <section class="theme-preview" aria-label="Vista previa del tema">
          <div class="theme-preview__surface-header">
            <span>SALA DE CHOQUE</span>
            <span id="themeSelectionLabel" class="theme-preview__selection"></span>
          </div>
          <div class="theme-preview__card">
            <span class="theme-preview__patient">CAMA 3 · PACIENTE</span>
            <span class="theme-preview__meta">DIAGNÓSTICO Y PENDIENTES</span>
            <span class="theme-preview__chip">OBSERVACIÓN</span>
          </div>
        </section>
        <button id="themeResetBtn" class="theme-reset" type="button" title="Restablecer paleta y efectos predeterminados">
          <span class="material-symbols-outlined" aria-hidden="true">restart_alt</span>
          <span>Restablecer</span>
        </button>
      </div>
    `;
    modalContent.appendChild(extras);
    document.getElementById('celebrationPicker').value = getSeasonalConfiguration()?.id==='christmas'
      ? (localStorage.getItem('censo-christmas-celebration') || 'fireworks')
      : getCelebrationChoice();
    document.getElementById('celebrationPicker').addEventListener('change', event => {
      if(getSeasonalConfiguration()?.id==='christmas')localStorage.setItem('censo-christmas-celebration',event.target.value);
      else setCelebrationChoice(event.target.value);
    });
    extras.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        const {themeToggle, value} = button.dataset;
        if (themeToggle === 'decorations') {
          void app.seasonalEngine?.setEnabled(value === 'on');
          refreshSeason();
        } else if (themeToggle === 'season') {
          if (value === 'off') {
            localStorage.setItem('censo-season-last', localStorage.getItem('censo-season') || 'auto');
            localStorage.setItem('censo-season', 'off');
          } else {
            localStorage.setItem('censo-season', localStorage.getItem('censo-season-last') || 'auto');
          }
          refreshSeason();
        } else if (themeToggle === 'celebrations') {
          localStorage.setItem('censo-celebration-mode', value);
          updateToggles();
        } else {
          localStorage.setItem('censo-celebration-sound', value);
          if (value === 'on') { unlockCelebrationAudio(); app.creatureHitAudio?.prepare(); }
          else app.creatureHitAudio?.stop();
          updateToggles();
        }
      });
    });
    document.getElementById('seasonalEnginePreview')?.addEventListener('change',event=>{
      void app.seasonalEngine?.setPreview(event.target.value);
      refreshSeason();
    });
    const ghostColorPicker = document.getElementById('ghostColorPicker');
    if (ghostColorPicker) {
      ghostColorPicker.value = localStorage.getItem('censo-ghost-color') || 'mixed';
      ghostColorPicker.addEventListener('change', event => { localStorage.setItem('censo-ghost-color', event.target.value); refreshSeason(); });
    }
    updateToggles();
    document.getElementById('celebrationPreview').addEventListener('click', async () => {
      app.cerrarModal?.('themeModal');
      await unlockCelebrationAudio();
      app.launchSeasonalConfetti?.({particleCount:150, spread:80, origin:{y:.6}});
    });
    initCelebrationAudio().catch(error => console.warn('[CENSO] Audio decorativo no disponible:', error));

    extras.querySelectorAll('.theme-effect-option').forEach(button => {
      button.addEventListener('click', () => applyEffect(button.dataset.effect));
    });
    document.getElementById('themeResetBtn')?.addEventListener('click', () => {
      for (const part of ['base','accent','effect','preset','custom-base','custom-accent','custom-header'])
        localStorage.removeItem(preferenceKey(part));
      refreshSeason();
      showAppearancePage('themes');
    });
  }

  function renderThemePickers() {
    ensureThemeStylesheets();
    const baseGrid = document.getElementById('baseColorPicker');
    const accentGrid = document.getElementById('accentColorPicker');
    if (!baseGrid || !accentGrid) return;

    baseGrid.className = 'theme-picker-section';
    accentGrid.className = 'theme-picker-section';
    baseGrid.innerHTML =
      `<div id="themePresetCatalogue">${renderThemePresets()}</div>
       <div id="themeCustomBasePanel" class="theme-custom-panel" hidden>
         <div class="theme-custom-choices">
           ${renderCustomBaseGrid()}
           ${renderCustomHeaderGrid()}
           ${renderAccentGrid()}
         </div>
       </div>`;
    // The former accent picker stays in markup for compatibility but is unused.
    accentGrid.innerHTML='';

    baseGrid.querySelectorAll('[data-theme-preset]').forEach(button=>{
      button.addEventListener('click',()=>choosePreset(button.dataset.themePreset));
    });
    baseGrid.querySelectorAll('.base-swatch').forEach(button=>{
      button.addEventListener('click',()=>chooseCustom(button.dataset.val,null));
    });
    baseGrid.querySelectorAll('.theme-header-swatch').forEach(button=>{
      button.addEventListener('click',()=>chooseCustom(null,null,button.dataset.header));
    });
    baseGrid.querySelectorAll('.accent-swatch').forEach(button=>{
      button.addEventListener('click',()=>chooseCustom(null,button.dataset.val));
    });

    const baseLabel=baseGrid.parentElement?.querySelector('label');
    if(baseLabel)baseLabel.textContent='TEMAS COMPLETOS';
    const oldAccentLabel=accentGrid.parentElement?.querySelector('label');
    if(oldAccentLabel)oldAccentLabel.textContent='ACENTO';

    ensureExtras();
    bindAppearanceTabs();
    showAppearancePage(getActivePreset()==='custom'?'custom':'themes');
    updatePresetPicker();
  }

  function removeOldThemeClasses() {
    [...document.body.classList]
      .filter(className => className.startsWith('base-') || className.startsWith('accent-'))
      .forEach(className => document.body.classList.remove(className));
  }

  function removeOldEffectClasses() {
    [...document.body.classList]
      .filter(className => className.startsWith('effect-'))
      .forEach(className => document.body.classList.remove(className));
  }

  function updatePickerState(base, accent) {
    document.querySelectorAll('.base-swatch').forEach(button => {
      const active = button.dataset.val === base;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('.accent-swatch').forEach(button => {
      const active = button.dataset.val === accent;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('.theme-header-swatch').forEach(button => {
      const active=button.dataset.header===getHeaderChoice();
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });

    const baseName = bases.find(item => item.id === base)?.name || base;
    const accentName = accents.find(item => item.id === accent)?.name || accent;
    const selection = document.getElementById('themeSelectionLabel');
    const selectedPreset=themePresets.find(p=>p.id===getActivePreset());
    if(selection)selection.textContent=selectedPreset?.name || `Personalizado · ${baseName} · ${accentName}`;
    updatePresetPicker();
  }

  function updateEffectPicker(effect) {
    document.querySelectorAll('.theme-effect-option').forEach(button => {
      const active = button.dataset.effect === effect;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function applyTheme(newBase, newAccent, persist = true) {
    const current = getCurrentTheme();
    const base = validBase(newBase || current.base);
    const accent = validAccent(newAccent || current.accent);

    removeOldThemeClasses();
    document.body.classList.add(base, accent);
    document.body.dataset.censoThemePreset=getActivePreset();
    applyHeaderOverride();
    if (persist) {
      localStorage.setItem(preferenceKey('base'), base);
      localStorage.setItem(preferenceKey('accent'), accent);
    }
    updatePickerState(base, accent);

    window.setTimeout(() => {
      const metaColor = getComputedStyle(document.body).getPropertyValue('--theme-meta').trim();
      const metas = document.querySelectorAll('meta[name="theme-color"]');
      if (metaColor) metas.forEach(meta => meta.setAttribute('content', metaColor));
    }, 50);
  }

  function applyEffect(newEffect, persist = true) {
    const effect = validEffect(newEffect || getCurrentTheme().effect);
    removeOldEffectClasses();
    document.body.classList.add(effect);
    if (persist) localStorage.setItem(preferenceKey('effect'), effect);
    ambient.sync(getSeasonalProfile() || (effect === 'effect-halloween' ? SEASONAL_PROFILES.halloween : null), effect);
    updateEffectPicker(effect);
  }

  function initTheme() {
    const savedView = localStorage.getItem('censo-view') || 'kanban';
    state.currentViewMode = savedView;
    const viewIcon = document.getElementById('viewIcon');
    if (viewIcon) viewIcon.textContent = state.currentViewMode === 'kanban' ? 'table_rows' : 'grid_view';

    renderThemePickers();
    refreshSeason();
    let lastSeason = getSeasonalProfile()?.id || '';
    const checkDate = () => {
      const id = getSeasonalProfile()?.id || '';
      if (id !== lastSeason) { lastSeason = id; refreshSeason(); }
    };
    window.setInterval(checkDate, 60000);
    document.addEventListener('visibilitychange', checkDate);
    window.addEventListener('storage', (event) => {
      if (!event.key || event.key.startsWith('censo-')) refreshSeason();
    });
  }

  return {
    initTheme,
    refreshSeasonalAppearance:refreshSeason,
    applyTheme,
    applyEffect,
    renderThemePickers
  };
}
