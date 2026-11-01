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

  const single = process.env.CLIENT_URL || 'http://localhost:5173';
  return [single.trim()];
};
