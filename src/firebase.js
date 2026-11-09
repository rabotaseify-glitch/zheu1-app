// Конфигурация Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ⚠️ ЗАМЕНИТЕ эти значения на ваши реальные данные из Firebase Console!
const firebaseConfig = {
  apiKey: "AIzaSyAvM-hskEfW2-_NbuZR2w-w8RfTcWZtqwI",
  authDomain: "zheu1-app.firebaseapp.com",
  databaseURL: "https://zheu1-app-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "zheu1-app",
  storageBucket: "zheu1-app.firebasestorage.app",
  messagingSenderId: "671995455780",
  appId: "1:671995455780:web:7812378377634f2c066bb1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);