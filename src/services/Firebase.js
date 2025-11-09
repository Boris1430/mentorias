import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyBrsSash9BVp2U4mtOvAtMhZlh7N5FJcxA',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'sistema-de-agendamiento-25edb.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'sistema-de-agendamiento-25edb',
  storageBucket:
    process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'sistema-de-agendamiento-25edb.firebasestorage.app',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '465299456895',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:465299456895:web:1ffbb232472855a88c504a',
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || 'G-T8EH420WT6',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
