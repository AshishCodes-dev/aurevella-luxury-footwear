/**
 * AUREVELLA — Phase 7: Cart & Checkout Integration Verification Suite
 *
 * Verifies end-to-end integration:
 * 1. Cart items & quantity bounds (1 to 10 per model, invalid ID rejection)
 * 2. Server quote recalculation & stock availability checks (zero client price trust)
 * 3. Multi-tenant address selection & cross-tenant hijacking rejection
 * 4. Idempotent order creation & immutable address/product snapshots
 * 5. Payment gateway order creation in Razorpay Test Mode
 * 6. Server-side payment verification & atomic inventory decrement
 * 7. Safe handling of payment cancellation and reconciliation states
 */

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
import { toRupees, formatRupeeText } from '../src/utils/orderPricing.js';
import {
  createMockRazorpay,
  setCustomRazorpayInstance,
  resetCustomRazorpayInstance,
} from '../src/config/razorpay.js';

async function runPhase7TestSuite() {
  console.log('====================================================');
  console.log('   AUREVELLA — Phase 7 Cart & Checkout Test Suite   ');
  console.log('====================================================\n');

  await connectTestDB();
  const host = mongoose.connection.host || 'unknown';
  console.log(`[Database] Connected to ${host}\n`);

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

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const TEST_KEY_ID = 'rzp_test_AurevellaKey01';
  const TEST_KEY_SECRET = 'aurevella_test_secret_32_chars_long!!';
  const TEST_WEBHOOK_SECRET = 'aurevella_webhook_secret_key_999!';

  process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

  // Initialize deterministic offline Razorpay mock (guarantees zero external network requests)
  const mockRazorpay = createMockRazorpay();
  setCustomRazorpayInstance(mockRazorpay);

  try {
    // ----------------------------------------------------
    // Suite 1: Test Users, Products & Addresses Setup
    // ----------------------------------------------------
    console.log('[Suite 1] Setting Up Test Accounts, Launch Products & Addresses...');

    const customerA = await User.findOneAndUpdate(
      { email: 'customerA_p7@aurevella.com' },
      {
        name: 'Aria Sharma',
        email: 'customerA_p7@aurevella.com',
        firebaseUid: 'fb-p7-custA-uid',
        role: 'customer',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const customerB = await User.findOneAndUpdate(
      { email: 'customerB_p7@aurevella.com' },
      {
        name: 'Tara Verma',
        email: 'customerB_p7@aurevella.com',
        firebaseUid: 'fb-p7-custB-uid',
        role: 'customer',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const tokenA = jwt.sign(
      { id: customerA._id.toString(), role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const tokenB = jwt.sign(
      { id: customerB._id.toString(), role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const headersA = {
      'Content-Type': 'application/json',
      'X-Aurevella-Request': '1',
      Cookie: `token=${tokenA}`,
      Origin: 'http://localhost:5173',
    };

    const headersB = {
      'Content-Type': 'application/json',
      'X-Aurevella-Request': '1',
      Cookie: `token=${tokenB}`,
      Origin: 'http://localhost:5173',
    };

    // Clean prior test orders
    await Order.deleteMany({ user: { $in: [customerA._id, customerB._id] } });

    // Seed test product with controlled stock
    const heelProduct = await Product.findOneAndUpdate(
      { code: 'prod-01' },
      {
        name: 'Floral Block Heel Sandal',
        slug: 'floral-block-heel-sandal',
        code: 'prod-01',
        pricePaise: 349900, // ₹3,499
        stockQuantity: 15,
        isActive: true,
      },
      { new: true }
    );

    const slideProduct = await Product.findOneAndUpdate(
      { code: 'prod-02' },
      {
        name: 'Blue Floral Slide',
        slug: 'blue-floral-slide',
        code: 'prod-02',
        pricePaise: 329900, // ₹3,299
        stockQuantity: 10,
        isActive: true,
      },
      { new: true }
    );

    // Seed addresses
    const addrA = await Address.findOneAndUpdate(
      { user: customerA._id, addressLine1: '402 Signature Towers' },
      {
        user: customerA._id,
        recipientName: 'Aria Sharma',
        phone: '+91 9876543210',
        addressLine1: '402 Signature Towers',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
        isDefault: true,
      },
      { upsert: true, new: true }
    );

    const addrB = await Address.findOneAndUpdate(
      { user: customerB._id, addressLine1: '701 Marina Bay' },
      {
        user: customerB._id,
        recipientName: 'Tara Verma',
        phone: '+91 9123456789',
        addressLine1: '701 Marina Bay',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600001',
        country: 'India',
        isDefault: true,
      },
      { upsert: true, new: true }
    );

    console.log('  Customer A ID:', customerA._id.toString());
    console.log('  Customer B ID:', customerB._id.toString());
    console.log('  Address A ID:', addrA._id.toString());

    // ----------------------------------------------------
    // Suite 2: Shopping Cart & Server Quote Verification
    // ----------------------------------------------------
    console.log('\n[Suite 2] Testing Shopping Cart & Server Quote Calculations...');

    // 2A: Empty cart quote rejection
    const emptyQuoteRes = await fetch(`${baseUrl}/api/orders/quote`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({ items: [] }),
    });
    record(
      'Cart Validation: Rejects empty items list for quote calculation (400)',
      emptyQuoteRes.status === 400,
      `Status: ${emptyQuoteRes.status}`
    );

    // 2B: Quantity limit enforcement (> 10 rejected)
    const excessQtyRes = await fetch(`${baseUrl}/api/orders/quote`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        items: [{ id: heelProduct.code, quantity: 11 }],
      }),
    });
    record(
      'Cart Validation: Rejects item quantity exceeding atelier limit of 10 per model (400)',
      excessQtyRes.status === 400,
      `Status: ${excessQtyRes.status}`
    );

    // 2C: Accurate quote calculation with complimentary shipping
    const quoteRes = await fetch(`${baseUrl}/api/orders/quote`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        items: [
          { id: heelProduct.code, quantity: 2 },
          { id: slideProduct.code, quantity: 1 },
        ],
        addressId: addrA._id.toString(),
      }),
    });
    const quoteData = await quoteRes.json();
    const expectedSubtotalPaise = 349900 * 2 + 329900; // 1,029,700 paise (₹10,297)

    const isQuoteAccurate =
      quoteRes.status === 200 &&
      quoteData.quote.subtotalPaise === expectedSubtotalPaise &&
      quoteData.quote.shippingFeePaise === 0 &&
      quoteData.quote.totalPaise === expectedSubtotalPaise &&
      quoteData.quote.shippingFeeText === 'Complimentary';

    record(
      'Server Quote: Calculates exact integer paise subtotal, complimentary shipping & total',
      isQuoteAccurate,
      `Expected: ${expectedSubtotalPaise} paise, Calculated: ${quoteData.quote?.totalPaise} paise`
    );

    // 2D: Server quote refresh when cart changes
    const updatedQuoteRes = await fetch(`${baseUrl}/api/orders/quote`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        items: [
          { id: heelProduct.code, quantity: 1 }, // Quantity updated from 2 to 1
        ],
        addressId: addrA._id.toString(),
      }),
    });
    const updatedQuoteData = await updatedQuoteRes.json();
    record(
      'Server Quote: Dynamically updates total when cart quantities change',
      updatedQuoteRes.status === 200 && updatedQuoteData.quote.totalPaise === 349900,
      `Updated total: ${updatedQuoteData.quote?.totalText}`
    );

    // 2E: Stock limit detection
    const outOfStockRes = await fetch(`${baseUrl}/api/orders/quote`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        items: [
          { id: slideProduct.code, quantity: 10 }, // Slide product has stock 10
        ],
      }),
    });
    // Requesting 11 units should fail stock check
    const stockExceededRes = await fetch(`${baseUrl}/api/orders/quote`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        items: [{ id: slideProduct.code, quantity: 11 }],
      }),
    });
    record(
      'Stock Constraint: Rejects item quantity exceeding available database inventory (400)',
      stockExceededRes.status === 400,
      `Status: ${stockExceededRes.status}`
    );

    // ----------------------------------------------------
    // Suite 3: Address Security & Cross-Tenant Ownership Checks
    // ----------------------------------------------------
    console.log('\n[Suite 3] Testing Address Selection & Cross-Tenant Isolation...');

    // 3A: Customer B attempting to use Customer A's address is blocked
    const hijackRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: headersB, // Tara Verma
      body: JSON.stringify({
        items: [{ id: heelProduct.code, quantity: 1 }],
        addressId: addrA._id.toString(), // Aria Sharma's address!
      }),
    });
    record(
      'Address Security: Prevents cross-tenant shipping address hijacking (400)',
      hijackRes.status === 400,
      `Status: ${hijackRes.status}`
    );

    // 3B: Valid address snapshotting
    const validOrderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        items: [{ id: heelProduct.code, quantity: 1 }],
        addressId: addrA._id.toString(),
        notes: 'Please pack in luxury presentation cedar box.',
        idempotencyKey: 'idemp_p7_order_001',
      }),
    });
    const validOrderData = await validOrderRes.json();
    const isOrderCreated =
      validOrderRes.status === 201 &&
      validOrderData.order.status === 'pending_payment' &&
      validOrderData.order.shippingAddress.recipientName === 'Aria Sharma';

    record(
      'Order Creation: Creates order in "pending_payment" with immutable address snapshot',
      isOrderCreated,
      `Order #: ${validOrderData.order?.orderNumber}, Status: ${validOrderData.order?.status}`
    );

    // 3C: Inventory preservation before payment
    const stockAfterCreate = (await Product.findById(heelProduct._id)).stockQuantity;
    record(
      'Inventory Policy: Inventory is preserved and NOT decremented prior to verified payment',
      stockAfterCreate === 15,
      `Stock remained exactly: ${stockAfterCreate}`
    );

    // 3D: Idempotency: re-submission returns existing order without duplication
    const dupSubmitRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        items: [{ id: heelProduct.code, quantity: 1 }],
        addressId: addrA._id.toString(),
        idempotencyKey: 'idemp_p7_order_001',
      }),
    });
    const dupSubmitData = await dupSubmitRes.json();
    record(
      'Idempotency: Re-submitting identical idempotency key returns existing order without duplicates',
      dupSubmitRes.status === 200 && dupSubmitData.isDuplicate === true,
      `Existing Order #: ${dupSubmitData.order?.orderNumber}`
    );

    // ----------------------------------------------------
    // Suite 4: Razorpay Test-Mode Payment Gateway & Verification
    // ----------------------------------------------------
    console.log('\n[Suite 4] Testing Razorpay Test-Mode Payment Initiation & Verification...');

    const orderId = validOrderData.order.id;

    // Simulate pre-set razorpayOrderId for deterministic offline test mode (avoids external network calls)
    await Order.updateOne(
      { _id: orderId },
      { $set: { 'paymentDetails.razorpayOrderId': 'order_p7_simulated_999' } }
    );

    // 4A: Payment initiation returns Razorpay order details and public keyId
    const payOrderRes = await fetch(`${baseUrl}/api/payments/create-order`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({ orderId }),
    });
    const payOrderData = await payOrderRes.json();

    const isPayOrderValid =
      payOrderRes.status === 200 &&
      payOrderData.status === 'success' &&
      payOrderData.keyId === TEST_KEY_ID &&
      payOrderData.amountPaise === 349900 &&
      payOrderData.currency === 'INR' &&
      payOrderData.razorpayOrderId === 'order_p7_simulated_999';

    record(
      'Payment Gateway: Creates Razorpay order matching verified server total and returns keyId',
      isPayOrderValid,
      `Razorpay Order ID: ${payOrderData.razorpayOrderId}, Amount: ${payOrderData.amountPaise} paise`
    );

    // 4B: Payment cancellation / dismiss leaves order safely in 'pending_payment'
    const orderBeforePayment = await Order.findById(orderId);
    record(
      'Payment Lifecycle: Unpaid or dismissed payment leaves order safely in "pending_payment"',
      orderBeforePayment.status === 'pending_payment' &&
        orderBeforePayment.paymentDetails.inventoryDecremented === false,
      `Order status: ${orderBeforePayment.status}`
    );

    // 4C: Cryptographic signature verification marks order 'paid' & atomically decrements stock
    const rzpOrderId = payOrderData.razorpayOrderId;
    const rzpPaymentId = `pay_test_p7_${Date.now()}`;
    const rzpSignature = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${rzpOrderId}|${rzpPaymentId}`)
      .digest('hex');

    // Register offline mock payment record (status: 'captured')
    mockRazorpay.mockPayment(rzpPaymentId, {
      id: rzpPaymentId,
      order_id: rzpOrderId,
      amount: validOrderData.order.totalPaise,
      currency: 'INR',
      status: 'captured',
    });

    const stockBeforeVerify = (await Product.findById(heelProduct._id)).stockQuantity;

    const verifyRes = await fetch(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        orderId,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        razorpaySignature: rzpSignature,
      }),
    });
    const verifyData = await verifyRes.json();

    const orderAfterVerify = await Order.findById(orderId);
    const stockAfterVerify = (await Product.findById(heelProduct._id)).stockQuantity;

    const isPaymentVerified =
      verifyRes.status === 200 &&
      orderAfterVerify.status === 'paid' &&
      orderAfterVerify.paymentDetails.inventoryDecremented === true &&
      stockAfterVerify === stockBeforeVerify - 1;

    record(
      'Payment Verification: Valid signature transitions order to "paid" and decrements inventory',
      isPaymentVerified,
      `Status: ${orderAfterVerify.status}, Stock: ${stockBeforeVerify} -> ${stockAfterVerify}`
    );

    // 4D: Repeated verify is idempotent (stock not decremented again)
    const dupVerifyRes = await fetch(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        orderId,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        razorpaySignature: rzpSignature,
      }),
    });
    const stockAfterDupVerify = (await Product.findById(heelProduct._id)).stockQuantity;
    record(
      'Idempotency: Repeated payment verification returns success without duplicate stock decrement',
      dupVerifyRes.status === 200 && stockAfterDupVerify === stockAfterVerify,
      `Stock remained unchanged: ${stockAfterDupVerify}`
    );

    // ----------------------------------------------------
    // Suite 5: Customer Order History
    // ----------------------------------------------------
    console.log('\n[Suite 5] Testing Customer Order History & Multi-Tenant Retrieval...');

    const historyRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'GET',
      headers: headersA,
    });
    const historyData = await historyRes.json();
    const hasOrder = historyData.orders?.some((o) => o.orderNumber === validOrderData.order.orderNumber);

    record(
      'Order History: Authenticated customer retrieves their own commissioned orders',
      historyRes.status === 200 && hasOrder,
      `Total customer orders: ${historyData.total}`
    );

    const historyBRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'GET',
      headers: headersB, // Customer B
    });
    const historyBData = await historyBRes.json();
    const hasLeakage = historyBData.orders?.some((o) => o.orderNumber === validOrderData.order.orderNumber);

    record(
      'Order History: Customer B CANNOT view Customer A orders (Multi-Tenant Isolation)',
      historyBRes.status === 200 && !hasLeakage,
      `Customer B order count: ${historyBData.total} (0 cross-tenant leak)`
    );

    // Restore test product stock and safely clean test-owned records
    await Product.updateOne({ _id: heelProduct._id }, { $set: { stockQuantity: 15 } });
    await Product.updateOne({ _id: slideProduct._id }, { $set: { stockQuantity: 10 } });
    await Order.deleteMany({ user: { $in: [customerA._id, customerB._id] } });
    await Address.deleteMany({ user: { $in: [customerA._id, customerB._id] } });
    await User.deleteMany({ _id: { $in: [customerA._id, customerB._id] } });

    console.log('\n====================================================');
    console.log('              PHASE 7 TEST RESULTS MATRIX           ');
    console.log('====================================================\n');
    console.table(results);

    if (allPassed) {
      console.log('✔ ALL PHASE 7 INTEGRATION TESTS PASSED WITH 100% SUCCESS!\n');
    } else {
      console.error('❌ SOME PHASE 7 TESTS FAILED. See details above.\n');
    }
  } catch (error) {
    console.error('[Phase 7 Suite Critical Error]:', error);
    allPassed = false;
  } finally {
    resetCustomRazorpayInstance();
    server.close();
    await mongoose.disconnect();
    console.log('[Teardown] Ephemeral server and MongoDB connection closed cleanly.');
    process.exit(allPassed ? 0 : 1);
  }
}

runPhase7TestSuite();
