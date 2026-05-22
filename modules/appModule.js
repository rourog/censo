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

import * as firebase from './firebaseModule.js?v=alerta-observacion-v5-1-20260522';
import * as bed from './bedModule.js?v=alerta-observacion-v5-1-20260522';
import * as utils from './utilsModule.js?v=alerta-observacion-v5-1-20260522';
import { state } from './stateModule.js?v=alerta-observacion-v5-1-20260522';

import { createEffectsModule } from './effectsModule.js?v=alerta-observacion-v5-1-20260522';
import { createRenderModule } from './renderModule.js?v=alerta-observacion-v5-1-20260522';
import { createPatientModule } from './patientModule.js?v=alerta-observacion-v5-1-20260522';
import { createThemeModule } from './themeModule.js?v=alerta-observacion-v5-1-20260522';
import { createModalModule } from './modalModule.js?v=alerta-observacion-v5-1-20260522';
import { createInteractionModule } from './interactionModule.js?v=alerta-observacion-v5-1-20260522';
import { createAuthModule } from './authModule.js?v=alerta-observacion-v5-1-20260522';

export function bootApp() {
  console.info('[CENSO] bootApp iniciado. BUILD: alerta-observacion-v5-1-20260522');
  window.CensoBuild = { version: 'alerta-observacion-v5-1-20260522', stage: 'bootApp', appModule: true };
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
  Object.assign(app, createInteractionModule(app));
  Object.assign(app, createAuthModule(app));

  app.__build = 'alerta-observacion-v5-1-20260522';
  window.CensoApp = app;
  window.CensoBuild = { ...window.CensoBuild, stage: 'modules-ready', appReady: true };

  app.bindModalBaseEvents();
  app.exposeWindowActions();
  app.initTheme();
  app.bindUiEvents();
  app.bindAuthEvents();
  app.bootAuth();
}
