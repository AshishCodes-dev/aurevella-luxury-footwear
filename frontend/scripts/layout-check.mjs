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
  { path: '/shop', name: 'shop', isShort: true },
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
        await page.screenshot({ path: screenshotFilePath, fullPage: true });

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

    await formPage.close();

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
