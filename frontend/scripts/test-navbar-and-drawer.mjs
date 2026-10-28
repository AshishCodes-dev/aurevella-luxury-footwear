import { chromium } from 'playwright';
import { preview } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440px' },
  { width: 1280, height: 800, name: '1280px' },
  { width: 1024, height: 768, name: '1024px' },
  { width: 768, height: 1024, name: '768px' },
  { width: 390, height: 844, name: '390px' },
  { width: 360, height: 740, name: '360px' },
];

function getCorsHeaders(route) {
  const reqHeaders = route.request().headers();
  const origin = reqHeaders['origin'] || 'http://127.0.0.1:4173';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Aurevella-Request',
  };
}

async function runVerification() {
  console.log('===============================================================');
  console.log('  AUREVELLA — Navbar Redesign & Drawer Double-Scroll Audit     ');
  console.log('===============================================================\n');

  const server = await preview({
    root: frontendDir,
    preview: { port: 4173, host: '127.0.0.1' },
  });
  const baseUrl = 'http://127.0.0.1:4173';

  const browser = await chromium.launch({ headless: true });
  let allPassed = true;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`✔ [PASS] ${message}`);
    } else {
      console.error(`✖ [FAIL] ${message}`);
      allPassed = false;
    }
  };

  try {
    // -------------------------------------------------------------
    // PART 1: Navbar Verification Across 6 Viewports
    // -------------------------------------------------------------
    console.log('\n--- Part 1: Navbar Verification Across Viewports ---');

    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(150);

      const navData = await page.evaluate(() => {
        const docEl = document.documentElement;
        const body = document.body;
        const winWidth = window.innerWidth;
        const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
        const hasOverflow = scrollWidth > winWidth + 1;
        const header = document.querySelector('header');
        const logo = header ? header.querySelector('a[aria-label="AUREVELLA home"]') : null;
        const logoRect = logo ? logo.getBoundingClientRect() : null;
        const logoVisible = logoRect && logoRect.width > 50 && logoRect.right <= winWidth;
        const searchBtn = header ? header.querySelector('a[aria-label*="Search"]') : null;
        const bagBtn = header ? header.querySelector('button[aria-label^="Open shopping bag"]') : null;
        const menuBtn = header ? header.querySelector('button[aria-label="Open mobile navigation"]') : null;

        return {
          hasOverflow,
          scrollWidth,
          winWidth,
          logoVisible,
          hasSearch: !!searchBtn,
          hasBag: !!bagBtn,
          hasMenuBtn: !!menuBtn,
        };
      });

      assert(!navData.hasOverflow, `Viewport ${vp.name}: Zero horizontal overflow (scrollWidth: ${navData.scrollWidth}px, winWidth: ${navData.winWidth}px)`);
      assert(navData.logoVisible, `Viewport ${vp.name}: AUREVELLA Logo visible and unclipped`);
      assert(navData.hasSearch, `Viewport ${vp.name}: Search trigger present in header`);
      assert(navData.hasBag, `Viewport ${vp.name}: Bag trigger present in header`);

      if (vp.width <= 768) {
        assert(navData.hasMenuBtn, `Viewport ${vp.name}: Mobile hamburger menu visible`);
      }

      await page.close();
    }

    // -------------------------------------------------------------
    // PART 2: Admin and Authenticated Role Header Inspection
    // -------------------------------------------------------------
    console.log('\n--- Part 2: Authenticated Customer & Admin Role Navigation ---');
    {
      const adminPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });

      // Mock admin user
      await adminPage.route(/.*\/api\/auth\/me.*/, (route) => {
        route.fulfill({
          status: 200,
          headers: { ...getCorsHeaders(route), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'success',
            user: { uid: 'adm-01', name: 'Executive Director', email: 'admin@aurevella.com', role: 'admin' },
          }),
        });
      });

      await adminPage.goto(`${baseUrl}/shop`, { waitUntil: 'networkidle' });
      await adminPage.waitForTimeout(200);

      const adminHeaderData = await adminPage.evaluate(() => {
        const header = document.querySelector('header');
        const text = header ? header.innerText : '';
        const adminBadge = header ? header.querySelector('a[href="/admin"]') : null;
        const accountLink = header ? header.querySelector('a[href="/account"]') : null;
        const signOutBtn = header ? Array.from(header.querySelectorAll('button')).find(b => (b.textContent && b.textContent.includes('Sign Out')) || (b.getAttribute('aria-label') && b.getAttribute('aria-label').toLowerCase().includes('sign out'))) : null;
        const hasCompetingAccountAdmin = text.includes('Account (Admin)');

        return {
          hasAdminBadge: !!adminBadge,
          adminBadgeText: adminBadge ? adminBadge.innerText.trim() : '',
          hasAccountLink: !!accountLink,
          accountText: accountLink ? accountLink.innerText.trim() : '',
          hasSignOut: !!signOutBtn,
          hasCompetingAccountAdmin,
        };
      });

      assert(adminHeaderData.hasAdminBadge, 'Admin user sees compact Admin badge linking to /admin');
      assert(!adminHeaderData.hasCompetingAccountAdmin, 'Clean separation: No competing "Account (Admin)" text');
      assert(adminHeaderData.hasAccountLink, 'Account link accessible for admin profile');
      assert(adminHeaderData.hasSignOut, 'Sign Out button accessible in header');

      await adminPage.close();
    }

    // -------------------------------------------------------------
    // PART 3: Bag Drawer Double Scrollbar & Scroll-Lock Lifecycle
    // -------------------------------------------------------------
    console.log('\n--- Part 3: Bag Drawer Double Scrollbar & Scroll-Lock Lifecycle ---');
    {
      const drawerPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });

      // Load products into localStorage to ensure enough items to test drawer scrolling
      await drawerPage.goto(`${baseUrl}/shop`, { waitUntil: 'networkidle' });
      await drawerPage.evaluate(() => {
        const mockItems = [
          {
            id: 'prod-01',
            lineKey: 'prod-01_EU 38',
            name: 'Floral Block Heel Sandal',
            category: 'Interchangeable Heel',
            price: 3499,
            priceText: '₹3,499',
            quantity: 2,
            lineTotal: 6998,
            lineTotalText: '₹6,998',
            image: '/images/products/product-01-floral-block-heel-sandal.jpg',
            size: 'EU 38',
          },
          {
            id: 'prod-02',
            lineKey: 'prod-02_EU 37',
            name: 'Blue Floral Slide',
            category: 'Flat Slide',
            price: 3299,
            priceText: '₹3,299',
            quantity: 1,
            lineTotal: 3299,
            lineTotalText: '₹3,299',
            image: '/images/products/product-02-blue-floral-slide.jpg',
            size: 'EU 37',
          },
          {
            id: 'prod-03',
            lineKey: 'prod-03_EU 39',
            name: 'Floral Block Heel Mule',
            category: 'Interchangeable Heel',
            price: 3699,
            priceText: '₹3,699',
            quantity: 1,
            lineTotal: 3699,
            lineTotalText: '₹3,699',
            image: '/images/products/product-03-floral-block-heel-mule.jpg',
            size: 'EU 39',
          },
        ];
        localStorage.setItem('aurevella_bag', JSON.stringify(mockItems));
      });

      // Reload to hydrate bag state
      await drawerPage.reload({ waitUntil: 'networkidle' });
      await drawerPage.waitForTimeout(200);

      // Verify page is initially scrollable
      const initialScroll = await drawerPage.evaluate(() => {
        return {
          bodyOverflow: document.body.style.overflow,
          htmlOverflow: document.documentElement.style.overflow,
        };
      });
      assert(initialScroll.bodyOverflow === '' && initialScroll.htmlOverflow === '', 'Initial page: Background scrolling is unlocked');

      // 1. Open drawer
      await drawerPage.locator('button[aria-label^="Open shopping bag"]').click();
      await drawerPage.waitForTimeout(250);

      // 2. Verify background page scroll lock
      const lockedScroll = await drawerPage.evaluate(() => {
        return {
          bodyOverflow: document.body.style.overflow,
          htmlOverflow: document.documentElement.style.overflow,
          scrollYBefore: window.scrollY,
        };
      });
      assert(lockedScroll.bodyOverflow === 'hidden' && lockedScroll.htmlOverflow === 'hidden', 'Drawer Open: Both documentElement and body have overflow="hidden" (Page locked)');

      // 3. Attempt scrolling the background window
      await drawerPage.mouse.wheel(0, 500);
      await drawerPage.waitForTimeout(100);
      const scrollYAfter = await drawerPage.evaluate(() => window.scrollY);
      assert(scrollYAfter === lockedScroll.scrollYBefore, 'Drawer Open: Background page does not scroll when mouse wheel fires');

      // 4. Verify Single Scroll Container inside Drawer
      const scrollContainers = await drawerPage.evaluate(() => {
        const drawer = document.querySelector('[role="dialog"][aria-label="Shopping Bag Drawer"]');
        if (!drawer) return [];
        const allEls = drawer.querySelectorAll('*');
        const scrollable = [];
        for (const el of allEls) {
          const style = window.getComputedStyle(el);
          if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
            scrollable.push({
              tag: el.tagName.toLowerCase(),
              className: typeof el.className === 'string' ? el.className.slice(0, 50) : '',
              scrollHeight: el.scrollHeight,
              clientHeight: el.clientHeight,
            });
          }
        }
        return scrollable;
      });

      assert(scrollContainers.length === 1, `Drawer has exactly ONE scrollable container (Found: ${scrollContainers.length})`);

      // 5. Verify Pinned Header and Footer accessibility
      const drawerLayout = await drawerPage.evaluate(() => {
        const drawer = document.querySelector('[role="dialog"][aria-label="Shopping Bag Drawer"]');
        const header = drawer ? drawer.querySelector('h2') : null;
        const checkoutBtn = drawer ? drawer.querySelector('a[href="/checkout"]') : null;
        const headerRect = header ? header.getBoundingClientRect() : null;
        const checkoutRect = checkoutBtn ? checkoutBtn.getBoundingClientRect() : null;
        const winHeight = window.innerHeight;

        return {
          headerVisible: headerRect && headerRect.top >= 0 && headerRect.top < 100,
          checkoutVisible: checkoutRect && checkoutRect.bottom <= winHeight + 10 && checkoutRect.top > 0,
        };
      });

      assert(drawerLayout.headerVisible, 'Drawer Header is pinned and visible at top');
      assert(drawerLayout.checkoutVisible, 'Drawer Checkout area is pinned and accessible within viewport');

      // 6. Test Quantity mutation and item removal inside drawer
      const initialTotalText = await drawerPage.locator('[role="dialog"] span:has-text("₹")').first().textContent();
      // Click increase quantity on second item
      const plusBtn = drawerPage.locator('button[aria-label^="Increase quantity"]').first();
      await plusBtn.click();
      await drawerPage.waitForTimeout(100);

      // Remove third item
      const removeBtn = drawerPage.locator('button[aria-label^="Remove"]').last();
      await removeBtn.click();
      await drawerPage.waitForTimeout(100);

      // 7. Close drawer via close button and verify scroll restoration
      await drawerPage.locator('button[aria-label="Close shopping bag"]').click();
      await drawerPage.waitForTimeout(200);

      const restoredScroll = await drawerPage.evaluate(() => {
        return {
          bodyOverflow: document.body.style.overflow,
          htmlOverflow: document.documentElement.style.overflow,
        };
      });
      assert(restoredScroll.bodyOverflow === '' && restoredScroll.htmlOverflow === '', 'Drawer Closed (Button): Page scrolling cleanly restored');

      // 8. Reopen and close via ESC key
      await drawerPage.locator('button[aria-label^="Open shopping bag"]').click();
      await drawerPage.waitForTimeout(200);
      await drawerPage.keyboard.press('Escape');
      await drawerPage.waitForTimeout(200);

      const escRestored = await drawerPage.evaluate(() => {
        return {
          bodyOverflow: document.body.style.overflow,
          htmlOverflow: document.documentElement.style.overflow,
        };
      });
      assert(escRestored.bodyOverflow === '' && escRestored.htmlOverflow === '', 'Drawer Closed (Escape Key): Page scrolling cleanly restored');

      // 9. Reopen and close via Backdrop click
      await drawerPage.locator('button[aria-label^="Open shopping bag"]').click();
      await drawerPage.waitForTimeout(200);
      await drawerPage.locator('[role="dialog"] > div[aria-hidden="true"]').click({ position: { x: 50, y: 50 } });
      await drawerPage.waitForTimeout(200);

      const backdropRestored = await drawerPage.evaluate(() => {
        return {
          bodyOverflow: document.body.style.overflow,
          htmlOverflow: document.documentElement.style.overflow,
        };
      });
      assert(backdropRestored.bodyOverflow === '' && backdropRestored.htmlOverflow === '', 'Drawer Closed (Backdrop Click): Page scrolling cleanly restored');

      // 10. Check /bag page has normal page scrolling and zero nested scrollbars
      await drawerPage.goto(`${baseUrl}/bag`, { waitUntil: 'networkidle' });
      await drawerPage.waitForTimeout(200);

      const bagPageScrollbars = await drawerPage.evaluate(() => {
        const allEls = document.querySelectorAll('*');
        const scrollable = [];
        for (const el of allEls) {
          if (el.tagName.toLowerCase() === 'html' || el.tagName.toLowerCase() === 'body') continue;
          const style = window.getComputedStyle(el);
          if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
            scrollable.push(el.tagName.toLowerCase());
          }
        }
        return scrollable;
      });
      assert(bagPageScrollbars.length === 0, 'Full Bag Page (/bag): Zero accidental nested scroll containers');

      await drawerPage.close();
    }

    console.log('\n===============================================================');
    if (allPassed) {
      console.log('✔ ALL NAVBAR REDESIGN & DRAWER SCROLL AUDIT CHECKS PASSED!');
    } else {
      console.error('❌ SOME CHECKS FAILED. See details above.');
    }
    console.log('===============================================================\n');

  } finally {
    await browser.close();
    await server.close();
  }

  process.exit(allPassed ? 0 : 1);
}

runVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
