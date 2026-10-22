import express from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import {
  createSession,
  logout,
  getCurrentUser,
  updateProfile,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts. Please try again later.',
  },
});

const sessionSchema = z.object({
  body: z.object({
    idToken: z.string({ required_error: 'Firebase ID token is required' }).min(1),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
    phone: z.string().min(7, 'Invalid phone number').max(20).optional().nullable(),
  }),
});

// Auth Routes
router.post('/session', sessionLimiter, validate(sessionSchema), createSession);
router.post('/logout', logout);
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);

export default router;
