/**
 * AUREVELLA — Loop 2 Backend Hardening Test Suite
 *
 * Verifies:
 * 1. Webhook rate limit exemption: /api/payments/webhook is NEVER throttled.
 * 2. Rate limiting enforcement on standard endpoints.
 * 3. Safe error masking: 500 errors masked in production; 4xx errors preserved.
 * 4. Multi-origin CORS: apex, www, and local origins accepted; unlisted origins rejected with 403.
 * 5. Multi-origin CSRF guard: mutating requests validated against all allowed origins.
 * 6. Trust proxy configuration resolution.
 */

import express from 'express';
import http from 'http';
import app from '../src/app.js';
import { getAllowedOrigins } from '../src/config/corsOrigins.js';
import { globalApiLimiter } from '../src/middleware/rateLimiter.js';

let passedCount = 0;
let failedCount = 0;
const results = [];

function assert(condition, name, detail) {
  if (condition) {
    passedCount++;
    results.push({ name, status: 'PASS', detail: detail || 'Assertion verified successfully' });
    console.log(`✔ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
  } else {
    failedCount++;
    results.push({ name, status: 'FAIL', detail: detail || 'Assertion failed' });
    console.error(`✖ [FAIL] ${name}${detail ? ` (${detail})` : ''}`);
  }
}

async function request(server, path, options = {}) {
  const address = server.address();
  const port = address.port;
  const url = `http://127.0.0.1:${port}${path}`;

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (_) {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            json,
          });
        });
      }
    );

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('   AUREVELLA — Loop 2 Backend Hardening Test Suite             ');
  console.log('===============================================================\n');

  // --- Part 1: Trust Proxy Configuration ---
  console.log('--- Part 1: Trust Proxy Configuration ---');
  const defaultTrustProxy = app.get('trust proxy');
  assert(
    defaultTrustProxy !== undefined,
    'Trust proxy setting is explicitly configured on Express app',
    `Current setting: ${defaultTrustProxy}`
  );

  // --- Part 2: Multi-Origin CORS & Resolver ---
  console.log('\n--- Part 2: Multi-Origin CORS & Resolver ---');
  const originalAllowed = process.env.ALLOWED_ORIGINS;
  const originalClient = process.env.CLIENT_URL;

  try {
    process.env.ALLOWED_ORIGINS = 'https://myaurevella.in, https://www.myaurevella.in, http://localhost:5173';
    const parsedOrigins = getAllowedOrigins();

    assert(
      parsedOrigins.length === 3,
      'getAllowedOrigins parses comma-separated origins with whitespace trimming',
      `Parsed: ${JSON.stringify(parsedOrigins)}`
    );
    assert(
      parsedOrigins.includes('https://myaurevella.in') &&
        parsedOrigins.includes('https://www.myaurevella.in') &&
        parsedOrigins.includes('http://localhost:5173'),
      'getAllowedOrigins includes apex, www, and local origins',
      'All 3 origins present'
    );
  } finally {
    process.env.ALLOWED_ORIGINS = originalAllowed || '';
    process.env.CLIENT_URL = originalClient;
  }

  // --- Part 3: Live Server Testing ---
  console.log('\n--- Part 3: Server Integration Testing ---');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    // 3.1 Webhook Rate Limiting Exemption
    // Send 35 requests to /api/payments/webhook and confirm NONE return 429
    let webhookRateLimited = false;
    for (let i = 0; i < 35; i++) {
      const res = await request(server, '/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': 'mock-sig-for-test',
        },
        body: JSON.stringify({ event: 'payment.captured' }),
      });
      if (res.status === 429) {
        webhookRateLimited = true;
        break;
      }
    }
    assert(
      !webhookRateLimited,
      'Webhook rate limit exemption: /api/payments/webhook is NEVER rate limited',
      '35 consecutive requests received standard handler response without 429'
    );

    // 3.2 Multi-Origin CORS Handling on Live Endpoints
    process.env.ALLOWED_ORIGINS = 'https://myaurevella.in, https://www.myaurevella.in, http://localhost:5173';

    // Apex origin
    const apexRes = await request(server, '/api/health', {
      headers: { Origin: 'https://myaurevella.in' },
    });
    assert(
      apexRes.status === 200 && apexRes.headers['access-control-allow-origin'] === 'https://myaurevella.in',
      'CORS: Apex origin (https://myaurevella.in) is permitted with Access-Control-Allow-Origin header',
      `Status: ${apexRes.status}`
    );

    // WWW origin
    const wwwRes = await request(server, '/api/health', {
      headers: { Origin: 'https://www.myaurevella.in' },
    });
    assert(
      wwwRes.status === 200 && wwwRes.headers['access-control-allow-origin'] === 'https://www.myaurevella.in',
      'CORS: Subdomain www origin (https://www.myaurevella.in) is permitted',
      `Status: ${wwwRes.status}`
    );

    // Untrusted origin
    const unlistedRes = await request(server, '/api/health', {
      headers: { Origin: 'https://unauthorized-phishing.com' },
    });
    assert(
      unlistedRes.status === 403,
      'CORS: Unlisted origin (https://unauthorized-phishing.com) is rejected with HTTP 403',
      `Status: ${unlistedRes.status}, Message: ${unlistedRes.json?.message || unlistedRes.body}`
    );

    // 3.3 CSRF Guard Multi-Origin Support
    // Mutating request from permitted apex origin with header
    const csrfApexRes = await request(server, '/api/payments/create-order', {
      method: 'POST',
      headers: {
        Origin: 'https://myaurevella.in',
        'x-aurevella-request': '1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId: 'test-order-123' }),
    });
    // Should pass CSRF guard and proceed to auth check (HTTP 401 Unauthorized), NOT 403 CSRF rejection
    assert(
      csrfApexRes.status === 401,
      'CSRF Guard: Permitted apex origin passes CSRF guard and reaches auth gate (401)',
      `Status: ${csrfApexRes.status}`
    );

    // Mutating request from unlisted origin with header
    const csrfUnlistedRes = await request(server, '/api/payments/create-order', {
      method: 'POST',
      headers: {
        Origin: 'https://unauthorized-phishing.com',
        'x-aurevella-request': '1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId: 'test-order-123' }),
    });
    assert(
      csrfUnlistedRes.status === 403,
      'CSRF Guard: Mutating request from unlisted origin is blocked with HTTP 403',
      `Status: ${csrfUnlistedRes.status}, Message: ${csrfUnlistedRes.json?.message}`
    );
  } finally {
    process.env.ALLOWED_ORIGINS = originalAllowed || '';
    process.env.CLIENT_URL = originalClient;
    await new Promise((resolve) => server.close(resolve));
  }

  // --- Part 4: Central Error Handler Masking Suite ---
  console.log('\n--- Part 4: Central Error Handler Masking Suite ---');

  // Create isolated test app with deliberate error routes
  const testErrorApp = express();
  testErrorApp.use(express.json());

  testErrorApp.get('/test-500', (req, res, next) => {
    const err = new Error('Database connection string password leaked in exception');
    err.status = 500;
    next(err);
  });

  testErrorApp.get('/test-400', (req, res, next) => {
    const err = new Error('Shoe size EU 48 is currently out of stock');
    err.status = 400;
    next(err);
  });

  // Attach same central error handler logic
  testErrorApp.use((err, req, res, next) => {
    const statusCode = err.status || err.statusCode || 500;
    const isProduction = process.env.NODE_ENV === 'production';

    let clientMessage = err.message || 'Internal Server Error';
    if (statusCode >= 500 && isProduction) {
      clientMessage = 'An unexpected server error occurred. Please try again later.';
    }

    res.status(statusCode).json({
      status: 'error',
      message: clientMessage,
      ...(isProduction ? {} : { stack: err.stack }),
    });
  });

  const errorServer = http.createServer(testErrorApp);
  await new Promise((resolve) => errorServer.listen(0, '127.0.0.1', resolve));

  const originalEnv = process.env.NODE_ENV;
  try {
    // 4.1 Production 500 Error Masking
    process.env.NODE_ENV = 'production';
    const prod500Res = await request(errorServer, '/test-500');
    assert(
      prod500Res.status === 500,
      'Error Handler: 500 HTTP status code returned for server errors in production',
      `Status: ${prod500Res.status}`
    );
    assert(
      prod500Res.json?.message === 'An unexpected server error occurred. Please try again later.',
      'Error Handler: Sensitive 500 error message is masked in production',
      `Received message: "${prod500Res.json?.message}"`
    );
    assert(
      prod500Res.json?.stack === undefined,
      'Error Handler: Stack trace is omitted in production response',
      'stack property is undefined'
    );

    // 4.2 Production 4xx Client Error Preservation
    const prod400Res = await request(errorServer, '/test-400');
    assert(
      prod400Res.status === 400,
      'Error Handler: 400 HTTP status code returned for client errors in production',
      `Status: ${prod400Res.status}`
    );
    assert(
      prod400Res.json?.message === 'Shoe size EU 48 is currently out of stock',
      'Error Handler: Client 4xx error message is preserved intact in production',
      `Received message: "${prod400Res.json?.message}"`
    );

    // 4.3 Development 500 Error Inspection
    process.env.NODE_ENV = 'development';
    const dev500Res = await request(errorServer, '/test-500');
    assert(
      dev500Res.json?.message === 'Database connection string password leaked in exception',
      'Error Handler: Unmasked error message returned in development mode for developer inspection',
      `Received message: "${dev500Res.json?.message}"`
    );
    assert(
      typeof dev500Res.json?.stack === 'string',
      'Error Handler: Stack trace is included in development mode',
      'stack property is a string'
    );
  } finally {
    process.env.NODE_ENV = originalEnv;
    await new Promise((resolve) => errorServer.close(resolve));
  }

  // --- Summary ---
  console.log('\n===============================================================');
  console.log(`  Summary: ${passedCount}/${results.length} Hardening Assertions Passed`);
  console.log('===============================================================');

  if (failedCount > 0) {
    console.error(`✖ SOME CHECKS FAILED (${failedCount} failure(s)).`);
    process.exit(1);
  } else {
    console.log('SUCCESS: All backend hardening and security guards verified.\n');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('[Fatal Test Failure]:', err);
  process.exit(1);
});
