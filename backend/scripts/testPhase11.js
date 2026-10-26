/**
 * AUREVELLA — Phase 11: Secure Admin Dashboard & Order Management Test Suite
 *
 * Comprehensive end-to-end regression tests verifying:
 * 1. Admin Authentication & Role Authorization (401 unauthenticated, 403 customer, 200 admin)
 * 2. CSRF & Request Origin Guard on admin mutating endpoints
 * 3. Executive Dashboard Stats (Revenue aggregation, order counts, low-stock watchlist, customer counts)
 * 4. Product CRUD & Schema Validation (integer pricePaise, category existence, duplicate slug/code rejection)
 * 5. Inventory Stock Management (non-negative integer enforcement, atomic stock adjustments)
 * 6. Order Fulfillment State Machine Security:
 *    - Rejection of manual 'paid' status declaration (strictly gateway-controlled)
 *    - Rejection of invalid state transitions (e.g. pending_payment -> shipped)
 *    - Allowed fulfillment progression (paid -> processing -> shipped -> delivered)
 *    - Immutability of cryptographic payment verification details (razorpayPaymentId, paidAt)
 * 7. Multi-tenant security (customer cannot elevate role or access admin endpoints)
 * 8. Order Dossier & Search Verification
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { connectTestDB } from '../src/config/db.js';
import Product from '../src/models/Product.js';
import Category from '../src/models/Category.js';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import {
  createMockRazorpay,
  setCustomRazorpayInstance,
  resetCustomRazorpayInstance,
} from '../src/config/razorpay.js';

async function runPhase11TestSuite() {
  console.log('====================================================');
  console.log('  AUREVELLA — Phase 11 Secure Admin Test Suite     ');
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
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}${detail ? ` - ${detail}` : ''}`);
  };

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Configure offline Razorpay mock (zero external network calls)
  const mockRazorpay = createMockRazorpay();
  setCustomRazorpayInstance(mockRazorpay);

  try {
    // ----------------------------------------------------
    // Suite 1: Test Accounts Setup
    // ----------------------------------------------------
    console.log('\n[Suite 1] Setting Up Test Accounts...');

    const adminUser = await User.findOneAndUpdate(
      { email: 'atelier_admin_p11@aurevella.com' },
      {
        name: 'Atelier Director',
        email: 'atelier_admin_p11@aurevella.com',
        firebaseUid: 'fb-p11-admin-uid',
        role: 'admin',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const customerUser = await User.findOneAndUpdate(
      { email: 'patron_p11@aurevella.com' },
      {
        name: 'Lady Aurelia',
        email: 'patron_p11@aurevella.com',
        firebaseUid: 'fb-p11-cust-uid',
        role: 'customer',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const adminToken = jwt.sign(
      { id: adminUser._id.toString(), role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const customerToken = jwt.sign(
      { id: customerUser._id.toString(), role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const adminHeaders = {
      'Content-Type': 'application/json',
      'X-Aurevella-Request': '1',
      Cookie: `token=${adminToken}`,
      Origin: 'http://localhost:5173',
    };

    const customerHeaders = {
      'Content-Type': 'application/json',
      'X-Aurevella-Request': '1',
      Cookie: `token=${customerToken}`,
      Origin: 'http://localhost:5173',
    };

    record('Suite 1: Admin & Customer User Accounts Seeded', !!adminUser && !!customerUser);

    // ----------------------------------------------------
    // Suite 2: Access Control & Authorization Gates
    // ----------------------------------------------------
    console.log('\n[Suite 2] Testing Access Control & Security Gates...');

    // 2.1: Unauthenticated request to /api/admin/ping -> 401
    const unauthPingRes = await fetch(`${baseUrl}/api/admin/ping`);
    record(
      '2.1: Unauthenticated request to /api/admin/ping returns 401',
      unauthPingRes.status === 401,
      `Status: ${unauthPingRes.status}`
    );

    // 2.2: Unauthenticated request to /api/admin/stats -> 401
    const unauthStatsRes = await fetch(`${baseUrl}/api/admin/stats`);
    record(
      '2.2: Unauthenticated request to /api/admin/stats returns 401',
      unauthStatsRes.status === 401,
      `Status: ${unauthStatsRes.status}`
    );

    // 2.3: Customer user request to /api/admin/ping -> 403 Forbidden
    const custPingRes = await fetch(`${baseUrl}/api/admin/ping`, {
      headers: customerHeaders,
    });
    record(
      '2.3: Customer role request to /api/admin/ping is rejected with 403 Forbidden',
      custPingRes.status === 403,
      `Status: ${custPingRes.status}`
    );

    // 2.4: Customer user request to /api/admin/stats -> 403 Forbidden
    const custStatsRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: customerHeaders,
    });
    record(
      '2.4: Customer role request to /api/admin/stats is rejected with 403 Forbidden',
      custStatsRes.status === 403,
      `Status: ${custStatsRes.status}`
    );

    // 2.5: Admin user request to /api/admin/ping -> 200 OK
    const adminPingRes = await fetch(`${baseUrl}/api/admin/ping`, {
      headers: adminHeaders,
    });
    const adminPingData = await adminPingRes.json();
    record(
      '2.5: Admin role request to /api/admin/ping returns 200 OK with role confirmation',
      adminPingRes.status === 200 && adminPingData.admin?.role === 'admin',
      `Status: ${adminPingRes.status}`
    );

    // 2.6: CSRF Guard - Mutating request without X-Aurevella-Request header -> 403
    const noCsrfRes = await fetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${adminToken}`,
        Origin: 'http://localhost:5173',
      },
      body: JSON.stringify({ name: 'CSRF Attack Test' }),
    });
    record(
      '2.6: Admin mutating request without X-Aurevella-Request header blocked by CSRF guard (403)',
      noCsrfRes.status === 403,
      `Status: ${noCsrfRes.status}`
    );

    // ----------------------------------------------------
    // Suite 3: Categories & Orders Seeding for Analytics
    // ----------------------------------------------------
    console.log('\n[Suite 3] Seeding Categories, Launch Products & Orders for Analytics...');

    const testCategory = await Category.findOneAndUpdate(
      { slug: 'heels-p11' },
      {
        name: 'Artisanal Heels P11',
        slug: 'heels-p11',
        description: 'Bespoke high heel footwear collection',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // Clean test products
    await Product.deleteMany({
      $or: [
        { slug: { $in: ['p11-heel-01', 'p11-slide-02', 'p11-mule-03', 'p11-velvet-opera-pump', 'duplicate-code-product'] } },
        { code: { $in: ['prod-p11-01', 'prod-p11-02', 'prod-p11-03', 'prod-p11-04'] } },
      ],
    });

    // Clean test orders
    await Order.deleteMany({
      $or: [
        { user: customerUser._id },
        { orderNumber: { $in: ['AV-P11-TEST-0001', 'AV-P11-TEST-0002', 'AV-P11-TEST-0003', 'AV-P11-CONCUR-0001'] } },
      ],
    });

    // Seed 1 normal product, 1 low-stock product (<= 5), 1 out-of-stock product
    const p1 = await Product.create({
      name: 'P11 Master Heel',
      slug: 'p11-heel-01',
      code: 'prod-p11-01',
      pricePaise: 349900,
      category: testCategory._id,
      description: 'Handcrafted floral heel with interchangeable parts.',
      image: '/assets/images/products/p11-heel.webp',
      stockQuantity: 15,
      isActive: true,
    });

    const p2LowStock = await Product.create({
      name: 'P11 Low Stock Slide',
      slug: 'p11-slide-02',
      code: 'prod-p11-02',
      pricePaise: 329900,
      category: testCategory._id,
      description: 'Limited edition slide with 3 units remaining.',
      image: '/assets/images/products/p11-slide.webp',
      stockQuantity: 3, // <= 5: Should trigger low stock watchlist
      isActive: true,
    });

    const p3OutOfStock = await Product.create({
      name: 'P11 Sold Out Mule',
      slug: 'p11-mule-03',
      code: 'prod-p11-03',
      pricePaise: 369900,
      category: testCategory._id,
      description: 'Sold out artisanal mule awaiting atelier crafting.',
      image: '/assets/images/products/p11-mule.webp',
      stockQuantity: 0, // <= 5: Should trigger low stock watchlist
      isActive: true,
    });

    // Seed Orders with varied statuses:
    // Order A: Paid (₹3,499)
    const orderA = await Order.create({
      orderNumber: 'AV-P11-TEST-0001',
      user: customerUser._id,
      items: [
        {
          product: p1._id,
          productCode: p1.code,
          name: p1.name,
          slug: p1.slug,
          image: p1.image,
          pricePaise: p1.pricePaise,
          quantity: 1,
          lineTotalPaise: p1.pricePaise,
        },
      ],
      itemsCount: 1,
      subtotalPaise: 349900,
      shippingFeePaise: 0,
      totalPaise: 349900,
      shippingAddress: {
        recipientName: 'Lady Aurelia',
        phone: '9876543210',
        addressLine1: 'Villa 10, Palm Avenue',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      status: 'paid',
      paymentDetails: {
        method: 'razorpay',
        razorpayPaymentId: 'pay_p11_test_0001',
        razorpayOrderId: 'order_p11_test_0001',
        paidAt: new Date(),
      },
    });

    // Order B: Delivered (₹6,598)
    const orderB = await Order.create({
      orderNumber: 'AV-P11-TEST-0002',
      user: customerUser._id,
      items: [
        {
          product: p2LowStock._id,
          productCode: p2LowStock.code,
          name: p2LowStock.name,
          slug: p2LowStock.slug,
          image: p2LowStock.image,
          pricePaise: 329900,
          quantity: 2,
          lineTotalPaise: 659800,
        },
      ],
      itemsCount: 2,
      subtotalPaise: 659800,
      shippingFeePaise: 0,
      totalPaise: 659800,
      shippingAddress: {
        recipientName: 'Lady Aurelia',
        phone: '9876543210',
        addressLine1: 'Villa 10, Palm Avenue',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      status: 'delivered',
      paymentDetails: {
        method: 'razorpay',
        razorpayPaymentId: 'pay_p11_test_0002',
        razorpayOrderId: 'order_p11_test_0002',
        paidAt: new Date(),
      },
    });

    // Order C: Pending Payment (₹3,699 - unfulfilled, must not contribute to paid revenue)
    const orderC = await Order.create({
      orderNumber: 'AV-P11-TEST-0003',
      user: customerUser._id,
      items: [
        {
          product: p3OutOfStock._id,
          productCode: p3OutOfStock.code,
          name: p3OutOfStock.name,
          slug: p3OutOfStock.slug,
          image: p3OutOfStock.image,
          pricePaise: 369900,
          quantity: 1,
          lineTotalPaise: 369900,
        },
      ],
      itemsCount: 1,
      subtotalPaise: 369900,
      shippingFeePaise: 0,
      totalPaise: 369900,
      shippingAddress: {
        recipientName: 'Lady Aurelia',
        phone: '9876543210',
        addressLine1: 'Villa 10, Palm Avenue',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      status: 'pending_payment',
    });

    record('Suite 3: Categories, Products & Multi-Status Orders Seeded', true);

    // ----------------------------------------------------
    // Suite 4: Executive Dashboard Stats Verification
    // ----------------------------------------------------
    console.log('\n[Suite 4] Testing GET /api/admin/stats...');

    const statsRes = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: adminHeaders,
    });
    const statsData = await statsRes.json();
    const metrics = statsData?.metrics;

    // Revenue calculation: Order A (349900) + Order B (659800) = at least 1,009,700 paise
    const expectedMinRevenue = 349900 + 659800;
    record(
      '4.1: Dashboard revenue aggregates verified paid & delivered orders correctly',
      statsRes.status === 200 && metrics.revenue?.totalPaise >= expectedMinRevenue,
      `Total Paise: ${metrics?.revenue?.totalPaise} (Expected >= ${expectedMinRevenue})`
    );

    record(
      '4.2: Dashboard orders breakdown includes paid, delivered, and pending counts',
      metrics?.orders?.paid >= 1 &&
        metrics?.orders?.delivered >= 1 &&
        metrics?.orders?.pending >= 1,
      `Paid: ${metrics?.orders?.paid}, Delivered: ${metrics?.orders?.delivered}, Pending: ${metrics?.orders?.pending}`
    );

    record(
      '4.3: Low inventory watchlist accurately flags products with stock <= 5 units',
      metrics?.inventory?.lowStockCount >= 2 &&
        metrics?.inventory?.lowStockItems?.some((i) => i.code === 'prod-p11-02') &&
        metrics?.inventory?.lowStockItems?.some((i) => i.code === 'prod-p11-03'),
      `Low stock count: ${metrics?.inventory?.lowStockCount}`
    );

    record(
      '4.4: Total customer accounts count is returned accurately',
      metrics?.customers?.total >= 1,
      `Customer count: ${metrics?.customers?.total}`
    );

    // ----------------------------------------------------
    // Suite 5: Product CRUD Operations & Schema Validation
    // ----------------------------------------------------
    console.log('\n[Suite 5] Testing Product Management CRUD & Validations...');

    // 5.1: Create product without required name -> 400
    const invalidProd1 = await fetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        slug: 'invalid-prod-1',
        pricePaise: 350000,
        categoryId: testCategory._id.toString(),
        description: 'Missing title description',
        image: '/assets/sample.webp',
      }),
    });
    record(
      '5.1: Create product rejects missing title with 400 Bad Request',
      invalidProd1.status === 400,
      `Status: ${invalidProd1.status}`
    );

    // 5.2: Create product with negative price -> 400
    const invalidProd2 = await fetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'Negative Price Shoe',
        slug: 'neg-price-shoe',
        pricePaise: -500,
        categoryId: testCategory._id.toString(),
        description: 'Bespoke shoe description with invalid negative price.',
        image: '/assets/sample.webp',
      }),
    });
    record(
      '5.2: Create product rejects negative price with 400 Bad Request',
      invalidProd2.status === 400,
      `Status: ${invalidProd2.status}`
    );

    // 5.3: Create product with non-existent category -> 400
    const fakeCatId = new mongoose.Types.ObjectId().toString();
    const invalidProd3 = await fetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'Ghost Category Shoe',
        slug: 'ghost-cat-shoe',
        pricePaise: 420000,
        categoryId: fakeCatId,
        description: 'Bespoke shoe description with non-existent category.',
        image: '/assets/sample.webp',
      }),
    });
    record(
      '5.3: Create product rejects non-existent categoryId with 400 Bad Request',
      invalidProd3.status === 400,
      `Status: ${invalidProd3.status}`
    );

    // 5.4: Create valid product -> 201 Created
    const validCreateRes = await fetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'P11 Velvet Opera Pump',
        slug: 'p11-velvet-opera-pump',
        code: 'prod-p11-04',
        pricePaise: 499900,
        categoryId: testCategory._id.toString(),
        description: 'Midnight blue velvet evening pump with gold heel accent.',
        image: '/assets/images/products/velvet-pump.webp',
        images: ['/assets/images/products/velvet-pump-1.webp'],
        alt: 'Velvet evening pump',
        stockQuantity: 8,
        isActive: true,
        priority: true,
      }),
    });
    const validCreateData = await validCreateRes.json();
    const createdProductId = validCreateData?.product?._id;
    record(
      '5.4: Create valid product succeeds with 201 Created and returns populated product',
      validCreateRes.status === 201 && validCreateData.product?.name === 'P11 Velvet Opera Pump',
      `ID: ${createdProductId}`
    );

    // 5.5: Duplicate slug conflict -> 409 Conflict
    const dupSlugRes = await fetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'Duplicate Velvet Opera Pump',
        slug: 'p11-velvet-opera-pump', // Exact duplicate slug
        pricePaise: 499900,
        categoryId: testCategory._id.toString(),
        description: 'Duplicate attempt description.',
        image: '/assets/images/products/velvet-pump.webp',
      }),
    });
    record(
      '5.5: Create product with duplicate slug is rejected with 409 Conflict',
      dupSlugRes.status === 409,
      `Status: ${dupSlugRes.status}`
    );

    // 5.6: Duplicate code conflict -> 409 Conflict
    const dupCodeRes = await fetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'Duplicate Code Product',
        slug: 'duplicate-code-product',
        code: 'prod-p11-04', // Exact duplicate code
        pricePaise: 499900,
        categoryId: testCategory._id.toString(),
        description: 'Duplicate code attempt description.',
        image: '/assets/images/products/velvet-pump.webp',
      }),
    });
    record(
      '5.6: Create product with duplicate code is rejected with 409 Conflict',
      dupCodeRes.status === 409,
      `Status: ${dupCodeRes.status}`
    );

    // 5.7: Retrieve single product via GET /api/admin/products/:idOrSlug
    const getSingleRes = await fetch(`${baseUrl}/api/admin/products/${createdProductId}`, {
      headers: adminHeaders,
    });
    const getSingleData = await getSingleRes.json();
    record(
      '5.7: Retrieve single product by ID returns 200 with full product attributes',
      getSingleRes.status === 200 && getSingleData.product?.slug === 'p11-velvet-opera-pump',
      `Slug: ${getSingleData?.product?.slug}`
    );

    // 5.8: Update permitted fields via PUT /api/admin/products/:id
    const updateRes = await fetch(`${baseUrl}/api/admin/products/${createdProductId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'P11 Velvet Evening Pump Refined',
        pricePaise: 529900, // Updated price
        stockQuantity: 12,
        isActive: true,
      }),
    });
    const updateData = await updateRes.json();
    record(
      '5.8: Update product updates permitted attributes (name, pricePaise, stock) successfully',
      updateRes.status === 200 &&
        updateData.product?.name === 'P11 Velvet Evening Pump Refined' &&
        updateData.product?.pricePaise === 529900 &&
        updateData.product?.stockQuantity === 12,
      `Updated Price: ₹${updateData.product?.price}`
    );

    // ----------------------------------------------------
    // Suite 6: Atomic Inventory Stock Patch
    // ----------------------------------------------------
    console.log('\n[Suite 6] Testing PATCH /api/admin/products/:id/stock...');

    // 6.1: Negative stock quantity -> 400
    const negStockRes = await fetch(`${baseUrl}/api/admin/products/${createdProductId}/stock`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ stockQuantity: -4 }),
    });
    record(
      '6.1: Stock adjustment with negative number is rejected with 400 Bad Request',
      negStockRes.status === 400,
      `Status: ${negStockRes.status}`
    );

    // 6.2: Non-integer stock quantity -> 400
    const floatStockRes = await fetch(`${baseUrl}/api/admin/products/${createdProductId}/stock`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ stockQuantity: 4.5 }),
    });
    record(
      '6.2: Stock adjustment with non-integer is rejected with 400 Bad Request',
      floatStockRes.status === 400,
      `Status: ${floatStockRes.status}`
    );

    // 6.3: Valid stock adjustment -> 200
    const validStockRes = await fetch(`${baseUrl}/api/admin/products/${createdProductId}/stock`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ stockQuantity: 25 }),
    });
    const validStockData = await validStockRes.json();
    record(
      '6.3: Valid stock adjustment atomically updates inventory in database',
      validStockRes.status === 200 && validStockData.product?.stockQuantity === 25,
      `New Stock: ${validStockData.product?.stockQuantity}`
    );

    // ----------------------------------------------------
    // Suite 7: Order Fulfillment Security & State Machine
    // ----------------------------------------------------
    console.log('\n[Suite 7] Testing Order Fulfillment State Machine Security...');

    // CRITICAL SECURITY RULE: Admin can NEVER manually declare an order 'paid'
    // 7.1: Attempt to transition order to 'paid' -> 400 Bad Request
    const manualPaidRes = await fetch(
      `${baseUrl}/api/admin/orders/${orderC.orderNumber}/fulfillment`,
      {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({
          status: 'paid',
        }),
      }
    );
    record(
      '7.1: SECURITY POLICY: Admin attempt to manually set order status to "paid" is REJECTED (400)',
      manualPaidRes.status === 400,
      `Status: ${manualPaidRes.status}`
    );

    // 7.2: Attempt invalid progression on pending_payment order (pending_payment -> shipped) -> 400
    const invalidProgression1 = await fetch(
      `${baseUrl}/api/admin/orders/${orderC.orderNumber}/fulfillment`,
      {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({
          status: 'shipped',
        }),
      }
    );
    record(
      '7.2: Unpaid order cannot jump to "shipped" (rejected with 400 Invalid Transition)',
      invalidProgression1.status === 400,
      `Status: ${invalidProgression1.status}`
    );

    // 7.3: Valid progression step 1: 'paid' -> 'processing' -> 200
    const toProcessingRes = await fetch(
      `${baseUrl}/api/admin/orders/${orderA.orderNumber}/fulfillment`,
      {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({
          status: 'processing',
          notes: 'Heels crafting initiated in Mumbai Atelier.',
        }),
      }
    );
    const toProcessingData = await toProcessingRes.json();
    record(
      '7.3: Valid progression "paid" -> "processing" succeeds with 200 and logs audit notes',
      toProcessingRes.status === 200 && toProcessingData.order?.status === 'processing',
      `Status: ${toProcessingData.order?.status}`
    );

    // 7.4: Valid progression step 2: 'processing' -> 'shipped' -> 200
    const toShippedRes = await fetch(
      `${baseUrl}/api/admin/orders/${orderA.orderNumber}/fulfillment`,
      {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({
          status: 'shipped',
          notes: 'Dispatched via BlueDart Express AWB 948192841.',
        }),
      }
    );
    const toShippedData = await toShippedRes.json();
    record(
      '7.4: Valid progression "processing" -> "shipped" succeeds with 200',
      toShippedRes.status === 200 && toShippedData.order?.status === 'shipped',
      `Status: ${toShippedData.order?.status}`
    );

    // 7.5: Valid progression step 3: 'shipped' -> 'delivered' -> 200
    const toDeliveredRes = await fetch(
      `${baseUrl}/api/admin/orders/${orderA.orderNumber}/fulfillment`,
      {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({
          status: 'delivered',
          notes: 'Hand delivered to patron.',
        }),
      }
    );
    const toDeliveredData = await toDeliveredRes.json();
    record(
      '7.5: Valid progression "shipped" -> "delivered" succeeds with 200',
      toDeliveredRes.status === 200 && toDeliveredData.order?.status === 'delivered',
      `Status: ${toDeliveredData.order?.status}`
    );

    // 7.6: Delivered order is final: attempt 'delivered' -> 'processing' -> 400
    const invalidProgression2 = await fetch(
      `${baseUrl}/api/admin/orders/${orderA.orderNumber}/fulfillment`,
      {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({
          status: 'processing',
        }),
      }
    );
    record(
      '7.6: Delivered order cannot be rolled back (rejected with 400 Invalid Transition)',
      invalidProgression2.status === 400,
      `Status: ${invalidProgression2.status}`
    );

    // 7.7: Payment Details Immutability Check
    // Verify that Razorpay Payment ID and payment details are intact and untampered
    const inspectOrderA = await Order.findById(orderA._id);
    record(
      '7.7: Cryptographic payment details (razorpayPaymentId) remained immutable across all fulfillment transitions',
      inspectOrderA.paymentDetails?.razorpayPaymentId === 'pay_p11_test_0001' &&
        inspectOrderA.status === 'delivered',
      `Razorpay Payment ID: ${inspectOrderA.paymentDetails?.razorpayPaymentId}`
    );

    // 7.8: Atomic Concurrency & State Locking
    // Create an order in 'paid' status to test atomic status transition race
    const orderConcurrent = await Order.create({
      orderNumber: 'AV-P11-CONCUR-0001',
      user: customerUser._id,
      items: [
        {
          product: p1._id,
          productCode: p1.code,
          name: p1.name,
          slug: p1.slug,
          image: p1.image,
          pricePaise: p1.pricePaise,
          quantity: 1,
          lineTotalPaise: p1.pricePaise,
        },
      ],
      itemsCount: 1,
      subtotalPaise: 349900,
      shippingFeePaise: 0,
      totalPaise: 349900,
      shippingAddress: {
        recipientName: 'Lady Aurelia',
        phone: '9876543210',
        addressLine1: 'Villa 10, Palm Avenue',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      status: 'paid',
      paymentDetails: {
        method: 'razorpay',
        razorpayPaymentId: 'pay_p11_concur_0001',
        razorpayOrderId: 'order_p11_concur_0001',
        paidAt: new Date(),
      },
    });

    // Request 1 transitions order from 'paid' to 'processing' -> succeeds with 200
    const concurReq1 = await fetch(
      `${baseUrl}/api/admin/orders/${orderConcurrent.orderNumber}/fulfillment`,
      {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({
          status: 'processing',
          notes: 'Admin 1 initiated crafting',
          expectedStatus: 'paid',
        }),
      }
    );

    // Request 2 represents a concurrent/stale request that read the order as 'paid',
    // attempting to cancel -> rejected with 409 Conflict
    const concurReq2 = await fetch(
      `${baseUrl}/api/admin/orders/${orderConcurrent.orderNumber}/fulfillment`,
      {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({
          status: 'cancelled',
          notes: 'Admin 2 attempted cancellation on stale state',
          expectedStatus: 'paid',
        }),
      }
    );
    const concurData2 = await concurReq2.json();

    record(
      '7.8: Atomic Concurrency: Stale fulfillment transition is rejected with 409 Conflict',
      concurReq1.status === 200 && concurReq2.status === 409,
      `Req 1: ${concurReq1.status}, Req 2: ${concurReq2.status} (${concurData2.message})`
    );

    // ----------------------------------------------------
    // Suite 8: Orders Listing & Detailed Inspection
    // ----------------------------------------------------
    console.log('\n[Suite 8] Testing Orders Listing & Dossier Inspection...');

    // 8.1: GET /api/admin/orders returns paginated orders
    const getOrdersRes = await fetch(`${baseUrl}/api/admin/orders?page=1&limit=10`, {
      headers: adminHeaders,
    });
    const getOrdersData = await getOrdersRes.json();
    record(
      '8.1: GET /api/admin/orders returns paginated customer orders list',
      getOrdersRes.status === 200 && Array.isArray(getOrdersData.orders) && getOrdersData.orders.length >= 2,
      `Found ${getOrdersData.orders?.length} orders`
    );

    // 8.2: Status filtering: GET /api/admin/orders?status=delivered
    const filterDeliveredRes = await fetch(
      `${baseUrl}/api/admin/orders?status=delivered`,
      {
        headers: adminHeaders,
      }
    );
    const filterDeliveredData = await filterDeliveredRes.json();
    record(
      '8.2: Orders list filters accurately by status (all returned orders are delivered)',
      filterDeliveredRes.status === 200 &&
        filterDeliveredData.orders.every((o) => o.status === 'delivered'),
      `Delivered Count: ${filterDeliveredData.orders?.length}`
    );

    // 8.3: Search orders by orderNumber
    const searchRes = await fetch(
      `${baseUrl}/api/admin/orders?search=${orderA.orderNumber}`,
      {
        headers: adminHeaders,
      }
    );
    const searchData = await searchRes.json();
    record(
      '8.3: Orders search by orderNumber locates exact targeted order',
      searchRes.status === 200 && searchData.orders?.some((o) => o.orderNumber === orderA.orderNumber),
      `Matched: ${orderA.orderNumber}`
    );

    // 8.4: Detailed single order dossier via GET /api/admin/orders/:idOrNumber
    const singleOrderRes = await fetch(
      `${baseUrl}/api/admin/orders/${orderA.orderNumber}`,
      {
        headers: adminHeaders,
      }
    );
    const singleOrderData = await singleOrderRes.json();
    record(
      '8.4: Order dossier includes customer profile, full shipping address, and line items snapshot',
      singleOrderRes.status === 200 &&
        singleOrderData.order?.customer?.email === 'patron_p11@aurevella.com' &&
        singleOrderData.order?.shippingAddress?.city === 'Mumbai' &&
        Array.isArray(singleOrderData.order?.items),
      `Recipient: ${singleOrderData.order?.shippingAddress?.recipientName}`
    );

    // ----------------------------------------------------
    // Suite 9: Multi-tenant Privilege Escalation Prevention
    // ----------------------------------------------------
    console.log('\n[Suite 9] Testing Multi-Tenant Privilege Escalation Prevention...');

    // 9.1: Customer attempts to elevate own role via PATCH /api/auth/profile
    const elevateRoleRes = await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'PATCH',
      headers: customerHeaders,
      body: JSON.stringify({
        role: 'admin',
        name: 'Hacked Admin Name',
      }),
    });
    const reFetchedCustomer = await User.findById(customerUser._id);
    record(
      '9.1: Customer cannot elevate own role to "admin" via profile update (remains "customer")',
      reFetchedCustomer.role === 'customer',
      `Actual Role: ${reFetchedCustomer.role}`
    );

    // 9.2: Customer cannot create or modify products
    const customerCreateProdRes = await fetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        name: 'Unauthorized Sneaker',
        slug: 'unauthorized-sneaker',
        pricePaise: 100000,
        categoryId: testCategory._id.toString(),
        description: 'Unauthorized creation attempt',
        image: '/assets/sample.webp',
      }),
    });
    record(
      '9.2: Customer role is blocked from product creation with 403 Forbidden',
      customerCreateProdRes.status === 403,
      `Status: ${customerCreateProdRes.status}`
    );

  } catch (err) {
    console.error('\n[Test Suite Error]:', err);
    record('Test Suite Execution', false, err.message);
  } finally {
    // Teardown
    resetCustomRazorpayInstance();
    server.close();
    await mongoose.connection.close();
    console.log('\n[Teardown] Test database connection and server closed.');
  }

  // Summary Table Output
  console.log('\n====================================================');
  console.log('            PHASE 11 TEST RESULTS SUMMARY            ');
  console.log('====================================================');
  console.table(results);

  const totalCount = results.length;
  const passedCount = results.filter((r) => r.Status === 'PASS').length;
  const failedCount = results.filter((r) => r.Status === 'FAIL').length;

  console.log(`\nExecution Summary: ${passedCount} passed, ${failedCount} failed, ${totalCount} total assertions.`);

  if (allPassed && failedCount === 0 && totalCount > 0) {
    console.log(`\n>>> ALL ${totalCount} TESTS PASSED SUCCESSFULLY! <<<\n`);
    process.exit(0);
  } else {
    console.error(`\n>>> ${failedCount} TEST(S) FAILED OUT OF ${totalCount}! <<<\n`);
    process.exit(1);
  }
}

runPhase11TestSuite();