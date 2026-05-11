const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

exports.deleteLeaderAccount = onCall({ region: "us-central1" }, async (request) => {
  const requesterUid = request.auth?.uid;
  const targetUid = request.data?.uid;

  if (!requesterUid) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "A valid target uid is required.");
  }

  if (requesterUid === targetUid) {
    throw new HttpsError("failed-precondition", "You cannot delete your own account here.");
  }

  const requesterRef = admin.firestore().doc(`users/${requesterUid}`);
  const requesterSnap = await requesterRef.get();

  if (!requesterSnap.exists) {
    throw new HttpsError("permission-denied", "Requester profile not found.");
  }

  const requesterRole = String(requesterSnap.data().role || "").toUpperCase();
  if (requesterRole !== "COSEL") {
    throw new HttpsError("permission-denied", "Only COSEL can delete leader accounts.");
  }

  const targetRef = admin.firestore().doc(`users/${targetUid}`);
  const targetSnap = await targetRef.get();

  if (!targetSnap.exists) {
    try {
      await admin.auth().deleteUser(targetUid);
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        throw new HttpsError("internal", error.message || "Failed to delete Auth account.");
      }
    }

    return {
      success: true,
      message: "Auth account deleted. Firestore profile did not exist."
    };
  }

  const targetData = targetSnap.data();
  const targetRole = String(targetData.role || "").toUpperCase();

  if (targetRole !== "LEADER") {
    throw new HttpsError("failed-precondition", "Only leader accounts can be deleted from this page.");
  }

  try {
    await admin.auth().deleteUser(targetUid);
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw new HttpsError("internal", error.message || "Failed to delete Auth account.");
    }
  }

  await targetRef.delete();

  return {
    success: true,
    message: "Leader deleted from Authentication and Firestore."
  };
});
