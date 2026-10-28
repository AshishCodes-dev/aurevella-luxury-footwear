import rateLimit from 'express-rate-limit';

/**
 * AUREVELLA — Dedicated Rate Limiting Configurations
 *
 * 1. globalApiLimiter: General rate limit across /api endpoints.
 *    STRICT EXEMPTION: Payments webhook (/api/payments/webhook) is explicitly exempted.
 * 2. paymentOrderLimiter: Sensitive payment creation and verification operations.
 * 3. orderLimiter: Order quote calculations and creation operations.
 * 4. adminLimiter: Administrative management operations.
 */

// Global API Limiter (applied to /api)
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // 300 requests per 15 minutes
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.DISABLE_RATE_LIMITER === 'true') return true;
    const url = req.originalUrl || req.path || '';
    return url.startsWith('/api/payments/webhook');
  },
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Sensitive Payment Operations Limiter
export const paymentOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30, // 30 operations per 15 minutes
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.DISABLE_RATE_LIMITER === 'true',
  message: {
    status: 'error',
    message: 'Payment request limit exceeded. Please wait a few minutes before trying again.',
  },
});

// Orders & Quotes Limiter
export const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60, // 60 operations per 15 minutes
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.DISABLE_RATE_LIMITER === 'true',
  message: {
    status: 'error',
    message: 'Order operation limit exceeded. Please wait a moment before trying again.',
  },
});

// Admin Operations Limiter
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100, // 100 operations per 15 minutes
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.DISABLE_RATE_LIMITER === 'true',
  message: {
    status: 'error',
    message: 'Admin request rate limit exceeded. Please try again later.',
  },
});
