import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';

import { getAllowedOrigins } from './config/corsOrigins.js';
import { csrfGuard } from './middleware/csrfGuard.js';
import { sanitize } from './middleware/sanitize.js';
import { globalApiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import productRoutes, { getCategories } from './routes/product.routes.js';
import userRoutes from './routes/user.routes.js';
import orderRoutes from './routes/order.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import contactRoutes from './routes/contact.routes.js';

const app = express();

// Trust Proxy Configuration
// Configured via TRUST_PROXY env var (e.g. 'true', integer hop count, or documented IP/subnet keywords)
const rawTrustProxy = process.env.TRUST_PROXY;
if (rawTrustProxy !== undefined && rawTrustProxy !== '') {
  const trimmed = rawTrustProxy.trim();
  if (trimmed === 'true') {
    app.set('trust proxy', 1);
  } else if (trimmed === 'false') {
    app.set('trust proxy', false);
  } else if (/^\d+$/.test(trimmed)) {
    app.set('trust proxy', parseInt(trimmed, 10));
  } else {
    const SAFE_KEYWORDS = new Set(['loopback', 'linklocal', 'uniquelocal']);
    const parts = trimmed.split(',').map((p) => p.trim());
    const isValidPart = (p) => {
      if (SAFE_KEYWORDS.has(p.toLowerCase())) return true;
      const ipv4Cidr = /^(?:\d{1,3}\.){3}\d{1,3}(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$/;
      const ipv6Cidr = /^[0-9a-fA-F:]+(?:\/(?:[0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$/;
      return ipv4Cidr.test(p) || ipv6Cidr.test(p);
    };

    if (parts.length > 0 && parts.every(isValidPart)) {
      app.set('trust proxy', trimmed);
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          `[SECURITY FATAL] Invalid TRUST_PROXY configuration "${trimmed}". Must be a boolean ('true'/'false'), an integer hop count, or comma-separated IPs/CIDRs/keywords ('loopback', 'linklocal', 'uniquelocal').`
        );
      } else {
        console.warn(
          `[WARN] Invalid TRUST_PROXY "${trimmed}" in non-production. Falling back to false.`
        );
        app.set('trust proxy', false);
      }
    }
  }
} else {
  app.set('trust proxy', false);
}

// Security headers
app.use(helmet());

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Cookie Parser
app.use(cookieParser());

// Body Parsers with Raw Body Capture for Webhooks
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// NoSQL Injection Sanitize Middleware
app.use(sanitize);

// CORS setup: allow origins listed in ALLOWED_ORIGINS (or fallback to CLIENT_URL)
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    // Allow non-browser requests (no origin header) or exact match with one of allowedOrigins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      const err = new Error(`Not allowed by CORS. Origin: ${origin}`);
      err.status = 403;
      callback(err);
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Custom CSRF and Origin Guard on mutating methods
app.use(csrfGuard);

// Global API rate limiting (exempts /api/payments/webhook)
app.use('/api', globalApiLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: 'ok',
    service: 'aurevella-backend',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.get('/api/categories', getCategories);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contact', contactRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Not Found - ${req.originalUrl}`,
  });
});

// Central Error Handler (never leaks stack trace in production; masks 500 error messages in production)
app.use(errorHandler);

export default app;
