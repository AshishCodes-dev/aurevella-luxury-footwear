import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import { initFirebase, getFirebaseAuth } from '../config/firebase.js';
import User from '../models/User.js';

/**
 * Core admin provisioning engine with enterprise safety safeguards:
 * 1. Production guard: NODE_ENV === 'production' requires CONFIRM_PROD_SEED === 'true'.
 * 2. Normalizes ADMIN_SEED_EMAIL via trim().toLowerCase().
 * 3. Conditional password requirement: only required when creating a new Firebase user
 *    or explicitly resetting an existing password.
 * 4. Password preservation by default for existing Firebase users.
 * 5. Identity conflict abort if MongoDB user has differing non-empty firebaseUid.
 *
 * @param {Object} options
 * @param {Object} options.auth - Firebase Auth service instance
 * @param {Object} options.UserModel - Mongoose User model
 * @param {Object} [options.env=process.env] - Environment configuration
 * @param {Object} [options.logger=console] - Logger interface
 * @returns {Promise<{ email: string, firebaseUid: string, role: string }>}
 */
export const executeAdminSeed = async ({
  auth,
  UserModel,
  env = process.env,
  logger = console,
}) => {
  // 1. Production Guard
  if (env.NODE_ENV === 'production' && env.CONFIRM_PROD_SEED !== 'true') {
    const errorMsg =
      '[SeedAdmin] ABORT: Running admin seeder in production environment requires CONFIRM_PROD_SEED=true.';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 2. Email Validation & Normalization
  const rawEmail = env.ADMIN_SEED_EMAIL;
  if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.trim()) {
    const errorMsg =
      '[SeedAdmin] Error: ADMIN_SEED_EMAIL environment variable is required.';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
  const email = rawEmail.trim().toLowerCase();

  const password = env.ADMIN_SEED_PASSWORD;
  const name = (env.ADMIN_SEED_NAME && env.ADMIN_SEED_NAME.trim()) || 'Aurevella Admin';
  const resetPassword = env.ADMIN_RESET_PASSWORD === 'true';

  // 3. Ensure user exists in Firebase Auth
  let firebaseUser;
  try {
    firebaseUser = await auth.getUserByEmail(email);
    logger.log(`[SeedAdmin] Found existing Firebase account for ${email}.`);

    const updatePayload = {
      displayName: name,
      emailVerified: true,
    };

    // Safety Guard: Preserve existing user credentials; do NOT overwrite password unless explicitly requested
    if (resetPassword) {
      if (!password || typeof password !== 'string' || password.length < 8) {
        const passErr = new Error(
          '[SeedAdmin] Error: ADMIN_RESET_PASSWORD=true requires ADMIN_SEED_PASSWORD with at least 8 characters.'
        );
        logger.error(passErr.message);
        throw passErr;
      }
      logger.log('[SeedAdmin] Explicit password reset requested. Updating password...');
      updatePayload.password = password;
    } else {
      logger.log(
        '[SeedAdmin] Preserving existing user credentials (password will not be overwritten).'
      );
    }

    await auth.updateUser(firebaseUser.uid, updatePayload);
  } catch (err) {
    if (
      err.code === 'auth/user-not-found' ||
      err.message?.includes('user-not-found') ||
      err.message?.includes('auth/user-not-found')
    ) {
      if (!password || typeof password !== 'string' || password.length < 8) {
        const passErr = new Error(
          '[SeedAdmin] Error: ADMIN_SEED_PASSWORD (minimum 8 characters) is required when creating a new Firebase admin account.'
        );
        logger.error(passErr.message);
        throw passErr;
      }
      logger.log(`[SeedAdmin] Creating new Firebase account for ${email}...`);
      firebaseUser = await auth.createUser({
        email,
        password,
        displayName: name,
        emailVerified: true,
      });
    } else {
      throw err;
    }
  }

  // 4. Ensure user exists in MongoDB with admin role
  let mongoUser = await UserModel.findOne({ email });

  if (mongoUser) {
    // Safety Guard: Prevent dangerous unlinking / relinking across disparate identities
    if (mongoUser.firebaseUid && mongoUser.firebaseUid !== firebaseUser.uid) {
      const conflictErr = new Error(
        `[SeedAdmin] ABORT: Identity conflict detected. MongoDB user ${email} is linked to firebaseUid "${mongoUser.firebaseUid}", ` +
        `but Firebase account has UID "${firebaseUser.uid}". Automatic relinking is blocked for safety.`
      );
      logger.error(conflictErr.message);
      throw conflictErr;
    }

    logger.log('[SeedAdmin] Updating existing MongoDB user to admin role...');
    mongoUser.role = 'admin';
    mongoUser.firebaseUid = firebaseUser.uid;
    mongoUser.emailVerified = true;
    mongoUser.isActive = true;
    if (!Array.isArray(mongoUser.providers)) {
      mongoUser.providers = [];
    }
    if (!mongoUser.providers.includes('password')) {
      mongoUser.providers.push('password');
    }
    await mongoUser.save();
  } else {
    logger.log('[SeedAdmin] Creating new MongoDB admin user record...');
    mongoUser = await UserModel.create({
      name,
      email,
      firebaseUid: firebaseUser.uid,
      providers: ['password'],
      emailVerified: true,
      role: 'admin',
      isActive: true,
    });
  }

  logger.log(`[SeedAdmin] SUCCESS: Administrator account [${email}] initialized with admin privileges.`);
  return {
    email,
    firebaseUid: firebaseUser.uid,
    role: 'admin',
  };
};

/**
 * Entry point for CLI invocation (npm run seed:admin).
 */
export const seedAdmin = async () => {
  try {
    await connectDB();
    initFirebase();
    const auth = getFirebaseAuth();

    await executeAdminSeed({
      auth,
      UserModel: User,
      env: process.env,
      logger: console,
    });
    process.exit(0);
  } catch (error) {
    console.error(`[SeedAdmin] FAILED: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Direct execution guard for Node.js ESM.
 * Compares the resolved file path of the current module against process.argv[1].
 * Handles Windows drive letters, forward/backward slash normalization, and casing.
 *
 * @param {string} [importMetaUrl=import.meta.url]
 * @param {string} [argv1=process.argv[1]]
 * @returns {boolean}
 */
export const isDirectExecution = (importMetaUrl = import.meta.url, argv1 = process.argv[1]) => {
  if (!argv1 || typeof argv1 !== 'string') return false;
  try {
    const currentFilePath = path.resolve(fileURLToPath(importMetaUrl));
    const executedFilePath = path.resolve(argv1);
    return currentFilePath.toLowerCase() === executedFilePath.toLowerCase();
  } catch (_) {
    return false;
  }
};

if (isDirectExecution()) {
  seedAdmin();
}
