import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDgdbRR1S8ng9lIn6k8XiLNOikbcxLL8Dc",
  authDomain: "umelec-70618.firebaseapp.com",
  projectId: "umelec-70618",
  storageBucket: "umelec-70618.firebasestorage.app",
  messagingSenderId: "103159835421",
  appId: "1:103159835421:web:e6b77a4b237019706dcff4",
  measurementId: "G-SLQZCEFD3W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export these so the frontend team can "borrow" them
export const auth = getAuth(app);
export const db = getFirestore(app);