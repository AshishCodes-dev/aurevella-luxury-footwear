export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    // Replace with parsed/transformed data if needed
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;
    next();
  } catch (error) {
    const issues = error.issues || error.errors;
    if (issues && Array.isArray(issues)) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: issues.map((err) => ({
          path: Array.isArray(err.path) ? err.path.join('.') : String(err.path || ''),
          message: err.message,
        })),
      });
    }
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
    });
  }
};
