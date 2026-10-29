/**
 * Central Error Handler Middleware
 *
 * Ensures:
 * 1. Full error details and stack traces are logged server-side for status >= 500.
 * 2. In production (NODE_ENV === 'production'), 500 server errors are masked with a generic user message.
 * 3. In production, error stack traces are never leaked in API response JSON.
 * 4. In development/test, full error messages and stacks are preserved for developer debugging.
 * 5. Client 4xx status codes and error messages are preserved across all environments.
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Server-side logging for unhandled server errors (status >= 500)
  if (statusCode >= 500) {
    console.error('[Unhandled Server Error]:', err);
  }

  // Safe client response message
  let clientMessage = err.message || 'Internal Server Error';
  if (statusCode >= 500 && isProduction) {
    clientMessage = 'An unexpected server error occurred. Please try again later.';
  }

  res.status(statusCode).json({
    status: 'error',
    message: clientMessage,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

export default errorHandler;
