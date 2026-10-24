import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const shotsDir = path.join(frontendDir, '.layout-shots');

// Ensure screenshots directory exists
if (!fs.existsSync(shotsDir)) {
  fs.mkdirSync(shotsDir, { recursive: true });
}

const ROUTES = [
  { path: '/', name: 'home', isShort: false },
  { path: '/shop', name: 'shop', isShort: false },
  { path: '/bag', name: 'bag', isShort: true },
  { path: '/collections', name: 'collections', isShort: true },
  { path: '/limited-edition', name: 'limited-edition', isShort: true },
  { path: '/about', name: 'about', isShort: true },
  { path: '/contact', name: 'contact', isShort: true },
  { path: '/privacy', name: 'privacy', isShort: true },
  { path: '/terms', name: 'terms', isShort: true },
  { path: '/shipping-policy', name: 'shipping-policy', isShort: true },
  { path: '/returns-policy', name: 'returns-policy', isShort: true },
  { path: '/login', name: 'login', isShort: true },
  { path: '/signup', name: 'signup', isShort: true },
  { path: '/forgot-password', name: 'forgot-password', isShort: true },
  { path: '/not-a-real-page-404', name: '404', isShort: true },
];

const WIDTHS = [360, 390, 768, 1024, 1440];
const HEIGHT = 844; // standard reference mobile/desktop viewport height

