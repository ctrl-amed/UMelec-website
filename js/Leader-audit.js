import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Global Audit Logger
 * @param {Object} user - { name: string, college: string, role: string }
 * @param {string} action - e.g., "Voter Approved"
 * @param {string} details - e.g., "Student ID 2021-0001 was verified."
 */
export async function createLeaderAudit(user, action, details) {
    try {
        await addDoc(collection(db, "auditLogs"), {
            userName: user.name || "Unknown",
            college: user.college || "N/A",
            role: user.role || "LEADER", 
            action: action,
            details: details,
            timestamp: serverTimestamp()
        });
        console.log(`Audit recorded successfully for action: ${action}`);
    } catch (e) {
        // This will now only fail if the user isn't logged in 
        // or doesn't have the COSEL/LEADER role in your rules.
        console.error("Audit log failed. Check Firestore Rules.", e);
    }
}