/**
 * AUREVELLA — Dynamic Express Route Enumeration & RBAC Security Verification Suite
 *
 * Verifies:
 * 1. Introspects app._router.stack to dynamically list ALL 34 application routes.
 * 2. Records security profile per route: requiresAuth, requiresAdmin, validatesInput.
 * 3. Asserts every admin route rejects anonymous callers with 401 Unauthorized.
 * 4. Asserts every admin route rejects standard customer accounts with 403 Forbidden.
 * 5. Asserts user-scoped resources (addresses, orders) enforce strict tenant isolation:
 *    Cross-user access returns 404 (Not Found / no data leak).
 * 6. Asserts all mutating routes reject requests missing the X-Aurevella-Request header (CSRF defense).
 * 7. Outputs standardized security audit table.
 */

import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { connectTestDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Address from '../src/models/Address.js';
import Order from '../src/models/Order.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import Inquiry from '../src/models/Inquiry.js';

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

/**
 * Programmatically traverse app router stack and extract all registered routes.
 */
function enumerateRoutes(appInstance) {
  const routes = [];

  for (const layer of appInstance._router.stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
      const path = layer.route.path;
      const handlers = layer.route.stack.map((s) => s.handle);
      for (const method of methods) {
        routes.push({ method, path, handlers });
      }
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      let mountPath = '';
      if (layer.regexp) {
        mountPath = layer.regexp.source
          .replace('\\/?(?=\\/|$)', '')
          .replace('^\\', '')
          .replace(/\\\//g, '/')
          .replace(/\^/g, '')
          .replace(/\$/g, '')
          .replace(/\?\(\?=\\\/\|\$\)/g, '')
          .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param');
      }

      // Collect router-level middlewares
      const routerMiddlewares = [];
      for (const subLayer of layer.handle.stack) {
        if (!subLayer.route && subLayer.handle) {
          routerMiddlewares.push(subLayer.handle);
        } else if (subLayer.route) {
          const methods = Object.keys(subLayer.route.methods).map((m) => m.toUpperCase());
          const fullPath = (mountPath + subLayer.route.path).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
          const allHandlers = [...routerMiddlewares, ...subLayer.route.stack.map((s) => s.handle)];
          for (const method of methods) {
            routes.push({
              method,
              path: fullPath,
              handlers: allHandlers,
            });
          }
        }
      }
    }
  }

  // Deduplicate and decorate with flags
  return routes.map((r) => {
    const requiresAuth = r.handlers.some(
      (h) =>
        h.name === 'authenticate' ||
        (h.toString && (h.toString().includes('AUTH_COOKIE_NAME') || h.toString().includes('jwt.verify')))
    );
    const requiresAdmin = r.handlers.some(
      (h) =>
        h.name === 'authorizeAdmin' ||
        (h.toString &&
          (h.toString().includes('ADMIN_ONLY') ||
            h.toString().includes('Administrator privileges required') ||
            h.toString().includes("role !== 'admin'")))
    );
    const validatesInput = r.handlers.some(
      (h) => h.name === 'validate' || (h.toString && h.toString().includes('schema.parse'))
    );

    return {
      method: r.method,
      path: r.path,
      requiresAuth,
      requiresAdmin,
      validatesInput,
    };
  });
}

async function request(server, path, options = {}) {
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}${path}`;

  const headers = {
    Connection: 'close',
    ...(options.headers || {}),
  };

  let bodyStr;
  if (options.body !== undefined && options.body !== null) {
    bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    headers['Content-Length'] = Buffer.byteLength(bodyStr);
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers,
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

    if (bodyStr !== undefined) {
      req.write(bodyStr);
    }
    req.end();
  });
}

function resolveParameterizedPath(path, params = {}) {
  let resolved = path;
  // Sort parameter keys descending by length to ensure :idOrSlug is matched before :id
  const sortedKeys = Object.keys(params).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    resolved = resolved.replace(`:${key}`, params[key]);
  }
  return resolved;
}

async function runRouteSecuritySuite() {
  console.log('========================================================================');
  console.log('      AUREVELLA — Dynamic Route Enumeration & RBAC Security Suite       ');
  console.log('========================================================================\n');

  await connectTestDB();

  // Create isolated ephemeral test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    // 1. Enumerate all routes from Express app
    const routes = enumerateRoutes(app);
    console.log(`[Discovery] Programmatically identified ${routes.length} distinct application routes.\n`);

    // 2. Seed test fixtures in test DB
    const userA = await User.findOneAndUpdate(
      { email: 'route_test_user_a@aurevella.com' },
      {
        name: 'Patron User A',
        email: 'route_test_user_a@aurevella.com',
        firebaseUid: 'fb-user-a-route-test',
        role: 'customer',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    const tokenA = jwt.sign({ id: userA._id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const userB = await User.findOneAndUpdate(
      { email: 'route_test_user_b@aurevella.com' },
      {
        name: 'Patron User B',
        email: 'route_test_user_b@aurevella.com',
        firebaseUid: 'fb-user-b-route-test',
        role: 'customer',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    const tokenB = jwt.sign({ id: userB._id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const adminUser = await User.findOneAndUpdate(
      { email: 'route_test_admin@aurevella.com' },
      {
        name: 'Atelier Administrator',
        email: 'route_test_admin@aurevella.com',
        firebaseUid: 'fb-admin-route-test',
        role: 'admin',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    const adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Seed User A's private address
    const addressA = await Address.create({
      user: userA._id,
      recipientName: 'Patron User A',
      phone: '+91 98765 43210',
      addressLine1: 'Suite 404, Sovereign Court',
      city: 'Jaipur',
      state: 'Rajasthan',
      postalCode: '302001',
      country: 'India',
      isDefault: true,
    });

    // Seed User A's private order
    const orderA = await Order.create({
      orderNumber: 'AV-ROUTE-TEST-001',
      user: userA._id,
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          slug: 'aur-sand-01',
          name: 'The Aurelia Sandal',
          productCode: 'AUR-001',
          image: '/images/products/sandal.jpg',
          pricePaise: 499900,
          quantity: 1,
          size: '38',
          lineTotalPaise: 499900,
        },
      ],
      shippingAddress: {
        recipientName: 'Patron User A',
        phone: '+91 98765 43210',
        addressLine1: 'Suite 404, Sovereign Court',
        city: 'Jaipur',
        state: 'Rajasthan',
        postalCode: '302001',
        country: 'India',
      },
      itemsCount: 1,
      subtotalPaise: 499900,
      shippingFeePaise: 0,
      totalPaise: 499900,
      currency: 'INR',
      status: 'pending_payment',
    });

    const mockObjectId = new mongoose.Types.ObjectId().toString();

    // ----------------------------------------------------
    // Section 1: RBAC Security Audit on All Admin Routes
    // ----------------------------------------------------
    console.log('--- SECTION 1: ADMIN ROUTE ACCESS CONTROL VERIFICATION ---');
    const adminRoutes = routes.filter((r) => r.requiresAdmin);
    assert(adminRoutes.length >= 13, `Admin route count verified (${adminRoutes.length} admin routes discovered)`);

    const tableRows = [];

    for (const r of routes) {
      let anonStatus = 'N/A';
      let customerStatus = 'N/A';

      if (r.requiresAdmin) {
        const testPath = resolveParameterizedPath(r.path, {
          id: mockObjectId,
          idOrSlug: 'test-item-slug',
          idOrNumber: 'AV-TEST-999',
        });

        // 1. Anonymous attempt (supplying X-Aurevella-Request so CSRF passes, hitting Auth middleware)
        const anonRes = await request(server, testPath, {
          method: r.method,
          headers: {
            'Content-Type': 'application/json',
            'X-Aurevella-Request': '1',
          },
          body: (r.method !== 'GET' && r.method !== 'DELETE') ? {} : undefined,
        });
        anonStatus = String(anonRes.status);
        assert(
          anonRes.status === 401,
          `Admin Anon Guard: ${r.method} ${r.path} returns 401 Unauthorized (got ${anonRes.status})`
        );

        // 2. Customer attempt
        const custRes = await request(server, testPath, {
          method: r.method,
          headers: {
            'Content-Type': 'application/json',
            'X-Aurevella-Request': '1',
            Cookie: `token=${tokenA}`,
          },
          body: (r.method !== 'GET' && r.method !== 'DELETE') ? {} : undefined,
        });
        customerStatus = String(custRes.status);
        assert(
          custRes.status === 403,
          `Admin RBAC Guard: ${r.method} ${r.path} returns 403 Forbidden for customer (got ${custRes.status})`
        );
      } else if (r.requiresAuth) {
        // Authenticated customer route
        const testPath = resolveParameterizedPath(r.path, {
          id: mockObjectId,
          idOrNumber: 'AV-TEST-999',
          idOrSlug: 'test-slug',
        });

        const anonRes = await request(server, testPath, {
          method: r.method,
          headers: {
            'Content-Type': 'application/json',
            'X-Aurevella-Request': '1',
          },
          body: (r.method !== 'GET' && r.method !== 'DELETE') ? {} : undefined,
        });
        anonStatus = String(anonRes.status);
        assert(
          anonRes.status === 401,
          `Customer Auth Guard: ${r.method} ${r.path} returns 401 Unauthorized for anon (got ${anonRes.status})`
        );
        customerStatus = '200/4xx (Allowed)';
      } else {
        anonStatus = 'Public';
        customerStatus = 'Public';
      }

      tableRows.push({
        method: r.method,
        path: r.path,
        auth: r.requiresAuth ? 'Yes' : 'No',
        admin: r.requiresAdmin ? 'Yes' : 'No',
        validated: r.validatesInput ? 'Yes' : 'No',
        anonResult: anonStatus,
        customerResult: customerStatus,
      });
    }

    // ----------------------------------------------------
    // Section 2: User Resource Tenant Isolation (Cross-User)
    // ----------------------------------------------------
    console.log('\n--- SECTION 2: CROSS-TENANT USER RESOURCE ISOLATION ---');

    // 2A: User B attempts to read User A's order by ID
    const crossOrderReadById = await request(server, `/api/orders/${orderA._id}`, {
      method: 'GET',
      headers: {
        Cookie: `token=${tokenB}`,
      },
    });
    assert(
      crossOrderReadById.status === 404,
      `Tenant Isolation: User B reading User A order by ID returns 404 (status: ${crossOrderReadById.status})`
    );

    // 2B: User B attempts to read User A's order by orderNumber
    const crossOrderReadByNumber = await request(server, `/api/orders/${orderA.orderNumber}`, {
      method: 'GET',
      headers: {
        Cookie: `token=${tokenB}`,
      },
    });
    assert(
      crossOrderReadByNumber.status === 404,
      `Tenant Isolation: User B reading User A order by number returns 404 (status: ${crossOrderReadByNumber.status})`
    );

    // 2C: User B attempts to modify User A's address
    const crossAddressUpdate = await request(server, `/api/users/addresses/${addressA._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Aurevella-Request': '1',
        Cookie: `token=${tokenB}`,
      },
      body: {
        recipientName: 'Hacker Name',
      },
    });
    assert(
      crossAddressUpdate.status === 404,
      `Tenant Isolation: User B modifying User A address returns 404 (status: ${crossAddressUpdate.status})`
    );

    // 2D: User B attempts to delete User A's address
    const crossAddressDelete = await request(server, `/api/users/addresses/${addressA._id}`, {
      method: 'DELETE',
      headers: {
        'X-Aurevella-Request': '1',
        Cookie: `token=${tokenB}`,
      },
    });
    assert(
      crossAddressDelete.status === 404,
      `Tenant Isolation: User B deleting User A address returns 404 (status: ${crossAddressDelete.status})`
    );

    // 2E: User B attempts to set User A's address as default
    const crossAddressDefault = await request(server, `/api/users/addresses/${addressA._id}/default`, {
      method: 'PATCH',
      headers: {
        'X-Aurevella-Request': '1',
        Cookie: `token=${tokenB}`,
      },
    });
    assert(
      crossAddressDefault.status === 404,
      `Tenant Isolation: User B setting User A address as default returns 404 (status: ${crossAddressDefault.status})`
    );

    // ----------------------------------------------------
    // Section 3: CSRF / Write Protection Verification
    // ----------------------------------------------------
    console.log('\n--- SECTION 3: WRITE ROUTE CSRF HEADER PROTECTION ---');
    const mutatingRoutes = routes.filter((r) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method));

    for (const mr of mutatingRoutes) {
      if (mr.path === '/api/payments/webhook') {
        // Webhooks are explicitly exempted from custom browser headers
        console.log(`  ℹ [EXEMPT] POST ${mr.path} is an external webhook; exempt from X-Aurevella-Request`);
        continue;
      }

      const testPath = resolveParameterizedPath(mr.path, {
        id: mockObjectId,
        idOrSlug: 'test-item-slug',
        idOrNumber: 'AV-TEST-999',
      });

      const missingHeaderRes = await request(server, testPath, {
        method: mr.method,
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${tokenA}`, // Even with valid credentials
        },
        body: mr.method === 'DELETE' ? undefined : {},
      });

      assert(
        missingHeaderRes.status === 403,
        `CSRF Guard: ${mr.method} ${mr.path} missing X-Aurevella-Request rejected with 403 (got ${missingHeaderRes.status})`
      );
    }

    // ----------------------------------------------------
    // Section 4: Security Audit Table & Lacking Protections
    // ----------------------------------------------------
    console.log('\n========================================================================');
    console.log('                 APPLICATION ROUTE SECURITY AUDIT TABLE                 ');
    console.log('========================================================================\n');

    console.log('| Method | Path | Auth | Admin | Validated | Anon Result | Customer Result |');
    console.log('|:---|:---|:---:|:---:|:---:|:---|:---|');
    for (const row of tableRows) {
      console.log(
        `| ${row.method.padEnd(6)} | ${row.path.padEnd(38)} | ${row.auth.padEnd(4)} | ${row.admin.padEnd(5)} | ${row.validated.padEnd(9)} | ${row.anonResult.padEnd(11)} | ${row.customerResult.padEnd(15)} |`
      );
    }

    console.log('\n--- ROUTES LACKING VALIDATION OR AUTHENTICATION REVIEW ---');
    const publicMutating = routes.filter(
      (r) => !r.requiresAuth && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method)
    );
    for (const pm of publicMutating) {
      console.log(`  • Public Write Route: ${pm.method} ${pm.path} (Validated: ${pm.validatesInput ? 'Yes' : 'No'})`);
    }

    const unvalidatedMutating = routes.filter(
      (r) => ['POST', 'PUT', 'PATCH'].includes(r.method) && !r.validatesInput
    );
    if (unvalidatedMutating.length === 0) {
      console.log('  ✔ All mutating payload endpoints enforce strict schema validation.');
    } else {
      for (const um of unvalidatedMutating) {
        console.log(`  ⚠ Mutating Route without Zod schema: ${um.method} ${um.path}`);
      }
    }

    // Clean up test documents
    await User.deleteMany({ email: { $in: [userA.email, userB.email, adminUser.email] } });
    await Address.deleteOne({ _id: addressA._id });
    await Order.deleteOne({ _id: orderA._id });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.close();
  }

  console.log('\n========================================================================');
  console.log(`Route Security Verification Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runRouteSecuritySuite().catch((err) => {
  console.error('[FATAL]:', err);
  process.exit(1);
});
