/**
 * AUREVELLA — Admin Seeder Safety Hardening Verification Suite
 *
 * Comprehensive non-destructive test suite verifying:
 * Part 1: Export Integrity & Function Signatures
 * Part 2: 12 Core Seeder Safety Guards (Dependency Injection)
 * Part 3: Windows Direct-Execution Guard (Path Resolution & Casing)
 * Part 4: Real Mongoose Schema & Model Integration (Against isolated test DB)
 *
 * STRICT SAFETY CONSTRAINTS:
 * - NEVER connects to or mutates MongoDB Atlas (enforced by connectTestDB fail-closed guard)
 * - NEVER contacts live Firebase Auth API (uses controlled mock auth handlers)
 * - Tests ONLY the actual exported implementations from backend/src/utils/seedAdmin.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { executeAdminSeed, seedAdmin, isDirectExecution } from '../src/utils/seedAdmin.js';
import { connectTestDB } from '../src/config/db.js';
import User from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runAdminSeederSafetySuite() {
  console.log('===============================================================');
  console.log('  AUREVELLA — Admin Seeder Safety & Hardening Test Suite      ');
  console.log('===============================================================\n');

  const results = [];
  let allPassed = true;

  const record = (name, passed, detail = '') => {
    if (!passed) allPassed = false;
    results.push({
      Safety_Guard: name,
      Status: passed ? 'PASS' : 'FAIL',
      Details: detail,
    });
    const mark = passed ? '✔' : '✖';
    console.log(`${mark} [${passed ? 'PASS' : 'FAIL'}] ${name}${detail ? ` (${detail})` : ''}`);
  };

  const silentLogger = {
    log: () => {},
    error: () => {},
  };

  // =========================================================================
  // PART 1: Export Integrity & Signatures
  // =========================================================================
  console.log('--- Part 1: Module Export Integrity ---');
  record(
    'Exports: executeAdminSeed is exported as an async function',
    typeof executeAdminSeed === 'function',
    'Actual seeder engine is directly exported and testable'
  );
  record(
    'Exports: seedAdmin is exported as a CLI entry function',
    typeof seedAdmin === 'function',
    'Main entry point available'
  );
  record(
    'Exports: isDirectExecution is exported as a guard function',
    typeof isDirectExecution === 'function',
    'Direct execution guard available for validation'
  );

  // =========================================================================
  // PART 2: 12 Core Seeder Safety Guards
  // =========================================================================
  console.log('\n--- Part 2: Core Safety Guards & Branching Paths ---');

  // TEST 1: Production guard blocks execution when CONFIRM_PROD_SEED is not 'true'
  try {
    let errorThrown = false;
    try {
      await executeAdminSeed({
        auth: {},
        UserModel: {},
        env: {
          NODE_ENV: 'production',
          CONFIRM_PROD_SEED: undefined,
          ADMIN_SEED_EMAIL: 'admin@aurevella.com',
        },
        logger: silentLogger,
      });
    } catch (err) {
      errorThrown = true;
      if (err.message.includes('CONFIRM_PROD_SEED=true')) {
        record(
          'Production Guard: Blocks unconfirmed run in production',
          true,
          'Rejected when CONFIRM_PROD_SEED is unset'
        );
      } else {
        record('Production Guard: Blocks unconfirmed run in production', false, `Unexpected error: ${err.message}`);
      }
    }
    if (!errorThrown) {
      record('Production Guard: Blocks unconfirmed run in production', false, 'Expected execution to be blocked');
    }
  } catch (err) {
    record('Production Guard: Blocks unconfirmed run in production', false, err.message);
  }

  // TEST 2: Production guard allows execution when CONFIRM_PROD_SEED === 'true'
  try {
    let mockAuth = {
      getUserByEmail: async () => ({ uid: 'test-admin-uid', email: 'admin@aurevella.com' }),
      updateUser: async () => {},
    };
    let mockUser = {
      role: 'customer',
      firebaseUid: 'test-admin-uid',
      save: async () => {},
    };
    let mockUserModel = {
      findOne: async () => mockUser,
    };

    let passedGuard = false;
    await executeAdminSeed({
      auth: mockAuth,
      UserModel: mockUserModel,
      env: {
        NODE_ENV: 'production',
        CONFIRM_PROD_SEED: 'true',
        ADMIN_SEED_EMAIL: 'admin@aurevella.com',
      },
      logger: silentLogger,
    });
    passedGuard = true;
    record(
      'Production Guard: Permits execution with explicit CONFIRM_PROD_SEED=true',
      passedGuard,
      'Guard acknowledged confirmation flag'
    );
  } catch (err) {
    record('Production Guard: Permits execution with explicit CONFIRM_PROD_SEED=true', false, err.message);
  }

  // TEST 3: Email validation & normalization (.trim().toLowerCase())
  try {
    let queriedEmailAuth = null;
    let queriedEmailMongo = null;

    let mockAuth = {
      getUserByEmail: async (em) => {
        queriedEmailAuth = em;
        return { uid: 'uid-norm-1', email: em };
      },
      updateUser: async () => {},
    };
    let mockUser = {
      role: 'customer',
      firebaseUid: 'uid-norm-1',
      save: async () => {},
    };
    let mockUserModel = {
      findOne: async (query) => {
        queriedEmailMongo = query.email;
        return mockUser;
      },
    };

    await executeAdminSeed({
      auth: mockAuth,
      UserModel: mockUserModel,
      env: {
        ADMIN_SEED_EMAIL: '   Admin.Executive@AUREVELLA.COM   ',
      },
      logger: silentLogger,
    });

    const isNormalized =
      queriedEmailAuth === 'admin.executive@aurevella.com' &&
      queriedEmailMongo === 'admin.executive@aurevella.com';

    record(
      'Email Normalization: Trims whitespace and lowercases input',
      isNormalized,
      `Normalized to "${queriedEmailAuth}" in both Auth and DB queries`
    );
  } catch (err) {
    record('Email Normalization: Trims whitespace and lowercases input', false, err.message);
  }

  // TEST 4: Email validation aborts on missing or empty email
  try {
    let threwOnEmpty = false;
    try {
      await executeAdminSeed({
        auth: {},
        UserModel: {},
        env: { ADMIN_SEED_EMAIL: '   ' },
        logger: silentLogger,
      });
    } catch (err) {
      threwOnEmpty = err.message.includes('ADMIN_SEED_EMAIL environment variable is required');
    }
    record(
      'Email Validation: Rejects empty or missing ADMIN_SEED_EMAIL',
      threwOnEmpty,
      'Safely aborted with required email error'
    );
  } catch (err) {
    record('Email Validation: Rejects empty or missing ADMIN_SEED_EMAIL', false, err.message);
  }

  // TEST 5: Password preservation by default for existing Firebase account
  try {
    let updatePayloadReceived = null;
    let mockAuth = {
      getUserByEmail: async () => ({ uid: 'existing-fb-uid', email: 'existing@aurevella.com' }),
      updateUser: async (uid, payload) => {
        updatePayloadReceived = payload;
      },
    };
    let mockUser = {
      role: 'customer',
      firebaseUid: 'existing-fb-uid',
      save: async () => {},
    };
    let mockUserModel = {
      findOne: async () => mockUser,
    };

    await executeAdminSeed({
      auth: mockAuth,
      UserModel: mockUserModel,
      env: {
        ADMIN_SEED_EMAIL: 'existing@aurevella.com',
      },
      logger: silentLogger,
    });

    const passwordPreserved =
      updatePayloadReceived &&
      !('password' in updatePayloadReceived) &&
      updatePayloadReceived.displayName === 'Aurevella Admin' &&
      updatePayloadReceived.emailVerified === true;

    record(
      'Password Preservation: Preserves existing password by default without password param',
      passwordPreserved,
      'Password property omitted from updateUser payload'
    );
  } catch (err) {
    record('Password Preservation: Preserves existing password by default without password param', false, err.message);
  }

  // TEST 6: Explicit password reset succeeds with valid password
  try {
    let updatePayloadReceived = null;
    let mockAuth = {
      getUserByEmail: async () => ({ uid: 'existing-fb-uid', email: 'existing@aurevella.com' }),
      updateUser: async (uid, payload) => {
        updatePayloadReceived = payload;
      },
    };
    let mockUser = {
      role: 'customer',
      firebaseUid: 'existing-fb-uid',
      save: async () => {},
    };
    let mockUserModel = {
      findOne: async () => mockUser,
    };

    await executeAdminSeed({
      auth: mockAuth,
      UserModel: mockUserModel,
      env: {
        ADMIN_SEED_EMAIL: 'existing@aurevella.com',
        ADMIN_RESET_PASSWORD: 'true',
        ADMIN_SEED_PASSWORD: 'ResetSecurePassword123!',
      },
      logger: silentLogger,
    });

    const passwordReset =
      updatePayloadReceived &&
      updatePayloadReceived.password === 'ResetSecurePassword123!';

    record(
      'Password Reset: Updates password when ADMIN_RESET_PASSWORD=true with valid password',
      passwordReset,
      'Password successfully forwarded to updateUser payload'
    );
  } catch (err) {
    record(
      'Password Reset: Updates password when ADMIN_RESET_PASSWORD=true with valid password',
      false,
      err.message
    );
  }

  // TEST 7: Explicit password reset fails when password is missing or < 8 chars
  try {
    let threwOnInvalidReset = false;
    let mockAuth = {
      getUserByEmail: async () => ({ uid: 'existing-fb-uid', email: 'existing@aurevella.com' }),
      updateUser: async () => {},
    };

    try {
      await executeAdminSeed({
        auth: mockAuth,
        UserModel: {},
        env: {
          ADMIN_SEED_EMAIL: 'existing@aurevella.com',
          ADMIN_RESET_PASSWORD: 'true',
          ADMIN_SEED_PASSWORD: 'short',
        },
        logger: silentLogger,
      });
    } catch (err) {
      threwOnInvalidReset = err.message.includes('ADMIN_RESET_PASSWORD=true requires ADMIN_SEED_PASSWORD with at least 8 characters');
    }

    record(
      'Password Reset Guard: Rejects short password when ADMIN_RESET_PASSWORD=true',
      threwOnInvalidReset,
      'Enforced minimum 8 character length requirement'
    );
  } catch (err) {
    record('Password Reset Guard: Rejects short password when ADMIN_RESET_PASSWORD=true', false, err.message);
  }

  // TEST 8: New account creation fails if ADMIN_SEED_PASSWORD is missing or < 8 chars
  try {
    let threwOnMissingNewPass = false;
    let mockAuth = {
      getUserByEmail: async () => {
        const notFound = new Error('User not found');
        notFound.code = 'auth/user-not-found';
        throw notFound;
      },
      createUser: async () => {},
    };

    try {
      await executeAdminSeed({
        auth: mockAuth,
        UserModel: {},
        env: {
          ADMIN_SEED_EMAIL: 'newuser@aurevella.com',
          ADMIN_SEED_PASSWORD: '',
        },
        logger: silentLogger,
      });
    } catch (err) {
      threwOnMissingNewPass = err.message.includes('ADMIN_SEED_PASSWORD (minimum 8 characters) is required when creating a new Firebase admin account');
    }

    record(
      'New Account Guard: Requires password when Firebase user does not exist',
      threwOnMissingNewPass,
      'Prevented creation without secure password'
    );
  } catch (err) {
    record('New Account Guard: Requires password when Firebase user does not exist', false, err.message);
  }

  // TEST 9: New account creation succeeds with valid password
  try {
    let createdFirebaseUser = null;
    let createdMongoDoc = null;

    let mockAuth = {
      getUserByEmail: async () => {
        const notFound = new Error('User not found');
        notFound.code = 'auth/user-not-found';
        throw notFound;
      },
      createUser: async (payload) => {
        createdFirebaseUser = payload;
        return { uid: 'new-firebase-uid-888', ...payload };
      },
    };
    let mockUserModel = {
      findOne: async () => null,
      create: async (doc) => {
        createdMongoDoc = doc;
        return doc;
      },
    };

    const result = await executeAdminSeed({
      auth: mockAuth,
      UserModel: mockUserModel,
      env: {
        ADMIN_SEED_EMAIL: 'newadmin@aurevella.com',
        ADMIN_SEED_PASSWORD: 'BrandNewAdminPass2026!',
        ADMIN_SEED_NAME: 'New Executive Admin',
      },
      logger: silentLogger,
    });

    const newAccountSuccess =
      createdFirebaseUser?.password === 'BrandNewAdminPass2026!' &&
      createdMongoDoc?.email === 'newadmin@aurevella.com' &&
      createdMongoDoc?.role === 'admin' &&
      result.firebaseUid === 'new-firebase-uid-888';

    record(
      'New Account Creation: Creates Firebase Auth and MongoDB record with valid password',
      newAccountSuccess,
      'Created both records with role=admin and valid credentials'
    );
  } catch (err) {
    record(
      'New Account Creation: Creates Firebase Auth and MongoDB record with valid password',
      false,
      err.message
    );
  }

  // TEST 10: Identity Conflict Guard (existing MongoDB user with differing UID)
  try {
    let conflictAborted = false;
    let savedCalled = false;

    let mockAuth = {
      getUserByEmail: async () => ({ uid: 'firebase-uid-NEW-456', email: 'user@aurevella.com' }),
      updateUser: async () => {},
    };
    let mockUser = {
      role: 'customer',
      firebaseUid: 'mongo-uid-EXISTING-123',
      save: async () => {
        savedCalled = true;
      },
    };
    let mockUserModel = {
      findOne: async () => mockUser,
    };

    try {
      await executeAdminSeed({
        auth: mockAuth,
        UserModel: mockUserModel,
        env: {
          ADMIN_SEED_EMAIL: 'user@aurevella.com',
        },
        logger: silentLogger,
      });
    } catch (err) {
      conflictAborted =
        err.message.includes('Identity conflict detected') &&
        err.message.includes('Automatic relinking is blocked for safety');
    }

    const safeResolution = conflictAborted && !savedCalled && mockUser.role === 'customer';

    record(
      'Identity Conflict Guard: Aborts if existing MongoDB user has different firebaseUid',
      safeResolution,
      'Protected customer data and blocked unauthorized relinking'
    );
  } catch (err) {
    record(
      'Identity Conflict Guard: Aborts if existing MongoDB user has different firebaseUid',
      false,
      err.message
    );
  }

  // TEST 11: Safe Promotion when existing MongoDB user matches UID
  try {
    let savedCalled = false;
    let mockAuth = {
      getUserByEmail: async () => ({ uid: 'matching-uid-777', email: 'existingadmin@aurevella.com' }),
      updateUser: async () => {},
    };
    let mockUser = {
      role: 'customer',
      firebaseUid: 'matching-uid-777',
      providers: ['password'],
      save: async () => {
        savedCalled = true;
      },
    };
    let mockUserModel = {
      findOne: async () => mockUser,
    };

    const result = await executeAdminSeed({
      auth: mockAuth,
      UserModel: mockUserModel,
      env: {
        ADMIN_SEED_EMAIL: 'existingadmin@aurevella.com',
      },
      logger: silentLogger,
    });

    const promoted = savedCalled && mockUser.role === 'admin' && result.role === 'admin';

    record(
      'Safe Role Promotion: Elevates existing MongoDB user with matching UID to admin',
      promoted,
      'Elevated role to admin without modifying conflicting identifiers'
    );
  } catch (err) {
    record(
      'Safe Role Promotion: Elevates existing MongoDB user with matching UID to admin',
      false,
      err.message
    );
  }

  // TEST 12: Linking existing MongoDB user with empty or unset firebaseUid
  try {
    let savedCalled = false;
    let mockAuth = {
      getUserByEmail: async () => ({ uid: 'first-time-uid-999', email: 'unlinked@aurevella.com' }),
      updateUser: async () => {},
    };
    let mockUser = {
      role: 'customer',
      firebaseUid: null,
      providers: [],
      save: async () => {
        savedCalled = true;
      },
    };
    let mockUserModel = {
      findOne: async () => mockUser,
    };

    await executeAdminSeed({
      auth: mockAuth,
      UserModel: mockUserModel,
      env: {
        ADMIN_SEED_EMAIL: 'unlinked@aurevella.com',
      },
      logger: silentLogger,
    });

    const linkedAndPromoted =
      savedCalled &&
      mockUser.role === 'admin' &&
      mockUser.firebaseUid === 'first-time-uid-999' &&
      mockUser.providers.includes('password');

    record(
      'Safe Linking: Links and promotes unlinked MongoDB user (empty firebaseUid)',
      linkedAndPromoted,
      'Safely attached first-time Firebase UID and set admin role'
    );
  } catch (err) {
    record(
      'Safe Linking: Links and promotes unlinked MongoDB user (empty firebaseUid)',
      false,
      err.message
    );
  }

  // =========================================================================
  // PART 3: Windows Direct-Execution Guard (isDirectExecution)
  // =========================================================================
  console.log('\n--- Part 3: Windows Direct-Execution Guard Verification ---');

  const dummyUrl = 'file:///C:/Users/dell/OneDrive/Desktop/AureVeLla/backend/src/utils/seedAdmin.js';

  // 1. Relative Windows forward slash path
  const matchesRelForward = isDirectExecution(
    dummyUrl,
    path.join('backend', 'src', 'utils', 'seedAdmin.js')
  ) || isDirectExecution(dummyUrl, 'src/utils/seedAdmin.js');
  // Resolving from backend:
  const absPathWindows = 'C:\\Users\\dell\\OneDrive\\Desktop\\AureVeLla\\backend\\src\\utils\\seedAdmin.js';
  const matchesAbs = isDirectExecution(dummyUrl, absPathWindows);
  record(
    'Direct Execution Guard: Matches exact Windows absolute path',
    matchesAbs,
    absPathWindows
  );

  // 2. Drive letter casing insensitivity (c:\ vs C:\)
  const lowerDrivePath = 'c:\\users\\dell\\onedrive\\desktop\\aurevella\\backend\\src\\utils\\seedadmin.js';
  const matchesCaseInsensitive = isDirectExecution(dummyUrl, lowerDrivePath);
  record(
    'Direct Execution Guard: Handles Windows drive letter and case insensitivity',
    matchesCaseInsensitive,
    lowerDrivePath
  );

  // 3. Rejection when imported by another script (e.g. test runner)
  const runnerPath = 'C:\\Users\\dell\\OneDrive\\Desktop\\AureVeLla\\backend\\scripts\\testSeedAdminSafety.js';
  const blocksImportRunner = !isDirectExecution(dummyUrl, runnerPath);
  record(
    'Direct Execution Guard: Returns false when imported by a test runner',
    blocksImportRunner,
    'Prevents unintended seed execution on test import'
  );

  // 4. Safe fallback on undefined or non-string argv[1]
  const safeOnUndefined = !isDirectExecution(dummyUrl, undefined);
  const safeOnEmpty = !isDirectExecution(dummyUrl, '');
  record(
    'Direct Execution Guard: Fails safe on undefined or empty argv[1]',
    safeOnUndefined && safeOnEmpty,
    'Guards against eval, worker, and REPL environments'
  );

  // =========================================================================
  // PART 4: Real Mongoose Model & Schema Integration (Isolated Test DB)
  // =========================================================================
  console.log('\n--- Part 4: Real Mongoose Model & Schema Integration ---');
  let testDbConnected = false;

  try {
    await connectTestDB();
    testDbConnected = true;
    console.log('[Test DB] Connected to isolated test database for Mongoose schema validation.\n');

    // Clean up any test artifacts in isolated test DB
    await User.deleteMany({ email: /^safety-integration-.*@aurevella-test\.local$/ });

    // Integration Test A: Real Mongoose Model Safe Promotion
    const promoEmail = 'safety-integration-promo@aurevella-test.local';
    const promoUser = await User.create({
      name: 'Existing Customer',
      email: promoEmail,
      firebaseUid: 'real-promo-uid-001',
      role: 'customer',
      providers: ['password'],
      emailVerified: false,
      isActive: true,
    });

    const promoMockAuth = {
      getUserByEmail: async () => ({ uid: 'real-promo-uid-001', email: promoEmail }),
      updateUser: async () => {},
    };

    await executeAdminSeed({
      auth: promoMockAuth,
      UserModel: User, // Real Mongoose Model!
      env: { ADMIN_SEED_EMAIL: promoEmail },
      logger: silentLogger,
    });

    const updatedUser = await User.findOne({ email: promoEmail });
    const realPromotionSucceeded =
      updatedUser &&
      updatedUser.role === 'admin' &&
      updatedUser.emailVerified === true &&
      updatedUser.firebaseUid === 'real-promo-uid-001';

    record(
      'Mongoose Model: Real User.findOne + save() promotes to admin role in database',
      realPromotionSucceeded,
      `Role: ${updatedUser?.role}, verified: ${updatedUser?.emailVerified}`
    );

    // Integration Test B: Real Mongoose Model Creation with Schema Validation
    const createEmail = 'safety-integration-create@aurevella-test.local';
    const createMockAuth = {
      getUserByEmail: async () => {
        const err = new Error('auth/user-not-found');
        err.code = 'auth/user-not-found';
        throw err;
      },
      createUser: async (payload) => ({ uid: 'real-created-uid-002', ...payload }),
    };

    await executeAdminSeed({
      auth: createMockAuth,
      UserModel: User, // Real Mongoose Model!
      env: {
        ADMIN_SEED_EMAIL: createEmail,
        ADMIN_SEED_PASSWORD: 'SchemaValidPassword123!',
        ADMIN_SEED_NAME: 'Schema Verified Admin',
      },
      logger: silentLogger,
    });

    const createdDoc = await User.findOne({ email: createEmail });
    const realCreationSucceeded =
      createdDoc &&
      createdDoc.role === 'admin' &&
      createdDoc.firebaseUid === 'real-created-uid-002' &&
      createdDoc.providers.includes('password');

    record(
      'Mongoose Model: Real User.create() passes schema validation and persists admin',
      realCreationSucceeded,
      `Saved ID: ${createdDoc?._id}, role: ${createdDoc?.role}`
    );

    // Integration Test C: Real Mongoose Model Identity Conflict Guard
    const conflictEmail = 'safety-integration-conflict@aurevella-test.local';
    await User.create({
      name: 'Conflicted User',
      email: conflictEmail,
      firebaseUid: 'original-bound-uid-999',
      role: 'customer',
      providers: ['password'],
      emailVerified: true,
      isActive: true,
    });

    const conflictMockAuth = {
      getUserByEmail: async () => ({ uid: 'infiltrator-new-uid-000', email: conflictEmail }),
      updateUser: async () => {},
    };

    let conflictCaught = false;
    try {
      await executeAdminSeed({
        auth: conflictMockAuth,
        UserModel: User, // Real Mongoose Model!
        env: { ADMIN_SEED_EMAIL: conflictEmail },
        logger: silentLogger,
      });
    } catch (err) {
      conflictCaught =
        err.message.includes('Identity conflict detected') &&
        err.message.includes('Automatic relinking is blocked for safety');
    }

    const unmutatedUser = await User.findOne({ email: conflictEmail });
    const realConflictProtected =
      conflictCaught &&
      unmutatedUser &&
      unmutatedUser.role === 'customer' &&
      unmutatedUser.firebaseUid === 'original-bound-uid-999';

    record(
      'Mongoose Model: Real User identity conflict blocks overwrite and preserves customer record',
      realConflictProtected,
      `Role remained: ${unmutatedUser?.role}, UID remained: ${unmutatedUser?.firebaseUid}`
    );

    // Clean up test records from isolated test DB
    await User.deleteMany({ email: /^safety-integration-.*@aurevella-test\.local$/ });
  } catch (err) {
    record('Mongoose Model: Real database integration checks', false, err.message);
  } finally {
    if (testDbConnected) {
      await mongoose.disconnect();
    }
  }

  // =========================================================================
  // Final Summary
  // =========================================================================
  console.log('\n===============================================================');
  console.log(`  Summary: ${results.filter((r) => r.Status === 'PASS').length}/${results.length} Safety Assertions Passed`);
  console.log('===============================================================');

  if (!allPassed) {
    console.error('FAIL: One or more admin seeder safety tests failed.');
    process.exit(1);
  } else {
    console.log('SUCCESS: All admin seeder safety guards, Windows path resolutions,');
    console.log('         and real Mongoose schema validations verified successfully.\n');
    process.exit(0);
  }
}

runAdminSeederSafetySuite();
