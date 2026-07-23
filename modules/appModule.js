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

import * as firebase from './firebaseModule.js?v=newsbar-v1-20260723';
import * as bed from './bedModule.js?v=newsbar-v1-20260723';
import * as utils from './utilsModule.js?v=newsbar-v1-20260723';
import { state } from './stateModule.js?v=newsbar-v1-20260723';

import { createEffectsModule } from './effectsModule.js?v=newsbar-v1-20260723';
import { createRenderModule } from './renderModule.js?v=newsbar-v1-20260723';
import { createPatientModule } from './patientModule.js?v=newsbar-v1-20260723';
import { createThemeModule } from './themeModule.js?v=newsbar-v1-20260723';
import { createModalModule } from './modalModule.js?v=newsbar-v1-20260723';
import { createMaintenanceModule } from './maintenanceModule.js?v=newsbar-v1-20260723';
import { createInteractionModule } from './interactionModule.js?v=newsbar-v1-20260723';
import { createNewsBarModule } from './newsBarModule.js?v=newsbar-v1-20260723';
import { createAuthModule } from './authModule.js?v=newsbar-v1-20260723';

const BUILD = 'newsbar-v1-20260723';

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
  Object.assign(app, createNewsBarModule(app));
  Object.assign(app, createAuthModule(app));

  app.__build = BUILD;
  window.CensoApp = app;
  window.CensoBuild = { ...window.CensoBuild, stage: 'modules-ready', appReady: true };

  app.bindModalBaseEvents();
  app.bindMaintenanceEvents();
  app.exposeWindowActions();
  app.initTheme();
  app.bindUiEvents();

  // La barra observa Firebase Auth directamente.
  // No es necesario modificar authModule.js.
  app.initNewsBarAuthBridge();

  app.bindAuthEvents();
  await app.bootAuth();
}
