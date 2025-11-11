import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions'; // Importante para las Cloud Functions

// Leer variables de entorno (REACT_APP_...)
const API_KEY = process.env.REACT_APP_FIREBASE_API_KEY;
const AUTH_DOMAIN = process.env.REACT_APP_FIREBASE_AUTH_DOMAIN;
const PROJECT_ID = process.env.REACT_APP_FIREBASE_PROJECT_ID;
const STORAGE_BUCKET = process.env.REACT_APP_FIREBASE_STORAGE_BUCKET;
const MESSAGING_SENDER_ID = process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID;
const APP_ID = process.env.REACT_APP_FIREBASE_APP_ID;
const MEASUREMENT_ID = process.env.REACT_APP_FIREBASE_MEASUREMENT_ID;

// Validación de API key
if (!API_KEY) {
  console.error('\nFATAL: REACT_APP_FIREBASE_API_KEY no está definida.');
  throw new Error('Falta REACT_APP_FIREBASE_API_KEY en variables de entorno.');
}

const firebaseConfig = {
  apiKey: API_KEY,
  authDomain: AUTH_DOMAIN,
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
  messagingSenderId: MESSAGING_SENDER_ID,
  appId: APP_ID,
  measurementId: MEASUREMENT_ID,
};

// --- INSTANCIAS Y EXPORTACIONES ---

// Agregamos 'export' a app para corregir el error de compilación
export const app = initializeApp(firebaseConfig);

// Exportamos los demás servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Exportamos las funciones configuradas con la región us-east1 (la que usamos en el deploy)
export const functions = getFunctions(app, 'us-east1');