import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { connectTestDB } from '../src/config/db.js';
import Product from '../src/models/Product.js';
import Address from '../src/models/Address.js';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import {
  validateAndCalculateOrderItems,
  OrderValidationError,
} from '../src/utils/orderPricing.js';
import { processPaymentSuccessAndDeductInventory } from '../src/services/paymentInventory.service.js';

async function runPhase14TestSuite() {
  console.log('====================================================');
  console.log('   AUREVELLA — Phase 14 Size Selection & Sizing Suite');
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

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const createdOrderIds = [];
  let testUser = null;
  let testAddress = null;

  try {
    // ----------------------------------------------------
    // Suite 1: Product Model Schema & Provisional Sizing Support
    // ----------------------------------------------------
    console.log('[Suite 1] Testing Product Model Schema & Provisional Sizes...');

    const defaultSizes = ['EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41'];

    // 1A: Default sizes populated on new product instance
    const sampleProduct = new Product({
      name: 'Phase 14 Test Sandal',
      slug: 'phase-14-test-sandal',
      pricePaise: 349900,
      category: new mongoose.Types.ObjectId(),
      description: 'Handcrafted test footwear for Phase 14 sizing suite',
      image: '/images/products/product-01-floral-block-heel-sandal.jpg',
      stockQuantity: 10,
    });

    record(
      'Product Model: Defaults sizes to provisional EU 36-41 range',
      Array.isArray(sampleProduct.sizes) &&
        sampleProduct.sizes.length === 6 &&
        sampleProduct.sizes.every((sz, idx) => sz === defaultSizes[idx]),
      `Sizes: ${sampleProduct.sizes?.join(', ')}`
    );

    // 1B: toSafeJSON includes sizes array
    const safeProduct = sampleProduct.toSafeJSON();
    record(
      'Product Model: toSafeJSON exposes sizes array',
      Array.isArray(safeProduct.sizes) && safeProduct.sizes.includes('EU 38'),
      `Exposed ${safeProduct.sizes?.length} sizes`
    );

    // ----------------------------------------------------
    // Suite 2: Order Model Schema & Size Field Snapshot
    // ----------------------------------------------------
    console.log('\n[Suite 2] Testing Order Model Schema & Size Snapshot...');

    // 2A: Valid size persists in order item
    const sizedOrderItem = {
      product: new mongoose.Types.ObjectId(),
      productCode: 'prod-01',
      name: 'Floral Block Heel Sandal',
      slug: 'floral-block-heel-sandal',
      image: '/images/products/product-01-floral-block-heel-sandal.jpg',
      size: 'EU 38',
      pricePaise: 349900,
      quantity: 1,
      lineTotalPaise: 349900,
    };

    const validOrder = new Order({
      orderNumber: 'AUR-P14-0001',
      user: new mongoose.Types.ObjectId(),
      items: [sizedOrderItem],
      shippingAddress: {
        recipientName: 'Test Patron',
        phone: '+91 9876543210',
        addressLine1: 'Atelier Suites 101',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      itemsCount: 1,
      subtotalPaise: 349900,
      totalPaise: 349900,
    });

    await validOrder.validate();
    record(
      'Order Model: Accepts order item with selected size',
      validOrder.items[0].size === 'EU 38',
      `Persisted size: ${validOrder.items[0].size}`
    );

    // 2B: Backward compatibility - size omitted or null is valid
    const legacyOrderItem = {
      product: new mongoose.Types.ObjectId(),
      productCode: 'prod-02',
      name: 'Blue Floral Slide',
      slug: 'blue-floral-slide',
      image: '/images/products/product-02-blue-floral-slide.jpg',
      pricePaise: 329900,
      quantity: 1,
      lineTotalPaise: 329900,
    };

    const legacyOrder = new Order({
      orderNumber: 'AUR-P14-0002',
      user: new mongoose.Types.ObjectId(),
      items: [legacyOrderItem],
      shippingAddress: {
        recipientName: 'Legacy Patron',
        phone: '+91 9876543210',
        addressLine1: 'Legacy Suites 102',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      itemsCount: 1,
      subtotalPaise: 329900,
      totalPaise: 329900,
    });

    await legacyOrder.validate();
    record(
      'Order Model: Allows order item with null / omitted size (legacy backward compatibility)',
      legacyOrder.items[0].size === null,
      `Legacy size defaults to null`
    );

    // 2C: Rejects size exceeding 20 characters
    let longSizeErr = null;
    try {
      const longSizeOrder = new Order({
        orderNumber: 'AUR-P14-0003',
        user: new mongoose.Types.ObjectId(),
        items: [
          {
            ...sizedOrderItem,
            size: 'EU 38 SUPER EXTRA ULTRA LONG SIZE VALUE OVER 20 CHARACTERS',
          },
        ],
        shippingAddress: {
          recipientName: 'Patron',
          phone: '+91 9876543210',
          addressLine1: '123 Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
        },
        itemsCount: 1,
        subtotalPaise: 349900,
        totalPaise: 349900,
      });
      await longSizeOrder.validate();
    } catch (e) {
      longSizeErr = e;
    }
    record(
      'Order Model: Enforces maxlength 20 on size field',
      longSizeErr !== null && longSizeErr.errors?.['items.0.size'] !== undefined,
      longSizeErr ? 'Rejected overly long size value' : 'Allowed invalid size length'
    );

    // 2D: toSafeJSON includes size field
    const safeOrder = validOrder.toSafeJSON();
    record(
      'Order Model: toSafeJSON exposes item size snapshot',
      safeOrder.items[0].size === 'EU 38',
      `Serialized size: ${safeOrder.items[0].size}`
    );

    // ----------------------------------------------------
    // Suite 3: Order Pricing & Sizing Server Validation
    // ----------------------------------------------------
    console.log('\n[Suite 3] Testing Server-Side Sizing Validation & Composite Pricing...');

    // Ensure prod-01 exists with known stock
    let prod01 = await Product.findOne({ code: 'prod-01' });
    if (!prod01) {
      throw new Error('prod-01 must exist in the database for testing');
    }

    // Temporarily save original stock
    const originalStock = prod01.stockQuantity;
    await Product.updateOne({ _id: prod01._id }, { $set: { stockQuantity: 10 } });
    prod01 = await Product.findById(prod01._id);

    // 3A: Accepts valid size
    const validPriced = await validateAndCalculateOrderItems([
      { id: 'prod-01', quantity: 2, size: 'EU 38' },
    ]);
    record(
      'OrderPricing: Accepts supported size ("EU 38")',
      validPriced.items[0].size === 'EU 38' && validPriced.items[0].quantity === 2,
      `Calculated lines: ${validPriced.items.length}`
    );

    // 3B: Rejects invalid size ("EU 99") with 400
    let invalidSizeErr = null;
    try {
      await validateAndCalculateOrderItems([
        { id: 'prod-01', quantity: 1, size: 'EU 99' },
      ]);
    } catch (e) {
      invalidSizeErr = e;
    }
    record(
      'OrderPricing: Rejects unsupported size ("EU 99") with 400 Bad Request',
      invalidSizeErr instanceof OrderValidationError &&
        invalidSizeErr.statusCode === 400 &&
        invalidSizeErr.message.includes('Invalid or unsupported size "EU 99"'),
      invalidSizeErr ? invalidSizeErr.message : 'Accepted invalid size'
    );

    // 3C: Rejects omitted size on footwear product
    let omittedSizeErr = null;
    try {
      await validateAndCalculateOrderItems([
        { id: 'prod-01', quantity: 1 },
      ]);
    } catch (e) {
      omittedSizeErr = e;
    }
    record(
      'OrderPricing: Rejects omitted size on footwear product with 400 Bad Request',
      omittedSizeErr instanceof OrderValidationError &&
        omittedSizeErr.statusCode === 400 &&
        omittedSizeErr.message.includes('size is required'),
      omittedSizeErr ? omittedSizeErr.message : 'Permitted omitted size'
    );

    // 3C-2: Rejects null size on footwear product
    let nullSizeErr = null;
    try {
      await validateAndCalculateOrderItems([
        { id: 'prod-01', quantity: 1, size: null },
      ]);
    } catch (e) {
      nullSizeErr = e;
    }
    record(
      'OrderPricing: Rejects null size on footwear product with 400 Bad Request',
      nullSizeErr instanceof OrderValidationError &&
        nullSizeErr.statusCode === 400 &&
        nullSizeErr.message.includes('size is required'),
      nullSizeErr ? nullSizeErr.message : 'Permitted null size'
    );

    // 3C-3: Rejects whitespace-only size on footwear product
    let blankSizeErr = null;
    try {
      await validateAndCalculateOrderItems([
        { id: 'prod-01', quantity: 1, size: '   ' },
      ]);
    } catch (e) {
      blankSizeErr = e;
    }
    record(
      'OrderPricing: Rejects whitespace-only size on footwear product with 400 Bad Request',
      blankSizeErr instanceof OrderValidationError &&
        blankSizeErr.statusCode === 400 &&
        blankSizeErr.message.includes('size is required'),
      blankSizeErr ? blankSizeErr.message : 'Permitted whitespace size'
    );

    // 3C-4: Permits non-footwear products with empty sizes array without size requirement
    const nonFootwearProd = await Product.findOneAndUpdate(
      { slug: 'temp-shoe-care-balm' },
      {
        name: 'Atelier Leather Conditioning Balm',
        slug: 'temp-shoe-care-balm',
        code: 'prod-care-balm',
        pricePaise: 150000,
        category: prod01.category,
        description: 'Bespoke leather conditioning balm for luxury calfskin',
        image: '/images/products/product-01-floral-block-heel-sandal.jpg',
        stockQuantity: 20,
        sizes: [], // Explicitly non-footwear item with no sizes
      },
      { upsert: true, new: true }
    );

    const nonFootwearPriced = await validateAndCalculateOrderItems([
      { id: 'prod-care-balm', quantity: 1 },
    ]);
    record(
      'OrderPricing: Permits non-footwear products with empty sizes array without size requirement',
      nonFootwearPriced.items[0].size === null && nonFootwearPriced.totalPaise === 150000,
      `Calculated non-footwear product line without error`
    );

    await Product.deleteOne({ _id: nonFootwearProd._id });

    // 3D: Allows multiple lines of the same product with distinct sizes
    const compositePriced = await validateAndCalculateOrderItems([
      { id: 'prod-01', quantity: 2, size: 'EU 37' },
      { id: 'prod-01', quantity: 3, size: 'EU 39' },
    ]);
    record(
      'OrderPricing: Supports composite line items (different sizes of same product)',
      compositePriced.items.length === 2 &&
        compositePriced.items[0].size === 'EU 37' &&
        compositePriced.items[1].size === 'EU 39' &&
        compositePriced.itemsCount === 5,
      `Total items count: ${compositePriced.itemsCount}`
    );

    // 3E: Enforces aggregate stock constraint across all size lines of the same product
    let aggregateStockErr = null;
    try {
      // prod-01 has stock 10. Request 6 + 6 = 12
      await validateAndCalculateOrderItems([
        { id: 'prod-01', quantity: 6, size: 'EU 37' },
        { id: 'prod-01', quantity: 6, size: 'EU 38' },
      ]);
    } catch (e) {
      aggregateStockErr = e;
    }
    record(
      'OrderPricing: Enforces aggregate stock constraint across all size lines',
      aggregateStockErr instanceof OrderValidationError &&
        aggregateStockErr.message.includes('Insufficient stock'),
      aggregateStockErr ? aggregateStockErr.message : 'Allowed exceeding aggregate stock'
    );

    // ----------------------------------------------------
    // Suite 4: End-to-End API Integration
    // ----------------------------------------------------
    console.log('\n[Suite 4] Testing End-to-End Order Creation & Quote APIs...');

    testUser = await User.findOneAndUpdate(
      { email: 'patron-p14@aurevella-atelier.com' },
      {
        email: 'patron-p14@aurevella-atelier.com',
        name: 'Phase 14 Patron',
        firebaseUid: 'firebase_p14_uid_987',
        role: 'customer',
      },
      { upsert: true, new: true }
    );

    testAddress = await Address.findOneAndUpdate(
      { user: testUser._id, recipientName: 'Phase 14 Patron' },
      {
        user: testUser._id,
        recipientName: 'Phase 14 Patron',
        phone: '+91 9876543210',
        addressLine1: 'Penthouse 404, Marine Lines',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400020',
        country: 'India',
        isDefault: true,
      },
      { upsert: true, new: true }
    );

    const token = jwt.sign(
      { id: testUser._id.toString(), role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const authHeaders = {
      'Content-Type': 'application/json',
      'X-Aurevella-Request': '1',
      Cookie: `token=${token}`,
      Origin: 'http://localhost:5173',
    };

    // 4A: Quote endpoint with size
    const quoteRes = await fetch(`${baseUrl}/api/orders/quote`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        items: [{ id: 'prod-01', quantity: 1, size: 'EU 40' }],
        addressId: testAddress._id.toString(),
      }),
    });
    const quoteData = await quoteRes.json();

    record(
      'API /api/orders/quote: Returns validated size in quote line items',
      quoteRes.status === 200 && quoteData.quote?.items?.[0]?.size === 'EU 40',
      `Quote item size: ${quoteData.quote?.items?.[0]?.size}`
    );

    // 4B: Quote endpoint rejects invalid size
    const badQuoteRes = await fetch(`${baseUrl}/api/orders/quote`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        items: [{ id: 'prod-01', quantity: 1, size: 'EU 999' }],
        addressId: testAddress._id.toString(),
      }),
    });
    const badQuoteData = await badQuoteRes.json();

    record(
      'API /api/orders/quote: Rejects invalid size with 400 Bad Request',
      badQuoteRes.status === 400 && badQuoteData.status === 'error',
      `Error: ${badQuoteData.message}`
    );

    // 4C: Create order with sizes
    const createOrderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        items: [
          { id: 'prod-01', quantity: 1, size: 'EU 38' },
          { id: 'prod-01', quantity: 1, size: 'EU 39' },
        ],
        addressId: testAddress._id.toString(),
        notes: 'Phase 14 verified order with selected shoe sizes',
        idempotencyKey: `p14_idemp_${Date.now()}`,
      }),
    });
    const createOrderData = await createOrderRes.json();
    const createdOrder = createOrderData.order;

    if (createdOrder?.id) {
      createdOrderIds.push(createdOrder.id);
    }

    record(
      'API POST /api/orders: Successfully creates order with sized composite line items',
      createOrderRes.status === 201 &&
        createdOrder?.items?.length === 2 &&
        createdOrder?.items[0]?.size === 'EU 38' &&
        createdOrder?.items[1]?.size === 'EU 39',
      `Order ${createdOrder?.orderNumber} created with 2 sized lines`
    );

    // 4D: GET /api/orders/:id returns size snapshot
    const fetchOrderRes = await fetch(`${baseUrl}/api/orders/${createdOrder.id}`, {
      method: 'GET',
      headers: authHeaders,
    });
    const fetchOrderData = await fetchOrderRes.json();
    const fetchedOrder = fetchOrderData.order;

    record(
      'API GET /api/orders/:id: Returns exact size snapshot in line items',
      fetchOrderRes.status === 200 &&
        fetchedOrder?.items?.[0]?.size === 'EU 38' &&
        fetchedOrder?.items?.[1]?.size === 'EU 39',
      `Retrieved sizes: ${fetchedOrder?.items?.map((i) => i.size).join(', ')}`
    );

    // 4E: Quote endpoint rejects omitted size on footwear
    const unsizedQuoteRes = await fetch(`${baseUrl}/api/orders/quote`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        items: [{ id: 'prod-01', quantity: 1 }],
        addressId: testAddress._id.toString(),
      }),
    });
    const unsizedQuoteData = await unsizedQuoteRes.json();
    record(
      'API /api/orders/quote: Rejects request missing required footwear size with 400 Bad Request',
      unsizedQuoteRes.status === 400 && unsizedQuoteData.message.includes('size is required'),
      `Error: ${unsizedQuoteData.message}`
    );

    // 4F: Create order endpoint rejects omitted or blank size on footwear
    const unsizedOrderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        items: [{ id: 'prod-01', quantity: 1, size: '   ' }],
        addressId: testAddress._id.toString(),
        notes: 'Unsized order attempt',
      }),
    });
    const unsizedOrderData = await unsizedOrderRes.json();
    record(
      'API POST /api/orders: Rejects request missing required footwear size with 400 Bad Request',
      unsizedOrderRes.status === 400 && unsizedOrderData.message.includes('size is required'),
      `Error: ${unsizedOrderData.message}`
    );

    // ----------------------------------------------------
    // Suite 5: Inventory Decrement with Sized Order Items
    // ----------------------------------------------------
    console.log('\n[Suite 5] Testing Stock Fulfillment & Deductions for Sized Orders...');

    const stockBefore = (await Product.findById(prod01._id)).stockQuantity;

    // Fulfill payment on the created multi-size order (quantity 2 total)
    const deductionResult = await processPaymentSuccessAndDeductInventory({
      orderId: createdOrder.id,
      razorpayPaymentId: `pay_p14_test_${Date.now()}`,
      razorpaySignature: 'sig_mock_p14',
    });

    const stockAfter = (await Product.findById(prod01._id)).stockQuantity;

    record(
      'Inventory: Atomically decrements aggregate stock for sized line items',
      deductionResult.success === true && stockAfter === stockBefore - 2,
      `Stock: ${stockBefore} -> ${stockAfter} (Decremented by 2)`
    );

    // Restore original stock
    await Product.updateOne({ _id: prod01._id }, { $set: { stockQuantity: originalStock } });

  } catch (err) {
    console.error('\n[FATAL TEST ERROR]:', err);
    record('Test Suite Execution', false, err.message);
  } finally {
    // Clean up created test orders, users, and addresses
    console.log('\nCleaning up Phase 14 test artifacts...');
    if (createdOrderIds.length > 0) {
      await Order.deleteMany({ _id: { $in: createdOrderIds } });
    }
    if (testAddress) {
      await Address.deleteOne({ _id: testAddress._id });
    }
    if (testUser) {
      await User.deleteOne({ _id: testUser._id });
    }

    server.close();
    await mongoose.connection.close();
  }

  // Print Summary Table
  console.log('\n====================================================');
  console.log('             PHASE 14 TEST RESULTS SUMMARY          ');
  console.log('====================================================');
  console.table(results);

  const passedCount = results.filter((r) => r.Status === 'PASS').length;
  const totalCount = results.length;
  console.log(`\nResults: ${passedCount}/${totalCount} tests passed.`);

  if (!allPassed || passedCount < totalCount) {
    console.error('Phase 14 Test Suite FAILED.');
    process.exit(1);
  } else {
    console.log('All Phase 14 Test Suite checks PASSED.\n');
    process.exit(0);
  }
}

runPhase14TestSuite();
