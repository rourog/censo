/*
  MÓDULO: appModule.js

  RESPONSABILIDAD:
  - Cablear módulos grandes.
  - Arrancar la aplicación en orden seguro.
  - Propagar el build actual a todas las importaciones locales.
*/

const BUILD = String(window.CensoBuild?.version || `runtime-${Date.now()}`);

function moduleUrl(name) {
  const url = new URL(`./${name}.js`, import.meta.url);
  url.searchParams.set('v', BUILD);
  return url.href;
}

async function loadModules() {
  const [
    firebase,
    bed,
    utils,
    stateModule,
    soundCatalog,
    soundboardModule,
    effectsModule,
    renderModule,
    patientModule,
    bedAdminModule,
    themeModule,
    modalModule,
    maintenanceModule,
    cie10LesionesModule,
    cie10ConsultOnlyModule,
    interactionModule,
    newsBarModule,
    printModule,
    authModule
  ] = await Promise.all([
    import(moduleUrl('firebaseModule')),
    import(moduleUrl('bedModule')),
    import(moduleUrl('utilsModule')),
    import(moduleUrl('stateModule')),
    import(moduleUrl('soundCatalog')),
    import(moduleUrl('soundboardModule')),
    import(moduleUrl('effectsModule')),
    import(moduleUrl('renderModule')),
    import(moduleUrl('patientModule')),
    import(moduleUrl('bedAdminModule')),
    import(moduleUrl('themeModule')),
    import(moduleUrl('modalModule')),
    import(moduleUrl('maintenanceModule')),
    import(moduleUrl('cie10LesionesModule')),
    import(moduleUrl('cie10ConsultOnlyModule')),
    import(moduleUrl('interactionModule')),
    import(moduleUrl('newsBarModule')),
    import(moduleUrl('printModule')),
    import(moduleUrl('authModule'))
  ]);

  return {
    firebase,
    bed,
    utils,
    state: stateModule.state,
    soundCatalog,
    createSoundboardModule: soundboardModule.createSoundboardModule,
    createEffectsModule: effectsModule.createEffectsModule,
    createRenderModule: renderModule.createRenderModule,
    createPatientModule: patientModule.createPatientModule,
    createBedAdminModule: bedAdminModule.createBedAdminModule,
    createThemeModule: themeModule.createThemeModule,
    createModalModule: modalModule.createModalModule,
    createMaintenanceModule: maintenanceModule.createMaintenanceModule,
    createCie10LesionesModule: cie10LesionesModule.createCie10LesionesModule,
    createCie10ConsultOnlyModule: cie10ConsultOnlyModule.createCie10ConsultOnlyModule,
    createInteractionModule: interactionModule.createInteractionModule,
    createNewsBarModule: newsBarModule.createNewsBarModule,
    createPrintModule: printModule.createPrintModule,
    createAuthModule: authModule.createAuthModule
  };
}

export async function bootApp() {
  console.info(`[CENSO] bootApp iniciado. BUILD: ${BUILD}`);
  window.CensoBuild = {
    ...(window.CensoBuild || {}),
    version: BUILD,
    stage: 'loading-modules',
    appModule: true
  };

  const modules = await loadModules();
  const app = {
    state: modules.state,
    firebase: modules.firebase,
    bed: modules.bed,
    utils: modules.utils,
    soundCatalog: modules.soundCatalog
  };

  Object.assign(app, modules.createSoundboardModule(app));
  Object.assign(app, modules.createEffectsModule(app));
  Object.assign(app, modules.createRenderModule(app));
  Object.assign(app, modules.createPatientModule(app));
  Object.assign(app, modules.createBedAdminModule(app));
  Object.assign(app, modules.createThemeModule(app));
  Object.assign(app, modules.createModalModule(app));
  Object.assign(app, modules.createMaintenanceModule(app));
  Object.assign(app, modules.createCie10LesionesModule(app));
  Object.assign(app, modules.createCie10ConsultOnlyModule(app));
  Object.assign(app, modules.createInteractionModule(app));
  Object.assign(app, modules.createNewsBarModule(app));
  Object.assign(app, modules.createPrintModule(app));
  Object.assign(app, modules.createAuthModule(app));

  app.__build = BUILD;
  window.CensoApp = app;
  window.CensoBuild = {
    ...window.CensoBuild,
    stage: 'modules-ready',
    appReady: true
  };

  app.bindModalBaseEvents();
  app.bindMaintenanceEvents();
  app.exposeWindowActions();
  app.initTheme();
  app.initPrintUi();
  app.initCie10Ui();
  app.initCie10ConsultOnly();
  app.bindUiEvents();
  app.initSoundboardAuthBridge();
  app.initBedCatalogAuthBridge();
  app.initBedAdminUiBridge();
  app.initNewsBarAuthBridge();

  app.bindAuthEvents();
  await app.bootAuth();
}
