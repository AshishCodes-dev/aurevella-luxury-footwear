import { chromium } from 'playwright';
import { preview } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');

const VIEWPORTS = [768, 900, 1024, 1100, 1180, 1280, 1366, 1440, 1536, 1920];
const STATES = [
  { id: 'logged-out', name: 'Logged-Out', user: null },
  { id: 'customer', name: 'Customer', user: { id: 'cust-test', name: 'Princess Gayatri Devi', email: 'customer@myaurevella.in', role: 'customer' } },
  { id: 'admin', name: 'Admin', user: { id: 'admin-test', name: 'AUREVELLA EXECUTIVE ADMIN', email: 'admin@myaurevella.in', role: 'admin' } },
];

const MOCK_PRODUCTS = [
  {
    id: 'prod-01',
    code: 'prod-01',
    name: 'Floral Block Heel Sandal',
    slug: 'floral-block-heel-sandal',
    pricePaise: 349900,
    price: 3499,
    priceText: '₹3,499',
    category: 'Interchangeable Heel',
    image: '/images/products/product-01-floral-block-heel-sandal.jpg',
    isActive: true,
  },
];

async function runNavbarMatrixCheck() {
  console.log('===================================================================');
  console.log('   AUREVELLA — Permanent Navbar Responsive Matrix Check (CI Mode)  ');
  console.log('===================================================================\n');

  // Start Vite preview on dynamic available port
  const previewServer = await preview({
    root: frontendDir,
    preview: { port: 5173, host: '127.0.0.1', strictPort: false },
  });
  const port = previewServer.httpServer.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Frontend] Preview server running at ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const results = [];
  let anyFailed = false;

  try {
    for (const stateObj of STATES) {
      console.log(`\n>>> Testing Navbar State: [${stateObj.name.toUpperCase()}]`);

      for (const width of VIEWPORTS) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
        });
        const page = await context.newPage();

        // Mock Firebase Auth and Backend APIs offline
        await page.route(/.*identitytoolkit\.googleapis\.com.*/, (route) => {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: { message: 'MOCK_OFFLINE' } }),
          });
        });

        await page.route(/.*\/api\/auth\/me.*/, (route) => {
          if (stateObj.user) {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ success: true, user: stateObj.user }),
            });
          } else {
            route.fulfill({
              status: 401,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Unauthorized', message: 'No valid token provided' }),
            });
          }
        });

        await page.route(/.*\/api\/products.*/, (route) => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ products: MOCK_PRODUCTS, total: 1 }),
          });
        });

        await page.route(/.*\/api\/categories.*/, (route) => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              categories: [{ id: 'cat-1', name: 'Interchangeable Heel', slug: 'interchangeable-heel' }],
            }),
          });
        });

        await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
        await page.waitForSelector('header');

        if (stateObj.id === 'admin') {
          await page.waitForSelector('header a[href="/admin"]', { timeout: 5000 }).catch(() => {});
        } else if (stateObj.id === 'customer') {
          await page.waitForSelector('header button:has-text("Sign Out")', { timeout: 5000 }).catch(() => {});
        } else {
          await page.waitForSelector('header a[href="/login"]', { timeout: 5000 }).catch(() => {});
        }

        // Measure layout integrity inside the page
        const measurement = await page.evaluate(() => {
          const header = document.querySelector('header');
          const headerRow = header ? header.querySelector('div') : null;
          const vw = window.innerWidth;

          // 1. Scroll overflow
          const docScrollOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
          const headerScrollOverflow = header ? header.scrollWidth > header.clientWidth : false;
          const containerScrollOverflow = headerRow ? headerRow.scrollWidth > headerRow.clientWidth : false;
          const hasScrollOverflow = docScrollOverflow || headerScrollOverflow || containerScrollOverflow;

          // 2. Element boundary checks
          const overflowingElements = [];
          if (header) {
            const allElements = header.querySelectorAll('*');
            for (const el of allElements) {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0 && rect.right > vw + 1) {
                overflowingElements.push({
                  tag: el.tagName.toLowerCase(),
                  text: (el.innerText || el.getAttribute('aria-label') || '').slice(0, 30).trim().replace(/\s+/g, ' '),
                  right: Math.round(rect.right),
                  vw,
                  diff: Math.round(rect.right - vw),
                });
              }
            }
          }

          // 3. Multi-line nav link wrapping check
          function isTextWrapped(el) {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
              const text = node.textContent.trim();
              if (!text) continue;
              const range = document.createRange();
              range.selectNode(node);
              const rects = Array.from(range.getClientRects()).filter(r => r.width > 0 && r.height > 0);
              const uniqueTops = new Set(rects.map(r => Math.round(r.top)));
              if (uniqueTops.size > 1) {
                return { wrapped: true, text, lineCount: uniqueTops.size };
              }
            }
            return { wrapped: false };
          }

          const wrappedLinks = [];
          const allInteractiveElements = Array.from(document.querySelectorAll('header nav a, header button, header a'));
          for (const item of allInteractiveElements) {
            const wrapResult = isTextWrapped(item);
            if (wrapResult.wrapped) {
              wrappedLinks.push({
                text: wrapResult.text,
                lineCount: wrapResult.lineCount,
              });
            }
          }

          // 4. Overlap checks
          const overlaps = [];
          if (headerRow && headerRow.children.length >= 3) {
            const logoCol = headerRow.children[0];
            const navCol = headerRow.children[1];
            const rightCol = headerRow.children[2];

            const isNavVisible = navCol && window.getComputedStyle(navCol).display !== 'none';
            if (logoCol && navCol && isNavVisible) {
              const logoRect = logoCol.getBoundingClientRect();
              const navRect = navCol.getBoundingClientRect();
              if (logoRect.right > navRect.left + 1) {
                overlaps.push(`Logo overlaps Nav (logo.right=${Math.round(logoRect.right)} > nav.left=${Math.round(navRect.left)})`);
              }
            }

            if (navCol && rightCol && isNavVisible) {
              const navRect = navCol.getBoundingClientRect();
              const rightRect = rightCol.getBoundingClientRect();
              if (navRect.right > rightRect.left + 1) {
                overlaps.push(`Nav overlaps Right Cluster (nav.right=${Math.round(navRect.right)} > right.left=${Math.round(rightRect.left)})`);
              }
            }
          }

          // Sibling overlaps inside Nav
          const navLinks = Array.from(document.querySelectorAll('header nav a'));
          for (let i = 0; i < navLinks.length; i++) {
            for (let j = i + 1; j < navLinks.length; j++) {
              const r1 = navLinks[i].getBoundingClientRect();
              const r2 = navLinks[j].getBoundingClientRect();
              if (r1.width > 0 && r2.width > 0 && r1.right > r2.left + 1 && r1.left < r2.right - 1) {
                overlaps.push(`Nav items overlap: "${navLinks[i].innerText.trim()}" and "${navLinks[j].innerText.trim()}"`);
              }
            }
          }

          return {
            hasScrollOverflow,
            overflowingElements,
            wrappedLinks,
            overlaps,
          };
        });

        const isPass = !measurement.hasScrollOverflow &&
                       measurement.overflowingElements.length === 0 &&
                       measurement.wrappedLinks.length === 0 &&
                       measurement.overlaps.length === 0;

        if (!isPass) anyFailed = true;

        const record = {
          viewport: width,
          state: stateObj.id,
          hasScrollOverflow: measurement.hasScrollOverflow,
          overflowCount: measurement.overflowingElements.length,
          overflowDetails: measurement.overflowingElements.map(e => `${e.tag}("${e.text}") +${e.diff}px`).join('; '),
          wrappedCount: measurement.wrappedLinks.length,
          wrappedDetails: measurement.wrappedLinks.map(w => `"${w.text}" (${w.lineCount} lines)`).join('; '),
          overlapCount: measurement.overlaps.length,
          overlapDetails: measurement.overlaps.join('; '),
          status: isPass ? 'PASS' : 'FAIL',
        };

        results.push(record);
        console.log(`  [${width}px] => ${record.status} ${!isPass ? `| Scroll: ${record.hasScrollOverflow} | Overflow: ${record.overflowCount} | Wrapped: ${record.wrappedCount} | Overlap: ${record.overlapCount}` : ''}`);

        await context.close();
      }
    }

    // Print summary table
    console.log(`\n===================================================================`);
    console.log(` FINAL NAVBAR RESULTS TABLE`);
    console.log(`===================================================================`);
    console.log(`| Width  | State      | Scroll Overflow | Right Edge Overflow | Wrapped Links | Overlaps | Status |`);
    console.log(`|--------|------------|-----------------|---------------------|---------------|----------|--------|`);
    for (const r of results) {
      console.log(`| ${String(r.viewport).padEnd(6)} | ${r.state.padEnd(10)} | ${String(r.hasScrollOverflow).padEnd(15)} | ${String(r.overflowCount).padEnd(19)} | ${String(r.wrappedCount).padEnd(13)} | ${String(r.overlapCount).padEnd(8)} | ${r.status.padEnd(6)} |`);
    }

    const failed = results.filter(r => r.status === 'FAIL');
    console.log(`\nTotal Combinations: ${results.length}`);
    console.log(`Passed: ${results.length - failed.length}`);
    console.log(`Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.error(`\n❌ NAVBAR CHECK FAILED with ${failed.length} failing configurations.`);
      process.exit(1);
    } else {
      console.log(`\n✔ ALL 30 NAVBAR COMBINATIONS PASSED PERFECTLY!\n`);
      process.exit(0);
    }

  } finally {
    await browser.close();
    previewServer.httpServer.close();
  }
}

runNavbarMatrixCheck().catch((err) => {
  console.error('Fatal navbar check error:', err);
  process.exit(1);
});
