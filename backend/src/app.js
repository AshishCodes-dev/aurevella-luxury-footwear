import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS setup: allow ONLY the origin in CLIENT_URL
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigin = process.env.CLIENT_URL;
    // Allow non-browser / server-to-server requests (no origin header)
    // or requests matching CLIENT_URL
    if (!origin || origin === allowedOrigin) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));

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

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Not Found - ${req.originalUrl}`,
  });
});

// Central Error Handler (never leaks stack trace in production)
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

export default app;
