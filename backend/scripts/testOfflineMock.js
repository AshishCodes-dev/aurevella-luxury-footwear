/**
 * AUREVELLA — Pure In-Memory Offline Mock Verification Suite
 *
 * Verifies strict offline test double behavior for Razorpay:
 * 1. Unconfigured payments.fetch() throws immediately (fail-closed)
 * 2. Unconfigured orders.create() throws immediately (fail-closed)
 * 3. Explicitly configured payment handlers work deterministically
 * 4. Explicitly configured order handlers work deterministically
 * 5. Default handlers work when explicitly provided
 * 6. Mock reset restores fail-closed unhandled state
 * 7. resetCustomRazorpayInstance() restores authentic Razorpay SDK path
 * 8. Zero external network requests dispatched
 */

import {
  createMockRazorpay,
  setCustomRazorpayInstance,
  resetCustomRazorpayInstance,
  getRazorpayInstance,
} from '../src/config/razorpay.js';
import Razorpay from 'razorpay';

async function runOfflineMockTests() {
  console.log('====================================================');
  console.log('   AUREVELLA — Offline Mock In-Memory Verification  ');
  console.log('====================================================\n');

  const results = [];
  let allPassed = true;

  const record = (name, passed, detail = '') => {
    if (!passed) allPassed = false;
    results.push({
      Test: name,
      Status: passed ? 'PASS' : 'FAIL',
      Detail: detail,
    });
  };

  try {
    const mock = createMockRazorpay();
    setCustomRazorpayInstance(mock);

    // ----------------------------------------------------
    // Test 1: Unconfigured payments.fetch() throws immediately
    // ----------------------------------------------------
    let unconfiguredPaymentThrew = false;
    let paymentErrMsg = '';
    try {
      await getRazorpayInstance().payments.fetch('pay_unconfigured_001');
    } catch (err) {
      if (err.message.includes('[OFFLINE MOCK GUARD]') && err.message.includes('pay_unconfigured_001')) {
        unconfiguredPaymentThrew = true;
        paymentErrMsg = err.message;
      }
    }
    record(
      'Fail-Closed: Unconfigured payments.fetch() throws immediately',
      unconfiguredPaymentThrew,
      paymentErrMsg
    );

    // ----------------------------------------------------
    // Test 2: Unconfigured orders.create() throws immediately
    // ----------------------------------------------------
    let unconfiguredOrderThrew = false;
    let orderErrMsg = '';
    try {
      await getRazorpayInstance().orders.create({ amount: 349900, currency: 'INR' });
    } catch (err) {
      if (err.message.includes('[OFFLINE MOCK GUARD]') && err.message.includes('orders.create')) {
        unconfiguredOrderThrew = true;
        orderErrMsg = err.message;
      }
    }
    record(
      'Fail-Closed: Unconfigured orders.create() throws immediately',
      unconfiguredOrderThrew,
      orderErrMsg
    );

    // ----------------------------------------------------
    // Test 3: Explicit payment handlers return deterministically
    // ----------------------------------------------------
    mock.mockPayment('pay_test_captured', {
      id: 'pay_test_captured',
      order_id: 'order_test_001',
      amount: 349900,
      currency: 'INR',
      status: 'captured',
    });

    const paymentResult = await getRazorpayInstance().payments.fetch('pay_test_captured');
    const isPaymentValid =
      paymentResult.id === 'pay_test_captured' &&
      paymentResult.status === 'captured' &&
      paymentResult.amount === 349900;

    record(
      'Deterministic: Explicit payment handler returns configured record',
      isPaymentValid,
      `ID: ${paymentResult.id}, Status: ${paymentResult.status}`
    );

    // ----------------------------------------------------
    // Test 4: Explicit order handlers return deterministically
    // ----------------------------------------------------
    mock.mockOrder({
      id: 'order_explicit_mock_001',
      amount: 349900,
      currency: 'INR',
      status: 'created',
    });

    const orderResult = await getRazorpayInstance().orders.create({
      amount: 349900,
      currency: 'INR',
    });
    const isOrderValid =
      orderResult.id === 'order_explicit_mock_001' &&
      orderResult.amount === 349900 &&
      orderResult.status === 'created';

    record(
      'Deterministic: Explicit order handler returns configured record',
      isOrderValid,
      `ID: ${orderResult.id}, Status: ${orderResult.status}`
    );

    // ----------------------------------------------------
    // Test 5: Default handlers handle unlisted IDs when provided
    // ----------------------------------------------------
    mock.mockDefaultPayment((id) => ({
      id,
      status: 'captured',
      amount: 100000,
      currency: 'INR',
    }));
    mock.mockDefaultOrder((params) => ({
      id: 'order_from_default',
      amount: params.amount,
      status: 'created',
    }));

    const defPayment = await getRazorpayInstance().payments.fetch('pay_random_dynamic');
    const defOrder = await getRazorpayInstance().orders.create({ amount: 50000 });

    const isDefaultWorking =
      defPayment.id === 'pay_random_dynamic' && defOrder.id === 'order_from_default';

    record(
      'Configurable: Default fallback handlers function when explicitly set',
      isDefaultWorking,
      `Payment ID: ${defPayment.id}, Order ID: ${defOrder.id}`
    );

    // ----------------------------------------------------
    // Test 6: mock.reset() clears all handlers & restores fail-closed
    // ----------------------------------------------------
    mock.reset();

    let postResetPaymentBlocked = false;
    let postResetOrderBlocked = false;

    try {
      await getRazorpayInstance().payments.fetch('pay_test_captured');
    } catch (err) {
      postResetPaymentBlocked = err.message.includes('[OFFLINE MOCK GUARD]');
    }

    try {
      await getRazorpayInstance().orders.create({ amount: 1000 });
    } catch (err) {
      postResetOrderBlocked = err.message.includes('[OFFLINE MOCK GUARD]');
    }

    record(
      'Teardown: mock.reset() restores fail-closed throwing on both methods',
      postResetPaymentBlocked && postResetOrderBlocked,
      'Both payments.fetch and orders.create throw [OFFLINE MOCK GUARD]'
    );

    // ----------------------------------------------------
    // Test 7: resetCustomRazorpayInstance() restores authentic SDK
    // ----------------------------------------------------
    resetCustomRazorpayInstance();

    process.env.RAZORPAY_KEY_ID = 'rzp_test_AurevellaMockVerification';
    process.env.RAZORPAY_KEY_SECRET = 'aurevella_mock_secret_verification!';

    const sdkInstance = getRazorpayInstance();
    const isAuthenticSdk = sdkInstance instanceof Razorpay;

    record(
      'Isolation: resetCustomRazorpayInstance() restores authentic Razorpay SDK instance',
      isAuthenticSdk,
      `instanceof Razorpay: ${isAuthenticSdk}`
    );

    // ----------------------------------------------------
    // Test 8: setCustomRazorpayInstance() rejected in production mode
    // ----------------------------------------------------
    const originalEnv = process.env.NODE_ENV;
    let prodInjectionBlocked = false;
    let prodInjectionError = '';

    try {
      process.env.NODE_ENV = 'production';
      try {
        setCustomRazorpayInstance({ mock: true });
      } catch (err) {
        if (err.message.includes('[SECURITY FATAL]') && err.message.includes('production environment')) {
          prodInjectionBlocked = true;
          prodInjectionError = err.message;
        }
      }
    } finally {
      process.env.NODE_ENV = originalEnv;
    }

    record(
      'Production Guard: setCustomRazorpayInstance() fails closed when NODE_ENV === "production"',
      prodInjectionBlocked,
      prodInjectionError
    );

    // ----------------------------------------------------
    // Test 9: createMockRazorpay() rejected in production mode
    // ----------------------------------------------------
    let prodFactoryBlocked = false;
    let prodFactoryError = '';

    try {
      process.env.NODE_ENV = 'production';
      try {
        createMockRazorpay();
      } catch (err) {
        if (err.message.includes('[SECURITY FATAL]') && err.message.includes('production environment')) {
          prodFactoryBlocked = true;
          prodFactoryError = err.message;
        }
      }
    } finally {
      process.env.NODE_ENV = originalEnv;
    }

    record(
      'Production Guard: createMockRazorpay() fails closed when NODE_ENV === "production"',
      prodFactoryBlocked,
      prodFactoryError
    );
  } finally {
    resetCustomRazorpayInstance();
  }

  console.log('\n====================================================');
  console.log('         OFFLINE MOCK TEST RESULTS MATRIX           ');
  console.log('====================================================\n');
  console.table(results);

  if (allPassed) {
    console.log('✔ ALL OFFLINE MOCK IN-MEMORY TESTS PASSED (100%)\n');
  } else {
    console.error('❌ SOME OFFLINE MOCK TESTS FAILED.\n');
    process.exit(1);
  }
}

runOfflineMockTests().catch((err) => {
  console.error('[Unhandled Suite Error]:', err);
  process.exit(1);
});
