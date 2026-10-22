import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate JWT Secret requirement
export const validateAuthConfig = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing.');
  }
  if (secret.length < 32) {
    throw new Error(
      `FATAL: JWT_SECRET environment variable is shorter than 32 characters (current length: ${secret.length}).`
    );
  }
};

/**
 * Sanitizes and validates a PEM private key from environment variables.
 * Strips surrounding quotes, translates literal "\n" to newlines, extracts exact PEM block,
 * and asserts PEM headers. Never prints or leaks key values.
 */
export const parsePrivateKey = (rawKey) => {
  if (!rawKey) {
    throw new Error('FIREBASE_PRIVATE_KEY environment variable is missing.');
  }

  let key = rawKey.trim();

  // Strip trailing commas and semicolons often left when copying from JSON
  if (key.endsWith(',') || key.endsWith(';')) {
    key = key.slice(0, -1).trim();
  }

  // Strip wrapping single or double quotes
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Convert escaped newlines into real newline characters
  key = key.replace(/\\n/g, '\n').trim();

  // Re-check after newline conversion
  if (key.endsWith(',') || key.endsWith(';')) {
    key = key.slice(0, -1).trim();
  }
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Verify standard PEM markers exist
  const hasBegin =
    key.includes('-----BEGIN PRIVATE KEY-----') ||
    key.includes('-----BEGIN RSA PRIVATE KEY-----');
  const hasEnd =
    key.includes('-----END PRIVATE KEY-----') ||
    key.includes('-----END RSA PRIVATE KEY-----');

  if (!hasBegin || !hasEnd) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY is malformed: missing '-----BEGIN PRIVATE KEY-----' or '-----END PRIVATE KEY-----' markers."
    );
  }

  // Isolate exact PEM boundary to strip any stray quotes, commas, or whitespace
  const beginMarker = key.includes('-----BEGIN RSA PRIVATE KEY-----')
    ? '-----BEGIN RSA PRIVATE KEY-----'
    : '-----BEGIN PRIVATE KEY-----';
  const endMarker = key.includes('-----END RSA PRIVATE KEY-----')
    ? '-----END RSA PRIVATE KEY-----'
    : '-----END PRIVATE KEY-----';

  const startIndex = key.indexOf(beginMarker);
  const endMarkerIndex = key.indexOf(endMarker);

  if (startIndex !== -1 && endMarkerIndex !== -1) {
    key = key.substring(startIndex, endMarkerIndex + endMarker.length).trim();
  }

  return key;
};

let firebaseApp = null;

export const initFirebase = () => {
  if (firebaseApp) return firebaseApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    return firebaseApp;
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  // Source 1 (Preferred): Service Account JSON file path
  if (serviceAccountPath && serviceAccountPath.trim() !== '') {
    const trimmedPath = serviceAccountPath.trim();
    const resolvedPath = path.resolve(trimmedPath);

    // Repository root: .../AureVeLla
    const projectRoot = path.resolve(__dirname, '../../..');
    const normResolved = path.normalize(resolvedPath).toLowerCase();
    const normRoot = path.normalize(projectRoot).toLowerCase();

    // Security Guard: Prohibit storing service account JSON files inside the repository
    if (normResolved.startsWith(normRoot)) {
      throw new Error(
        `Security Violation: FIREBASE_SERVICE_ACCOUNT_PATH must resolve outside the project folder (${projectRoot}) to prevent accidental git leakage. Received: ${trimmedPath}`
      );
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_PATH file does not exist at: ${resolvedPath}`
      );
    }

    let serviceAccount;
    try {
      const fileData = fs.readFileSync(resolvedPath, 'utf8');
      serviceAccount = JSON.parse(fileData);
    } catch (parseError) {
      throw new Error(
        `Failed to parse FIREBASE_SERVICE_ACCOUNT_PATH JSON file: ${parseError.message}`
      );
    }

    const missingFields = [];
    if (!serviceAccount.project_id) missingFields.push('project_id');
    if (!serviceAccount.client_email) missingFields.push('client_email');
    if (!serviceAccount.private_key) missingFields.push('private_key');

    if (missingFields.length > 0) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_PATH file is missing required properties: ${missingFields.join(', ')}`
      );
    }

    const envProjectId = process.env.FIREBASE_PROJECT_ID;
    if (envProjectId && serviceAccount.project_id !== envProjectId) {
      throw new Error(
        `FIREBASE_PROJECT_ID mismatch: service account file contains project_id "${serviceAccount.project_id}" but environment specifies "${envProjectId}".`
      );
    }

    try {
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
      });
      console.log('[Firebase] Admin SDK initialized successfully via service account file.');
      return firebaseApp;
    } catch (error) {
      console.error('[Firebase] Failed to initialize Firebase Admin SDK from file:', error.message);
      throw error;
    }
  }

  // Source 2 (Fallback): Inline Environment Variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  const missing = [];
  if (!projectId) missing.push('FIREBASE_PROJECT_ID');
  if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!rawPrivateKey) missing.push('FIREBASE_PRIVATE_KEY');

  if (missing.length > 0) {
    throw new Error(
      `Firebase configuration incomplete. Provide either FIREBASE_SERVICE_ACCOUNT_PATH or the required environment variables: ${missing.join(', ')}`
    );
  }

  const privateKey = parsePrivateKey(rawPrivateKey);

  try {
    firebaseApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('[Firebase] Admin SDK initialized successfully via environment variables.');
    return firebaseApp;
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firebase Admin SDK:', error.message);
    throw error;
  }
};

export const getFirebaseAuth = () => {
  if (!firebaseApp && getApps().length === 0) {
    initFirebase();
  }
  const apps = getApps();
  if (apps.length === 0) {
    throw new Error('Firebase Admin SDK is not initialized. Check your Firebase environment configuration.');
  }
  return getAuth(firebaseApp || apps[0]);
};

export default {
  initFirebase,
  getFirebaseAuth,
  validateAuthConfig,
  parsePrivateKey,
};
