import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import app from '../src/app.js';
import { connectTestDB } from '../src/config/db.js';
import Product from '../src/models/Product.js';
import Address from '../src/models/Address.js';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import * as razorpayConfig from '../src/config/razorpay.js';
import { processPaymentSuccessAndDeductInventory } from '../src/services/paymentInventory.service.js';

async function runPhase6_2TestSuite() {
  console.log('====================================================');
  console.log('   AUREVELLA — Phase 6.2 Backend Verification Suite ');
  console.log('====================================================\n');

  await connectTestDB();

  // Verify MongoDB connection topology
  const host = mongoose.connection.host || 'unknown';
  const topoType = mongoose.connection.client?.topology?.description?.type || 'unknown';
  const isReplicaSet = ['ReplicaSetWithPrimary', 'Sharded', 'LoadBalanced'].includes(topoType);
  console.log(`[Database] Connected to ${host} (Topology: ${topoType}, Transactions Supported: ${isReplicaSet})\n`);

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

  // Start ephemeral server on random available port
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Deterministic test secrets for signature testing
  const TEST_KEY_ID = 'rzp_test_AurevellaKey01';
  const TEST_KEY_SECRET = 'aurevella_test_secret_32_chars_long!!';
  const TEST_WEBHOOK_SECRET = 'aurevella_webhook_secret_key_999!';

  // Override config getters safely for the test environment
  process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

  // Initialize deterministic offline Razorpay mock (guarantees zero external network requests)
  const mockRazorpay = razorpayConfig.createMockRazorpay();
  razorpayConfig.setCustomRazorpayInstance(mockRazorpay);

  try {
    // ----------------------------------------------------
    // Suite 1: Test Accounts & Products Setup
    // ----------------------------------------------------
    console.log('[Suite 1] Setting Up Test Accounts & Products...');

    // Clean up any stale test-owned orders from interrupted prior runs
    await Order.deleteMany({ orderNumber: { $regex: /^AUR-TEST/ } });

    const testUserA = await User.findOneAndUpdate(
      { email: 'userA_p62@aurevella.com' },
      {
        name: 'Customer A',
        email: 'userA_p62@aurevella.com',
        firebaseUid: 'fb-p62-userA-uid',
        role: 'customer',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const testUserB = await User.findOneAndUpdate(
      { email: 'userB_p62@aurevella.com' },
      {
        name: 'Customer B',
        email: 'userB_p62@aurevella.com',
        firebaseUid: 'fb-p62-userB-uid',
        role: 'customer',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const tokenA = jwt.sign(
      { id: testUserA._id.toString(), role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const tokenB = jwt.sign(
      { id: testUserB._id.toString(), role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const authHeadersA = {
      'Content-Type': 'application/json',
      'X-Aurevella-Request': '1',
      Cookie: `token=${tokenA}`,
      Origin: 'http://localhost:5173',
    };

    const authHeadersB = {
      'Content-Type': 'application/json',
      'X-Aurevella-Request': '1',
      Cookie: `token=${tokenB}`,
      Origin: 'http://localhost:5173',
    };

    // Primary test product
    const testProduct = await Product.findOneAndUpdate(
      { slug: 'phase62-test-heel' },
      {
        name: 'Phase 6.2 Velvet Heel',
        slug: 'phase62-test-heel',
        code: 'prod-p62-test',
        pricePaise: 350000, // ₹3,500
        category: new mongoose.Types.ObjectId(),
        description: 'Test footwear for payment integration',
        image: '/images/test-heel.jpg',
        stockQuantity: 10,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // Secondary test product for multi-item transaction tests
    const testProduct2 = await Product.findOneAndUpdate(
      { slug: 'phase62-test-sandal' },
      {
        name: 'Phase 6.2 Silk Sandal',
        slug: 'phase62-test-sandal',
        code: 'prod-p62-test-2',
        pricePaise: 320000,
        category: new mongoose.Types.ObjectId(),
        description: 'Secondary test product',
        image: '/images/test-sandal.jpg',
        stockQuantity: 10,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const createTestOrder = async (user, qty = 1, customOrderNumber = null) => {
      const orderNum =
        customOrderNumber ||
        `AUR-TEST-P62-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      return await Order.create({
        orderNumber: orderNum,
        user: user._id,
        items: [
          {
            product: testProduct._id,
            productCode: testProduct.code,
            name: testProduct.name,
            slug: testProduct.slug,
            image: testProduct.image,
            pricePaise: testProduct.pricePaise,
            quantity: qty,
            lineTotalPaise: testProduct.pricePaise * qty,
          },
        ],
        shippingAddress: {
          recipientName: 'Test Recipient',
          phone: '+91 9876543210',
          addressLine1: '404 Luxury Lane',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        itemsCount: qty,
        subtotalPaise: testProduct.pricePaise * qty,
        shippingFeePaise: 0,
        totalPaise: testProduct.pricePaise * qty,
        currency: 'INR',
        status: 'pending_payment',
        paymentDetails: {
          method: 'razorpay',
          inventoryDecremented: false,
          webhookEventIds: [],
        },
      });
    };

    // ----------------------------------------------------
    // Suite 2: Razorpay Configuration & Fail-Safe Checks
    // ----------------------------------------------------
    console.log('[Suite 2] Testing Configuration & Validation Safety...');

    // 2A: Missing environment variables fail safely
    const originalSecret = process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_KEY_SECRET;
    let missingConfigThrew = false;
    try {
      razorpayConfig.getRazorpayKeySecret();
    } catch (err) {
      missingConfigThrew = err.message.includes('RAZORPAY_KEY_SECRET is missing');
    }
    process.env.RAZORPAY_KEY_SECRET = originalSecret;

    record(
      'Config: Fails safely with clear message when credentials are missing',
      missingConfigThrew,
      'Threw safe configuration error without exposing values'
    );

    // 2B: Unauthenticated request rejected
    const unauthRes = await fetch(`${baseUrl}/api/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Aurevella-Request': '1',
      },
      body: JSON.stringify({ orderId: new mongoose.Types.ObjectId() }),
    });
    record(
      'Auth: Rejects unauthenticated payment initiation (401)',
      unauthRes.status === 401,
      `Status: ${unauthRes.status}`
    );

    // 2C: Invalid request body rejected via Zod
    const invalidBodyRes = await fetch(`${baseUrl}/api/payments/create-order`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({}),
    });
    record(
      'Validation: Rejects invalid request bodies missing orderId (400)',
      invalidBodyRes.status === 400,
      `Status: ${invalidBodyRes.status}`
    );

    // ----------------------------------------------------
    // Suite 3: Cross-User Authorization & Order Scoping
    // ----------------------------------------------------
    console.log('\n[Suite 3] Testing Cross-User Payment Isolation...');

    const orderUserA = await createTestOrder(testUserA, 1);

    const hijackRes = await fetch(`${baseUrl}/api/payments/create-order`, {
      method: 'POST',
      headers: authHeadersB,
      body: JSON.stringify({ orderId: orderUserA._id.toString() }),
    });
    record(
      'Security: Customer B cannot initiate payment for Customer A order (404 Not Found)',
      hijackRes.status === 404,
      `Status: ${hijackRes.status} (expected 404)`
    );

    // ----------------------------------------------------
    // Suite 4: Payment Order Creation & Idempotency
    // ----------------------------------------------------
    console.log('\n[Suite 4] Testing Payment Initiation & Idempotent Order Creation...');

    orderUserA.paymentDetails.razorpayOrderId = 'order_test_simulated_999';
    await orderUserA.save();

    const initRes = await fetch(`${baseUrl}/api/payments/create-order`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ orderId: orderUserA._id.toString() }),
    });
    const initData = await initRes.json();

    const isInitSuccessful =
      initRes.status === 200 &&
      initData.razorpayOrderId === 'order_test_simulated_999' &&
      initData.amountPaise === orderUserA.totalPaise &&
      initData.keyId === TEST_KEY_ID;

    record(
      'Payment Initiation: Returns correct server-calculated total and public keyId',
      isInitSuccessful,
      `Amount: ${initData.amountPaise} paise (₹3,500), razorpayOrderId: ${initData.razorpayOrderId}`
    );

    const repeatInitRes = await fetch(`${baseUrl}/api/payments/create-order`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ orderId: orderUserA._id.toString() }),
    });
    const repeatInitData = await repeatInitRes.json();
    record(
      'Idempotency: Repeated initiation returns existing Razorpay order ID without creating duplicate',
      repeatInitRes.status === 200 &&
        repeatInitData.razorpayOrderId === 'order_test_simulated_999',
      `Identical order ID preserved: ${repeatInitData.razorpayOrderId}`
    );

    // ----------------------------------------------------
    // Suite 5: Signature Verification & Payment ID Guards
    // ----------------------------------------------------
    console.log('\n[Suite 5] Testing Signature Verification & Payment ID Uniqueness...');

    const razorpayOrderId = 'order_test_simulated_999';
    const razorpayPaymentId = 'pay_test_payment_12345';

    const validSignature = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    // 5A: Tampered signature rejected
    const badSigRes = await fetch(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        orderId: orderUserA._id.toString(),
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: 'tampered_invalid_hex_signature_00000000000000000000000000000000',
      }),
    });
    record(
      'Verification: Rejects invalid or forged payment signature (400)',
      badSigRes.status === 400,
      `Status: ${badSigRes.status}`
    );

    // 5B: Mismatched Razorpay order ID rejected
    const mismatchedOrderRes = await fetch(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        orderId: orderUserA._id.toString(),
        razorpayOrderId: 'order_completely_different_id',
        razorpayPaymentId,
        razorpaySignature: validSignature,
      }),
    });
    record(
      'Verification: Rejects mismatched Razorpay order ID (400)',
      mismatchedOrderRes.status === 400,
      `Status: ${mismatchedOrderRes.status}`
    );

    // 5C: Valid signature accepted & transitions order to 'paid'
    const initialStock = (await Product.findById(testProduct._id)).stockQuantity;

    // Register offline mock payment response (status: 'captured')
    mockRazorpay.mockPayment(razorpayPaymentId, {
      id: razorpayPaymentId,
      order_id: razorpayOrderId,
      amount: orderUserA.totalPaise,
      currency: 'INR',
      status: 'captured',
    });

    const validVerifyRes = await fetch(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        orderId: orderUserA._id.toString(),
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
      }),
    });
    const validVerifyData = await validVerifyRes.json();

    const postVerifyStock = (await Product.findById(testProduct._id)).stockQuantity;
    const isOrderPaid =
      validVerifyRes.status === 200 &&
      validVerifyData.order?.status === 'paid' &&
      postVerifyStock === initialStock - 1;

    record(
      'Verification: Valid signature marks order "paid" and decrements stock atomically',
      isOrderPaid,
      `Status: ${validVerifyData.order?.status}, Stock: ${initialStock} -> ${postVerifyStock}`
    );

    // 5D: Repeated verification request is idempotent
    const repeatVerifyRes = await fetch(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        orderId: orderUserA._id.toString(),
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
      }),
    });
    const stockAfterRepeat = (await Product.findById(testProduct._id)).stockQuantity;

    record(
      'Idempotency: Repeated verification does NOT decrement inventory a second time',
      repeatVerifyRes.status === 200 && stockAfterRepeat === postVerifyStock,
      `Stock remained unchanged at ${stockAfterRepeat}`
    );

    // 5E: Duplicate payment ID reuse across different orders is rejected (Fix 2)
    const orderUserA_DuplicatePayment = await createTestOrder(testUserA, 1);
    orderUserA_DuplicatePayment.paymentDetails.razorpayOrderId = 'order_test_dup_pay_id';
    await orderUserA_DuplicatePayment.save();

    const dupSig = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`order_test_dup_pay_id|${razorpayPaymentId}`)
      .digest('hex');

    const duplicatePayRes = await fetch(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        orderId: orderUserA_DuplicatePayment._id.toString(),
        razorpayOrderId: 'order_test_dup_pay_id',
        razorpayPaymentId, // REUSING SAME PAYMENT ID ALREADY ATTACHED TO orderUserA!
        razorpaySignature: dupSig,
      }),
    });
    record(
      'Security: Rejects attaching already-used razorpayPaymentId to a different order (409)',
      duplicatePayRes.status === 409,
      `Status: ${duplicatePayRes.status} (Conflict blocked)`
    );

    // 5F: Uncaptured payment (status: 'authorized') rejected and inventory preserved
    const orderUncaptured = await createTestOrder(testUserA, 1);
    const rzpOrderUncaptured = `order_test_uncap_${Date.now()}`;
    const rzpPayUncaptured = `pay_test_uncap_${Date.now()}`;
    orderUncaptured.paymentDetails.razorpayOrderId = rzpOrderUncaptured;
    await orderUncaptured.save();

    const uncapSig = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${rzpOrderUncaptured}|${rzpPayUncaptured}`)
      .digest('hex');

    mockRazorpay.mockPayment(rzpPayUncaptured, {
      id: rzpPayUncaptured,
      order_id: rzpOrderUncaptured,
      amount: orderUncaptured.totalPaise,
      currency: 'INR',
      status: 'authorized', // Not captured!
    });

    const stockBeforeUncap = (await Product.findById(testProduct._id)).stockQuantity;
    const uncapRes = await fetch(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        orderId: orderUncaptured._id.toString(),
        razorpayOrderId: rzpOrderUncaptured,
        razorpayPaymentId: rzpPayUncaptured,
        razorpaySignature: uncapSig,
      }),
    });
    const uncapData = await uncapRes.json();
    const stockAfterUncap = (await Product.findById(testProduct._id)).stockQuantity;

    record(
      'Gateway Validation: Rejects uncaptured payment status (409 PAYMENT_NOT_CAPTURED)',
      uncapRes.status === 409 && uncapData.code === 'PAYMENT_NOT_CAPTURED' && stockAfterUncap === stockBeforeUncap,
      `Status: ${uncapRes.status}, Code: ${uncapData.code}, Stock unchanged: ${stockAfterUncap}`
    );

    // 5G: Gateway amount mismatch flags order for reconciliation without decrementing stock
    const orderMismatch = await createTestOrder(testUserA, 1);
    const rzpOrderMismatch = `order_test_mis_${Date.now()}`;
    const rzpPayMismatch = `pay_test_mis_${Date.now()}`;
    orderMismatch.paymentDetails.razorpayOrderId = rzpOrderMismatch;
    await orderMismatch.save();

    const mismatchSig = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${rzpOrderMismatch}|${rzpPayMismatch}`)
      .digest('hex');

    mockRazorpay.mockPayment(rzpPayMismatch, {
      id: rzpPayMismatch,
      order_id: rzpOrderMismatch,
      amount: orderMismatch.totalPaise + 50000, // ₹500 mismatch!
      currency: 'INR',
      status: 'captured',
    });

    const stockBeforeMismatch = (await Product.findById(testProduct._id)).stockQuantity;
    const mismatchRes = await fetch(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        orderId: orderMismatch._id.toString(),
        razorpayOrderId: rzpOrderMismatch,
        razorpayPaymentId: rzpPayMismatch,
        razorpaySignature: mismatchSig,
      }),
    });
    const mismatchData = await mismatchRes.json();
    const orderMismatchInDb = await Order.findById(orderMismatch._id);
    const stockAfterMismatch = (await Product.findById(testProduct._id)).stockQuantity;

    record(
      'Gateway Validation: Rejects amount mismatch and flags for atelier reconciliation (409)',
      mismatchRes.status === 409 &&
        mismatchData.code === 'PAYMENT_RECONCILIATION_NEEDED' &&
        orderMismatchInDb.status === 'payment_reconciliation_needed' &&
        stockAfterMismatch === stockBeforeMismatch,
      `Status: ${mismatchRes.status}, Order DB status: ${orderMismatchInDb.status}`
    );

    // 5H: Gateway unreachable/missing returns 502 without decrementing stock
    const orderGatewayErr = await createTestOrder(testUserA, 1);
    const rzpOrderGwErr = `order_test_gwerr_${Date.now()}`;
    const rzpPayGwErr = `pay_test_gwerr_${Date.now()}`;
    orderGatewayErr.paymentDetails.razorpayOrderId = rzpOrderGwErr;
    await orderGatewayErr.save();

    const gwErrSig = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${rzpOrderGwErr}|${rzpPayGwErr}`)
      .digest('hex');

    mockRazorpay.mockPayment(rzpPayGwErr, new Error('Simulated gateway timeout error'));

    const stockBeforeGwErr = (await Product.findById(testProduct._id)).stockQuantity;
    const gwErrRes = await fetch(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        orderId: orderGatewayErr._id.toString(),
        razorpayOrderId: rzpOrderGwErr,
        razorpayPaymentId: rzpPayGwErr,
        razorpaySignature: gwErrSig,
      }),
    });
    const gwErrData = await gwErrRes.json();
    const stockAfterGwErr = (await Product.findById(testProduct._id)).stockQuantity;

    record(
      'Gateway Validation: Gateway failure returns 502 GATEWAY_VERIFICATION_UNAVAILABLE',
      gwErrRes.status === 502 && gwErrData.code === 'GATEWAY_VERIFICATION_UNAVAILABLE' && stockAfterGwErr === stockBeforeGwErr,
      `Status: ${gwErrRes.status}, Code: ${gwErrData.code}, Stock unchanged: ${stockAfterGwErr}`
    );

    // ----------------------------------------------------
    // Suite 6: Webhook Processing & Strict Amount/Currency Validation
    // ----------------------------------------------------
    console.log('\n[Suite 6] Testing Webhook Validation, Amount/Currency & Raw Body...');

    const orderUserA2 = await createTestOrder(testUserA, 2);
    const webhookRzpOrderId = `order_webhook_test_${Date.now()}`;
    orderUserA2.paymentDetails.razorpayOrderId = webhookRzpOrderId;
    await orderUserA2.save();

    const webhookPayload = {
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: webhookRzpOrderId,
            amount: orderUserA2.totalPaise,
            currency: 'INR',
            status: 'paid',
          },
        },
        payment: {
          entity: {
            id: `pay_webhook_${Date.now()}`,
            order_id: webhookRzpOrderId,
            amount: orderUserA2.totalPaise,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    const webhookRawBody = JSON.stringify(webhookPayload);
    const validWebhookSignature = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(webhookRawBody)
      .digest('hex');

    // 6A: Reject invalid webhook signature
    const badWebhookRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'invalid_forged_webhook_signature',
      },
      body: webhookRawBody,
    });
    record(
      'Webhook: Rejects invalid or forged webhook HMAC signature (400)',
      badWebhookRes.status === 400,
      `Status: ${badWebhookRes.status}`
    );

    // 6B: Accept valid webhook signature and process payment
    const stockBeforeWebhook = (await Product.findById(testProduct._id)).stockQuantity;

    const goodWebhookRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validWebhookSignature,
        'x-razorpay-event-id': 'evt_test_unique_001',
      },
      body: webhookRawBody,
    });

    const orderAfterWebhook = await Order.findById(orderUserA2._id);
    const stockAfterWebhook = (await Product.findById(testProduct._id)).stockQuantity;
    const isWebhookProcessed =
      goodWebhookRes.status === 200 &&
      orderAfterWebhook.status === 'paid' &&
      stockAfterWebhook === stockBeforeWebhook - 2;

    record(
      'Webhook: Processes "order.paid" using raw request body HMAC and decrements stock',
      isWebhookProcessed,
      `Order status: ${orderAfterWebhook.status}, Stock: ${stockBeforeWebhook} -> ${stockAfterWebhook}`
    );

    // 6C: Duplicate webhook event does not decrement stock twice
    const dupWebhookRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': validWebhookSignature,
        'x-razorpay-event-id': 'evt_test_unique_001',
      },
      body: webhookRawBody,
    });

    const stockAfterDupWebhook = (await Product.findById(testProduct._id)).stockQuantity;
    record(
      'Webhook Deduplication: Duplicate webhook delivery does not decrement stock twice',
      dupWebhookRes.status === 200 && stockAfterDupWebhook === stockAfterWebhook,
      `Stock remained exactly: ${stockAfterDupWebhook}`
    );

    // 6D: Webhook Amount Mismatch Rejection (Fix 3)
    const orderUserA_AmountTest = await createTestOrder(testUserA, 1);
    const amountRzpOrderId = `order_amt_test_${Date.now()}`;
    orderUserA_AmountTest.paymentDetails.razorpayOrderId = amountRzpOrderId;
    await orderUserA_AmountTest.save();

    const tamperedAmountPayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_amt_tampered_${Date.now()}`,
            order_id: amountRzpOrderId,
            amount: 100, // TAMPERED! (₹1 instead of ₹3,500)
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    });

    const tamperedAmountSig = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(tamperedAmountPayload)
      .digest('hex');

    const amountMismatchRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': tamperedAmountSig,
      },
      body: tamperedAmountPayload,
    });

    const orderAfterAmountMismatch = await Order.findById(orderUserA_AmountTest._id);
    const isAmountMismatchFlagged =
      amountMismatchRes.status === 200 &&
      orderAfterAmountMismatch.status === 'payment_reconciliation_needed' &&
      orderAfterAmountMismatch.paymentDetails.failureReason === 'payment_amount_mismatch';

    record(
      'Webhook Validation: Amount mismatch flags "payment_reconciliation_needed" without marking paid',
      isAmountMismatchFlagged,
      `Status: ${orderAfterAmountMismatch.status}, Reason: ${orderAfterAmountMismatch.paymentDetails.failureReason}`
    );

    // 6E: Webhook Currency Mismatch Rejection (Fix 3)
    const orderUserA_CurrencyTest = await createTestOrder(testUserA, 1);
    const currencyRzpOrderId = `order_curr_test_${Date.now()}`;
    orderUserA_CurrencyTest.paymentDetails.razorpayOrderId = currencyRzpOrderId;
    await orderUserA_CurrencyTest.save();

    const tamperedCurrencyPayload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_curr_tampered_${Date.now()}`,
            order_id: currencyRzpOrderId,
            amount: orderUserA_CurrencyTest.totalPaise,
            currency: 'USD', // TAMPERED!
            status: 'captured',
          },
        },
      },
    });

    const tamperedCurrencySig = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(tamperedCurrencyPayload)
      .digest('hex');

    const currMismatchRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': tamperedCurrencySig,
      },
      body: tamperedCurrencyPayload,
    });

    const orderAfterCurrMismatch = await Order.findById(orderUserA_CurrencyTest._id);
    const isCurrencyMismatchFlagged =
      currMismatchRes.status === 200 &&
      orderAfterCurrMismatch.status === 'payment_reconciliation_needed' &&
      orderAfterCurrMismatch.paymentDetails.failureReason === 'payment_currency_mismatch';

    record(
      'Webhook Validation: Currency mismatch flags "payment_reconciliation_needed" without marking paid',
      isCurrencyMismatchFlagged,
      `Status: ${orderAfterCurrMismatch.status}, Reason: ${orderAfterCurrMismatch.paymentDetails.failureReason}`
    );

    // 6F: payment.failed cannot overwrite already-paid order
    const paidOrderToTestFailed = orderAfterWebhook; // Status: 'paid'
    const failedPayload = JSON.stringify({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            order_id: paidOrderToTestFailed.paymentDetails.razorpayOrderId,
            error_description: 'Customer bank declined',
          },
        },
      },
    });
    const failedSig = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(failedPayload)
      .digest('hex');

    await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': failedSig,
      },
      body: failedPayload,
    });

    const orderAfterFailedEvent = await Order.findById(paidOrderToTestFailed._id);
    record(
      'Webhook Safety: "payment.failed" event cannot overwrite an already-paid order',
      orderAfterFailedEvent.status === 'paid',
      `Order status remained: ${orderAfterFailedEvent.status}`
    );

    // ----------------------------------------------------
    // Suite 6.2 Remediation: Comprehensive Webhook Amount & Currency Validation
    // ----------------------------------------------------
    console.log('\n[Suite 6.2 Remediation] Testing Strict Webhook Amount, Currency & Entity Validation...');

    // Helper to send signed webhook payload
    const sendSignedWebhook = async (payloadObj, extraHeaders = {}) => {
      const body = JSON.stringify(payloadObj);
      const signature = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      return fetch(`${baseUrl}/api/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signature,
          ...extraHeaders,
        },
        body,
      });
    };

    // 6G1: Null amount rejection
    const orderNullAmt = await createTestOrder(testUserA, 1);
    const rzpNullAmt = `order_null_amt_${Date.now()}`;
    orderNullAmt.paymentDetails.razorpayOrderId = rzpNullAmt;
    await orderNullAmt.save();

    await sendSignedWebhook({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_null_amt_${Date.now()}`,
            order_id: rzpNullAmt,
            amount: null,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    });
    const orderAfterNullAmt = await Order.findById(orderNullAmt._id);
    record(
      'Webhook Validation: Null amount flags "payment_reconciliation_needed"',
      orderAfterNullAmt.status === 'payment_reconciliation_needed' &&
        orderAfterNullAmt.paymentDetails.failureReason === 'payment_amount_mismatch',
      `Status: ${orderAfterNullAmt.status}`
    );

    // 6G2: String amount rejection
    const orderStrAmt = await createTestOrder(testUserA, 1);
    const rzpStrAmt = `order_str_amt_${Date.now()}`;
    orderStrAmt.paymentDetails.razorpayOrderId = rzpStrAmt;
    await orderStrAmt.save();

    await sendSignedWebhook({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_str_amt_${Date.now()}`,
            order_id: rzpStrAmt,
            amount: `${orderStrAmt.totalPaise}`, // String type
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    });
    const orderAfterStrAmt = await Order.findById(orderStrAmt._id);
    record(
      'Webhook Validation: String amount flags "payment_reconciliation_needed"',
      orderAfterStrAmt.status === 'payment_reconciliation_needed' &&
        orderAfterStrAmt.paymentDetails.failureReason === 'payment_amount_mismatch',
      `Status: ${orderAfterStrAmt.status}`
    );

    // 6G3: Missing / non-finite amount rejection
    const orderMissingAmt = await createTestOrder(testUserA, 1);
    const rzpMissingAmt = `order_missing_amt_${Date.now()}`;
    orderMissingAmt.paymentDetails.razorpayOrderId = rzpMissingAmt;
    await orderMissingAmt.save();

    await sendSignedWebhook({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_missing_amt_${Date.now()}`,
            order_id: rzpMissingAmt,
            // amount field omitted (undefined)
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    });
    const orderAfterMissingAmt = await Order.findById(orderMissingAmt._id);
    record(
      'Webhook Validation: Missing amount flags "payment_reconciliation_needed"',
      orderAfterMissingAmt.status === 'payment_reconciliation_needed' &&
        orderAfterMissingAmt.paymentDetails.failureReason === 'payment_amount_mismatch',
      `Status: ${orderAfterMissingAmt.status}`
    );

    // 6G4: Null currency rejection
    const orderNullCurr = await createTestOrder(testUserA, 1);
    const rzpNullCurr = `order_null_curr_${Date.now()}`;
    orderNullCurr.paymentDetails.razorpayOrderId = rzpNullCurr;
    await orderNullCurr.save();

    await sendSignedWebhook({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_null_curr_${Date.now()}`,
            order_id: rzpNullCurr,
            amount: orderNullCurr.totalPaise,
            currency: null,
            status: 'captured',
          },
        },
      },
    });
    const orderAfterNullCurr = await Order.findById(orderNullCurr._id);
    record(
      'Webhook Validation: Null currency flags "payment_reconciliation_needed"',
      orderAfterNullCurr.status === 'payment_reconciliation_needed' &&
        orderAfterNullCurr.paymentDetails.failureReason === 'payment_currency_mismatch',
      `Status: ${orderAfterNullCurr.status}`
    );

    // 6G5: Empty / whitespace currency rejection
    const orderEmptyCurr = await createTestOrder(testUserA, 1);
    const rzpEmptyCurr = `order_empty_curr_${Date.now()}`;
    orderEmptyCurr.paymentDetails.razorpayOrderId = rzpEmptyCurr;
    await orderEmptyCurr.save();

    await sendSignedWebhook({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_empty_curr_${Date.now()}`,
            order_id: rzpEmptyCurr,
            amount: orderEmptyCurr.totalPaise,
            currency: '   ',
            status: 'captured',
          },
        },
      },
    });
    const orderAfterEmptyCurr = await Order.findById(orderEmptyCurr._id);
    record(
      'Webhook Validation: Empty currency flags "payment_reconciliation_needed"',
      orderAfterEmptyCurr.status === 'payment_reconciliation_needed' &&
        orderAfterEmptyCurr.paymentDetails.failureReason === 'payment_currency_mismatch',
      `Status: ${orderAfterEmptyCurr.status}`
    );

    // 6G6: "order.paid" event without payment entity is safely flagged for reconciliation (Phase 7 Audit Fix)
    const orderPaidOnly = await createTestOrder(testUserA, 1);
    const rzpOrderPaidOnlyId = `order_paid_only_${Date.now()}`;
    orderPaidOnly.paymentDetails.razorpayOrderId = rzpOrderPaidOnlyId;
    await orderPaidOnly.save();

    const stockBeforeOrderPaidOnly = (await Product.findById(testProduct._id)).stockQuantity;

    const orderPaidOnlyRes = await sendSignedWebhook({
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: rzpOrderPaidOnlyId,
            amount: orderPaidOnly.totalPaise,
            amount_paid: orderPaidOnly.totalPaise,
            currency: 'INR',
            status: 'paid',
          },
        },
        // payment entity is omitted entirely
      },
    });

    const orderAfterPaidOnly = await Order.findById(orderPaidOnly._id);
    const stockAfterOrderPaidOnly = (await Product.findById(testProduct._id)).stockQuantity;
    const isOrderPaidOnlySafe =
      orderPaidOnlyRes.status === 200 &&
      orderAfterPaidOnly.status === 'payment_reconciliation_needed' &&
      orderAfterPaidOnly.paymentDetails.failureReason === 'insufficient_payment_evidence' &&
      orderAfterPaidOnly.paymentDetails.inventoryDecremented === false &&
      stockAfterOrderPaidOnly === stockBeforeOrderPaidOnly;

    record(
      'Webhook: "order.paid" without payment entity is safely flagged for reconciliation (Phase 7 Audit Fix)',
      isOrderPaidOnlySafe,
      `Status: ${orderAfterPaidOnly.status}, Reason: ${orderAfterPaidOnly.paymentDetails.failureReason}, Stock preserved: ${stockAfterOrderPaidOnly}`
    );

    // 6G7: "order.paid" without payment entity and without valid order.entity details flags reconciliation
    const orderMissingBoth = await createTestOrder(testUserA, 1);
    const rzpMissingBoth = `order_missing_both_${Date.now()}`;
    orderMissingBoth.paymentDetails.razorpayOrderId = rzpMissingBoth;
    await orderMissingBoth.save();

    const missingBothRes = await sendSignedWebhook({
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: rzpMissingBoth,
            // amount_paid and currency are missing from order.entity!
          },
        },
        // payment entity is omitted entirely
      },
    });

    const orderAfterMissingBoth = await Order.findById(orderMissingBoth._id);
    record(
      'Webhook Safety: Missing payment entity flags "payment_reconciliation_needed" with insufficient_payment_evidence',
      missingBothRes.status === 200 &&
        orderAfterMissingBoth.status === 'payment_reconciliation_needed' &&
        orderAfterMissingBoth.paymentDetails.failureReason === 'insufficient_payment_evidence',
      `Status: ${orderAfterMissingBoth.status}, Reason: ${orderAfterMissingBoth.paymentDetails.failureReason}`
    );

    // 6G8: Idempotency & non-downgrade: Delayed malformed webhook on already-paid order preserves 'paid' status
    const paidOrderForDowngrade = await createTestOrder(testUserA, 1);
    const rzpPaidDowngradeId = `order_paid_dw_${Date.now()}`;
    const rzpPaymentDowngradeId = `pay_dw_${Date.now()}`;
    paidOrderForDowngrade.paymentDetails.razorpayOrderId = rzpPaidDowngradeId;
    await paidOrderForDowngrade.save();

    // Mark it paid via valid webhook first
    await sendSignedWebhook({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: rzpPaymentDowngradeId,
            order_id: rzpPaidDowngradeId,
            amount: paidOrderForDowngrade.totalPaise,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    });

    const delayedMalformedRes = await sendSignedWebhook({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_delayed_malformed_${Date.now()}`,
            order_id: rzpPaidDowngradeId, // Already paid!
            amount: 99999999, // Tampered amount
            currency: 'EUR', // Tampered currency
            status: 'captured',
          },
        },
      },
    });

    const orderAfterDelayed = await Order.findById(paidOrderForDowngrade._id);
    record(
      'Webhook Idempotency: Delayed malformed webhook on already-paid order cannot downgrade status',
      delayedMalformedRes.status === 200 && orderAfterDelayed.status === 'paid',
      `Status remained: ${orderAfterDelayed.status}`
    );

    // ----------------------------------------------------
    // Suite 7: Transaction Rollback Atomicity on Multi-Item Failure
    // ----------------------------------------------------
    console.log('\n[Suite 7] Testing Mongoose Transaction Rollback on Partial Item Depletion...');

    // Product 1 has stock = 5, Product 2 has stock = 0
    await Product.updateOne({ _id: testProduct._id }, { $set: { stockQuantity: 5 } });
    await Product.updateOne({ _id: testProduct2._id }, { $set: { stockQuantity: 0 } });

    // Create an order containing BOTH products (item 1 available, item 2 unavailable)
    const multiItemOrder = await Order.create({
      orderNumber: `AUR-TX-ROLLBACK-${Date.now()}`,
      user: testUserA._id,
      items: [
        {
          product: testProduct._id,
          productCode: testProduct.code,
          name: testProduct.name,
          slug: testProduct.slug,
          image: testProduct.image,
          pricePaise: testProduct.pricePaise,
          quantity: 2,
          lineTotalPaise: testProduct.pricePaise * 2,
        },
        {
          product: testProduct2._id,
          productCode: testProduct2.code,
          name: testProduct2.name,
          slug: testProduct2.slug,
          image: testProduct2.image,
          pricePaise: testProduct2.pricePaise,
          quantity: 1, // OUT OF STOCK!
          lineTotalPaise: testProduct2.pricePaise,
        },
      ],
      shippingAddress: {
        recipientName: 'Test Recipient',
        phone: '+91 9876543210',
        addressLine1: '404 Luxury Lane',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      itemsCount: 3,
      subtotalPaise: testProduct.pricePaise * 2 + testProduct2.pricePaise,
      shippingFeePaise: 0,
      totalPaise: testProduct.pricePaise * 2 + testProduct2.pricePaise,
      currency: 'INR',
      status: 'pending_payment',
      paymentDetails: {
        method: 'razorpay',
        razorpayOrderId: `order_tx_rollback_${Date.now()}`,
        inventoryDecremented: false,
        webhookEventIds: [],
      },
    });

    const stockP1Before = (await Product.findById(testProduct._id)).stockQuantity;

    // Process payment - Item 2 fails due to 0 stock
    let txReconciliationCaught = false;
    try {
      await processPaymentSuccessAndDeductInventory({
        orderId: multiItemOrder._id,
        razorpayPaymentId: `pay_tx_test_${Date.now()}`,
      });
    } catch (err) {
      txReconciliationCaught = err.name === 'InventoryReconciliationError';
    }

    const stockP1After = (await Product.findById(testProduct._id)).stockQuantity;
    const isZeroPartialDeduction = stockP1After === stockP1Before; // Item 1 was NOT decremented!

    record(
      'Transaction Atomicity: Partial item failure rolls back all item deductions (0 partial commit)',
      txReconciliationCaught && isZeroPartialDeduction,
      `P1 stock: ${stockP1Before} -> ${stockP1After} (No partial deduction), reconciliation caught: ${txReconciliationCaught}`
    );

    // ----------------------------------------------------
    // Suite 8: Concurrency Contention for Final Unit of Stock
    // ----------------------------------------------------
    console.log('\n[Suite 8] Testing Concurrency Contention on Final Stock Unit...');

    // Set stock to exactly 1
    await Product.updateOne({ _id: testProduct._id }, { $set: { stockQuantity: 1 } });

    // Order 1 for 1 unit, Order 2 for 1 unit
    const orderFinal1 = await createTestOrder(testUserA, 1);
    const orderFinal2 = await createTestOrder(testUserB, 1);

    orderFinal1.paymentDetails.razorpayOrderId = `order_final_1_${Date.now()}`;
    orderFinal2.paymentDetails.razorpayOrderId = `order_final_2_${Date.now()}`;
    await orderFinal1.save();
    await orderFinal2.save();

    const payIdFinal1 = `pay_final_1_${Date.now()}`;
    const payIdFinal2 = `pay_final_2_${Date.now()}`;

    const sigFinal1 = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${orderFinal1.paymentDetails.razorpayOrderId}|${payIdFinal1}`)
      .digest('hex');

    const sigFinal2 = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${orderFinal2.paymentDetails.razorpayOrderId}|${payIdFinal2}`)
      .digest('hex');

    // Register offline mock payments for contention orders
    mockRazorpay.mockPayment(payIdFinal1, {
      id: payIdFinal1,
      order_id: orderFinal1.paymentDetails.razorpayOrderId,
      amount: orderFinal1.totalPaise,
      currency: 'INR',
      status: 'captured',
    });
    mockRazorpay.mockPayment(payIdFinal2, {
      id: payIdFinal2,
      order_id: orderFinal2.paymentDetails.razorpayOrderId,
      amount: orderFinal2.totalPaise,
      currency: 'INR',
      status: 'captured',
    });

    // Fire verification concurrently for both orders competing for the same single unit
    const [compRes1, compRes2] = await Promise.all([
      fetch(`${baseUrl}/api/payments/verify`, {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({
          orderId: orderFinal1._id.toString(),
          razorpayOrderId: orderFinal1.paymentDetails.razorpayOrderId,
          razorpayPaymentId: payIdFinal1,
          razorpaySignature: sigFinal1,
        }),
      }),
      fetch(`${baseUrl}/api/payments/verify`, {
        method: 'POST',
        headers: authHeadersB,
        body: JSON.stringify({
          orderId: orderFinal2._id.toString(),
          razorpayOrderId: orderFinal2.paymentDetails.razorpayOrderId,
          razorpayPaymentId: payIdFinal2,
          razorpaySignature: sigFinal2,
        }),
      }),
    ]);

    const finalProductInDb = await Product.findById(testProduct._id);
    const statusCodes = [compRes1.status, compRes2.status].sort();

    // Exactly one must succeed (200) and one must be flagged for reconciliation (409)
    const isOneSuccessOneReconciled = statusCodes[0] === 200 && statusCodes[1] === 409;
    const isStockNeverNegative = finalProductInDb.stockQuantity === 0;

    record(
      'Contention: Two orders competing for final unit never oversell; exactly 1 succeeds, 1 reconciled',
      isOneSuccessOneReconciled && isStockNeverNegative,
      `Responses: ${statusCodes.join(', ')}, Final stock: ${finalProductInDb.stockQuantity} (never negative)`
    );

    // ----------------------------------------------------
    // Suite 8: Concurrency & Payment Hardening (Phase 8.6)
    // ----------------------------------------------------
    console.log('\n[Suite 8] Testing Concurrency, Duplicate Webhook/Verify Deduplication & Production Guards...');

    // 8A: Concurrent Verification and Webhook on the Same Order (Never Double Decrement)
    await Product.updateOne({ _id: testProduct._id }, { $set: { stockQuantity: 10 } });
    const orderConcurrent = await createTestOrder(testUserA, 2); // 2 units
    const rzpOrderConcurrent = `order_test_conc_${Date.now()}`;
    const rzpPayConcurrent = `pay_test_conc_${Date.now()}`;
    orderConcurrent.paymentDetails.razorpayOrderId = rzpOrderConcurrent;
    await orderConcurrent.save();

    const sigConcurrent = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${rzpOrderConcurrent}|${rzpPayConcurrent}`)
      .digest('hex');

    mockRazorpay.mockPayment(rzpPayConcurrent, {
      id: rzpPayConcurrent,
      order_id: rzpOrderConcurrent,
      amount: orderConcurrent.totalPaise,
      currency: 'INR',
      status: 'captured',
    });

    const stockBeforeConcurrent = (await Product.findById(testProduct._id)).stockQuantity; // 10

    // Fire client verify and webhook simultaneously for the exact same order
    const [clientVerifyRes, webhookRes] = await Promise.all([
      fetch(`${baseUrl}/api/payments/verify`, {
        method: 'POST',
        headers: authHeadersA,
        body: JSON.stringify({
          orderId: orderConcurrent._id.toString(),
          razorpayOrderId: rzpOrderConcurrent,
          razorpayPaymentId: rzpPayConcurrent,
          razorpaySignature: sigConcurrent,
        }),
      }),
      sendSignedWebhook({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: rzpPayConcurrent,
              order_id: rzpOrderConcurrent,
              amount: orderConcurrent.totalPaise,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      }),
    ]);

    const stockAfterConcurrent = (await Product.findById(testProduct._id)).stockQuantity;
    const orderAfterConcurrent = await Order.findById(orderConcurrent._id);

    // Stock must be decremented by exactly 2 (from 10 to 8), NEVER by 4!
    const isDecrementedExactlyOnce = stockAfterConcurrent === stockBeforeConcurrent - 2;
    const isBothSuccessful = clientVerifyRes.status === 200 && webhookRes.status === 200;
    const isOrderFinalPaid =
      orderAfterConcurrent.status === 'paid' &&
      orderAfterConcurrent.paymentDetails?.inventoryDecremented === true;

    record(
      'Concurrency: Simultaneous verify & webhook on same order decrements stock exactly once (0 double decrement)',
      isBothSuccessful && isDecrementedExactlyOnce && isOrderFinalPaid,
      `Responses: verify ${clientVerifyRes.status}, webhook ${webhookRes.status}, Stock: ${stockBeforeConcurrent} -> ${stockAfterConcurrent} (-2), Status: ${orderAfterConcurrent.status}`
    );

    // 8B: Production Guard: Fallback rejected when NODE_ENV === 'production'
    const orderProdGuard = await createTestOrder(testUserA, 1);
    const originalEnv = process.env.NODE_ENV;
    let prodFallbackThrew = false;
    let prodFallbackErrMsg = '';

    try {
      process.env.NODE_ENV = 'production';
      await processPaymentSuccessAndDeductInventory({
        orderId: orderProdGuard._id,
        razorpayPaymentId: `pay_prod_guard_${Date.now()}`,
      });
    } catch (err) {
      if (err.message.includes('[SECURITY FATAL]') && err.message.includes('production environment')) {
        prodFallbackThrew = true;
        prodFallbackErrMsg = err.message;
      }
    } finally {
      process.env.NODE_ENV = originalEnv;
    }

    const orderAfterProdGuard = await Order.findById(orderProdGuard._id);
    const isStockUntouchedProd =
      (await Product.findById(testProduct._id)).stockQuantity === stockAfterConcurrent;

    record(
      'Production Guard: Standalone fallback fails closed when NODE_ENV === "production"',
      prodFallbackThrew && isStockUntouchedProd && orderAfterProdGuard.status === 'pending_payment',
      `Error: ${prodFallbackErrMsg.substring(0, 80)}..., Stock preserved: ${isStockUntouchedProd}`
    );

    // 8C: Multi-Item Atomicity: Depleted item in multi-item order triggers compensation and 0 inventory lost
    await Product.updateOne({ _id: testProduct._id }, { $set: { stockQuantity: 5 } });
    await Product.updateOne({ _id: testProduct2._id }, { $set: { stockQuantity: 0 } }); // Out of stock!

    const orderMultiDepleted = await Order.create({
      orderNumber: `AUR-TEST-P62-MULTI-${Date.now().toString(36).toUpperCase()}`,
      user: testUserA._id,
      items: [
        {
          product: testProduct._id,
          productCode: testProduct.code,
          name: testProduct.name,
          slug: testProduct.slug,
          image: testProduct.image,
          pricePaise: testProduct.pricePaise,
          quantity: 2, // Available (5)
          lineTotalPaise: testProduct.pricePaise * 2,
        },
        {
          product: testProduct2._id,
          productCode: testProduct2.code,
          name: testProduct2.name,
          slug: testProduct2.slug,
          image: testProduct2.image,
          pricePaise: testProduct2.pricePaise,
          quantity: 1, // Depleted (0)
          lineTotalPaise: testProduct2.pricePaise,
        },
      ],
      itemsCount: 3,
      subtotalPaise: testProduct.pricePaise * 2 + testProduct2.pricePaise,
      shippingFeePaise: 0,
      totalPaise: testProduct.pricePaise * 2 + testProduct2.pricePaise,
      currency: 'INR',
      status: 'pending_payment',
      shippingAddress: {
        recipientName: 'Test Recipient A',
        phone: '+91 9876543210',
        addressLine1: '123 Heritage Lane',
        city: 'Jaipur',
        state: 'Rajasthan',
        postalCode: '302001',
        country: 'India',
      },
      paymentDetails: {
        method: 'razorpay',
        razorpayOrderId: `order_multi_dep_${Date.now()}`,
        inventoryDecremented: false,
        webhookEventIds: [],
      },
    });

    let multiDepletionThrew = false;
    try {
      await processPaymentSuccessAndDeductInventory({
        orderId: orderMultiDepleted._id,
        razorpayPaymentId: `pay_multi_dep_${Date.now()}`,
      });
    } catch (err) {
      multiDepletionThrew = err.name === 'InventoryReconciliationError';
    }

    const testProdStockAfterMulti = (await Product.findById(testProduct._id)).stockQuantity;
    const testProd2StockAfterMulti = (await Product.findById(testProduct2._id)).stockQuantity;
    const orderAfterMulti = await Order.findById(orderMultiDepleted._id);

    const isStock1Preserved = testProdStockAfterMulti === 5;
    const isStock2Preserved = testProd2StockAfterMulti === 0;
    const isMultiOrderReconciled =
      orderAfterMulti.status === 'payment_reconciliation_needed' &&
      orderAfterMulti.paymentDetails?.inventoryDecremented === false;

    record(
      'Multi-Item Atomicity: Out-of-stock item triggers clean compensation; 0 partial stock deducted',
      multiDepletionThrew && isStock1Preserved && isStock2Preserved && isMultiOrderReconciled,
      `Item 1 stock: 5 -> ${testProdStockAfterMulti}, Item 2 stock: 0 -> ${testProd2StockAfterMulti}, Status: ${orderAfterMulti.status}`
    );

    // ----------------------------------------------------
    // Cleanup Test Data
    // ----------------------------------------------------
    await Order.deleteMany({ orderNumber: { $regex: /^AUR-TEST/ } });
    await Product.deleteMany({ slug: { $in: ['phase62-test-heel', 'phase62-test-sandal'] } });
    await User.deleteMany({
      email: { $in: ['userA_p62@aurevella.com', 'userB_p62@aurevella.com'] },
    });

    // Print summary results table
    console.log('\n====================================================');
    console.log('              PHASE 6.2 TEST RESULTS MATRIX         ');
    console.log('====================================================\n');
    console.table(results);

    if (allPassed) {
      console.log('✔ ALL PHASE 6.2 TESTS PASSED WITH 100% SUCCESS!\n');
    } else {
      console.error('❌ SOME PHASE 6.2 TESTS FAILED. See details above.\n');
    }
  } finally {
    razorpayConfig.resetCustomRazorpayInstance();
    server.close();
    await mongoose.disconnect();
    console.log('[Teardown] Ephemeral server and MongoDB connection closed cleanly.\n');
  }

  if (!allPassed) {
    process.exit(1);
  }
}

runPhase6_2TestSuite().catch((err) => {
  console.error('[Fatal Test Error]:', err);
  process.exit(1);
});
