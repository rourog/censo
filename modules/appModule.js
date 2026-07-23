/*
  MÓDULO: appModule.js

  RESPONSABILIDAD:
  - Cablear módulos grandes.
  - Arrancar la aplicación en orden seguro.

  NO DEBE:
  - Contener lógica clínica detallada.
  - Construir HTML de pacientes.
  - Hablar con Firestore directamente.
*/

import * as firebase from './firebaseModule.js?v=bulk-reset-v1-20260722';
import * as bed from './bedModule.js?v=bulk-reset-v1-20260722';
import * as utils from './utilsModule.js?v=bulk-reset-v1-20260722';
import { state } from './stateModule.js?v=bulk-reset-v1-20260722';

import { createEffectsModule } from './effectsModule.js?v=bulk-reset-v1-20260722';
import { createRenderModule } from './renderModule.js?v=bulk-reset-v1-20260722';
import { createPatientModule } from './patientModule.js?v=bulk-reset-v1-20260722';
import { createThemeModule } from './themeModule.js?v=bulk-reset-v1-20260722';
import { createModalModule } from './modalModule.js?v=bulk-reset-v1-20260722';
import { createMaintenanceModule } from './maintenanceModule.js?v=bulk-reset-v1-20260722';
import { createInteractionModule } from './interactionModule.js?v=bulk-reset-v1-20260722';
import { createAuthModule } from './authModule.js?v=bulk-reset-v1-20260722';

const BUILD = 'bulk-reset-v1-20260722';

export async function bootApp() {
  console.info(`[CENSO] bootApp iniciado. BUILD: ${BUILD}`);
  window.CensoBuild = { version: BUILD, stage: 'bootApp', appModule: true };
  const app = {
    state,
    firebase,
    bed,
    utils
  };

  Object.assign(app, createEffectsModule(app));
  Object.assign(app, createRenderModule(app));
  Object.assign(app, createPatientModule(app));
  Object.assign(app, createThemeModule(app));
  Object.assign(app, createModalModule(app));
  Object.assign(app, createMaintenanceModule(app));
  Object.assign(app, createInteractionModule(app));
  Object.assign(app, createAuthModule(app));

  app.__build = BUILD;
  window.CensoApp = app;
  window.CensoBuild = { ...window.CensoBuild, stage: 'modules-ready', appReady: true };

  app.bindModalBaseEvents();
  app.bindMaintenanceEvents();
  app.exposeWindowActions();
  app.initTheme();
  app.bindUiEvents();
  app.bindAuthEvents();
  await app.bootAuth();
}
