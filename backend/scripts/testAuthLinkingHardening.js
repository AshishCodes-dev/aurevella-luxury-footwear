import 'dotenv/config';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectTestDB } from '../src/config/db.js';
import { setCustomFirebaseAuth, resetCustomFirebaseAuth } from '../src/config/firebase.js';
import User from '../src/models/User.js';

async function runAuthLinkingTests() {
  console.log('================================================================');
  console.log('   AUREVELLA — Authentication & Account Linking Hardening Suite  ');
  console.log('================================================================\n');

  await connectTestDB();

  const results = [];
  let allPassed = true;

  const record = (name, passed, detail = '') => {
    if (!passed) allPassed = false;
    results.push({
      Test: name,
      Status: passed ? 'PASS' : 'FAIL',
      Detail: detail,
    });
  };

  // Start ephemeral test server
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Helper to post session with custom CSRF header
  const postSession = (idToken) =>
    fetch(`${baseUrl}/api/auth/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Aurevella-Request': '1',
      },
      body: JSON.stringify({ idToken }),
    });

  // Mock token store for test double
  let mockTokens = {};
  const mockFirebaseAuth = {
    verifyIdToken: async (token) => {
      if (mockTokens[token]) {
        return mockTokens[token];
      }
      throw new Error(`Token ${token} not recognized by mock`);
    },
  };

  setCustomFirebaseAuth(mockFirebaseAuth);

  try {
    // Clean test user collection
    await User.deleteMany({ email: { $regex: /@auth-test\.aurevella\.in$/ } });

    // ------------------------------------------------------------------
    // Test 1: Active user with matching firebaseUid creates session (200)
    // ------------------------------------------------------------------
    const activeEmail = 'active-user@auth-test.aurevella.in';
    const activeUid = 'uid-active-123';
    await User.create({
      name: 'Active User',
      email: activeEmail,
      firebaseUid: activeUid,
      role: 'customer',
      isActive: true,
      providers: ['password'],
    });

    mockTokens['token-active'] = {
      uid: activeUid,
      email: activeEmail,
      email_verified: true,
      firebase: { sign_in_provider: 'password' },
    };

    const res1 = await postSession('token-active');
    const data1 = await res1.json();
    record(
      'Active User: Firebase UID match issues session (200 OK)',
      res1.status === 200 && data1.status === 'success' && data1.user.email === activeEmail,
      `Status: ${res1.status}`
    );

    // ------------------------------------------------------------------
    // Test 2: Inactive user with matching firebaseUid is rejected (403)
    // ------------------------------------------------------------------
    const inactiveEmail = 'inactive-uid@auth-test.aurevella.in';
    const inactiveUid = 'uid-inactive-456';
    await User.create({
      name: 'Inactive User',
      email: inactiveEmail,
      firebaseUid: inactiveUid,
      role: 'customer',
      isActive: false,
      providers: ['password'],
    });

    mockTokens['token-inactive-uid'] = {
      uid: inactiveUid,
      email: inactiveEmail,
      email_verified: true,
      firebase: { sign_in_provider: 'password' },
    };

    const res2 = await postSession('token-inactive-uid');
    const data2 = await res2.json();
    record(
      'Inactive User: Direct UID match rejected with 403 Deactivated',
      res2.status === 403 && data2.message === 'User account has been deactivated',
      `Status: ${res2.status}, Message: "${data2.message}"`
    );

    // ------------------------------------------------------------------
    // Test 3: Inactive user found by verified email is rejected (403) before linking
    // ------------------------------------------------------------------
    const inactiveEmail2 = 'deactivated-linking@auth-test.aurevella.in';
    const originalUid = 'uid-original-789';
    const newUid = 'uid-new-attempt-999';
    await User.create({
      name: 'Deactivated For Linking',
      email: inactiveEmail2,
      firebaseUid: originalUid,
      role: 'customer',
      isActive: false,
      providers: ['password'],
    });

    mockTokens['token-deactivated-linking'] = {
      uid: newUid,
      email: inactiveEmail2,
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    };

    const res3 = await postSession('token-deactivated-linking');
    const data3 = await res3.json();

    // Verify in database that account was NOT linked to newUid
    const userInDbAfterRes3 = await User.findOne({ email: inactiveEmail2 });
    const notLinked = userInDbAfterRes3.firebaseUid === originalUid;

    record(
      'Inactive User: Account linking branch blocks deactivated user before linking (403)',
      res3.status === 403 && data3.message === 'User account has been deactivated' && notLinked,
      `Status: ${res3.status}, UID unchanged: ${notLinked}`
    );

    // ------------------------------------------------------------------
    // Test 4: Existing active user found by email with unverified token is rejected (409)
    // ------------------------------------------------------------------
    const activeEmail4 = 'unverified-email@auth-test.aurevella.in';
    await User.create({
      name: 'Active User 4',
      email: activeEmail4,
      firebaseUid: 'uid-444',
      role: 'customer',
      isActive: true,
    });

    mockTokens['token-unverified'] = {
      uid: 'uid-different-444',
      email: activeEmail4,
      email_verified: false,
      firebase: { sign_in_provider: 'password' },
    };

    const res4 = await postSession('token-unverified');
    const data4 = await res4.json();
    record(
      'Account Linking: Unverified email rejected with 409 Conflict',
      res4.status === 409 && data4.message.includes('verify your email'),
      `Status: ${res4.status}, Message: "${data4.message}"`
    );

    // ------------------------------------------------------------------
    // Test 5: Existing active user with differing firebaseUid is rejected (409) to prevent UID hijacking
    // ------------------------------------------------------------------
    const activeEmail5 = 'bound-account@auth-test.aurevella.in';
    const boundUid = 'uid-strictly-bound-555';
    const rogueUid = 'uid-hijack-attempt-666';
    await User.create({
      name: 'Bound User',
      email: activeEmail5,
      firebaseUid: boundUid,
      role: 'admin', // Admin account
      isActive: true,
      providers: ['password'],
    });

    mockTokens['token-hijack'] = {
      uid: rogueUid,
      email: activeEmail5,
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    };

    const res5 = await postSession('token-hijack');
    const data5 = await res5.json();

    // Verify admin role and boundUid remain intact
    const adminAfter5 = await User.findOne({ email: activeEmail5 });
    const intact = adminAfter5.firebaseUid === boundUid && adminAfter5.role === 'admin';

    record(
      'Account Linking: Accidental UID reassignment rejected with 409 Conflict',
      res5.status === 409 && data5.message.includes('Identity conflict detected') && intact,
      `Status: ${res5.status}, Bound UID preserved: ${intact}`
    );

    // ------------------------------------------------------------------
    // Test 6: Safe linking when user has no firebaseUid preserves role and adds provider
    // ------------------------------------------------------------------
    const legacyEmail = 'legacy-seed@auth-test.aurevella.in';
    const linkUid = 'uid-linkable-777';
    // Create user with empty firebaseUid via direct insert
    await User.collection.insertOne({
      name: 'Legacy Admin',
      email: legacyEmail,
      firebaseUid: '',
      role: 'admin',
      isActive: true,
      providers: ['password'],
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockTokens['token-legacy-link'] = {
      uid: linkUid,
      email: legacyEmail,
      email_verified: true,
      name: 'Legacy Admin Updated',
      firebase: { sign_in_provider: 'google.com' },
    };

    const res6 = await postSession('token-legacy-link');
    const data6 = await res6.json();

    const linkedUserInDb = await User.findOne({ email: legacyEmail });
    const linkSuccess =
      linkedUserInDb.firebaseUid === linkUid &&
      linkedUserInDb.role === 'admin' &&
      linkedUserInDb.providers.includes('google.com');

    record(
      'Account Linking: Safe link attaches new UID, preserves admin role (never demoted/promoted)',
      res6.status === 200 && linkSuccess,
      `Status: ${res6.status}, Linked UID: ${linkedUserInDb.firebaseUid}, Role: ${linkedUserInDb.role}`
    );

    // ------------------------------------------------------------------
    // Test 7: New user creation defaults to role 'customer' and isActive true
    // ------------------------------------------------------------------
    const newEmail = 'brand-new-user@auth-test.aurevella.in';
    const newUid7 = 'uid-brand-new-888';
    mockTokens['token-new-user'] = {
      uid: newUid7,
      email: newEmail,
      email_verified: true,
      name: 'Elena Rostova',
      firebase: { sign_in_provider: 'google.com' },
    };

    const res7 = await postSession('token-new-user');
    const data7 = await res7.json();

    const createdUser = await User.findOne({ email: newEmail });
    record(
      'New User Registration: Role is strictly customer and isActive is true',
      res7.status === 200 && createdUser.role === 'customer' && createdUser.isActive === true,
      `Status: ${res7.status}, Role: ${createdUser?.role}, Active: ${createdUser?.isActive}`
    );

    // Clean up test data
    await User.deleteMany({ email: { $regex: /@auth-test\.aurevella\.in$/ } });

    // ------------------------------------------------------------------
    // Summary Table
    // ------------------------------------------------------------------
    console.table(results);

    const passedCount = results.filter((r) => r.Status === 'PASS').length;
    console.log(`\nResults: ${passedCount}/${results.length} tests passed.`);

    if (!allPassed) {
      console.error('\n❌ SOME AUTH HARDENING TESTS FAILED.');
      process.exit(1);
    } else {
      console.log('\n✔ ALL AUTH HARDENING TESTS PASSED PERFECTLY!');
    }
  } finally {
    resetCustomFirebaseAuth();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
}

runAuthLinkingTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
