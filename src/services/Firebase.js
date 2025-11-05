import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBrsSash9BVp2U4mtOvAtMhZlh7N5FJcxA",
  authDomain: "sistema-de-agendamiento-25edb.firebaseapp.com",
  projectId: "sistema-de-agendamiento-25edb",
  storageBucket: "sistema-de-agendamiento-25edb.firebasestorage.app",
  messagingSenderId: "465299456895",
  appId: "1:465299456895:web:1ffbb232472855a88c504a",
  measurementId: "G-T8EH420WT6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
