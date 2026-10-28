import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { parsePrivateKey } from '../src/config/firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

console.log('========================================');
console.log('    AUREVELLA ENVIRONMENT CHECK PANEL    ');
console.log('========================================\n');

let allPassed = true;

const pass = (label, reason) => {
  console.log(`[OK]   ${label}: ${reason}`);
};

const fail = (label, reason) => {
  allPassed = false;
  console.log(`[FAIL] ${label}: ${reason}`);
};

const info = (label, reason) => {
  console.log(`[INFO] ${label}: ${reason}`);
};

// 1. MONGODB_URI
const mongoUri = process.env.MONGODB_URI;
if (mongoUri && mongoUri.trim().length > 0) {
  pass('MONGODB_URI', 'Set and non-empty');
} else {
  fail('MONGODB_URI', 'Missing or empty');
}

// 2. CLIENT_URL & ALLOWED_ORIGINS
const allowedOrigins = process.env.ALLOWED_ORIGINS;
const clientUrl = process.env.CLIENT_URL;
if (allowedOrigins && allowedOrigins.trim().length > 0) {
  const count = allowedOrigins.split(',').filter((o) => o.trim().length > 0).length;
  pass('ALLOWED_ORIGINS', `Set (${count} origins configured)`);
} else if (clientUrl && clientUrl.trim().length > 0) {
  pass('CLIENT_URL', 'Set and non-empty (fallback for ALLOWED_ORIGINS)');
} else {
  fail('CLIENT_URL / ALLOWED_ORIGINS', 'Missing or empty: Neither CLIENT_URL nor ALLOWED_ORIGINS is configured');
}

// 3. JWT_SECRET
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  fail('JWT_SECRET', 'Missing or empty');
} else if (jwtSecret.length < 32) {
  fail('JWT_SECRET', `Length is ${jwtSecret.length} characters (must be >= 32 characters)`);
} else {
  pass('JWT_SECRET', `Length is sufficient (${jwtSecret.length} chars >= 32)`);
}

// 4. Firebase Credentials Validation
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

if (serviceAccountPath && serviceAccountPath.trim() !== '') {
  info('Firebase Credential Source', 'FIREBASE_SERVICE_ACCOUNT_PATH (preferred file source)');
  const trimmed = serviceAccountPath.trim();
  const resolvedPath = path.resolve(trimmed);
  const normResolved = path.normalize(resolvedPath).toLowerCase();
  const normRoot = path.normalize(projectRoot).toLowerCase();

  // Security check: Must reside outside the repository
  if (normResolved.startsWith(normRoot)) {
    fail(
      'Firebase Service Account Location',
      'Security violation: File resides inside the project folder. It must be located outside the repository.'
    );
  } else {
    pass('Firebase Service Account Location', 'Resides safely outside project repository');
  }

  // File existence check
  if (!fs.existsSync(resolvedPath)) {
    fail('Firebase Service Account File', `File does not exist at resolved path: ${resolvedPath}`);
  } else {
    pass('Firebase Service Account File', 'File exists on disk');

    // JSON parsing check
    let parsed = null;
    try {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      parsed = JSON.parse(content);
      pass('Firebase JSON Parser', 'File parsed as valid JSON');
    } catch (err) {
      fail('Firebase JSON Parser', `JSON parse error: ${err.message}`);
    }

    if (parsed) {
      // Required properties
      const missingProps = [];
      if (!parsed.project_id) missingProps.push('project_id');
      if (!parsed.client_email) missingProps.push('client_email');
      if (!parsed.private_key) missingProps.push('private_key');

      if (missingProps.length > 0) {
        fail('Firebase JSON Schema', `Missing required properties: ${missingProps.join(', ')}`);
      } else {
        pass('Firebase JSON Schema', 'Contains project_id, client_email, and private_key');
      }

      // Check project_id match with FIREBASE_PROJECT_ID if specified in env
      if (projectId && projectId.trim() !== '') {
        if (parsed.project_id === projectId.trim()) {
          pass('Firebase Project ID Match', 'Matches FIREBASE_PROJECT_ID in environment');
        } else {
          fail(
            'Firebase Project ID Match',
            `Mismatch between file project_id and FIREBASE_PROJECT_ID in environment`
          );
        }
      } else {
        info('Firebase Project ID Match', 'FIREBASE_PROJECT_ID not set in env; using project_id from file');
      }
    }
  }
} else {
  // Fallback inline credentials check
  info('Firebase Credential Source', 'Inline environment variables (fallback source)');

  if (projectId && projectId.trim().length > 0) {
    pass('FIREBASE_PROJECT_ID', 'Set and non-empty');
  } else {
    fail('FIREBASE_PROJECT_ID', 'Missing or empty');
  }

  if (clientEmail && clientEmail.trim().length > 0) {
    pass('FIREBASE_CLIENT_EMAIL', 'Set and non-empty');
  } else {
    fail('FIREBASE_CLIENT_EMAIL', 'Missing or empty');
  }

  if (!rawPrivateKey || rawPrivateKey.trim().length === 0) {
    fail('FIREBASE_PRIVATE_KEY', 'Missing or empty');
  } else {
    try {
      parsePrivateKey(rawPrivateKey);
      pass('FIREBASE_PRIVATE_KEY Format', 'Contains valid BEGIN and END PEM markers and parses cleanly');
    } catch (err) {
      fail('FIREBASE_PRIVATE_KEY Format', err.message);
    }
  }
}

// 5. ADMIN_SEED Settings
const adminEmail = process.env.ADMIN_SEED_EMAIL;
const adminPassword = process.env.ADMIN_SEED_PASSWORD;
const adminName = process.env.ADMIN_SEED_NAME;

if (adminEmail && adminEmail.trim().length > 0) {
  pass('ADMIN_SEED_EMAIL', 'Set');
} else {
  info('ADMIN_SEED_EMAIL', 'Not set (required only when executing seedAdmin.js)');
}

if (adminPassword && adminPassword.trim().length > 0) {
  if (adminPassword.length >= 8) {
    pass('ADMIN_SEED_PASSWORD', `Set (length: ${adminPassword.length} >= 8 chars)`);
  } else {
    fail('ADMIN_SEED_PASSWORD', `Set but length is too short (${adminPassword.length} < 8 chars)`);
  }
} else {
  info('ADMIN_SEED_PASSWORD', 'Not set (required only when executing seedAdmin.js)');
}

if (adminName && adminName.trim().length > 0) {
  pass('ADMIN_SEED_NAME', 'Set');
} else {
  info('ADMIN_SEED_NAME', 'Not set (defaults to "Aurevella Admin")');
}

console.log('\n========================================');
if (allPassed) {
  console.log('STATUS: ALL CRITICAL CHECKS PASSED');
  console.log('========================================\n');
  process.exit(0);
} else {
  console.log('STATUS: ONE OR MORE CHECKS FAILED');
  console.log('========================================\n');
  process.exit(1);
}
