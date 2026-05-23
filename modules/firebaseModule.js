/*
  MÓDULO: firebaseModule.js

  RESPONSABILIDAD:
  - Inicializar Firebase, Firestore y Auth.
  - Exportar primitivas de Firebase para que otros módulos no repitan imports remotos.

  NO DEBE:
  - Tocar el DOM.
  - Renderizar pacientes.
  - Contener contraseñas.
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
import {
  initializeFirestore,
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDyBGnwCaBaKEpqZshEcwbYJ8VHzbAQU48",
  authDomain: "censo-de-urgencias.firebaseapp.com",
  projectId: "censo-de-urgencias",
  storageBucket: "censo-de-urgencias.firebasestorage.app",
  messagingSenderId: "887013797611",
  appId: "1:887013797611:web:555a63ce66aeb50b4a58ae",
  measurementId: "G-Y8GRGC6ZP7"
};

export const app = initializeApp(firebaseConfig);

export let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (error) {
  console.warn('Analytics no disponible en este entorno:', error);
}

export const db = initializeFirestore(app, { experimentalForceLongPolling: true });
export const auth = getAuth(app);

export {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
};
