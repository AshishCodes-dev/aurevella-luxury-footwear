/**
 * AUREVELLA — Loop 6 Razorpay Key Safety Guards Test Suite
 *
 * Verifies:
 * 1. RAZORPAY_KEY_ID prefix validation (must start with rzp_live_ or rzp_test_).
 * 2. RAZORPAY_KEY_ID environment matching:
 *    - Live key (rzp_live_) in development or test environment is strictly rejected.
 *    - Live key (rzp_live_) in production environment is accepted.
 *    - Test key (rzp_test_) in production is accepted with clear warning/info (staging mode).
 * 3. RAZORPAY_KEY_SECRET non-empty validation.
 * 4. RAZORPAY_WEBHOOK_SECRET checks:
 *    - Mandatory in production (>= 16 chars).
 *    - Must NOT equal RAZORPAY_KEY_SECRET.
 * 5. Secret redaction: Key secrets and webhook secrets are NEVER printed in logs/output.
 * 6. Runtime guard in backend/src/config/razorpay.js:
 *    - Refuses to instantiate real Razorpay client with rzp_live_ in non-production.
 *    - Preserves test injection / offline mock functionality.
 */

import { checkRazorpayConfig } from './checkEnv.js';
import {
  getRazorpayInstance,
  setCustomRazorpayInstance,
  resetCustomRazorpayInstance,
  createMockRazorpay,
} from '../src/config/razorpay.js';

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

console.log('===============================================================');
console.log('   AUREVELLA — Razorpay Key Safety Guards Test Suite (Loop 6)  ');
console.log('===============================================================\n');

// Capture console logs to verify that secret values are NEVER leaked to stdout/stderr
const interceptedLogs = [];
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function startLogCapture() {
  interceptedLogs.length = 0;
  console.log = (...args) => {
    interceptedLogs.push(args.map((a) => String(a)).join(' '));
    originalConsoleLog(...args);
  };
  console.error = (...args) => {
    interceptedLogs.push(args.map((a) => String(a)).join(' '));
    originalConsoleError(...args);
  };
  console.warn = (...args) => {
    interceptedLogs.push(args.map((a) => String(a)).join(' '));
    originalConsoleWarn(...args);
  };
}

function stopLogCapture() {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}

// Preserve existing process.env
const savedEnv = { ...process.env };

