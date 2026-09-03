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

import * as firebase from './firebaseModule.js?v=admin-sonidos-v4-20260903';
import * as bed from './bedModule.js?v=admin-sonidos-v4-20260903';
import * as utils from './utilsModule.js?v=admin-sonidos-v4-20260903';
import { state } from './stateModule.js?v=admin-sonidos-v4-20260903';

import { createSoundboardModule } from './soundboardModule.js?v=admin-sonidos-v4-20260903';
import { createEffectsModule } from './effectsModule.js?v=admin-sonidos-v4-20260903';
import { createRenderModule } from './renderModule.js?v=admin-sonidos-v4-20260903';
import { createPatientModule } from './patientModule.js?v=admin-sonidos-v4-20260903';
import { createThemeModule } from './themeModule.js?v=admin-sonidos-v4-20260903';
import { createModalModule } from './modalModule.js?v=admin-sonidos-v4-20260903';
import { createMaintenanceModule } from './maintenanceModule.js?v=admin-sonidos-v4-20260903';
import { createInteractionModule } from './interactionModule.js?v=admin-sonidos-v4-20260903';
import { createNewsBarModule } from './newsBarModule.js?v=admin-sonidos-v4-20260903';
import { createAuthModule } from './authModule.js?v=admin-sonidos-v4-20260903';

const BUILD = 'admin-sonidos-v4-20260903';

export async function bootApp() {
  console.info(`[CENSO] bootApp iniciado. BUILD: ${BUILD}`);
  window.CensoBuild = { version: BUILD, stage: 'bootApp', appModule: true };
  const app = {
    state,
    firebase,
    bed,
    utils
  };

  Object.assign(app, createSoundboardModule(app));
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
  // Restaurar el puente que muestra noticias y avisos después de iniciar sesión.
  app.initSoundboardAuthBridge();
  app.initNewsBarAuthBridge();

  app.bindAuthEvents();
  await app.bootAuth();
}
