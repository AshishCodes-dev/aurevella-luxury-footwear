import { chromium } from 'playwright';
import { preview } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');

async function testAuthReset() {
  console.log('\n=============================================================');
  console.log('   AUREVELLA — Auth Form Reset & Lifecycle Verification     ');
  console.log('=============================================================\n');

  console.log('[Server] Starting Vite preview server...');
  const server = await preview({
    root: frontendDir,
    preview: { port: 4173, host: '127.0.0.1' },
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  let loggedInUser = null;

  // Intercept authentication API endpoints
  await page.route('**/api/auth/me', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: loggedInUser }),
    });
  });

  await page.route('**/api/auth/logout', (route) => {
    loggedInUser = null;
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Logged out successfully' }),
    });
  });

  const failures = [];

  // TEST 1: Initial Page Load
  console.log('--- Test 1: Initial load on /login ---');
  await page.goto('http://127.0.0.1:4173/login', { waitUntil: 'networkidle' });
  let emailVal = await page.inputValue('#email');
  let passVal = await page.inputValue('#password');
  if (emailVal !== '' || passVal !== '') {
    failures.push(`FAIL: Initial /login not empty (email="${emailVal}", pass="${passVal}")`);
  } else {
    console.log('✔ PASS: Initial /login form opened with pristine empty fields.');
  }

  // TEST 2: Active Typing Verification (Ensures fields don't accidentally clear while typing)
  console.log('\n--- Test 2: Active typing stability ---');
  await page.fill('#email', 'artisan@aurevella.com');
  await page.fill('#password', 'AtelierCraft2026!');
  await page.waitForTimeout(200);

  emailVal = await page.inputValue('#email');
  passVal = await page.inputValue('#password');
  if (emailVal !== 'artisan@aurevella.com' || passVal !== 'AtelierCraft2026!') {
    failures.push(`FAIL: Active typing corrupted: email="${emailVal}", pass="${passVal}"`);
  } else {
    console.log('✔ PASS: Values preserved while user is actively typing.');
  }

  // TEST 3: Navigation away without submit -> reopen /login
  console.log('\n--- Test 3: Abandoned form -> navigate to /shop -> reopen /login ---');
  await page.click('a[href="/shop"]');
  await page.waitForURL('**/shop');
  await page.waitForTimeout(150);

  await page.click('a[href="/login"]');
  await page.waitForURL('**/login');
  await page.waitForTimeout(200);

  emailVal = await page.inputValue('#email');
  passVal = await page.inputValue('#password');
  if (emailVal !== '' || passVal !== '') {
    failures.push(`FAIL: Reopened /login retained abandoned form values (email="${emailVal}", pass="${passVal}")`);
  } else {
    console.log('✔ PASS: Reopening /login after navigating away initializes with empty fields.');
  }

  // TEST 4: Failed Login Clears Password & Preserves Email
  console.log('\n--- Test 4: Failed login submission ---');
  await page.fill('#email', 'incorrect_shopper@example.com');
  await page.fill('#password', 'WrongSecret999');
  await page.click('button[type="submit"]');

  // Wait for alert error banner
  await page.waitForSelector('[role="alert"]', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(200);

  emailVal = await page.inputValue('#email');
  passVal = await page.inputValue('#password');
  if (emailVal !== 'incorrect_shopper@example.com') {
    failures.push(`FAIL: Email was lost on failed login (got "${emailVal}")`);
  } else if (passVal !== '') {
    failures.push(`FAIL: Password was not wiped on failed login (got "${passVal}")`);
  } else {
    console.log('✔ PASS: Failed login cleared password and preserved email for re-attempt.');
  }

  // TEST 5: Successful Login -> Logout -> Reopen Login Flow
  console.log('\n--- Test 5: Full Login -> Logout -> Reopen Login Flow ---');
  loggedInUser = {
    uid: 'shopper-test-uid',
    email: 'elena.rossi@aurevella.com',
    name: 'Elena Rossi',
    role: 'customer',
    isActive: true,
    emailVerified: true,
    providers: ['password'],
  };

  // Navigate to /account directly with logged-in user mock
  await page.goto('http://127.0.0.1:4173/account', { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  console.log('Logged in session active on /account.');

  // Click Sign Out
  const signOutBtn = page.locator('button:has-text("Sign Out")').first();
  await signOutBtn.click();
  await page.waitForURL('**/login');
  await page.waitForTimeout(300);

  emailVal = await page.inputValue('#email');
  passVal = await page.inputValue('#password');
  if (emailVal !== '' || passVal !== '') {
    failures.push(`FAIL: Credentials retained after logout (email="${emailVal}", pass="${passVal}")`);
  } else {
    console.log('✔ PASS: Logout cleanly cleared all application-controlled form fields.');
  }

  // Take screenshot of pristine /login post-logout
  const screenshotPath = path.resolve(frontendDir, '.layout-shots', 'verified_logout_login_flow.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Saved verification snapshot to ${screenshotPath}`);

  // TEST 6: Refresh on /login
  console.log('\n--- Test 6: Page refresh on /login ---');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  emailVal = await page.inputValue('#email');
  passVal = await page.inputValue('#password');
  if (emailVal !== '' || passVal !== '') {
    failures.push(`FAIL: Values appeared after reload (email="${emailVal}", pass="${passVal}")`);
  } else {
    console.log('✔ PASS: Page reload on /login maintains pristine empty fields.');
  }

  // TEST 7: Signup Page Clean Form Lifecycle
  console.log('\n--- Test 7: Signup page form lifecycle ---');
  await page.goto('http://127.0.0.1:4173/signup', { waitUntil: 'networkidle' });
  const nameVal = await page.inputValue('#name');
  const signupEmail = await page.inputValue('#email');
  const signupPass = await page.inputValue('#password');
  const confirmPass = await page.inputValue('#confirmPassword');

  if (nameVal !== '' || signupEmail !== '' || signupPass !== '' || confirmPass !== '') {
    failures.push(`FAIL: /signup fields not empty on visit`);
  } else {
    console.log('✔ PASS: /signup form opened with pristine empty fields across all 4 inputs.');
  }

  // TEST 8: Storage Credential Security Audit
  console.log('\n--- Test 8: Storage credential security check ---');
  const storageKeys = await page.evaluate(() => {
    const local = Object.keys(localStorage);
    const session = Object.keys(sessionStorage);
    const sensitive = local.concat(session).filter((k) => /pass|token|secret|credential|auth_user/i.test(k));
    return { local, session, sensitive };
  });

  if (storageKeys.sensitive.length > 0) {
    failures.push(`FAIL: Sensitive tokens in storage: ${storageKeys.sensitive.join(', ')}`);
  } else {
    console.log('✔ PASS: Zero passwords, tokens, or sensitive credentials present in localStorage/sessionStorage.');
  }

  await browser.close();
  server.httpServer.close();
  console.log('\n[Server] Preview server closed.');

  console.log('\n=============================================================');
  if (failures.length > 0) {
    console.error('❌ FAILURES DETECTED:');
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('✔ ALL AUTH RESET & LIFECYCLE TESTS PASSED PERFECTLY!');
    console.log('=============================================================\n');
  }
}

testAuthReset().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
