import { getAllowedOrigins } from '../config/corsOrigins.js';

export const csrfGuard = (req, res, next) => {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  // Skip non-mutating requests
  if (!mutatingMethods.includes(req.method)) {
    return next();
  }

  // Exempt external webhooks
  const url = req.originalUrl || req.path || '';
  if (url.startsWith('/api/payments/webhook')) {
    return next();
  }

  // Verify custom header
  const aurevellaHeader = req.headers['x-aurevella-request'];
  if (aurevellaHeader !== '1') {
    return res.status(403).json({
      status: 'error',
      message: 'Forbidden: Missing or invalid X-Aurevella-Request header',
    });
  }

  // Verify Origin header if present
  const origin = req.headers['origin'];
  if (origin) {
    const allowedOrigins = getAllowedOrigins();
    if (!allowedOrigins.includes(origin)) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Request origin does not match allowed client origin',
      });
    }
  }

  next();
};
