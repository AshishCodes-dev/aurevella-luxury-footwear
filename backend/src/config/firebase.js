import admin from 'firebase-admin';

// Validate JWT Secret requirement
export const validateAuthConfig = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing or shorter than 32 characters.');
  }
};

let firebaseApp = null;

export const initFirebase = () => {
  if (firebaseApp) return firebaseApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Correctly format private key by replacing escaped newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase] Firebase admin credentials missing in environment.');
    return null;
  }

  try {
    if (admin.apps.length === 0) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('[Firebase] Admin SDK initialized successfully.');
    } else {
      firebaseApp = admin.app();
    }
    return firebaseApp;
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firebase Admin SDK:', error.message);
    throw error;
  }
};

export const getFirebaseAuth = () => {
  if (!firebaseApp && admin.apps.length === 0) {
    initFirebase();
  }
  if (admin.apps.length === 0) {
    throw new Error('Firebase Admin SDK is not initialized. Check your FIREBASE_* environment variables.');
  }
  return admin.auth();
};

export default admin;
