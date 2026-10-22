import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { initFirebase, getFirebaseAuth } from '../config/firebase.js';
import User from '../models/User.js';

const seedAdmin = async () => {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  const name = process.env.ADMIN_SEED_NAME || 'Aurevella Admin';

  if (!email || !password) {
    console.error('Error: ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD environment variables are required.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: ADMIN_SEED_PASSWORD must be at least 8 characters long.');
    process.exit(1);
  }

  try {
    await connectDB();
    initFirebase();
    const auth = getFirebaseAuth();

    // 1. Ensure user exists in Firebase Auth
    let firebaseUser;
    try {
      firebaseUser = await auth.getUserByEmail(email);
      console.log(`[SeedAdmin] Found existing Firebase account for ${email}. Updating credentials...`);
      await auth.updateUser(firebaseUser.uid, {
        password,
        displayName: name,
        emailVerified: true,
      });
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.log(`[SeedAdmin] Creating new Firebase account for ${email}...`);
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

    // 2. Ensure user exists in MongoDB with admin role
    const normalizedEmail = email.toLowerCase().trim();
    let mongoUser = await User.findOne({ email: normalizedEmail });

    if (mongoUser) {
      console.log(`[SeedAdmin] Updating existing MongoDB user to admin role...`);
      mongoUser.role = 'admin';
      mongoUser.firebaseUid = firebaseUser.uid;
      mongoUser.emailVerified = true;
      mongoUser.isActive = true;
      if (!mongoUser.providers.includes('password')) {
        mongoUser.providers.push('password');
      }
      await mongoUser.save();
    } else {
      console.log(`[SeedAdmin] Creating new MongoDB admin user record...`);
      mongoUser = await User.create({
        name,
        email: normalizedEmail,
        firebaseUid: firebaseUser.uid,
        providers: ['password'],
        emailVerified: true,
        role: 'admin',
        isActive: true,
      });
    }

    console.log(`[SeedAdmin] SUCCESS: Administrator account [${normalizedEmail}] initialized with admin privileges.`);
    process.exit(0);
  } catch (error) {
    console.error(`[SeedAdmin] FAILED: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
