/**
 * AUREVELLA — Black-Box Authentication User Simulation
 * Phase 1 Execution Script
 *
 * Runs Journeys A through E in headless Chromium against the live running site:
 * Frontend: http://localhost:5173
 * Backend:  http://localhost:5000
 */

import { chromium } from 'playwright';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:5000';

async function runBlackBoxSimulation() {
  console.log('===============================================================');
  console.log('   AUREVELLA — Phase 1: Black-Box Authentication Simulation    ');
  console.log('===============================================================\n');

  const browser = await chromium.launch({ headless: true });
  const findings = [];

  const recordFinding = (journey, step, description, details) => {
    findings.push({ journey, step, description, details });
    console.log(`[${journey}] Step ${step}: ${description}`);
    if (details) console.log(`   -> Detail: ${JSON.stringify(details)}`);
  };

  try {
    // -------------------------------------------------------------------------
    // JOURNEY A & B: LOGIN AUDIT (Initial State, Empty, Malformed, Invalid, Visibility)
    // -------------------------------------------------------------------------
    console.log('--- Executing Journey A & B: Login Page Form State & Validation ---');
    {
      const context = await browser.newContext();
      const page = await context.newPage();

      // 1. Open login page
      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#email');

      // 2. Inspect initial form field states
      const emailInput = page.locator('#email');
      const passwordInput = page.locator('#password');
      const emailVal = await emailInput.inputValue();
      const passwordVal = await passwordInput.inputValue();
      const emailType = await emailInput.getAttribute('type');
      const passwordType = await passwordInput.getAttribute('type');
      const emailAutocomplete = await emailInput.getAttribute('autocomplete');
      const passwordAutocomplete = await passwordInput.getAttribute('autocomplete');

      recordFinding('Journey A', 1, 'Initial Login Form Field State', {
        emailVal,
        passwordVal,
        emailType,
        passwordType,
        emailAutocomplete,
        passwordAutocomplete,
      });

      // 3. Password visibility toggle test
      const toggleBtn = page.locator('button[aria-label*="password"], button:has(svg)').filter({ has: page.locator('svg') });
      const toggleVisible = await page.locator('button:has(.lucide-eye, .lucide-eye-off)').isVisible();
      let typeBefore = await passwordInput.getAttribute('type');
      let typeAfter = null;
      let typeRestored = null;

      if (toggleVisible) {
        await passwordInput.fill('SampleSecret123');
        const eyeBtn = page.locator('button:has(.lucide-eye, .lucide-eye-off)');
        await eyeBtn.click();
        typeAfter = await passwordInput.getAttribute('type');
        await eyeBtn.click();
        typeRestored = await passwordInput.getAttribute('type');
      }

      recordFinding('Journey A', 2, 'Password Visibility Toggle Behavior', {
        toggleVisible,
        typeBefore,
        typeAfter,
        typeRestored,
      });

      // Clear the test value
      await passwordInput.fill('');
      await emailInput.fill('');

      // 4. Journey B: Submit empty fields
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      await page.waitForTimeout(200);

      const emptyEmailError = await page.locator('p.text-red-400, span.text-red-400, .text-destructive').allInnerTexts();
      recordFinding('Journey B', 1, 'Empty Fields Validation Response', {
        errorMessages: emptyEmailError,
      });

      // 5. Journey B: Malformed email input
      await emailInput.fill('invalid-email-format');
      await passwordInput.fill('short');
      await submitBtn.click();
      await page.waitForTimeout(200);

      const malformedErrors = await page.locator('p.text-red-400, span.text-red-400, .text-destructive').allInnerTexts();
      recordFinding('Journey B', 2, 'Malformed Input Client Validation', {
        errorMessages: malformedErrors,
      });

      // 6. Journey B: Valid format but non-existent or invalid credentials
      await emailInput.fill('nonexistent.user.audit@aurevella.com');
      await passwordInput.fill('ValidLengthWrongPass123!');
      await submitBtn.click();

      // Wait for server response alert or error
      await page.waitForSelector('[role="alert"]', { timeout: 10000 }).catch(() => {});

      const serverAlert = await page.locator('[role="alert"]').allInnerTexts();
      const currentUrlAfterFailed = page.url();
      const postFailedEmail = await emailInput.inputValue();
      const postFailedPass = await passwordInput.inputValue();

      recordFinding('Journey B', 3, 'Invalid Credentials Server Response & Field State', {
        serverAlert,
        currentUrlAfterFailed,
        postFailedEmailPreserved: postFailedEmail === 'nonexistent.user.audit@aurevella.com',
        postFailedPassEmpty: postFailedPass === '',
      });

      // Check application storage for leaked credentials
      const storageAudit = await page.evaluate(() => {
        return {
          localStorageKeys: Object.keys(localStorage),
          sessionStorageKeys: Object.keys(sessionStorage),
          localStorageDump: JSON.stringify(localStorage),
        };
      });

      recordFinding('Journey B', 4, 'Storage Inspection After Failed Login', {
        storageAudit,
        containsPassword: storageAudit.localStorageDump.includes('ValidLengthWrongPass123!'),
      });

      await context.close();
    }

    // -------------------------------------------------------------------------
    // JOURNEY C: SIGNUP PAGE AUDIT
    // -------------------------------------------------------------------------
    console.log('\n--- Executing Journey C: Signup Page Form State & Controls ---');
    {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`${FRONTEND_URL}/signup`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#email');

      const nameInput = page.locator('#name');
      const emailInput = page.locator('#email');
      const passwordInput = page.locator('#password');
      const confirmInput = page.locator('#confirmPassword');

      const initialFields = {
        name: await nameInput.inputValue().catch(() => null),
        email: await emailInput.inputValue().catch(() => null),
        password: await passwordInput.inputValue().catch(() => null),
        confirmPassword: await confirmInput.inputValue().catch(() => null),
      };

      recordFinding('Journey C', 1, 'Initial Signup Form State', initialFields);

      // Submit empty signup form
      const signupSubmit = page.locator('button[type="submit"]');
      await signupSubmit.click();
      await page.waitForTimeout(200);

      const signupErrors = await page.locator('p.text-red-400, span.text-red-400, .text-destructive').allInnerTexts();
      recordFinding('Journey C', 2, 'Empty Signup Form Validation Errors', {
        errors: signupErrors,
      });

      // Test Password mismatch validation
      if (await confirmInput.isVisible()) {
        await nameInput.fill('Audit Test Customer');
        await emailInput.fill('audit.test@example.com');
        await passwordInput.fill('SecurePass123!');
        await confirmInput.fill('MismatchPass456!');
        await signupSubmit.click();
        await page.waitForTimeout(200);

        const mismatchErrors = await page.locator('p.text-red-400, span.text-red-400, .text-destructive').allInnerTexts();
        recordFinding('Journey C', 3, 'Password Mismatch Validation Response', {
          errors: mismatchErrors,
        });
      }

      await context.close();
    }

    // -------------------------------------------------------------------------
    // JOURNEY D: GOOGLE SIGN-IN INTERACTION AUDIT
    // -------------------------------------------------------------------------
    console.log('\n--- Executing Journey D: Google Sign-in Flow & Provider Check ---');
    {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#email');

      const googleBtn = page.locator('button:has-text("Google"), button[aria-label*="Google"]');
      const googleBtnVisible = await googleBtn.isVisible();

      recordFinding('Journey D', 1, 'Google Sign-in Button Presence', {
        googleBtnVisible,
        buttonText: googleBtnVisible ? await googleBtn.innerText() : null,
      });

      // Click Google Sign-in in headless browser to observe popup error / cancellation
      let popupErrorTriggered = false;
      let alertText = null;

      if (googleBtnVisible) {
        // Intercept popup or error
        page.on('pageerror', (err) => console.log('Google page error:', err.message));
        await googleBtn.click();
        await page.waitForTimeout(1000);

        alertText = await page.locator('[role="alert"], .text-red-400, .text-destructive').allInnerTexts();
      }

      recordFinding('Journey D', 2, 'Google Sign-in Click in Headless Environment', {
        alertText,
      });

      await context.close();
    }

    // -------------------------------------------------------------------------
    // JOURNEY A (PART 2) & JOURNEY E: LOGOUT & SENSITIVE FORM PURGING
    // -------------------------------------------------------------------------
    console.log('\n--- Executing Journey A (Part 2) & E: Logout Lifecycle & Sensitive Form Purging ---');
    {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Mock customer session
      await page.route(/.*\/api\/auth\/me.*/, (route) => {
        route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': FRONTEND_URL,
            'Access-Control-Allow-Credentials': 'true',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'success',
            user: {
              id: 'cust-audit-01',
              email: 'customer.audit@aurevella.com',
              name: 'Audited Customer',
              role: 'customer',
              isActive: true,
              emailVerified: true,
            },
          }),
        });
      });

      // Mock logout endpoint
      await page.route(/.*\/api\/auth\/logout.*/, (route) => {
        route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': FRONTEND_URL,
            'Access-Control-Allow-Credentials': 'true',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'success', message: 'Logged out successfully' }),
        });
      });

      // 1. Load authenticated session on /account
      await page.goto(`${FRONTEND_URL}/account`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const authenticatedUrl = page.url();
      const accountBody = await page.textContent('body');
      const accountVerified = accountBody.includes('Audited Customer') || accountBody.includes('customer.audit');

      recordFinding('Journey A', 3, 'Authenticated Customer on /account', {
        authenticatedUrl,
        accountVerified,
      });

      // 2. Perform UI logout
      const signOutBtn = page.locator('header button[aria-label="Sign out"]');
      let logoutExecuted = false;
      if (await signOutBtn.isVisible()) {
        await signOutBtn.click({ force: true });
        await page.waitForTimeout(500);
        logoutExecuted = true;
      }

      const postLogoutUrl = page.url();
      recordFinding('Journey A', 4, 'UI Logout Execution', {
        logoutExecuted,
        postLogoutUrl,
      });

      // 3. Inspect the resulting /login form state after logout
      const postLogoutEmailVal = await page.locator('#email').inputValue().catch(() => null);
      const postLogoutPassVal = await page.locator('#password').inputValue().catch(() => null);

      recordFinding('Journey A', 5, 'Post-Logout Login Form Field State', {
        postLogoutEmailVal,
        postLogoutPassVal,
        isEmailEmpty: postLogoutEmailVal === '',
        isPassEmpty: postLogoutPassVal === '',
      });

      // 4. Verify /account is now blocked
      // Remove mock auth so /api/auth/me returns 401
      await page.unroute(/.*\/api\/auth\/me.*/);
      await page.route(/.*\/api\/auth\/me.*/, (route) => {
        route.fulfill({
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': FRONTEND_URL,
            'Access-Control-Allow-Credentials': 'true',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'error', message: 'Authentication required' }),
        });
      });

      await page.goto(`${FRONTEND_URL}/account`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL('**/login', { timeout: 5000 }).catch(() => {});
      const blockedUrl = page.url();

      recordFinding('Journey A', 6, 'Post-Logout Protected Route Navigation (/account)', {
        blockedUrl,
        redirectedToLogin: blockedUrl.includes('/login'),
      });

      // 5. Inspect localStorage & sessionStorage after logout
      const postLogoutStorage = await page.evaluate(() => {
        return {
          localStorageKeys: Object.keys(localStorage),
          sessionStorageKeys: Object.keys(sessionStorage),
          cookie: document.cookie,
        };
      });

      recordFinding('Journey A', 7, 'Post-Logout Browser Storage State', postLogoutStorage);

      await context.close();
    }

    console.log('\n===============================================================');
    console.log('       BLACK-BOX SIMULATION FINDINGS COMPLETE                  ');
    console.log('===============================================================');
  } finally {
    await browser.close();
  }
}

runBlackBoxSimulation().catch((err) => {
  console.error('Simulation Error:', err);
  process.exit(1);
});
