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

import * as firebase from './firebaseModule.js';
import * as bed from './bedModule.js';
import * as utils from './utilsModule.js';
import { state } from './stateModule.js';

import { createEffectsModule } from './effectsModule.js';
import { createRenderModule } from './renderModule.js';
import { createPatientModule } from './patientModule.js';
import { createThemeModule } from './themeModule.js';
import { createModalModule } from './modalModule.js';
import { createInteractionModule } from './interactionModule.js';
import { createAuthModule } from './authModule.js';

export function bootApp() {
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

  window.CensoApp = app;

  app.bindModalBaseEvents();
  app.exposeWindowActions();
  app.initTheme();
  app.bindUiEvents();
  app.bindAuthEvents();
  app.bootAuth();
}
