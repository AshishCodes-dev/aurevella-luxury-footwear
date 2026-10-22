export const csrfGuard = (req, res, next) => {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  // Skip non-mutating requests
  if (!mutatingMethods.includes(req.method)) {
    return next();
  }

  // Exempt external webhooks
  if (req.originalUrl === '/api/payments/webhook' || req.path === '/api/payments/webhook') {
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
  const allowedOrigin = process.env.CLIENT_URL;

  if (origin && allowedOrigin) {
    if (origin !== allowedOrigin) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Request origin does not match allowed client origin',
      });
    }
  }

  next();
};
