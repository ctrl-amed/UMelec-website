// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// I added doc, setDoc, getDoc, updateDoc here so your functions below actually work!
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
const storage = getStorage(app); // Added this line

// ADD THIS: Hidden instance for creating users without logout
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);

// 3. Export everything at once
export { auth, db, functions, storage }; // Added storage to the export

// 4. Your Helper Logic (Exactly as you wrote it!)
export const VerificationHelper = {
    generateCode: () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    },

    saveCode: async (email, code) => {
        const expiryDate = new Date();
        expiryDate.setMinutes(expiryDate.getMinutes() + 10);

        const codeData = {
            email: email,
            code: code,
            createdAt: new Date(), 
            expiresAt: expiryDate,
            used: false
        };

        // This would have crashed without the import at the top
        await setDoc(doc(db, "passwordResetCodes", email), codeData);
    },

    verifyCode: async (email, inputCode) => {
        const docRef = doc(db, "passwordResetCodes", email);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error("No verification code found. Please request a new one.");
        }

        const data = docSnap.data();
        const now = new Date();
        const expiresAt = data.expiresAt.toDate(); 

        if (data.used) throw new Error("This code has already been used.");
        if (now > expiresAt) throw new Error("This code has expired.");
        if (data.code !== inputCode) throw new Error("Invalid verification code.");

        // This would have crashed without the import at the top
        await updateDoc(docRef, { used: true });
        return true;
    }
};