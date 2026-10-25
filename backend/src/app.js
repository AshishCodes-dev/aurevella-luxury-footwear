import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';

import { csrfGuard } from './middleware/csrfGuard.js';
import { sanitize } from './middleware/sanitize.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import productRoutes, { getCategories } from './routes/product.routes.js';
import userRoutes from './routes/user.routes.js';
import orderRoutes from './routes/order.routes.js';
import paymentRoutes from './routes/payment.routes.js';

const app = express();

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

// CORS setup: allow ONLY the origin in CLIENT_URL
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
    // Allow non-browser requests (no origin header) or exact match with CLIENT_URL
    if (!origin || origin === allowedOrigin) {
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

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Not Found - ${req.originalUrl}`,
  });
});

// Central Error Handler (never leaks stack trace in production)
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

export default app;