try {
  // -------------------------------------------------------------
  // SUITE 1: Key Prefix & Required Field Validations
  // -------------------------------------------------------------
  console.log('--- Suite 1: Key Prefix & Required Field Validations ---');

  // 1.1 Bad key prefix
  {
    const loggedFailures = [];
    const isValid = checkRazorpayConfig(
      {
        NODE_ENV: 'development',
        RAZORPAY_KEY_ID: 'invalid_prefix_key_12345',
        RAZORPAY_KEY_SECRET: 'fake_secret_12345',
      },
      { fail: (l, r) => loggedFailures.push(`${l}: ${r}`) }
    );
    assert(isValid === false, 'Prefix Validation: Invalid key prefix rejected', 'Returned false');
    assert(
      loggedFailures.some((m) => m.includes('Invalid key prefix')),
      'Prefix Validation: Explains key must start with rzp_live_ or rzp_test_'
    );
  }

  // 1.2 Missing RAZORPAY_KEY_ID
  {
    const loggedFailures = [];
    const isValid = checkRazorpayConfig(
      {
        NODE_ENV: 'development',
        RAZORPAY_KEY_ID: '',
        RAZORPAY_KEY_SECRET: 'fake_secret_12345',
      },
      { fail: (l, r) => loggedFailures.push(`${l}: ${r}`) }
    );
    assert(isValid === false, 'Key ID Validation: Empty RAZORPAY_KEY_ID rejected');
  }

  // 1.3 Missing RAZORPAY_KEY_SECRET
  {
    const loggedFailures = [];
    const isValid = checkRazorpayConfig(
      {
        NODE_ENV: 'development',
        RAZORPAY_KEY_ID: 'rzp_test_FAKEFORTEST',
        RAZORPAY_KEY_SECRET: '   ',
      },
      { fail: (l, r) => loggedFailures.push(`${l}: ${r}`) }
    );
    assert(isValid === false, 'Key Secret Validation: Empty RAZORPAY_KEY_SECRET rejected');
  }

  // -------------------------------------------------------------
  // SUITE 2: Environment Match Guard (Live vs Test Keys)
  // -------------------------------------------------------------
  console.log('\n--- Suite 2: Environment Match Guard (Live vs Test Keys) ---');

  // 2.1 Live key in development mode => strictly rejected
  {
    const loggedFailures = [];
    const isValid = checkRazorpayConfig(
      {
        NODE_ENV: 'development',
        RAZORPAY_KEY_ID: 'rzp_live_FAKEFORTEST',
        RAZORPAY_KEY_SECRET: 'fake_secret_12345',
      },
      { fail: (l, r) => loggedFailures.push(`${l}: ${r}`) }
    );
    assert(isValid === false, 'Environment Guard: Live key in development mode is rejected', 'Returned false');
    assert(
      loggedFailures.some((m) => m.includes('Live keys are only allowed in production')),
      'Environment Guard: Explains live keys are only allowed in production'
    );
  }

  // 2.2 Live key in test mode => strictly rejected
  {
    const loggedFailures = [];
    const isValid = checkRazorpayConfig(
      {
        NODE_ENV: 'test',
        RAZORPAY_KEY_ID: 'rzp_live_FAKEFORTEST',
        RAZORPAY_KEY_SECRET: 'fake_secret_12345',
      },
      { fail: (l, r) => loggedFailures.push(`${l}: ${r}`) }
    );
    assert(isValid === false, 'Environment Guard: Live key in test mode is rejected', 'Returned false');
  }

  // 2.3 Live key in production mode with valid secrets => accepted
  {
    const isValid = checkRazorpayConfig(
      {
        NODE_ENV: 'production',
        RAZORPAY_KEY_ID: 'rzp_live_FAKEFORTEST',
        RAZORPAY_KEY_SECRET: 'fake_prod_key_secret_12345',
        RAZORPAY_WEBHOOK_SECRET: 'different_webhook_secret_32chars',
      },
      { pass: () => {}, info: () => {}, fail: () => {} }
    );
    assert(isValid === true, 'Environment Guard: Live key accepted in production mode with valid secrets', 'Returned true');
  }

  // 2.4 Test key in production mode => accepted as warning/info (staging mode)
  {
    const loggedInfos = [];
    const isValid = checkRazorpayConfig(
      {
        NODE_ENV: 'production',
        RAZORPAY_KEY_ID: 'rzp_test_FAKEFORTEST',
        RAZORPAY_KEY_SECRET: 'fake_test_key_secret_12345',
        RAZORPAY_WEBHOOK_SECRET: 'different_webhook_secret_32chars',
      },
      {
        pass: () => {},
        info: (l, r) => loggedInfos.push(`${l}: ${r}`),
        fail: () => {},
      }
    );
    assert(isValid === true, 'Environment Guard: Test key in production mode passes (not rejected)', 'Returned true');
    assert(
      loggedInfos.some((m) => m.includes('TEST MODE: no real payments')),
      'Environment Guard: Test key in production is clearly labelled "TEST MODE: no real payments"'
    );
  }

  // -------------------------------------------------------------
  // SUITE 3: Webhook Secret Validation Rules
  // -------------------------------------------------------------
  console.log('\n--- Suite 3: Webhook Secret Validation Rules ---');

  // 3.1 Webhook secret equal to key secret in production => rejected
  {
    const loggedFailures = [];
    const identicalSecret = 'identical_secret_value_12345';
    const isValid = checkRazorpayConfig(
      {
        NODE_ENV: 'production',
        RAZORPAY_KEY_ID: 'rzp_live_FAKEFORTEST',
        RAZORPAY_KEY_SECRET: identicalSecret,
        RAZORPAY_WEBHOOK_SECRET: identicalSecret,
      },
      { fail: (l, r) => loggedFailures.push(`${l}: ${r}`) }
    );
    assert(isValid === false, 'Webhook Secret Guard: Identical key secret and webhook secret rejected in production');
    assert(
      loggedFailures.some((m) => m.includes('must NOT equal RAZORPAY_KEY_SECRET')),
      'Webhook Secret Guard: Error message states secrets must not be equal'
    );
  }

  // 3.2 Webhook secret equal to key secret in development => rejected
  {
    const identicalSecret = 'identical_dev_secret_value_12345';
    const isValid = checkRazorpayConfig(
      {
        NODE_ENV: 'development',
        RAZORPAY_KEY_ID: 'rzp_test_FAKEFORTEST',
        RAZORPAY_KEY_SECRET: identicalSecret,
        RAZORPAY_WEBHOOK_SECRET: identicalSecret,
      },
      { fail: () => {} }
    );
    assert(isValid === false, 'Webhook Secret Guard: Identical key secret and webhook secret rejected in development');
  }

  // 3.3 Webhook secret missing in production => rejected
  {
    const isValid = checkRazorpayConfig(
      {
        NODE_ENV: 'production',
        RAZORPAY_KEY_ID: 'rzp_live_FAKEFORTEST',
        RAZORPAY_KEY_SECRET: 'fake_key_secret_12345',
        RAZORPAY_WEBHOOK_SECRET: '',
      },
      { fail: () => {} }
    );
    assert(isValid === false, 'Webhook Secret Guard: Missing webhook secret rejected in production');
  }

  // 3.4 Webhook secret too short (< 16 chars) in production => rejected
  {
    const isValid = checkRazorpayConfig(
      {
        NODE_ENV: 'production',
        RAZORPAY_KEY_ID: 'rzp_live_FAKEFORTEST',
        RAZORPAY_KEY_SECRET: 'fake_key_secret_12345',
        RAZORPAY_WEBHOOK_SECRET: 'short_secret',
      },
      { fail: () => {} }
    );
    assert(isValid === false, 'Webhook Secret Guard: Webhook secret under 16 characters rejected in production');
  }

  // -------------------------------------------------------------
  // SUITE 4: Zero Secret Leakage in Logs
  // -------------------------------------------------------------
  console.log('\n--- Suite 4: Zero Secret Leakage in Logs ---');

  {
    const canaryKeySecret = 'SECRET_CANARY_VALUE_KEY_99999';
    const canaryWebhookSecret = 'SECRET_CANARY_VALUE_WEBHOOK_88888';

    startLogCapture();
    try {
      checkRazorpayConfig(
        {
          NODE_ENV: 'production',
          RAZORPAY_KEY_ID: 'rzp_live_FAKEFORTEST',
          RAZORPAY_KEY_SECRET: canaryKeySecret,
          RAZORPAY_WEBHOOK_SECRET: canaryWebhookSecret,
        },
        {
          pass: (l, r) => console.log(`[PASS] ${l}: ${r}`),
          info: (l, r) => console.log(`[INFO] ${l}: ${r}`),
          fail: (l, r) => console.log(`[FAIL] ${l}: ${r}`),
        }
      );
    } finally {
      stopLogCapture();
    }

    const allCaptured = interceptedLogs.join('\n');
    const keySecretLeaked = allCaptured.includes(canaryKeySecret);
    const webhookSecretLeaked = allCaptured.includes(canaryWebhookSecret);

    assert(
      keySecretLeaked === false,
      'Secret Redaction: RAZORPAY_KEY_SECRET value is never printed in output',
      'Canary secret absent from logs'
    );
    assert(
      webhookSecretLeaked === false,
      'Secret Redaction: RAZORPAY_WEBHOOK_SECRET value is never printed in output',
      'Canary webhook secret absent from logs'
    );
  }

  // -------------------------------------------------------------
  // SUITE 5: Runtime Client Guard (backend/src/config/razorpay.js)
  // -------------------------------------------------------------
  console.log('\n--- Suite 5: Runtime Client Guard in razorpay.js ---');

  // 5.1 Refuses to create real client with rzp_live_ in development
  {
    process.env.NODE_ENV = 'development';
    process.env.RAZORPAY_KEY_ID = 'rzp_live_FAKEFORTEST';
    process.env.RAZORPAY_KEY_SECRET = 'fake_key_secret_dev';
    resetCustomRazorpayInstance();

    let caughtError = null;
    try {
      getRazorpayInstance();
    } catch (err) {
      caughtError = err;
    }

    assert(
      caughtError !== null && caughtError.message.includes('[SECURITY FATAL]'),
      'Runtime Guard: getRazorpayInstance() throws fatal error when live key used in development',
      caughtError ? caughtError.message : 'No error thrown'
    );
  }

  // 5.2 Refuses to create real client with rzp_live_ in test environment
  {
    process.env.NODE_ENV = 'test';
    process.env.RAZORPAY_KEY_ID = 'rzp_live_FAKEFORTEST';
    process.env.RAZORPAY_KEY_SECRET = 'fake_key_secret_test';
    resetCustomRazorpayInstance();

    let caughtError = null;
    try {
      getRazorpayInstance();
    } catch (err) {
      caughtError = err;
    }

    assert(
      caughtError !== null && caughtError.message.includes('[SECURITY FATAL]'),
      'Runtime Guard: getRazorpayInstance() throws fatal error when live key used in test mode without mock',
      caughtError ? caughtError.message : 'No error thrown'
    );
  }

  // 5.3 Offline mock injection continues to work transparently in test mode
  {
    process.env.NODE_ENV = 'test';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_FAKEFORTEST';
    process.env.RAZORPAY_KEY_SECRET = 'fake_key_secret_test';
    const mock = createMockRazorpay();
    setCustomRazorpayInstance(mock);

    const instance = getRazorpayInstance();
    assert(
      instance === mock,
      'Runtime Mock Guard: setCustomRazorpayInstance mock returned transparently in test environment'
    );
    resetCustomRazorpayInstance();
  }
} finally {
  // Completely restore original process.env
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, savedEnv);
  resetCustomRazorpayInstance();
}

console.log('\n===============================================================');
console.log(`  Summary: ${passedCount}/${passedCount + failedCount} Razorpay Guard Assertions Passed`);
console.log('===============================================================');

if (failedCount > 0) {
  console.error(`FAILED: ${failedCount} assertions did not pass.`);
  process.exit(1);
} else {
  console.log('SUCCESS: All Razorpay key safety guards verified.\n');
  process.exit(0);
}
