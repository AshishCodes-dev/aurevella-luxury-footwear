import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { connectTestDB } from '../src/config/db.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import Address from '../src/models/Address.js';
import User from '../src/models/User.js';

async function runPhase5TestSuite() {
  console.log('====================================================');
  console.log('   AUREVELLA — Phase 5 Backend Verification Suite   ');
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

  // Start ephemeral server
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // ----------------------------------------------------
    // 1. Model Validation Tests
    // ----------------------------------------------------
    console.log('[Suite 1] Testing Mongoose Models & Validation Rules...');

    // 1A. Product pricePaise integer enforcement
    let priceError = null;
    try {
      const invalidProd = new Product({
        name: 'Invalid Price Product',
        slug: 'invalid-price-prod',
        category: new mongoose.Types.ObjectId(),
        pricePaise: 3499.5, // Float, not integer
        description: 'Test',
        image: '/images/test.jpg',
        stockQuantity: 10,
      });
      await invalidProd.validate();
    } catch (err) {
      priceError = err;
    }
    record(
      'Product Model: Rejects non-integer pricePaise',
      priceError !== null && priceError.errors?.pricePaise !== undefined,
      priceError ? 'Validation failed as expected on fractional paise' : 'Failed to reject float'
    );

    // 1B. Product negative price rejection
    let negativePriceError = null;
    try {
      const invalidProd = new Product({
        name: 'Negative Price Product',
        slug: 'negative-price-prod',
        category: new mongoose.Types.ObjectId(),
        pricePaise: -500,
        description: 'Test',
        image: '/images/test.jpg',
        stockQuantity: 10,
      });
      await invalidProd.validate();
    } catch (err) {
      negativePriceError = err;
    }
    record(
      'Product Model: Rejects negative pricePaise',
      negativePriceError !== null && negativePriceError.errors?.pricePaise !== undefined,
      negativePriceError ? 'Rejected negative price' : 'Failed to reject negative price'
    );

    // 1C. Address PIN Code validation
    let pinError = null;
    try {
      const invalidAddr = new Address({
        user: new mongoose.Types.ObjectId(),
        recipientName: 'Test Recipient',
        phone: '+91 9876543210',
        addressLine1: '123 Atelier Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '012345', // Starts with 0, invalid in India
      });
      await invalidAddr.validate();
    } catch (err) {
      pinError = err;
    }
    record(
      'Address Model: Rejects invalid Indian PIN code format',
      pinError !== null && pinError.errors?.postalCode !== undefined,
      pinError ? 'Regex asserted 6-digit PIN code starting with 1-9' : 'Failed to assert PIN format'
    );

    // ----------------------------------------------------
    // 2. Public Catalogue Endpoints
    // ----------------------------------------------------
    console.log('\n[Suite 2] Testing Public Catalogue API Endpoints...');

    // 2A. GET /api/categories
    const catRes = await fetch(`${baseUrl}/api/categories`);
    const catData = await catRes.json();
    const has2Categories = catRes.status === 200 && catData.categories?.length >= 2;
    record(
      'GET /api/categories: Returns active categories',
      has2Categories,
      `Status ${catRes.status}, count: ${catData.categories?.length || 0}`
    );

    // 2B. GET /api/products
    const prodRes = await fetch(`${baseUrl}/api/products`);
    const prodData = await prodRes.json();
    const has3Products = prodRes.status === 200 && prodData.products?.length === 3;
    record(
      'GET /api/products: Returns all 3 active launch products',
      has3Products,
      `Status ${prodRes.status}, count: ${prodData.products?.length || 0}`
    );

    // 2C. GET /api/products?category=interchangeable-heel
    const heelRes = await fetch(`${baseUrl}/api/products?category=interchangeable-heel`);
    const heelData = await heelRes.json();
    const heelOk = heelRes.status === 200 && heelData.products?.length === 2;
    record(
      'GET /api/products?category=interchangeable-heel: Filters correctly',
      heelOk,
      `Returned ${heelData.products?.length} heel products (expected 2)`
    );

    // 2D. GET /api/products?category=flat-slide
    const slideRes = await fetch(`${baseUrl}/api/products?category=flat-slide`);
    const slideData = await slideRes.json();
    const slideOk = slideRes.status === 200 && slideData.products?.length === 1;
    record(
      'GET /api/products?category=flat-slide: Filters correctly',
      slideOk,
      `Returned ${slideData.products?.length} slide products (expected 1)`
    );

    // 2E. GET /api/products?sort=price-asc
    const sortRes = await fetch(`${baseUrl}/api/products?sort=price-asc`);
    const sortData = await sortRes.json();
    const prices = (sortData.products || []).map((p) => p.pricePaise);
    const isSortedAsc = prices.length === 3 && prices[0] <= prices[1] && prices[1] <= prices[2];
    record(
      'GET /api/products?sort=price-asc: Sorts price ascending',
      isSortedAsc,
      `Prices in paise: ${prices.join(', ')}`
    );

    // 2F. GET /api/products/:idOrSlug (by slug)
    const slugRes = await fetch(`${baseUrl}/api/products/blue-floral-slide`);
    const slugData = await slugRes.json();
    const slugOk = slugRes.status === 200 && slugData.product?.name === 'Blue Floral Slide';
    record(
      'GET /api/products/:slug: Resolves product by slug',
      slugOk,
      `Status ${slugRes.status}, product: "${slugData.product?.name}"`
    );

    // 2G. GET /api/products/:idOrSlug (by Code and MongoDB _id)
    const firstProd = prodData.products?.[0];
    const codeRes = await fetch(`${baseUrl}/api/products/${firstProd.id}`);
    const codeData = await codeRes.json();
    const codeOk = codeRes.status === 200 && codeData.product?.id === firstProd.id;

    const mongoIdRes = await fetch(`${baseUrl}/api/products/${firstProd._id}`);
    const mongoIdData = await mongoIdRes.json();
    const mongoIdOk = mongoIdRes.status === 200 && mongoIdData.product?._id === firstProd._id;

    record(
      'GET /api/products/:id: Resolves product by Code (prod-01) and MongoDB _id',
      codeOk && mongoIdOk,
      `Code match: ${codeOk}, Mongo _id match: ${mongoIdOk}`
    );

    // 2H. GET /api/products/:idOrSlug (Non-existent / Invalid)
    const notFoundRes = await fetch(`${baseUrl}/api/products/non-existent-luxury-shoe-slug`);
    const notFoundData = await notFoundRes.json();
    const notFoundOk = notFoundRes.status === 404 && notFoundData.status === 'error';
    record(
      'GET /api/products/:idOrSlug: Returns 404 on missing product',
      notFoundOk,
      `Status ${notFoundRes.status}, message: "${notFoundData.message}"`
    );

    // ----------------------------------------------------
    // 3. Customer Address API & Ownership Isolation
    // ----------------------------------------------------
    console.log('\n[Suite 3] Testing Customer Address API & Ownership Security...');

    // 3A. Unauthenticated requests blocked
    const unauthGet = await fetch(`${baseUrl}/api/users/addresses`);
    record(
      'GET /api/users/addresses: Rejects unauthenticated request',
      unauthGet.status === 401,
      `Status ${unauthGet.status} (expected 401)`
    );

    const unauthPost = await fetch(`${baseUrl}/api/users/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Aurevella-Request': '1', Origin: 'http://localhost:5173' },
      body: JSON.stringify({ recipientName: 'Ghost' }),
    });
    record(
      'POST /api/users/addresses: Rejects unauthenticated request',
      unauthPost.status === 401,
      `Status ${unauthPost.status} (expected 401)`
    );

    // Create 2 distinct test users in MongoDB
    const testUserA = await User.findOneAndUpdate(
      { email: 'test_client_a@aurevella.com' },
      {
        name: 'Client Alpha',
        email: 'test_client_a@aurevella.com',
        firebaseUid: 'fb-uid-test-alpha-001',
        role: 'customer',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const testUserB = await User.findOneAndUpdate(
      { email: 'test_client_b@aurevella.com' },
      {
        name: 'Client Beta',
        email: 'test_client_b@aurevella.com',
        firebaseUid: 'fb-uid-test-beta-002',
        role: 'customer',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // Mint signed session tokens for both users
    const tokenA = jwt.sign({ id: testUserA._id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const tokenB = jwt.sign({ id: testUserB._id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Clean any prior test addresses for these users
    await Address.deleteMany({ user: { $in: [testUserA._id, testUserB._id] } });

    // 3B. Address validation: reject invalid payload
    const badAddressRes = await fetch(`${baseUrl}/api/users/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Aurevella-Request': '1',
        Origin: 'http://localhost:5173',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify({
        recipientName: 'A', // too short (< 2)
        phone: '123', // too short (< 10)
        addressLine1: 'Short',
        city: 'M',
        state: 'MH',
        postalCode: 'bad-pin',
      }),
    });
    const badAddressData = await badAddressRes.json();
    record(
      'POST /api/users/addresses: Enforces strict address validation',
      badAddressRes.status === 400 && badAddressData.errors?.length > 0,
      `Status ${badAddressRes.status}, caught ${badAddressData.errors?.length || 0} validation errors`
    );

    // 3C. Valid address creation for User A
    const validAddressPayload = {
      recipientName: 'Alpha Client',
      phone: '+91 9876543210',
      addressLine1: 'Penthouse 4B, Aurevella Residences',
      addressLine2: 'Near Regal Circle',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
      isDefault: true,
    };

    const createRes = await fetch(`${baseUrl}/api/users/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Aurevella-Request': '1',
        Origin: 'http://localhost:5173',
        Cookie: `token=${tokenA}`,
      },
      body: JSON.stringify(validAddressPayload),
    });
    const createData = await createRes.json();
    const createdOk = createRes.status === 201 && createData.address?.city === 'Mumbai';
    record(
      'POST /api/users/addresses: Creates address successfully',
      createdOk,
      `Status ${createRes.status}, created address ID: ${createData.address?.id}`
    );

    // 3D. Ownership check: User A sees their address
    const getResA = await fetch(`${baseUrl}/api/users/addresses`, {
      headers: { Cookie: `token=${tokenA}` },
    });
    const dataA = await getResA.json();
    const userAOk = getResA.status === 200 && dataA.addresses?.length === 1;
    record(
      'GET /api/users/addresses: User A retrieves their own address',
      userAOk,
      `User A address count: ${dataA.addresses?.length || 0}`
    );

    // 3E. Ownership Isolation check: User B sees ZERO addresses
    const getResB = await fetch(`${baseUrl}/api/users/addresses`, {
      headers: { Cookie: `token=${tokenB}` },
    });
    const dataB = await getResB.json();
    const userBOk = getResB.status === 200 && dataB.addresses?.length === 0;
    record(
      'GET /api/users/addresses: User B CANNOT see User A addresses (Strict Ownership Isolation)',
      userBOk,
      `User B address count: ${dataB.addresses?.length || 0} (cross-tenant leakage: NONE)`
    );

    // Clean up test data
    await Address.deleteMany({ user: { $in: [testUserA._id, testUserB._id] } });
    await User.deleteMany({ _id: { $in: [testUserA._id, testUserB._id] } });
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  // Print results table
  console.log('\n====================================================');
  console.log('              PHASE 5 TEST RESULTS MATRIX           ');
  console.log('====================================================\n');
  console.table(results);

  if (allPassed) {
    console.log('\n✔ ALL PHASE 5 TESTS PASSED WITH 100% SUCCESS!\n');
    process.exit(0);
  } else {
    console.error('\n❌ SOME TESTS FAILED. See details above.\n');
    process.exit(1);
  }
}

runPhase5TestSuite().catch((err) => {
  console.error('[Unhandled Suite Error]:', err);
  process.exit(1);
});
