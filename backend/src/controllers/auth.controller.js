import jwt from 'jsonwebtoken';
import { getFirebaseAuth } from '../config/firebase.js';
import User from '../models/User.js';

export const createSession = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Firebase ID token is required',
      });
    }

    const firebaseAuth = getFirebaseAuth();
    let decodedToken;
    try {
      decodedToken = await firebaseAuth.verifyIdToken(idToken);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: `Invalid Firebase token: ${err.message}`,
      });
    }

    const {
      uid: firebaseUid,
      email,
      email_verified: emailVerified = false,
      name = '',
      picture = null,
      firebase: firebaseClaims = {},
    } = decodedToken;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Firebase token does not contain an email address',
      });
    }

    const provider = firebaseClaims.sign_in_provider || 'password';
    const normalizedEmail = email.toLowerCase().trim();

    let user = await User.findOne({ firebaseUid });

    if (user) {
      // Existing user by firebaseUid
      if (!user.isActive) {
        return res.status(403).json({
          status: 'error',
          message: 'User account has been deactivated',
        });
      }

      // Update provider list and verification if changed
      let modified = false;
      if (emailVerified && !user.emailVerified) {
        user.emailVerified = true;
        modified = true;
      }
      if (!user.providers.includes(provider)) {
        user.providers.push(provider);
        modified = true;
      }
      if (picture && !user.photoURL) {
        user.photoURL = picture;
        modified = true;
      }
      if (modified) {
        await user.save();
      }
    } else {
      // Check if user already exists by email
      const existingUserByEmail = await User.findOne({ email: normalizedEmail });

      if (existingUserByEmail) {
        // Enforce account linking security: email MUST be verified
        if (!emailVerified) {
          return res.status(409).json({
            status: 'error',
            message:
              'An account with this email already exists. Please verify your email with the existing provider before linking.',
          });
        }

        // Safe link: attach new firebaseUid and provider
        existingUserByEmail.firebaseUid = firebaseUid;
        existingUserByEmail.emailVerified = true;
        if (!existingUserByEmail.providers.includes(provider)) {
          existingUserByEmail.providers.push(provider);
        }
        if (picture && !existingUserByEmail.photoURL) {
          existingUserByEmail.photoURL = picture;
        }
        await existingUserByEmail.save();
        user = existingUserByEmail;
      } else {
        // Create brand new user (role is ALWAYS customer)
        user = await User.create({
          name: name.trim() || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          firebaseUid,
          providers: [provider],
          emailVerified: !!emailVerified,
          photoURL: picture,
          role: 'customer',
          isActive: true,
        });
      }
    }

    // Determine session lifetime
    const isAdmin = user.role === 'admin';
    const expiresIn = isAdmin ? '24h' : '7d';
    const maxAge = isAdmin ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const sessionJwt = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      secret,
      { expiresIn }
    );

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('token', sessionJwt, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge,
    });

    return res.status(200).json({
      status: 'success',
      user: user.toSafeJSON(),
    });
  } catch (error) {
    console.error('[Session Controller Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to establish user session',
    });
  }
};

export const logout = async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
  });

  return res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
};

export const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    status: 'success',
    user: req.user.toSafeJSON(),
  });
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    let modified = false;

    if (name !== undefined) {
      req.user.name = name.trim();
      modified = true;
    }

    if (phone !== undefined) {
      req.user.phone = phone ? phone.trim() : null;
      modified = true;
    }

    if (modified) {
      await req.user.save();
    }

    return res.status(200).json({
      status: 'success',
      user: req.user.toSafeJSON(),
    });
  } catch (error) {
    console.error('[Update Profile Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
    });
  }
};
