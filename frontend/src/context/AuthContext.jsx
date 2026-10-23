import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  updateProfile as updateFirebaseProfile,
} from '../config/firebase.js';
import { apiFetch } from '../utils/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authEpoch, setAuthEpoch] = useState(0);

  // Synchronize authentication status with backend session on mount
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const data = await apiFetch('/api/auth/me');
        if (isMounted) {
          setUser(data.user);
        }
      } catch (err) {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Email + Password Sign In
  const loginWithEmail = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();

    // Exchange Firebase ID token for secure backend session cookie
    const res = await apiFetch('/api/auth/session', {
      method: 'POST',
      body: { idToken },
    });

    // Clear Firebase client state; backend session is single source of truth
    try {
      await signOut(auth);
    } catch (_) {}

    setUser(res.user);
    return res.user;
  };

  // Email + Password Sign Up
  const signupWithEmail = async (name, email, password) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      try {
        await updateFirebaseProfile(credential.user, { displayName: name });
      } catch (_) {}
    }
    const idToken = await credential.user.getIdToken();

    const res = await apiFetch('/api/auth/session', {
      method: 'POST',
      body: { idToken },
    });

    try {
      await signOut(auth);
    } catch (_) {}

    setUser(res.user);
    return res.user;
  };

  // Google OAuth Sign In
  const loginWithGoogle = async () => {
    const credential = await signInWithPopup(auth, googleProvider);
    const idToken = await credential.user.getIdToken();

    const res = await apiFetch('/api/auth/session', {
      method: 'POST',
      body: { idToken },
    });

    try {
      await signOut(auth);
    } catch (_) {}

    setUser(res.user);
    return res.user;
  };

  // Password Reset Link
  const requestPasswordReset = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Update Profile
  const updateProfile = async ({ name, phone }) => {
    const res = await apiFetch('/api/auth/profile', {
      method: 'PUT',
      body: { name, phone },
    });
    setUser(res.user);
    return res.user;
  };

  // Sign Out
  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      try {
        await signOut(auth);
      } catch (_) {}
      setUser(null);
      setAuthEpoch((prev) => prev + 1);
    }
  };

  const value = {
    user,
    loading,
    authEpoch,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    requestPasswordReset,
    updateProfile,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
