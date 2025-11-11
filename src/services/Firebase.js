import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Leer variables de entorno (REACT_APP_...)
const API_KEY = process.env.REACT_APP_FIREBASE_API_KEY;
const AUTH_DOMAIN = process.env.REACT_APP_FIREBASE_AUTH_DOMAIN;
const PROJECT_ID = process.env.REACT_APP_FIREBASE_PROJECT_ID;
const STORAGE_BUCKET = process.env.REACT_APP_FIREBASE_STORAGE_BUCKET;
const MESSAGING_SENDER_ID = process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID;
const APP_ID = process.env.REACT_APP_FIREBASE_APP_ID;
const MEASUREMENT_ID = process.env.REACT_APP_FIREBASE_MEASUREMENT_ID;

// Validación mínima: la API key es necesaria y debe ser provista por .env.local o variables de entorno.
if (!API_KEY) {
  // Intentamos usar el valor embebido solo como último recurso, pero advertimos al desarrollador.
  console.error('\nFATAL: REACT_APP_FIREBASE_API_KEY no está definida.\n- Crea un archivo `.env.local` en la raíz del proyecto con las variables de Firebase (REACT_APP_FIREBASE_API_KEY, REACT_APP_FIREBASE_AUTH_DOMAIN, REACT_APP_FIREBASE_PROJECT_ID, REACT_APP_FIREBASE_STORAGE_BUCKET, REACT_APP_FIREBASE_APP_ID).\n- Reinicia el servidor de desarrollo después de crear .env.local.\nEjemplo:\nREACT_APP_FIREBASE_API_KEY=tu_api_key_aqui\nREACT_APP_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com\nREACT_APP_FIREBASE_PROJECT_ID=tu-proyecto\nREACT_APP_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com\nREACT_APP_FIREBASE_APP_ID=1:...:web:...\n');
  throw new Error('Falta REACT_APP_FIREBASE_API_KEY en variables de entorno. Lee src/services/Firebase.js para instrucciones.');
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