async function runLayoutChecks() {
  console.log('\n======================================================');
  console.log('   AUREVELLA — Headless Browser Layout & Form Audit   ');
  console.log('======================================================\n');

  // 1. Start Vite preview server for dist/
  console.log('[Server] Starting Vite preview server...');
  const server = await preview({
    root: frontendDir,
    preview: {
      port: 4173,
      host: '127.0.0.1',
    },
  });

  const baseUrl = 'http://127.0.0.1:4173';
  console.log(`[Server] Preview server listening at ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const results = [];
  let allPassed = true;

  try {
    for (const route of ROUTES) {
      for (const width of WIDTHS) {
        const page = await browser.newPage({
          viewport: { width, height: HEIGHT },
        });

        // Intercept unauthenticated session sync so headless test environment has no network CORS errors
        await page.route('**/api/auth/me', (route) => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ user: null }),
          });
        });

        const consoleErrors = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });
        page.on('pageerror', (err) => {
          consoleErrors.push(err.message);
        });

        // Navigate
        await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(150); // allow font & layout stabilization

        // Check horizontal overflow
        const overflowData = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const winWidth = window.innerWidth;
          const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          const hasOverflow = scrollWidth > winWidth + 1;

          let offending = [];
          if (hasOverflow) {
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
              const rect = el.getBoundingClientRect();
              if (rect.right > winWidth + 1) {
                offending.push({
                  tag: el.tagName.toLowerCase(),
                  className: typeof el.className === 'string' ? el.className.slice(0, 60) : '',
                  right: Math.round(rect.right),
                  width: Math.round(rect.width),
                });
                if (offending.length >= 3) break;
              }
            }
          }

          return {
            hasOverflow,
            scrollWidth,
            winWidth,
            offending,
          };
        });

        // Check Footer Positioning
        const footerData = await page.evaluate(() => {
          const footer = document.querySelector('footer');
          if (!footer) return { exists: false, atBottom: false, rect: null };
          const rect = footer.getBoundingClientRect();
          const winHeight = window.innerHeight;
          // Footer bottom must meet or exceed viewport bottom on all pages
          const atBottom = rect.bottom >= winHeight - 2;
          return {
            exists: true,
            atBottom,
            bottom: Math.round(rect.bottom),
            winHeight,
          };
        });

        // Check Cumulative Layout Shift (CLS)
        const clsValue = await page.evaluate(() => {
          return new Promise((resolve) => {
            let cls = 0;
            const observer = new PerformanceObserver((entryList) => {
              for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                  cls += entry.value;
                }
              }
            });
            try {
              observer.observe({ type: 'layout-shift', buffered: true });
            } catch (_) {}
            setTimeout(() => {
              observer.disconnect();
              resolve(Number(cls.toFixed(4)));
            }, 100);
          });
        });

        // Take Full Page Screenshot
        const screenshotFileName = `${route.name}_w${width}.png`;
        const screenshotFilePath = path.join(shotsDir, screenshotFileName);
        try {
          await page.screenshot({ path: screenshotFilePath, fullPage: true, timeout: 15000 });
        } catch (_) {
          // If font loading took slightly longer, take screenshot without fullPage waiting
          await page.screenshot({ path: screenshotFilePath }).catch(() => {});
        }

        const passOverflow = !overflowData.hasOverflow;
        const passFooter = footerData.atBottom;
        const passCLS = clsValue < 0.1;
        const passConsole = consoleErrors.length === 0;

        const rowPassed = passOverflow && passFooter && passCLS && passConsole;
        if (!rowPassed) allPassed = false;

        results.push({
          route: route.path,
          width,
          passOverflow,
          overflowInfo: overflowData.hasOverflow
            ? `OVERFLOW (${overflowData.scrollWidth}px > ${overflowData.winWidth}px) on ${JSON.stringify(overflowData.offending)}`
            : 'OK',
          passFooter,
          footerInfo: footerData.atBottom ? 'OK' : `GAP (${footerData.bottom}px < ${footerData.winHeight}px)`,
          cls: clsValue,
          passCLS,
          consoleErrors,
          passed: rowPassed,
        });

        await page.close();
      }
    }

    // 2. Form Tests
    console.log('\n--- Running Form State & Navigation Tests ---');
    const formPage = await browser.newPage({ viewport: { width: 1024, height: 800 } });
    await formPage.route('**/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: null }),
      });
    });

    const formErrors = [];

    // Test 2A: Open /login, type credentials, go to /signup, check empty
    await formPage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await formPage.fill('#email', 'fresh_visitor@example.com');
    await formPage.fill('#password', 'TestPassword123');

    // Navigate to /signup
    await formPage.click('a[href="/signup"]');
    await formPage.waitForURL(`${baseUrl}/signup`);
    await formPage.waitForTimeout(100);

    const signupEmailVal = await formPage.inputValue('#email');
    const signupPassVal = await formPage.inputValue('#password');

    if (signupEmailVal !== '' || signupPassVal !== '') {
      formErrors.push(
        `FAIL: /signup fields not clean after navigating from /login (email="${signupEmailVal}", pass="${signupPassVal}")`
      );
    } else {
      console.log('✔ PASS: /signup opened with pristine empty form fields.');
    }

    // Navigate back to /login
    await formPage.click('a[href="/login"]');
    await formPage.waitForURL(`${baseUrl}/login`);
    await formPage.waitForTimeout(100);

    const loginEmailVal = await formPage.inputValue('#email');
    const loginPassVal = await formPage.inputValue('#password');

    if (loginEmailVal !== '' || loginPassVal !== '') {
      formErrors.push(
        `FAIL: /login fields retained values after switching to /signup and back (email="${loginEmailVal}", pass="${loginPassVal}")`
      );
    } else {
      console.log('✔ PASS: /login fields are completely clean after returning from /signup.');
    }

    // Test 2B: Failed login clears password but keeps email
    await formPage.fill('#email', 'nonexistent_account@example.com');
    await formPage.fill('#password', 'WrongPasswordXYZ');
    await formPage.click('button[type="submit"]');

    // Wait for alert banner to appear
    await formPage.waitForSelector('[role="alert"]', { timeout: 8000 }).catch(() => {});
    await formPage.waitForTimeout(200);

    const emailAfterFail = await formPage.inputValue('#email');
    const passAfterFail = await formPage.inputValue('#password');

    if (emailAfterFail !== 'nonexistent_account@example.com') {
      formErrors.push(`FAIL: email was cleared or corrupted after failed login ("${emailAfterFail}")`);
    } else if (passAfterFail !== '') {
      formErrors.push(`FAIL: password was not cleared after failed login ("${passAfterFail}")`);
    } else {
      console.log('✔ PASS: password field was cleared while email remained preserved after failed login.');
    }

    // Test 2C: Form Autocomplete Attributes
    await formPage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    const loginEmailAuto = await formPage.getAttribute('#email', 'autocomplete');
    const loginPassAuto = await formPage.getAttribute('#password', 'autocomplete');
    if (loginEmailAuto !== 'username') {
      formErrors.push(`FAIL: /login #email missing autocomplete="username" (got "${loginEmailAuto}")`);
    } else if (loginPassAuto !== 'current-password') {
      formErrors.push(`FAIL: /login #password missing autocomplete="current-password" (got "${loginPassAuto}")`);
    } else {
      console.log('✔ PASS: /login fields contain standard autocomplete tokens (username, current-password).');
    }

    await formPage.goto(`${baseUrl}/signup`, { waitUntil: 'networkidle' });
    const signupEmailAuto = await formPage.getAttribute('#email', 'autocomplete');
    const signupPassAuto = await formPage.getAttribute('#password', 'autocomplete');
    if (signupEmailAuto !== 'username') {
      formErrors.push(`FAIL: /signup #email missing autocomplete="username" (got "${signupEmailAuto}")`);
    } else if (signupPassAuto !== 'new-password') {
      formErrors.push(`FAIL: /signup #password missing autocomplete="new-password" (got "${signupPassAuto}")`);
    } else {
      console.log('✔ PASS: /signup fields contain standard autocomplete tokens (username, new-password).');
    }

    await formPage.close();

    // Test 2D: Logout reset lifecycle test
    console.log('\n--- Running Auth Logout Reset Lifecycle Test ---');
    const authContext = await browser.newContext({ viewport: { width: 1024, height: 800 } });
    const authPage = await authContext.newPage();
    let mockLoggedIn = true;
    await authPage.route('**/api/auth/me', (route) => {
      if (mockLoggedIn) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              uid: 'test-user-123',
              email: 'vip@aurevella.com',
              name: 'Elena Rossi',
              role: 'customer',
              isActive: true,
              emailVerified: true,
              providers: ['password'],
            },
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: null }),
        });
      }
    });

    await authPage.route('**/api/auth/logout', (route) => {
      mockLoggedIn = false;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Logged out successfully' }),
      });
    });

    await authPage.goto(`${baseUrl}/account`, { waitUntil: 'networkidle' });
    await authPage.waitForTimeout(100);

    const signOutBtn = authPage.locator('button:has-text("Sign Out")').first();
    await signOutBtn.click();
    await authPage.waitForURL(`${baseUrl}/login`);
    await authPage.waitForTimeout(200);

    const emailAfterLogout = await authPage.inputValue('#email');
    const passAfterLogout = await authPage.inputValue('#password');

    if (emailAfterLogout !== '' || passAfterLogout !== '') {
      formErrors.push(
        `FAIL: credentials retained after logout (email="${emailAfterLogout}", pass="${passAfterLogout}")`
      );
    } else {
      console.log('✔ PASS: Logout cleanly cleared all form fields and unmounted state.');
    }

    // Verify localStorage & sessionStorage contain zero tokens or sensitive auth state
    const storageCheck = await authPage.evaluate(() => {
      const keys = Object.keys(localStorage).concat(Object.keys(sessionStorage));
      const forbidden = keys.filter((k) => /token|pass|auth_user|secret/i.test(k));
      return { keys, forbidden };
    });

    if (storageCheck.forbidden.length > 0) {
      formErrors.push(`FAIL: sensitive keys found in storage: ${storageCheck.forbidden.join(', ')}`);
    } else {
      console.log('✔ PASS: Storage contains zero credentials or auth tokens.');
    }

    await authPage.close();
    await authContext.close();

    // 3. Catalogue & Shopping Bag Tests
    console.log('\n--- Running Catalogue & Shopping Bag Tests ---');
    const shopPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await shopPage.route('**/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: null }),
      });
    });

    const shopErrors = [];

    // Navigate to /shop
    await shopPage.goto(`${baseUrl}/shop`, { waitUntil: 'networkidle' });
    await shopPage.waitForTimeout(150);

    // Check all 3 products rendered
    let cards = await shopPage.$$('article');
    if (cards.length !== 3) {
      shopErrors.push(`FAIL: Expected 3 launch products on /shop, found ${cards.length}`);
    } else {
      console.log('✔ PASS: All 3 launch products correctly displayed in catalogue.');
    }

    // Filter by "Flat Slide (1)"
    await shopPage.click('button:has-text("Flat Slide")');
    await shopPage.waitForTimeout(100);
    cards = await shopPage.$$('article');
    const flatSlideTitle = await shopPage.locator('article h3').textContent();
    if (cards.length !== 1 || !flatSlideTitle.includes('Blue Floral Slide')) {
      shopErrors.push(`FAIL: Filter "Flat Slide" expected 1 card ("Blue Floral Slide"), got ${cards.length}`);
    } else {
      console.log('✔ PASS: "Flat Slide" filter correctly isolates Blue Floral Slide.');
    }

    // Filter by "Interchangeable Heel (2)"
    await shopPage.click('button:has-text("Interchangeable Heel")');
    await shopPage.waitForTimeout(100);
    cards = await shopPage.$$('article');
    if (cards.length !== 2) {
      shopErrors.push(`FAIL: Filter "Interchangeable Heel" expected 2 cards, got ${cards.length}`);
    } else {
      console.log('✔ PASS: "Interchangeable Heel" filter correctly isolates 2 heel models.');
    }

    // Filter back to "All (3)"
    await shopPage.click('button:has-text("All")');
    await shopPage.waitForTimeout(100);
    cards = await shopPage.$$('article');
    if (cards.length !== 3) {
      shopErrors.push(`FAIL: Filter "All" expected 3 cards, got ${cards.length}`);
    } else {
      console.log('✔ PASS: "All" filter restores full launch collection of 3 models.');
    }

    // Test Shopping Bag Flow
    // Click "Add to Bag" on first product
    const addToBagBtn = shopPage.locator('button:has-text("Add to Bag")').first();
    await addToBagBtn.click();
    await shopPage.waitForTimeout(200);

    // Verify Drawer opens
    const drawer = shopPage.locator('[role="dialog"][aria-label="Shopping Bag Drawer"]');
    const isDrawerVisible = await drawer.isVisible();
    if (!isDrawerVisible) {
      shopErrors.push('FAIL: Shopping Bag Drawer did not open after clicking "Add to Bag"');
    } else {
      console.log('✔ PASS: Shopping Bag Drawer opened automatically on Add to Bag.');
    }

    // Verify localStorage persistence
    const bagInStorage = await shopPage.evaluate(() => {
      return JSON.parse(localStorage.getItem('aurevella_bag') || '[]');
    });
    if (!Array.isArray(bagInStorage) || bagInStorage.length !== 1 || bagInStorage[0].quantity !== 1) {
      shopErrors.push(`FAIL: localStorage 'aurevella_bag' unexpected: ${JSON.stringify(bagInStorage)}`);
    } else {
      console.log('✔ PASS: Bag item persisted in localStorage with valid ID and quantity: 1.');
    }

    // Test Quantity Increment
    const increaseBtn = drawer.locator('button[aria-label^="Increase quantity"]').first();
    await increaseBtn.click();
    await shopPage.waitForTimeout(100);

    const updatedQty = await shopPage.evaluate(() => {
      const bag = JSON.parse(localStorage.getItem('aurevella_bag') || '[]');
      return bag[0]?.quantity;
    });
    if (updatedQty !== 2) {
      shopErrors.push(`FAIL: Quantity did not increment to 2, got ${updatedQty}`);
    } else {
      console.log('✔ PASS: Quantity successfully incremented to 2.');
    }

    // Test Quantity Decrement
    const decreaseBtn = drawer.locator('button[aria-label^="Decrease quantity"]').first();
    await decreaseBtn.click();
    await shopPage.waitForTimeout(100);

    const decrementedQty = await shopPage.evaluate(() => {
      const bag = JSON.parse(localStorage.getItem('aurevella_bag') || '[]');
      return bag[0]?.quantity;
    });
    if (decrementedQty !== 1) {
      shopErrors.push(`FAIL: Quantity did not decrement back to 1, got ${decrementedQty}`);
    } else {
      console.log('✔ PASS: Quantity successfully decremented back to 1.');
    }

    // Test Page Reload & Persistence
    await shopPage.reload({ waitUntil: 'networkidle' });
    await shopPage.waitForTimeout(150);

    // Check header bag badge count is 1
    const bagBadge = await shopPage.locator('button[aria-label^="Open shopping bag"]').textContent();
    if (!bagBadge.includes('1')) {
      shopErrors.push(`FAIL: Header bag badge did not display count 1 after reload (text="${bagBadge}")`);
    } else {
      console.log('✔ PASS: Bag count 1 persisted in header badge across page reload.');
    }

    // Open bag drawer from header
    await shopPage.click('button[aria-label^="Open shopping bag"]');
    await shopPage.waitForTimeout(150);

    // Remove item from bag
    const removeBtn = shopPage.locator('button[aria-label^="Remove"]').first();
    await removeBtn.click();
    await shopPage.waitForTimeout(150);

    // Verify empty state
    const emptyStateText = await shopPage.locator('[role="dialog"]').textContent();
    if (!emptyStateText.includes('Your Bag is Empty')) {
      shopErrors.push('FAIL: Bag did not transition to empty state after item removal.');
    } else {
      console.log('✔ PASS: Bag empty state verified after removing item.');
    }

    // Check localStorage is empty array
    const bagAfterRemove = await shopPage.evaluate(() => {
      return JSON.parse(localStorage.getItem('aurevella_bag') || '[]');
    });
    if (bagAfterRemove.length !== 0) {
      shopErrors.push(`FAIL: localStorage not empty after removal: ${JSON.stringify(bagAfterRemove)}`);
    } else {
      console.log('✔ PASS: localStorage correctly cleared to empty array after item removal.');
    }

    // Close drawer
    const closeDrawerBtn = shopPage.locator('button[aria-label="Close shopping bag"]');
    await closeDrawerBtn.click();
    await shopPage.waitForTimeout(100);

    await shopPage.close();

    if (shopErrors.length > 0) {
      console.error('\n[Catalogue/Bag Test Failures]:');
      shopErrors.forEach((e) => console.error(`  - ${e}`));
      allPassed = false;
    } else {
      console.log('\n✔ ALL Catalogue & Shopping Bag tests passed.');
    }

    // Print Results Summary Table
    console.log('\n======================================================');
    console.log('              LAYOUT & RESPONSIVENESS MATRIX          ');
    console.log('======================================================\n');
    console.table(
      results.map((r) => ({
        Route: r.route,
        Width: `${r.width}px`,
        'No Overflow': r.passOverflow ? 'PASS' : 'FAIL',
        'Footer Anchored': r.passFooter ? 'PASS' : 'FAIL',
        CLS: r.cls,
        Errors: r.consoleErrors.length,
        Status: r.passed ? 'PASS' : 'FAIL',
      }))
    );

    if (formErrors.length > 0) {
      console.error('\n[Form Test Failures]:');
      formErrors.forEach((e) => console.error(`  - ${e}`));
      allPassed = false;
    } else {
      console.log('\n✔ ALL Form State tests passed.');
    }

    if (allPassed) {
      console.log('\n✔ ALL ROUTES, WIDTHS, AND FORM CHECKS PASSED PERFECTLY!\n');
    } else {
      console.error('\n❌ SOME CHECKS FAILED. See details above.\n');
    }
  } finally {
    await browser.close();
    server.httpServer.close();
    console.log('[Server] Preview server closed.');
  }

  if (!allPassed) {
    process.exit(1);
  }
}

runLayoutChecks().catch((err) => {
  console.error('[Error] Layout check failed with unhandled exception:', err);
  process.exit(1);
});
