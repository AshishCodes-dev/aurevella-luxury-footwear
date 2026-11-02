import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { connectTestDB } from '../src/config/db.js';
import {
  createMockRazorpay,
  setCustomRazorpayInstance,
  resetCustomRazorpayInstance,
} from '../src/config/razorpay.js';
import {
  processPaymentSuccessAndDeductInventory,
  recoverStuckProcessingOrder,
} from '../src/services/paymentInventory.service.js';
import {
  isAddressSnapshotEquivalent,
  normalizeAddressField,
  normalizePhoneNumber,
} from '../src/controllers/order.controller.js';
import { isValidTrustProxyConfig, runCheckEnv } from './checkEnv.js';
import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import Order from '../src/models/Order.js';

async function runPaymentConcurrencyAndRecoveryTests() {
  console.log('================================================================');
  console.log('   AUREVELLA — Payment Concurrency & Reliability Test Suite    ');
  console.log('================================================================\n');

  await connectTestDB();

  const results = [];
  let allPassed = true;

  const record = (name, passed, detail = '') => {
    if (!passed) allPassed = false;
    results.push({
      Test: name,
      Status: passed ? 'PASS' : 'FAIL',
      Detail: detail,
    });
    console.log(`${passed ? '✔ [PASS]' : '✖ [FAIL]'} ${name} ${detail ? '(' + detail + ')' : ''}`);
  };

  // Start ephemeral test server
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const mockRazorpay = createMockRazorpay();
  setCustomRazorpayInstance(mockRazorpay);

  let testUser;
  let authToken;

  try {
    // Setup isolated test user & credentials
    await Order.deleteMany({ orderNumber: { $regex: /^AUR-20261102-/ } });
    await User.deleteMany({ email: 'payment-test@myaurevella.in' });
    testUser = await User.create({
      name: 'Payment Test Customer',
      email: 'payment-test@myaurevella.in',
      firebaseUid: 'uid-payment-test-001',
      providers: ['password'],
      emailVerified: true,
      role: 'customer',
      isActive: true,
    });

    const jwtSecret = process.env.JWT_SECRET || 'test_jwt_secret_must_be_thirty_two_chars_long!';
    authToken = jwt.sign({ id: testUser._id.toString(), role: testUser.role }, jwtSecret, {
      expiresIn: '1h',
    });

    const authHeaders = {
      'Content-Type': 'application/json',
      'X-Aurevella-Request': '1',
      Authorization: `Bearer ${authToken}`,
    };

    // Setup isolated test category & products
    const testCategory = await Category.findOneAndUpdate(
      { slug: 'test-heels' },
      { name: 'Test Heels', slug: 'test-heels', description: 'Test Category' },
      { upsert: true, new: true }
    );

    await Product.deleteMany({ slug: { $in: ['test-conc-heel', 'test-stuck-heel'] } });
    const productA = await Product.create({
      name: 'Stiletto Test Heel',
      slug: 'test-conc-heel',
      code: 'AUR-TST-01',
      pricePaise: 2500000,
      stockQuantity: 50,
      category: testCategory._id,
      description: 'Luxury handcrafted stiletto test heel.',
      heelHeight: '100mm',
      image: 'https://myaurevella.in/test.jpg',
      images: ['https://myaurevella.in/test.jpg'],
      isActive: true,
    });

    const productB = await Product.create({
      name: 'Ankle Strap Test Heel',
      slug: 'test-stuck-heel',
      code: 'AUR-TST-02',
      pricePaise: 3200000,
      stockQuantity: 10,
      category: testCategory._id,
      description: 'Luxury handcrafted ankle strap test heel.',
      heelHeight: '85mm',
      image: 'https://myaurevella.in/test2.jpg',
      images: ['https://myaurevella.in/test2.jpg'],
      isActive: true,
    });

    const baseAddress = {
      recipientName: 'Aurevella VIP Customer',
      phone: '+91 98765 43210',
      addressLine1: '42 Heritage Boulevard',
      addressLine2: 'Penthouse 9B',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    };

    // =========================================================================
    // SECTION 2: PAYMENT CREATION CONCURRENCY TESTS
    // =========================================================================
    console.log('\n--- Section 2: Razorpay Payment Creation Concurrency ---');

    // Test 2.1: Concurrent createPaymentOrder calls (5 simultaneous requests)
    const order1 = await Order.create({
      orderNumber: 'AUR-20261102-CON1',
      user: testUser._id,
      items: [
        {
          product: productA._id,
          productCode: productA.code,
          name: productA.name,
          slug: productA.slug,
          image: productA.images[0],
          pricePaise: productA.pricePaise,
          quantity: 1,
          lineTotalPaise: productA.pricePaise,
          size: 'IT 38',
        },
      ],
      shippingAddress: baseAddress,
      itemsCount: 1,
      subtotalPaise: 2500000,
      shippingFeePaise: 0,
      totalPaise: 2500000,
      currency: 'INR',
      status: 'pending_payment',
    });

    let gatewayCreateCount = 0;
    mockRazorpay.reset();
    mockRazorpay.mockDefaultOrder(async (params) => {
      gatewayCreateCount++;
      // Simulate real gateway latency
      await new Promise((r) => setTimeout(r, 60));
      return {
        id: `order_rzp_mock_${Date.now()}`,
        amount: params.amount,
        currency: params.currency,
        status: 'created',
      };
    });

    // Fire 5 simultaneous requests for the exact same order
    const concurrentRequests = Array.from({ length: 5 }, () =>
      fetch(`${baseUrl}/api/payments/create-order`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ orderId: order1._id.toString() }),
      }).then((r) => r.json())
    );

    const concurrentResponses = await Promise.all(concurrentRequests);

    const allSuccessful = concurrentResponses.every((r) => r.status === 'success');
    const firstOrderId = concurrentResponses[0]?.razorpayOrderId;
    const allSameGatewayOrder = concurrentResponses.every(
      (r) => r.razorpayOrderId === firstOrderId && firstOrderId
    );

    record(
      'Payment Creation Concurrency: 5 simultaneous requests all succeed with identical razorpayOrderId',
      allSuccessful && allSameGatewayOrder,
      `gatewayCreateCount=${gatewayCreateCount}, returnedId=${firstOrderId}`
    );

    record(
      'Payment Creation Concurrency: Exactly 1 gateway order created despite 5 concurrent requests',
      gatewayCreateCount === 1,
      `gateway orders created: ${gatewayCreateCount}`
    );

    // Test 2.2: Reused payment order on subsequent call returns 200 with same razorpayOrderId
    const repeatRes = await fetch(`${baseUrl}/api/payments/create-order`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ orderId: order1._id.toString() }),
    });
    const repeatData = await repeatRes.json();
    record(
      'Payment Creation Idempotency: Subsequent request reuses existing razorpayOrderId with 0 gateway calls',
      repeatRes.status === 200 && repeatData.razorpayOrderId === firstOrderId && gatewayCreateCount === 1,
      `status: ${repeatRes.status}, id: ${repeatData.razorpayOrderId}`
    );

    // Test 2.3: In-flight contention returns 409 PAYMENT_CREATION_IN_PROGRESS when lock held
    const order2 = await Order.create({
      orderNumber: 'AUR-20261102-LCK1',
      user: testUser._id,
      items: [
        {
          product: productA._id,
          productCode: productA.code,
          name: productA.name,
          slug: productA.slug,
          image: productA.images[0],
          pricePaise: productA.pricePaise,
          quantity: 1,
          lineTotalPaise: productA.pricePaise,
        },
      ],
      shippingAddress: baseAddress,
      itemsCount: 1,
      subtotalPaise: 2500000,
      totalPaise: 2500000,
      currency: 'INR',
      status: 'pending_payment',
      paymentDetails: {
        paymentCreationClaimedAt: new Date(), // Active fresh lock
      },
    });

    const contentionRes = await fetch(`${baseUrl}/api/payments/create-order`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ orderId: order2._id.toString() }),
    });
    const contentionData = await contentionRes.json();
    record(
      'Payment Creation Contention: Returns 409 Conflict with code PAYMENT_CREATION_IN_PROGRESS during lock contention',
      contentionRes.status === 409 && contentionData.code === 'PAYMENT_CREATION_IN_PROGRESS',
      `status: ${contentionRes.status}, code: ${contentionData.code}`
    );

    // Test 2.4: Gateway error clears lease immediately for rapid retry
    const order3 = await Order.create({
      orderNumber: 'AUR-20261102-ERR1',
      user: testUser._id,
      items: [
        {
          product: productA._id,
          productCode: productA.code,
          name: productA.name,
          slug: productA.slug,
          image: productA.images[0],
          pricePaise: productA.pricePaise,
          quantity: 1,
          lineTotalPaise: productA.pricePaise,
        },
      ],
      shippingAddress: baseAddress,
      itemsCount: 1,
      subtotalPaise: 2500000,
      totalPaise: 2500000,
      currency: 'INR',
      status: 'pending_payment',
    });

    mockRazorpay.reset();
    mockRazorpay.mockDefaultOrder(() => {
      throw new Error('Gateway simulated network timeout');
    });

    const errorRes = await fetch(`${baseUrl}/api/payments/create-order`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ orderId: order3._id.toString() }),
    });

    const refreshedOrder3 = await Order.findById(order3._id);
    const lockCleared = !refreshedOrder3.paymentDetails?.paymentCreationClaimedAt;

    record(
      'Payment Creation Resilience: Failed gateway call releases lock immediately',
      errorRes.status === 500 && lockCleared,
      `status: ${errorRes.status}, lockCleared: ${lockCleared}`
    );

    // =========================================================================
    // SECTION 3: STUCK PROCESSING RECOVERY TESTS
    // =========================================================================
    console.log('\n--- Section 3: Razorpay Stuck Processing Recovery ---');

    // Test 3.1: Active claim protection (claim age < maxClaimAgeMs is not disrupted)
    const orderStuckActive = await Order.create({
      orderNumber: 'AUR-20261102-STK1',
      user: testUser._id,
      items: [
        {
          product: productB._id,
          productCode: productB.code,
          name: productB.name,
          slug: productB.slug,
          image: productB.images[0],
          pricePaise: productB.pricePaise,
          quantity: 1,
          lineTotalPaise: productB.pricePaise,
        },
      ],
      shippingAddress: baseAddress,
      itemsCount: 1,
      subtotalPaise: 3200000,
      totalPaise: 3200000,
      status: 'processing',
      paymentDetails: {
        processingClaimedAt: new Date(Date.now() - 5000), // 5 seconds ago (< 30s)
      },
    });

    const activeRecovery = await recoverStuckProcessingOrder({
      orderId: orderStuckActive._id,
      maxClaimAgeMs: 30000,
      customRazorpayClient: mockRazorpay,
    });

    record(
      'Stuck Processing Recovery: Active claim within lease window is left untouched (inProgress: true)',
      activeRecovery.inProgress === true && activeRecovery.status === 'processing',
      activeRecovery.message
    );

    // Test 3.2: Expired lease recovery with captured gateway payment fulfills order safely
    const initialProductBStock = (await Product.findById(productB._id)).stockQuantity;
    const orderStuckCaptured = await Order.create({
      orderNumber: 'AUR-20261102-STK2',
      user: testUser._id,
      items: [
        {
          product: productB._id,
          productCode: productB.code,
          name: productB.name,
          slug: productB.slug,
          image: productB.images[0],
          pricePaise: productB.pricePaise,
          quantity: 2,
          lineTotalPaise: productB.pricePaise * 2,
        },
      ],
      shippingAddress: baseAddress,
      itemsCount: 2,
      subtotalPaise: 6400000,
      totalPaise: 6400000,
      status: 'processing',
      paymentDetails: {
        razorpayPaymentId: 'pay_mock_captured_999',
        razorpayOrderId: 'order_mock_999',
        inventoryDecremented: false,
        processingClaimedAt: new Date(Date.now() - 45000), // 45s ago (> 30s)
      },
    });

    mockRazorpay.reset();
    mockRazorpay.mockPayment('pay_mock_captured_999', {
      id: 'pay_mock_captured_999',
      status: 'captured',
      amount: 6400000,
      currency: 'INR',
    });

    const capturedRecovery = await recoverStuckProcessingOrder({
      orderId: orderStuckCaptured._id,
      maxClaimAgeMs: 30000,
      customRazorpayClient: mockRazorpay,
    });

    const updatedOrderStuck2 = await Order.findById(orderStuckCaptured._id);
    const postStockProductB = (await Product.findById(productB._id)).stockQuantity;

    record(
      'Stuck Processing Recovery: Captured gateway payment transitions order to "paid" and decrements inventory',
      capturedRecovery.success === true &&
        updatedOrderStuck2.status === 'paid' &&
        updatedOrderStuck2.paymentDetails.inventoryDecremented === true &&
        postStockProductB === initialProductBStock - 2,
      `status: ${updatedOrderStuck2.status}, stock: ${initialProductBStock} -> ${postStockProductB}`
    );

    // Test 3.3: Zero duplicate decrement on repeated recovery invocation
    const repeatRecovery = await recoverStuckProcessingOrder({
      orderId: orderStuckCaptured._id,
      maxClaimAgeMs: 30000,
      customRazorpayClient: mockRazorpay,
    });
    const recheckStockProductB = (await Product.findById(productB._id)).stockQuantity;

    record(
      'Stuck Processing Recovery Idempotency: Repeated recovery on paid order causes ZERO additional stock decrement',
      repeatRecovery.alreadyResolved === true && recheckStockProductB === postStockProductB,
      `recheckStock: ${recheckStockProductB} (unchanged)`
    );

    // Test 3.4: Expired lease with failed gateway payment resets order to pending_payment without stock decrement
    const initialProductAStock = (await Product.findById(productA._id)).stockQuantity;
    const orderStuckFailed = await Order.create({
      orderNumber: 'AUR-20261102-STK3',
      user: testUser._id,
      items: [
        {
          product: productA._id,
          productCode: productA.code,
          name: productA.name,
          slug: productA.slug,
          image: productA.images[0],
          pricePaise: productA.pricePaise,
          quantity: 1,
          lineTotalPaise: productA.pricePaise,
        },
      ],
      shippingAddress: baseAddress,
      itemsCount: 1,
      subtotalPaise: 2500000,
      totalPaise: 2500000,
      status: 'processing',
      paymentDetails: {
        razorpayPaymentId: 'pay_mock_failed_888',
        inventoryDecremented: false,
        processingClaimedAt: new Date(Date.now() - 60000), // 60s ago (> 30s)
      },
    });

    mockRazorpay.mockPayment('pay_mock_failed_888', {
      id: 'pay_mock_failed_888',
      status: 'failed',
      error_description: 'Card was declined by bank',
    });

    const failedRecovery = await recoverStuckProcessingOrder({
      orderId: orderStuckFailed._id,
      maxClaimAgeMs: 30000,
      customRazorpayClient: mockRazorpay,
    });

    const updatedOrderStuck3 = await Order.findById(orderStuckFailed._id);
    const postStockProductA = (await Product.findById(productA._id)).stockQuantity;

    record(
      'Stuck Processing Recovery: Failed gateway payment safely reverts order to "pending_payment" with zero stock decrement',
      failedRecovery.recovered === true &&
        updatedOrderStuck3.status === 'pending_payment' &&
        updatedOrderStuck3.paymentDetails.inventoryDecremented === false &&
        postStockProductA === initialProductAStock,
      `status: ${updatedOrderStuck3.status}, stock: ${postStockProductA} (preserved)`
    );

    // Test 3.5: Expired lease with no payment ever created safely reverts to pending_payment
    const orderStuckNoPay = await Order.create({
      orderNumber: 'AUR-20261102-STK4',
      user: testUser._id,
      items: [
        {
          product: productA._id,
          productCode: productA.code,
          name: productA.name,
          slug: productA.slug,
          image: productA.images[0],
          pricePaise: productA.pricePaise,
          quantity: 1,
          lineTotalPaise: productA.pricePaise,
        },
      ],
      shippingAddress: baseAddress,
      itemsCount: 1,
      subtotalPaise: 2500000,
      totalPaise: 2500000,
      status: 'processing',
      paymentDetails: {
        razorpayOrderId: 'order_mock_unattempted_777',
        inventoryDecremented: false,
        processingClaimedAt: new Date(Date.now() - 50000),
      },
    });

    mockRazorpay.mockOrderPayments('order_mock_unattempted_777', { count: 0, items: [] });

    const unattemptedRecovery = await recoverStuckProcessingOrder({
      orderId: orderStuckNoPay._id,
      maxClaimAgeMs: 30000,
      customRazorpayClient: mockRazorpay,
    });

    const updatedOrderStuck4 = await Order.findById(orderStuckNoPay._id);
    record(
      'Stuck Processing Recovery: Unattempted payment order safely reverts to "pending_payment"',
      unattemptedRecovery.recovered === true && updatedOrderStuck4.status === 'pending_payment',
      `status: ${updatedOrderStuck4.status}`
    );

    // =========================================================================
    // SECTION 4: ORDER IDEMPOTENCY & FULL ADDRESS CONSISTENCY
    // =========================================================================
    console.log('\n--- Section 4: Full Address Snapshot Idempotency ---');

    // Test 4.1: Deterministic normalization of whitespace, casing, and phone formatting
    const addr1 = {
      recipientName: '  Aurevella VIP  Customer  ',
      phone: '+91 98765 43210',
      addressLine1: '  42 Heritage Boulevard  ',
      addressLine2: 'Penthouse 9B',
      city: 'mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    };

    const addr2 = {
      recipientName: 'Aurevella VIP Customer',
      phone: '9876543210', // Without +91 or spaces
      addressLine1: '42 Heritage Boulevard',
      addressLine2: '  penthouse 9b  ',
      city: 'MUMBAI',
      state: 'maharashtra',
      postalCode: '400001',
      country: 'India',
    };

    const isEquiv = isAddressSnapshotEquivalent(addr1, addr2);
    record(
      'Address Normalization: isAddressSnapshotEquivalent normalizes whitespace, casing, and phone formatting',
      isEquiv === true,
      `normalized match: ${isEquiv}`
    );

    // Test 4.2: Detect differences in addressLine2 (e.g. apartment/suite change)
    const addrDiffSuite = { ...addr1, addressLine2: 'Penthouse 10A' };
    record(
      'Address Idempotency: Rejects mismatch on addressLine2 (apartment/suite)',
      isAddressSnapshotEquivalent(addr1, addrDiffSuite) === false,
      'detected addressLine2 difference'
    );

    // Test 4.3: Detect differences in city
    const addrDiffCity = { ...addr1, city: 'Pune' };
    record(
      'Address Idempotency: Rejects mismatch on city',
      isAddressSnapshotEquivalent(addr1, addrDiffCity) === false,
      'detected city difference'
    );

    // Test 4.4: Detect differences in state
    const addrDiffState = { ...addr1, state: 'Gujarat' };
    record(
      'Address Idempotency: Rejects mismatch on state',
      isAddressSnapshotEquivalent(addr1, addrDiffState) === false,
      'detected state difference'
    );

    // Test 4.5: Detect differences in phone number
    const addrDiffPhone = { ...addr1, phone: '9123456789' };
    record(
      'Address Idempotency: Rejects mismatch on phone number',
      isAddressSnapshotEquivalent(addr1, addrDiffPhone) === false,
      'detected phone difference'
    );

    // =========================================================================
    // SECTION 5: ENVIRONMENT & CONFIGURATION SAFETY
    // =========================================================================
    console.log('\n--- Section 5: Environment & Configuration Safety ---');

    // Test 5.1: isValidTrustProxyConfig accepts documented safe values
    const safeValues = ['true', 'false', '1', '2', 'loopback', 'linklocal', '127.0.0.1', '10.0.0.0/8'];
    const allSafeAccepted = safeValues.every((val) => isValidTrustProxyConfig(val).valid);
    record(
      'Configuration Safety: isValidTrustProxyConfig accepts documented safe proxy values',
      allSafeAccepted,
      `checked: ${safeValues.join(', ')}`
    );

    // Test 5.2: isValidTrustProxyConfig rejects arbitrary non-empty strings
    const dangerousValues = ['foobar', 'arbitrary_string', 'malicious.host.com', 'admin_bypass'];
    const allDangerousRejected = dangerousValues.every((val) => !isValidTrustProxyConfig(val).valid);
    record(
      'Configuration Safety: isValidTrustProxyConfig strictly rejects arbitrary strings',
      allDangerousRejected,
      `rejected: ${dangerousValues.join(', ')}`
    );

    // Test 5.3: runCheckEnv validates passed env object without relying on process.env
    let checkEnvFailures = 0;
    const fakeEnv = {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/aurevella_test',
      CLIENT_URL: 'http://localhost:5173',
      JWT_SECRET: 'test_jwt_secret_with_sufficient_length_at_least_32_characters!',
      FIREBASE_PROJECT_ID: 'test-project',
      FIREBASE_CLIENT_EMAIL: 'test@project.iam.gserviceaccount.com',
      FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7\\n-----END PRIVATE KEY-----\\n',
      RAZORPAY_KEY_ID: 'rzp_test_MOCKKEY12345',
      RAZORPAY_KEY_SECRET: 'mock_key_secret_123',
    };

    const mockLogger = {
      pass: () => {},
      fail: () => {
        checkEnvFailures++;
      },
      info: () => {},
    };

    const envPassed = runCheckEnv(fakeEnv);
    record(
      'Environment Validation: runCheckEnv respects passed env object and passes for valid configuration',
      envPassed === true,
      `envPassed=${envPassed}`
    );

    // Test 5.4: Production guard rejects USE_LOCAL_DB in production
    const prodWithLocalDb = { ...fakeEnv, NODE_ENV: 'production', USE_LOCAL_DB: 'true' };
    const prodLocalDbPassed = runCheckEnv(prodWithLocalDb);
    record(
      'Environment Validation: Rejects USE_LOCAL_DB === "true" in production mode',
      prodLocalDbPassed === false,
      `prodLocalDbPassed=${prodLocalDbPassed}`
    );
  } finally {
    resetCustomRazorpayInstance();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(
    `Summary: ${results.filter((r) => r.Status === 'PASS').length}/${results.length} assertions passed`
  );
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runPaymentConcurrencyAndRecoveryTests().catch((err) => {
  console.error('[TEST FATAL ERROR]:', err);
  process.exit(1);
});
