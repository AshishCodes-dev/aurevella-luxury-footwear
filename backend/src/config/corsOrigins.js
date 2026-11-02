/**
 * AUREVELLA — Allowed CORS Origins Resolver
 *
 * Reads ALLOWED_ORIGINS (comma-separated list of origins) or falls back to CLIENT_URL.
 * Normalizes entries by trimming whitespace and filtering empty strings.
 */
export const getAllowedOrigins = () => {
  const allowed = process.env.ALLOWED_ORIGINS;
  if (allowed && allowed.trim().length > 0) {
    return allowed
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  const single = process.env.CLIENT_URL;
  if (single && single.trim().length > 0) {
    return [single.trim()];
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SECURITY FATAL] Neither ALLOWED_ORIGINS nor CLIENT_URL is configured in production environment. Refusing to start with insecure origin defaults.'
    );
  }

  return ['http://localhost:5173'];
};
