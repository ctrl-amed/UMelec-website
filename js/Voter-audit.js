import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function createVoterAudit(user, action, details) {
    try {
        await addDoc(collection(db, "auditLogs"), {
            userName: user.name || "Student Voter",
            college: user.college || "N/A",
            role: null, // Explicitly null for Voters
            action: action,
            details: details,
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error("Voter Audit failed:", e);
    }
}