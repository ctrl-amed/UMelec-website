// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyDgdbRR1S8ng9lIn6k8XiLNOikbcxLL8Dc",
  authDomain: "umelec-70618.firebaseapp.com",
  projectId: "umelec-70618",
  storageBucket: "umelec-70618.firebasestorage.app",
  messagingSenderId: "103159835421",
  appId: "1:103159835421:web:e6b77a4b237019706dcff4",
  measurementId: "G-SLQZCEFD3W"
};

// 1. Initialize the App
const app = initializeApp(firebaseConfig);

// 2. Initialize the Services
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "us-central1");

// 3. Export everything at once (No duplicates)
export { auth, db, functions };