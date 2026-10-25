import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { connectTestDB } from '../src/config/db.js';
import Product from '../src/models/Product.js';
import Address from '../src/models/Address.js';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import { toRupees, formatRupeeText } from '../src/utils/orderPricing.js';

async function runPhase6_1TestSuite() {
  console.log('====================================================');
  console.log('   AUREVELLA — Phase 6.1 Backend Verification Suite ');
  console.log('====================================================\n');

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
  };

  // Start ephemeral server on random available port
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // ----------------------------------------------------
    // Suite 1: Order Model Schema & Validation Rules
    // ----------------------------------------------------
    console.log('[Suite 1] Testing Order Mongoose Model & Schema Rules...');

    // 1A: Rejects non-integer pricePaise in items
    let fractionalPriceError = null;
    try {
      const invalidOrder = new Order({
        orderNumber: 'AUR-TEST-0001',
        user: new mongoose.Types.ObjectId(),
        items: [
          {
            product: new mongoose.Types.ObjectId(),
            productCode: 'prod-01',
            name: 'Test Sandal',
            slug: 'test-sandal',
            image: '/images/test.jpg',
            pricePaise: 3499.5, // Non-integer paise
            quantity: 1,
            lineTotalPaise: 3499.5,
          },
        ],
        shippingAddress: {
          recipientName: 'Test Buyer',
          phone: '+91 9876543210',
          addressLine1: '123 Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        itemsCount: 1,
        subtotalPaise: 3499.5,
        totalPaise: 3499.5,
      });
      await invalidOrder.validate();
    } catch (err) {
      fractionalPriceError = err;
    }
    record(
      'Order Model: Rejects fractional / non-integer pricePaise',
      fractionalPriceError !== null &&
        fractionalPriceError.errors?.['items.0.pricePaise'] !== undefined,
      fractionalPriceError ? 'Rejected fractional paise successfully' : 'Failed to reject float'
    );

    // 1B: Rejects invalid order status
    let statusError = null;
    try {
      const invalidStatusOrder = new Order({
        orderNumber: 'AUR-TEST-0002',
        user: new mongoose.Types.ObjectId(),
        items: [
          {
            product: new mongoose.Types.ObjectId(),
            productCode: 'prod-01',
            name: 'Test Sandal',
            slug: 'test-sandal',
            image: '/images/test.jpg',
            pricePaise: 349900,
            quantity: 1,
            lineTotalPaise: 349900,
          },
        ],
        shippingAddress: {
          recipientName: 'Test Buyer',
          phone: '+91 9876543210',
          addressLine1: '123 Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        itemsCount: 1,
        subtotalPaise: 349900,
        totalPaise: 349900,
        status: 'unsupported_arbitrary_status', // Invalid enum
      });
      await invalidStatusOrder.validate();
    } catch (err) {
      statusError = err;
    }
    record(
      'Order Model: Enforces controlled order status enum',
      statusError !== null && statusError.errors?.status !== undefined,
      statusError ? 'Rejected unauthorized status enum' : 'Failed to enforce status enum'
    );

    // 1C: Rejects quantity exceeding limit (> 10)
    let qtyError = null;
    try {
      const invalidQtyOrder = new Order({
        orderNumber: 'AUR-TEST-0003',
        user: new mongoose.Types.ObjectId(),
        items: [
          {
            product: new mongoose.Types.ObjectId(),
            productCode: 'prod-01',
            name: 'Test Sandal',
            slug: 'test-sandal',
            image: '/images/test.jpg',
            pricePaise: 349900,
            quantity: 25, // Exceeds max 10
            lineTotalPaise: 8747500,
          },
        ],
        shippingAddress: {
          recipientName: 'Test Buyer',
          phone: '+91 9876543210',
          addressLine1: '123 Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        itemsCount: 25,
        subtotalPaise: 8747500,
        totalPaise: 8747500,
      });
      await invalidQtyOrder.validate();
    } catch (err) {
      qtyError = err;
    }
    record(
      'Order Model: Enforces maximum quantity limit (<= 10)',
      qtyError !== null && qtyError.errors?.['items.0.quantity'] !== undefined,
      qtyError ? 'Rejected quantity > 10' : 'Failed to enforce quantity limit'
    );

    // ----------------------------------------------------
    // Suite 2: Test Users, Products & Addresses Setup
    // ----------------------------------------------------
    console.log('\n[Suite 2] Setting Up Test Accounts, Address Book & Launch Products...');

    const testUserAlpha = await User.findOneAndUpdate(
      { email: 'alpha_phase6@aurevella.com' },
      {
        name: 'Alpha Customer',
        email: 'alpha_phase6@aurevella.com',
        firebaseUid: 'fb-phase6-alpha-uid',
        role: 'customer',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const testUserBeta = await User.findOneAndUpdate(
      { email: 'beta_phase6@aurevella.com' },
      {
        name: 'Beta Customer',
        email: 'beta_phase6@aurevella.com',
        firebaseUid: 'fb-phase6-beta-uid',
        role: 'customer',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const tokenAlpha = jwt.sign(
      { id: testUserAlpha._id.toString(), role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const tokenBeta = jwt.sign(
      { id: testUserBeta._id.toString(), role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const authHeadersAlpha = {
      'Content-Type': 'application/json',
      'X-Aurevella-Request': '1',
      Cookie: `token=${tokenAlpha}`,
      Origin: 'http://localhost:5173',
    };

    const authHeadersBeta = {
      'Content-Type': 'application/json',
      'X-Aurevella-Request': '1',
      Cookie: `token=${tokenBeta}`,
      Origin: 'http://localhost:5173',
    };

    // User Alpha's verified address
    const alphaAddress = await Address.findOneAndUpdate(
      { user: testUserAlpha._id, recipientName: 'Alpha Customer' },
      {
        user: testUserAlpha._id,
        recipientName: 'Alpha Customer',
        phone: '+91 9876543210',
        addressLine1: 'Flat 402, Aurevella Residences',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400050',
        country: 'India',
        isDefault: true,
      },
      { upsert: true, new: true }
    );

    // User Beta's verified address
    const betaAddress = await Address.findOneAndUpdate(
      { user: testUserBeta._id, recipientName: 'Beta Customer' },
      {
        user: testUserBeta._id,
        recipientName: 'Beta Customer',
        phone: '+91 9123456789',
        addressLine1: 'Villa 12, Aurevella Enclave',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
        isDefault: true,
      },
      { upsert: true, new: true }
    );

    // Fetch approved launch products
    const prod01 = await Product.findOne({ code: 'prod-01' });
    const prod02 = await Product.findOne({ code: 'prod-02' });
    const prod03 = await Product.findOne({ code: 'prod-03' });

    if (!prod01 || !prod02 || !prod03) {
      throw new Error('Approved launch products not found in database. Seed products first.');
    }

    const initialStockProd01 = prod01.stockQuantity;

    // ----------------------------------------------------
    // Suite 3: Server-Side Price Calculation & Zero Trust
    // ----------------------------------------------------
    console.log('\n[Suite 3] Testing Server-Side Pricing Engine & Zero Price Trust...');

    // 3A: Attempt to send malicious client prices (price: 1 rupee, total: 100 paise)
    const quotePayload = {
      items: [
        {
          id: 'prod-01',
          quantity: 2,
          price: 1, // Tampered client price (ignored)
          pricePaise: 100, // Tampered client paise (ignored)
          lineTotal: 2,
        },
        {
          id: 'prod-02',
          quantity: 1,
          price: 10, // Tampered client price (ignored)
        },
      ],
      addressId: alphaAddress._id.toString(),
    };

    const quoteRes = await fetch(`${baseUrl}/api/orders/quote`, {
      method: 'POST',
      headers: authHeadersAlpha,
      body: JSON.stringify(quotePayload),
    });
    const quoteData = await quoteRes.json();

    // Expected: 2 * 349900 (prod-01) + 1 * 329900 (prod-02) = 699800 + 329900 = 1029700 paise (₹10,297)
    const expectedSubtotalPaise = 2 * prod01.pricePaise + 1 * prod02.pricePaise;
    const isQuotePriceAccurate =
      quoteRes.status === 200 &&
      quoteData.quote?.subtotalPaise === expectedSubtotalPaise &&
      quoteData.quote?.totalPaise === expectedSubtotalPaise &&
      quoteData.quote?.total === 10297;

    record(
      'Pricing Engine: Overrides client prices with DB pricePaise (Zero Client Price Trust)',
      isQuotePriceAccurate,
      `Calculated: ${quoteData.quote?.totalPaise} paise (${quoteData.quote?.totalText}), expected: ${expectedSubtotalPaise} paise`
    );

    // 3B: Rupee serialization & fractional paise precision
    const isWholePaiseAccurate =
      toRupees(349900) === 3499 && formatRupeeText(349900) === '₹3,499';
    const isFractionalPaiseAccurate =
      toRupees(349950) === 3499.5 && formatRupeeText(349950) === '₹3,499.50';
    const isZeroPaiseAccurate =
      toRupees(0) === 0 && formatRupeeText(0) === '₹0';

    const isRupeeSerializationCorrect =
      isWholePaiseAccurate && isFractionalPaiseAccurate && isZeroPaiseAccurate;

    record(
      'Serialization: Preserves fractional paise without silent loss or precision truncation',
      isRupeeSerializationCorrect,
      `349950 paise -> ${toRupees(349950)} (${formatRupeeText(349950)})`
    );

    // ----------------------------------------------------
    // Suite 4: Stock & Product Availability Enforcements
    // ----------------------------------------------------
    console.log('\n[Suite 4] Testing Stock & Product Availability Constraints...');

    // 4A: Rejects non-existent product ID
    const badProdRes = await fetch(`${baseUrl}/api/orders/quote`, {
      method: 'POST',
      headers: authHeadersAlpha,
      body: JSON.stringify({
        items: [{ id: 'non-existent-product-id-xyz', quantity: 1 }],
      }),
    });
    record(
      'Validation: Rejects non-existent product ID',
      badProdRes.status === 400,
      `Status: ${badProdRes.status} (expected 400)`
    );

    // 4B: Rejects inactive product
    const inactiveProd = await Product.findOneAndUpdate(
      { slug: 'temp-inactive-test-shoe' },
      {
        name: 'Archived Luxury Loafer',
        slug: 'temp-inactive-test-shoe',
        code: 'prod-inactive-test',
        pricePaise: 400000,
        category: prod01.category,
        description: 'Test inactive shoe',
        image: '/images/test.jpg',
        stockQuantity: 10,
        isActive: false, // Inactive
      },
      { upsert: true, new: true }
    );

    const inactiveOrderRes = await fetch(`${baseUrl}/api/orders/quote`, {
      method: 'POST',
      headers: authHeadersAlpha,
      body: JSON.stringify({
        items: [{ id: 'prod-inactive-test', quantity: 1 }],
      }),
    });
    record(
      'Validation: Rejects inactive product from order placement',
      inactiveOrderRes.status === 400,
      `Status: ${inactiveOrderRes.status} (expected 400)`
    );

    // Clean up inactive test product
    await Product.deleteOne({ _id: inactiveProd._id });

    // 4C: Rejects quantity exceeding stock
    const excessQtyRes = await fetch(`${baseUrl}/api/orders/quote`, {
      method: 'POST',
      headers: authHeadersAlpha,
      body: JSON.stringify({
        items: [{ id: 'prod-03', quantity: 10 }], // We will test an item where requested > stock
      }),
    });
    // Let's create a temporary product with stock = 2 and request 5
    const lowStockProd = await Product.findOneAndUpdate(
      { slug: 'temp-low-stock-test-shoe' },
      {
        name: 'Limited Artisan Pump',
        slug: 'temp-low-stock-test-shoe',
        code: 'prod-low-stock-test',
        pricePaise: 500000,
        category: prod01.category,
        description: 'Test low stock shoe',
        image: '/images/test.jpg',
        stockQuantity: 2, // Only 2 pairs in stock
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const outOfStockRes = await fetch(`${baseUrl}/api/orders/quote`, {
      method: 'POST',
      headers: authHeadersAlpha,
      body: JSON.stringify({
        items: [{ id: 'prod-low-stock-test', quantity: 5 }], // Requests 5, available: 2
      }),
    });
    const outOfStockData = await outOfStockRes.json();
    const stockRejected =
      outOfStockRes.status === 400 &&
      outOfStockData.message.includes('Insufficient stock');

    record(
      'Validation: Rejects request exceeding available stockQuantity',
      stockRejected,
      `Status: ${outOfStockRes.status}, message: "${outOfStockData.message}"`
    );

    // Clean up low stock test product
    await Product.deleteOne({ _id: lowStockProd._id });

    // ----------------------------------------------------
    // Suite 5: Address Security & Cross-Tenant Isolation
    // ----------------------------------------------------
    console.log('\n[Suite 5] Testing Address Security & Multi-Tenant Authorization...');

    // 5A: User Beta attempts to create order using User Alpha's address ID
    const crossTenantOrderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: authHeadersBeta,
      body: JSON.stringify({
        items: [{ id: 'prod-01', quantity: 1 }],
        addressId: alphaAddress._id.toString(), // Alpha's address!
      }),
    });
    const crossTenantData = await crossTenantOrderRes.json();
    const isAddressHijackBlocked =
      crossTenantOrderRes.status === 400 &&
      crossTenantData.message.includes('Shipping address was not found');

    record(
      'Security: Prevents cross-tenant shipping address hijacking',
      isAddressHijackBlocked,
      `Status: ${crossTenantOrderRes.status}, message: "${crossTenantData.message}"`
    );

    // ----------------------------------------------------
    // Suite 6: Order Creation, Number Format & Inventory Hold Rule
    // ----------------------------------------------------
    console.log('\n[Suite 6] Testing Order Creation & Inventory Preservation Rule...');

    const idempotencyKey = `idemp-key-${Date.now()}`;
    const orderCreateRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: authHeadersAlpha,
      body: JSON.stringify({
        items: [
          { id: 'prod-01', quantity: 1, price: 99 }, // Price ignored
          { id: 'prod-02', quantity: 1, price: 199 }, // Price ignored
        ],
        addressId: alphaAddress._id.toString(),
        notes: 'Hand delivery requested at door.',
        idempotencyKey,
      }),
    });
    const orderCreateData = await orderCreateRes.json();
    const createdOrder = orderCreateData.order;

    const orderNumberRegex = /^AUR-[0-9]{8}-[A-Z0-9]{4}$/;
    const isOrderNumberValid =
      orderCreateRes.status === 201 &&
      createdOrder?.orderNumber &&
      orderNumberRegex.test(createdOrder.orderNumber);

    record(
      'Order Creation: Generates unique order number matching AUR-YYYYMMDD-XXXX',
      isOrderNumberValid,
      `Status: ${orderCreateRes.status}, Order #: ${createdOrder?.orderNumber}`
    );

    const isSnapshotClean =
      createdOrder?.shippingAddress?.recipientName === alphaAddress.recipientName &&
      createdOrder?.shippingAddress?.postalCode === alphaAddress.postalCode &&
      createdOrder?.items?.length === 2 &&
      createdOrder?.status === 'pending_payment';

    record(
      'Order Creation: Embeds immutable address snapshot & pending_payment status',
      isSnapshotClean,
      `Recipient: ${createdOrder?.shippingAddress?.recipientName}, Status: ${createdOrder?.status}`
    );

    // 6B: Confirm Phase 6.1 Inventory Rule: Stock is NOT decremented yet!
    const prod01AfterOrder = await Product.findOne({ code: 'prod-01' });
    const isStockPreservedInPhase6_1 =
      prod01AfterOrder.stockQuantity === initialStockProd01;

    record(
      'Phase 6.1 Policy: Stock is preserved and NOT decremented prior to payment verification',
      isStockPreservedInPhase6_1,
      `Initial stock: ${initialStockProd01}, current stock: ${prod01AfterOrder.stockQuantity} (preserved)`
    );

    // 6C: Idempotency Protection: Re-submitting same idempotency key returns existing order
    const duplicateRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: authHeadersAlpha,
      body: JSON.stringify({
        items: [{ id: 'prod-01', quantity: 1 }],
        addressId: alphaAddress._id.toString(),
        idempotencyKey, // Same key
      }),
    });
    const duplicateData = await duplicateRes.json();
    const isDuplicateHandled =
      duplicateRes.status === 200 &&
      duplicateData.isDuplicate === true &&
      duplicateData.order?.orderNumber === createdOrder.orderNumber;

    record(
      'Idempotency: Re-submitting identical idempotency key returns existing order without duplicates',
      isDuplicateHandled,
      `Duplicate detected: ${duplicateData.isDuplicate}, returned Order #: ${duplicateData.order?.orderNumber}`
    );

    // 6D: Cross-User Idempotency Isolation: User Beta submits identical idempotency key
    const betaDuplicateKeyRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: authHeadersBeta,
      body: JSON.stringify({
        items: [{ id: 'prod-01', quantity: 1 }],
        addressId: betaAddress._id.toString(),
        idempotencyKey, // Identical key as User Alpha
      }),
    });
    const betaDuplicateKeyData = await betaDuplicateKeyRes.json();
    const isBetaOrderCreated =
      betaDuplicateKeyRes.status === 201 &&
      betaDuplicateKeyData.order?.orderNumber &&
      betaDuplicateKeyData.order?.orderNumber !== createdOrder.orderNumber;

    record(
      'Idempotency: Keys are scoped per user (User B can use same key without cross-user leak)',
      isBetaOrderCreated,
      `User B created Order #: ${betaDuplicateKeyData.order?.orderNumber} (distinct from User A)`
    );

    // ----------------------------------------------------
    // Suite 7: Customer Order Scoping & Access Isolation
    // ----------------------------------------------------
    console.log('\n[Suite 7] Testing Customer Order History & Cross-Tenant Read Isolation...');

    // 7A: User Alpha gets order history
    const alphaOrdersRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'GET',
      headers: authHeadersAlpha,
    });
    const alphaOrdersData = await alphaOrdersRes.json();
    const hasAlphaOrder =
      alphaOrdersRes.status === 200 &&
      alphaOrdersData.orders?.some((o) => o.orderNumber === createdOrder.orderNumber);

    record(
      'GET /api/orders: Customer retrieves their own order history',
      hasAlphaOrder,
      `Alpha orders count: ${alphaOrdersData.orders?.length}`
    );

    // 7B: User Beta queries order history (must NOT see Alpha's order)
    const betaOrdersRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'GET',
      headers: authHeadersBeta,
    });
    const betaOrdersData = await betaOrdersRes.json();
    const betaCannotSeeAlphaOrders =
      betaOrdersRes.status === 200 &&
      !betaOrdersData.orders?.some((o) => o.orderNumber === createdOrder.orderNumber);

    record(
      'GET /api/orders: Multi-tenant isolation (User B cannot see User A orders)',
      betaCannotSeeAlphaOrders,
      `Beta orders count: ${betaOrdersData.orders?.length} (0 cross-tenant leak)`
    );

    // 7C: User Beta attempts to query User Alpha's order details directly by orderNumber
    const betaDirectRes = await fetch(`${baseUrl}/api/orders/${createdOrder.orderNumber}`, {
      method: 'GET',
      headers: authHeadersBeta,
    });
    const isDirectAccessBlocked = betaDirectRes.status === 404;

    record(
      'GET /api/orders/:id: Multi-tenant isolation (User B receives 404 accessing User A order)',
      isDirectAccessBlocked,
      `Status: ${betaDirectRes.status} (expected 404 Not Found)`
    );

    // 7D: Customer Order History Pagination
    const paginationRes = await fetch(`${baseUrl}/api/orders?page=1&limit=5`, {
      method: 'GET',
      headers: authHeadersAlpha,
    });
    const paginationData = await paginationRes.json();
    const isPaginationValid =
      paginationRes.status === 200 &&
      paginationData.page === 1 &&
      paginationData.total >= 1 &&
      paginationData.pages >= 1 &&
      Array.isArray(paginationData.orders);

    record(
      'GET /api/orders: Supports pagination parameters (page, limit, total, pages)',
      isPaginationValid,
      `Page: ${paginationData.page}, Pages: ${paginationData.pages}, Total: ${paginationData.total}`
    );

    // Clean up created test orders
    await Order.deleteMany({ orderNumber: { $regex: /^AUR-TEST/ } });
    await Order.deleteOne({ orderNumber: createdOrder.orderNumber });
    if (betaDuplicateKeyData.order?.orderNumber) {
      await Order.deleteOne({ orderNumber: betaDuplicateKeyData.order.orderNumber });
    }

    // Print summary results table
    console.log('\n====================================================');
    console.log('              PHASE 6.1 TEST RESULTS MATRIX         ');
    console.log('====================================================\n');
    console.table(results);

    if (allPassed) {
      console.log('✔ ALL PHASE 6.1 TESTS PASSED WITH 100% SUCCESS!\n');
    } else {
      console.error('❌ SOME PHASE 6.1 TESTS FAILED. See details above.\n');
    }
  } finally {
    server.close();
    await mongoose.disconnect();
    console.log('[Teardown] Ephemeral server and MongoDB connection closed cleanly.\n');
  }

  if (!allPassed) {
    process.exit(1);
  }
}

runPhase6_1TestSuite().catch((err) => {
  console.error('[Fatal Test Error]:', err);
  process.exit(1);
});