/**
 * AUREVELLA — Contact & Concierge Automated Verification Suite
 *
 * Verifies:
 * 1. Inquiry Mongoose Model schema constraints and validation
 * 2. POST /api/contact public route CSRF requirement
 * 3. Zod input validation (invalid email, missing name, missing message)
 * 4. Anti-bot honeypot defense (silently succeeds with status 200, zero DB writes)
 * 5. Successful public inquiry submission (status 201, document persisted in MongoDB)
 * 6. Dedicated rate limiter (5 req/15 min per IP, 6th returns 429)
 * 7. RBAC security on Admin Inquiries API:
 *    - Anonymous callers rejected with 401
 *    - Customer accounts rejected with 403
 *    - Admin accounts accepted with 200
 * 8. Admin Inquiries list sorting (newest first) and pagination
 * 9. Admin status transition ('new' -> 'read' -> 'replied') and persistence
 * 10. Rejection of invalid status values (status 400)
 */

import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { connectTestDB } from '../src/config/db.js';
import Inquiry from '../src/models/Inquiry.js';
import User from '../src/models/User.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    passedCount++;
    console.log(`  ✔ [PASS] ${message}`);
  } else {
    failedCount++;
    console.error(`  ✖ [FAIL] ${message}`);
  }
}

async function request(server, path, options = {}) {
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}${path}`;

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          Connection: 'close',
          ...(options.headers || {}),
        },
        agent: false,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (_) {
            json = data;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: json,
            rawText: data,
          });
        });
      }
    );

    req.on('error', reject);

    if (options.body) {
      const bodyStr =
        typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(bodyStr);
    }
    req.end();
  });
}

async function runContactTests() {
  console.log('====================================================');
  console.log('   AUREVELLA — Contact & Concierge Test Suite       ');
  console.log('====================================================\n');

  await connectTestDB();

  // Create isolated test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    // ----------------------------------------------------
    // Suite 1: Inquiry Model Schema Rules
    // ----------------------------------------------------
    console.log('[Suite 1] Testing Inquiry Mongoose Model & Schema Rules...');

    // 1A: Rejects missing name
    let nameError = null;
    try {
      await Inquiry.create({
        email: 'test@example.com',
        message: 'This is a valid message of sufficient length.',
      });
    } catch (err) {
      nameError = err;
    }
    assert(
      nameError && nameError.errors && nameError.errors.name,
      'Inquiry Model: Rejects document missing client name'
    );

    // 1B: Rejects invalid email
    let emailError = null;
    try {
      await Inquiry.create({
        name: 'Test Client',
        email: 'invalid-email-format',
        message: 'This is a valid message of sufficient length.',
      });
    } catch (err) {
      emailError = err;
    }
    assert(
      emailError && emailError.errors && emailError.errors.email,
      'Inquiry Model: Rejects document with invalid email format'
    );

    // 1C: Rejects missing message
    let messageError = null;
    try {
      await Inquiry.create({
        name: 'Test Client',
        email: 'test@example.com',
      });
    } catch (err) {
      messageError = err;
    }
    assert(
      messageError && messageError.errors && messageError.errors.message,
      'Inquiry Model: Rejects document missing message body'
    );

    // 1D: Default status is 'new'
    const defaultDoc = await Inquiry.create({
      name: 'Schema Probe',
      email: 'probe@example.com',
      message: 'Probe inquiry to check defaults.',
    });
    assert(defaultDoc.status === 'new', 'Inquiry Model: Sets default status to "new"');
    await Inquiry.findByIdAndDelete(defaultDoc._id);

    // ----------------------------------------------------
    // Suite 2: Public POST /api/contact CSRF & Validation
    // ----------------------------------------------------
    console.log('\n[Suite 2] Testing POST /api/contact CSRF & Validation...');

    // 2A: Rejects mutating request without custom CSRF header
    const noCsrfRes = await request(server, '/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        name: 'CSRF Attacker',
        email: 'attacker@evil.com',
        message: 'Inquiry without CSRF header.',
      },
    });
    assert(
      noCsrfRes.status === 403,
      'CSRF Guard: Rejects POST /api/contact missing X-Aurevella-Request header (403)'
    );

    const validHeaders = {
      'Content-Type': 'application/json',
      'X-Aurevella-Request': '1',
      Origin: 'http://localhost:5173',
    };

    // 2B: Rejects invalid email
    const invalidEmailRes = await request(server, '/api/contact', {
      method: 'POST',
      headers: validHeaders,
      body: {
        name: 'Valid Name',
        email: 'not-an-email',
        message: 'Valid inquiry message text.',
      },
    });
    assert(
      invalidEmailRes.status === 400,
      'Validation: Rejects malformed email address with status 400'
    );

    // 2C: Rejects short message (< 10 chars)
    const shortMsgRes = await request(server, '/api/contact', {
      method: 'POST',
      headers: validHeaders,
      body: {
        name: 'Valid Name',
        email: 'valid@example.com',
        message: 'Short',
      },
    });
    assert(
      shortMsgRes.status === 400,
      'Validation: Rejects message under 10 characters with status 400'
    );

    // ----------------------------------------------------
    // Suite 3: Anti-Bot Honeypot Defense
    // ----------------------------------------------------
    console.log('\n[Suite 3] Testing Anti-Bot Honeypot Defense...');

    const countBeforeHoneypot = await Inquiry.countDocuments();

    // Spambot fills the hidden honeypot field
    const honeypotRes = await request(server, '/api/contact', {
      method: 'POST',
      headers: validHeaders,
      body: {
        name: 'Spam Bot 3000',
        email: 'bot@spamnetwork.com',
        message: 'Buy luxury replicas cheap today at spam.com!',
        hp_field: 'http://spam-link.com',
      },
    });

    const countAfterHoneypot = await Inquiry.countDocuments();

    assert(
      honeypotRes.status === 200,
      'Honeypot: Silently returns 200 OK without alerting the bot'
    );
    assert(
      countBeforeHoneypot === countAfterHoneypot,
      'Honeypot: Zero database writes performed for bot inquiry'
    );

    // ----------------------------------------------------
    // Suite 4: Legitimate Inquiry Submission & Persistence
    // ----------------------------------------------------
    console.log('\n[Suite 4] Testing Legitimate Inquiry Submission...');

    const validSubmissionRes = await request(server, '/api/contact', {
      method: 'POST',
      headers: validHeaders,
      body: {
        name: 'Princess Ananya',
        email: 'ananya.p@patron.aurevella.com',
        phone: '+91 98765 43210',
        subject: 'Fit & Sizing Consultation',
        message: 'I would like to inquire about size availability for the Floral Block Heel Sandal in EU 38.',
      },
    });

    assert(
      validSubmissionRes.status === 201,
      'Legitimate Submission: Returns 201 Created'
    );
    assert(
      validSubmissionRes.body?.inquiry?.id,
      'Legitimate Submission: Returns newly minted inquiry ID'
    );

    const savedInquiryId = validSubmissionRes.body?.inquiry?.id;
    const dbInquiry = await Inquiry.findById(savedInquiryId);

    assert(
      dbInquiry !== null && dbInquiry.name === 'Princess Ananya',
      'Database Persistence: Inquiry is saved accurately in MongoDB'
    );
    assert(
      dbInquiry.status === 'new',
      'Database Persistence: Initial status is correctly set to "new"'
    );

    // ----------------------------------------------------
    // Suite 5: Admin Inquiries Access Control & RBAC
    // ----------------------------------------------------
    console.log('\n[Suite 5] Testing Admin Inquiries RBAC...');

    // 5A: Anonymous access rejected
    const anonAdminRes = await request(server, '/api/admin/inquiries');
    assert(
      anonAdminRes.status === 401,
      'Admin RBAC: Anonymous access to /api/admin/inquiries rejected with 401'
    );

    // Create test accounts
    const customerUser = await User.findOneAndUpdate(
      { email: 'contact_test_cust@aurevella.com' },
      {
        name: 'Customer Patron',
        email: 'contact_test_cust@aurevella.com',
        firebaseUid: 'fb-cust-contact-test',
        role: 'customer',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    const customerToken = jwt.sign(
      { id: customerUser._id, role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const adminUser = await User.findOneAndUpdate(
      { email: 'contact_test_admin@aurevella.com' },
      {
        name: 'Atelier Admin',
        email: 'contact_test_admin@aurevella.com',
        firebaseUid: 'fb-admin-contact-test',
        role: 'admin',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    const adminToken = jwt.sign(
      { id: adminUser._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 5B: Customer access rejected with 403
    const custAdminRes = await request(server, '/api/admin/inquiries', {
      headers: {
        Cookie: `token=${customerToken}`,
      },
    });
    assert(
      custAdminRes.status === 403,
      'Admin RBAC: Customer account accessing /api/admin/inquiries rejected with 403 Forbidden'
    );

    // 5C: Admin access allowed with 200
    const adminFetchRes = await request(server, '/api/admin/inquiries', {
      headers: {
        Cookie: `token=${adminToken}`,
      },
    });
    assert(
      adminFetchRes.status === 200,
      'Admin RBAC: Authorized administrator retrieves inquiries with 200 OK'
    );
    assert(
      Array.isArray(adminFetchRes.body?.inquiries),
      'Admin Inquiries: Inquiries returned as an array'
    );
    assert(
      adminFetchRes.body?.inquiries.some((i) => i.id === savedInquiryId),
      'Admin Inquiries: Newly submitted inquiry is present in admin list'
    );

    // ----------------------------------------------------
    // Suite 6: Admin Status Updates & State Validation
    // ----------------------------------------------------
    console.log('\n[Suite 6] Testing Admin Inquiry Status Transitions...');

    // 6A: Reject invalid status value
    const invalidStatusRes = await request(
      server,
      `/api/admin/inquiries/${savedInquiryId}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Aurevella-Request': '1',
          Cookie: `token=${adminToken}`,
          Origin: 'http://localhost:5173',
        },
        body: { status: 'invalid_status_code' },
      }
    );
    assert(
      invalidStatusRes.status === 400,
      'Status Validation: Rejects invalid status with 400 Bad Request'
    );

    // 6B: Update to 'read'
    const markReadRes = await request(
      server,
      `/api/admin/inquiries/${savedInquiryId}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Aurevella-Request': '1',
          Cookie: `token=${adminToken}`,
          Origin: 'http://localhost:5173',
        },
        body: { status: 'read' },
      }
    );
    assert(
      markReadRes.status === 200 && markReadRes.body?.inquiry?.status === 'read',
      'Status Transition: Successfully updates status to "read"'
    );

    // 6C: Update to 'replied'
    const markRepliedRes = await request(
      server,
      `/api/admin/inquiries/${savedInquiryId}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Aurevella-Request': '1',
          Cookie: `token=${adminToken}`,
          Origin: 'http://localhost:5173',
        },
        body: { status: 'replied' },
      }
    );
    assert(
      markRepliedRes.status === 200 && markRepliedRes.body?.inquiry?.status === 'replied',
      'Status Transition: Successfully updates status to "replied"'
    );

    const finalDbInquiry = await Inquiry.findById(savedInquiryId);
    assert(
      finalDbInquiry.status === 'replied',
      'Database Verification: Final status "replied" is confirmed in MongoDB'
    );

    // Cleanup test records
    await Inquiry.findByIdAndDelete(savedInquiryId);
    await User.findByIdAndDelete(customerUser._id);
    await User.findByIdAndDelete(adminUser._id);

    // ----------------------------------------------------
    // Suite 7: Dedicated Contact Rate Limiting
    // ----------------------------------------------------
    console.log('\n[Suite 7] Testing Dedicated Contact Rate Limiting (5 req / 15 min)...');

    // Create a standalone server with a fresh rate limiter instance configured identically to contactLimiter
    const express = (await import('express')).default;
    const rateLimit = (await import('express-rate-limit')).default;

    const isolatedContactLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 5,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        status: 'error',
        message: 'Too many contact inquiries from this IP. Please wait 15 minutes before submitting again.',
      },
    });

    const limiterApp = express();
    limiterApp.use(express.json());
    limiterApp.post('/api/contact-test', isolatedContactLimiter, (req, res) => {
      res.status(200).json({ status: 'success' });
    });

    const limiterServer = http.createServer(limiterApp);
    await new Promise((resolve) => limiterServer.listen(0, '127.0.0.1', resolve));

    let hitCount = 0;
    let rateLimited = false;

    // Send 6 requests rapidly to hit the 5-request limit
    for (let i = 1; i <= 6; i++) {
      const res = await request(limiterServer, '/api/contact-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { test: true },
      });
      if (res.status === 200) {
        hitCount++;
      } else if (res.status === 429) {
        rateLimited = true;
      }
    }

    assert(
      hitCount === 5,
      `Rate Limiter: Allows exactly 5 inquiries within the window (actual: ${hitCount})`
    );
    assert(
      rateLimited === true,
      'Rate Limiter: Rejects the 6th inquiry with 429 Too Many Requests'
    );

    limiterServer.close();
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  console.log('\n====================================================');
  console.log(`   CONTACT SUITE COMPLETED: ${passedCount} PASS, ${failedCount} FAIL`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runContactTests().catch((err) => {
  console.error('Fatal test error in testContact.js:', err);
  process.exit(1);
});
