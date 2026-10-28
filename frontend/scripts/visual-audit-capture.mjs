import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const shotsDir = path.join(frontendDir, '.visual-audit-shots');

if (!fs.existsSync(shotsDir)) {
  fs.mkdirSync(shotsDir, { recursive: true });
}

const FRONTEND_URL = 'http://localhost:5173';

function getCorsHeaders(route) {
  const reqHeaders = route.request().headers();
  const origin = reqHeaders['origin'] || FRONTEND_URL;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Aurevella-Request',
  };
}

async function captureVisualAudit() {
  console.log('===============================================================');
  console.log('  AUREVELLA — Visual Audit & UX Screenshot Capture Engine       ');
  console.log('===============================================================\n');

  const browser = await chromium.launch({ headless: true });
  const captured = [];

  // Helper to take screenshot
  async function snap(page, filename, options = {}) {
    const filePath = path.join(shotsDir, filename);
    try {
      await page.screenshot({
        path: filePath,
        fullPage: options.fullPage ?? false,
        timeout: 10000,
        animations: 'disabled',
      });
    } catch (_) {
      await page.screenshot({
        path: filePath,
        fullPage: false,
        timeout: 5000,
      }).catch(() => {});
    }
    captured.push({ filename, path: filePath, fullPage: options.fullPage ?? false });
    console.log(`📸 Captured: ${filename}`);
  }

  try {
    // -------------------------------------------------------------
    // 1. HOMEPAGE across viewports
    // -------------------------------------------------------------
    console.log('\n--- Auditing Homepage ---');
    const viewports = [
      { width: 1440, height: 900, name: '1440' },
      { width: 768, height: 1024, name: '768' },
      { width: 390, height: 844, name: '390' },
      { width: 320, height: 600, name: '320' },
    ];

    for (const vp of viewports) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      // Capture viewport (above the fold) and full page
      await snap(page, `home_${vp.name}_viewport.png`, { fullPage: false });
      if (vp.name === '1440' || vp.name === '390') {
        await snap(page, `home_${vp.name}_fullpage.png`, { fullPage: true });
      }

      // If mobile 390, open mobile menu drawer
      if (vp.name === '390') {
        const menuBtn = page.locator('button[aria-label="Open mobile navigation menu"]');
        if (await menuBtn.isVisible()) {
          await menuBtn.click();
          await page.waitForTimeout(300);
          await snap(page, `home_390_mobile_nav_drawer.png`);
        }
      }
      await ctx.close();
    }

    // -------------------------------------------------------------
    // 2. SHOP / CATALOGUE & SEARCH STATES
    // -------------------------------------------------------------
    console.log('\n--- Auditing Shop & Discovery ---');
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(`${FRONTEND_URL}/shop`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await snap(page, `shop_1440_viewport.png`);
      await snap(page, `shop_1440_fullpage.png`, { fullPage: true });

      // Active search query
      const searchInput = page.locator('input[placeholder*="Search by"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('mule');
        await page.waitForTimeout(300);
        await snap(page, `shop_search_mule_1440.png`);

        // Empty search state
        await searchInput.fill('nonexistent-velvet-boot');
        await page.waitForTimeout(300);
        await snap(page, `shop_search_empty_1440.png`);
      }
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${FRONTEND_URL}/shop`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await snap(page, `shop_390_viewport.png`);
      await snap(page, `shop_390_fullpage.png`, { fullPage: true });
      await ctx.close();
    }

    // -------------------------------------------------------------
    // 3. PRODUCT DETAIL PAGES (prod-01, prod-02, prod-03)
    // -------------------------------------------------------------
    console.log('\n--- Auditing Product Detail Pages ---');
    const products = ['prod-01', 'prod-02', 'prod-03'];
    for (const pid of products) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(`${FRONTEND_URL}/product/${pid}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await snap(page, `pdp_${pid}_1440_viewport.png`);
      await snap(page, `pdp_${pid}_1440_fullpage.png`, { fullPage: true });

      if (pid === 'prod-01') {
        // Open Sizing Guide modal
        const sizingBtn = page.locator('button:has-text("Size Guide")');
        if (await sizingBtn.isVisible()) {
          await sizingBtn.click();
          await page.waitForTimeout(300);
          await snap(page, `pdp_prod01_sizing_modal_1440.png`);
          // Close modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        }
      }
      await ctx.close();
    }

    // PDP on Mobile (390px)
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${FRONTEND_URL}/product/prod-01`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await snap(page, `pdp_prod01_390_viewport.png`);
      await snap(page, `pdp_prod01_390_fullpage.png`, { fullPage: true });
      await ctx.close();
    }

    // -------------------------------------------------------------
    // 4. BAG DRAWER, FULL BAG & CHECKOUT
    // -------------------------------------------------------------
    console.log('\n--- Auditing Shopping Bag & Checkout ---');
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(`${FRONTEND_URL}/product/prod-01`, { waitUntil: 'networkidle' });
      // Select size 38
      const sizeBtn = page.locator('button:has-text("EU 38")');
      if (await sizeBtn.isVisible()) {
        await sizeBtn.click();
        await page.waitForTimeout(100);
      }
      const addBtn = page.locator('button:has-text("Add to Bag")');
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(400);
        await snap(page, `bag_drawer_open_1440.png`);
      }

      // Navigate to /bag
      await page.goto(`${FRONTEND_URL}/bag`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await snap(page, `bag_page_1440_fullpage.png`, { fullPage: true });

      // Navigate to /checkout (unauthenticated gateway)
      await page.goto(`${FRONTEND_URL}/checkout`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await snap(page, `checkout_unauth_1440_fullpage.png`, { fullPage: true });
      await ctx.close();
    }

    // Authenticated Checkout
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();

      await page.route(/.*\/api\/auth\/me.*/, (route) => {
        route.fulfill({
          status: 200,
          headers: { ...getCorsHeaders(route), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'success',
            user: {
              id: 'cust-test-01',
              email: 'claudia.allegra@aurevella.luxury',
              name: 'Claudia Allegra',
              role: 'customer',
              isActive: true,
              emailVerified: true,
            },
          }),
        });
      });

      await page.route(/.*\/api\/users\/addresses.*/, (route) => {
        route.fulfill({
          status: 200,
          headers: { ...getCorsHeaders(route), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'success',
            addresses: [
              {
                id: 'addr-01',
                _id: 'addr-01',
                recipientName: 'Claudia Allegra',
                phone: '+91 98765 43210',
                addressLine1: 'Via Condotti 18, Suite 4B',
                addressLine2: 'Near Spanish Steps',
                city: 'Bengaluru',
                state: 'Karnataka',
                postalCode: '560001',
                country: 'India',
                isDefault: true,
              },
            ],
          }),
        });
      });

      await page.goto(`${FRONTEND_URL}/product/prod-01`, { waitUntil: 'networkidle' });
      const sizeBtn = page.locator('button:has-text("EU 38")');
      if (await sizeBtn.isVisible()) {
        await sizeBtn.click();
        await page.waitForTimeout(100);
      }
      const addBtn = page.locator('button:has-text("Add to Bag")');
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(300);
      }

      await page.goto(`${FRONTEND_URL}/checkout`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await snap(page, `checkout_authenticated_1440_fullpage.png`, { fullPage: true });
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${FRONTEND_URL}/checkout`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await snap(page, `checkout_390_fullpage.png`, { fullPage: true });
      await ctx.close();
    }

    // -------------------------------------------------------------
    // 5. AUTHENTICATION PAGES (Login, Signup, Forgot Password)
    // -------------------------------------------------------------
    console.log('\n--- Auditing Authentication Pages ---');
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(200);
      await snap(page, `login_1440_viewport.png`);

      await page.goto(`${FRONTEND_URL}/signup`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(200);
      await snap(page, `signup_1440_viewport.png`);

      await page.goto(`${FRONTEND_URL}/forgot-password`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(200);
      await snap(page, `forgot_password_1440_viewport.png`);
      await ctx.close();
    }

    // -------------------------------------------------------------
    // 6. BRAND, EDITORIAL & POLICY PAGES
    // -------------------------------------------------------------
    console.log('\n--- Auditing Editorial & Policy Pages ---');
    const editorialRoutes = [
      { route: '/about', name: 'about' },
      { route: '/collections', name: 'collections' },
      { route: '/limited-edition', name: 'limited_edition' },
      { route: '/contact', name: 'contact' },
      { route: '/shipping-policy', name: 'shipping_policy' },
      { route: '/returns-policy', name: 'returns_policy' },
      { route: '/privacy', name: 'privacy_policy' },
      { route: '/terms', name: 'terms_policy' },
      { route: '/not-a-real-page-404', name: '404_not_found' },
    ];

    for (const r of editorialRoutes) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(`${FRONTEND_URL}${r.route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await snap(page, `${r.name}_1440_fullpage.png`, { fullPage: true });
      await ctx.close();
    }

    // -------------------------------------------------------------
    // 7. CUSTOMER ACCOUNT & ADDRESS MANAGEMENT (Mocked Session)
    // -------------------------------------------------------------
    console.log('\n--- Auditing Account Page ---');
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();

      await page.route(/.*\/api\/auth\/me.*/, (route) => {
        route.fulfill({
          status: 200,
          headers: { ...getCorsHeaders(route), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'success',
            user: {
              id: 'cust-test-01',
              email: 'claudia.allegra@aurevella.luxury',
              name: 'Claudia Allegra',
              role: 'customer',
              isActive: true,
              emailVerified: true,
            },
          }),
        });
      });

      await page.route(/.*\/api\/users\/addresses.*/, (route) => {
        route.fulfill({
          status: 200,
          headers: { ...getCorsHeaders(route), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'success',
            addresses: [
              {
                id: 'addr-01',
                _id: 'addr-01',
                name: 'Claudia Allegra',
                phone: '+91 98765 43210',
                addressLine1: 'Via Condotti 18, Suite 4B',
                addressLine2: 'Near Spanish Steps',
                city: 'Bengaluru',
                state: 'Karnataka',
                postalCode: '560001',
                isDefault: true,
              },
            ],
          }),
        });
      });

      await page.route(/.*\/api\/orders.*/, (route) => {
        route.fulfill({
          status: 200,
          headers: { ...getCorsHeaders(route), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'success',
            orders: [
              {
                id: 'ord-test-001',
                orderNumber: 'AV-2026-90412',
                createdAt: new Date().toISOString(),
                totalAmountFormatted: '₹3,499',
                paymentStatus: 'paid',
                status: 'processing',
                items: [
                  {
                    name: 'Floral Block Heel Sandal',
                    size: 'EU 38',
                    quantity: 1,
                    priceFormatted: '₹3,499',
                  },
                ],
              },
            ],
          }),
        });
      });

      await page.goto(`${FRONTEND_URL}/account`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await snap(page, `account_1440_fullpage.png`, { fullPage: true });

      // Also check /orders
      await page.goto(`${FRONTEND_URL}/orders`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await snap(page, `orders_1440_fullpage.png`, { fullPage: true });

      await ctx.close();
    }

    // -------------------------------------------------------------
    // 8. ADMIN DASHBOARD & PRIMARY TABS (Mocked Admin Session)
    // -------------------------------------------------------------
    console.log('\n--- Auditing Admin Dashboard Tabs ---');
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();

      await page.route(/.*\/api\/auth\/me.*/, (route) => {
        route.fulfill({
          status: 200,
          headers: { ...getCorsHeaders(route), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'success',
            user: {
              uid: 'admin-01',
              email: 'director@aurevella.com',
              name: 'Executive Director',
              role: 'admin',
              isActive: true,
              emailVerified: true,
            },
          }),
        });
      });

      await page.route(/.*\/api\/categories.*/, (route) => {
        route.fulfill({
          status: 200,
          headers: { ...getCorsHeaders(route), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'success',
            categories: [
              { id: 'cat-1', name: 'Interchangeable Heel', slug: 'interchangeable-heel' },
              { id: 'cat-2', name: 'Flat Slide', slug: 'flat-slide' },
            ],
          }),
        });
      });

      await page.route(/.*\/api\/admin\/stats.*/, (route) => {
        route.fulfill({
          status: 200,
          headers: { ...getCorsHeaders(route), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'success',
            metrics: {
              revenue: { totalFormatted: '₹48,990', totalPaise: 4899000 },
              orders: { total: 18, paid: 14, processing: 4, shipped: 2, delivered: 8, pending: 2, cancelled: 0 },
              inventory: { totalProducts: 3, lowStockCount: 1, lowStockItems: [] },
              customers: { total: 9 },
              recentOrders: [
                {
                  id: 'ord-01',
                  orderNumber: 'AV-2026-001',
                  customerName: 'Aria Rossi',
                  totalFormatted: '₹3,499',
                  paymentStatus: 'paid',
                  status: 'processing',
                  createdAt: new Date().toISOString(),
                },
              ],
            },
          }),
        });
      });

      // Overview Tab
      await page.goto(`${FRONTEND_URL}/admin`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await snap(page, `admin_overview_1440_fullpage.png`, { fullPage: true });

      // Products Tab
      const prodTab = page.locator('button:has-text("Products"), [role="tab"]:has-text("Products"), a:has-text("Products")').first();
      if (await prodTab.isVisible()) {
        await prodTab.click();
        await page.waitForTimeout(400);
        await snap(page, `admin_products_1440_fullpage.png`, { fullPage: true });
      }

      // Orders Tab
      const orderTab = page.locator('button:has-text("Orders"), [role="tab"]:has-text("Orders"), a:has-text("Orders")').first();
      if (await orderTab.isVisible()) {
        await orderTab.click();
        await page.waitForTimeout(400);
        await snap(page, `admin_orders_1440_fullpage.png`, { fullPage: true });
      }

      await ctx.close();
    }

    console.log(`\n===============================================================`);
    console.log(`  Capture Complete: ${captured.length} screenshots recorded in .visual-audit-shots/`);
    console.log(`===============================================================\n`);

  } finally {
    await browser.close();
  }
}

captureVisualAudit().catch((err) => {
  console.error('Fatal error during visual audit capture:', err);
  process.exit(1);
});
