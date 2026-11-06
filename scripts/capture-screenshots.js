const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
  console.log('Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1440,960',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });

  try {
    // ----------------------------------------------------
    // SCREEN 1: Login Screen
    // ----------------------------------------------------
    console.log('1. Capturing 01_login_screen.png...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await sleep(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_screen.png') });

    // ----------------------------------------------------
    // SCREEN 2: Admin Dashboard
    // ----------------------------------------------------
    console.log('2. Logging in as ADMIN...');
    await page.click('input[type="email"]', { clickCount: 3 });
    await page.type('input[type="email"]', 'admin@ledgerline.dev');
    await page.click('input[type="password"]', { clickCount: 3 });
    await page.type('input[type="password"]', 'Admin1234!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await sleep(1200);

    console.log('Capturing 02_admin_dashboard.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_admin_dashboard.png') });

    // ----------------------------------------------------
    // SCREEN 3: Create Account Modal (Admin feature)
    // ----------------------------------------------------
    console.log('3. Opening Create Account Modal...');
    const newAccountBtn = await page.$('button:has(svg), button');
    // Find button containing "+ New Account" or "New Account"
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('New Account') || text.includes('Create Account')) {
        await btn.click();
        break;
      }
    }
    await sleep(600);
    console.log('Capturing 03_create_account_modal.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_create_account_modal.png') });

    // Close modal by clicking Cancel
    const cancelBtn = await page.$$('button');
    for (const btn of cancelBtn) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.trim() === 'Cancel') {
        await btn.click();
        break;
      }
    }
    await sleep(400);

    // ----------------------------------------------------
    // SCREEN 4: Account Statement View (Account A)
    // ----------------------------------------------------
    console.log('4. Navigating to Account Statement...');
    // Click on Account A link
    const accountLinks = await page.$$('a[href^="/accounts/"]');
    if (accountLinks.length > 0) {
      await accountLinks[0].click();
      await sleep(1500);
    }
    console.log('Capturing 04_account_statement.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_account_statement.png') });

    // ----------------------------------------------------
    // SCREEN 5: Transfer Money Page
    // ----------------------------------------------------
    console.log('5. Navigating to Transfer Page...');
    const transferLink = await page.$('a[href$="/transfer"]');
    if (transferLink) {
      await transferLink.click();
      await sleep(1500);
    }
    console.log('Capturing 05_transfer_money_page.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_transfer_money_page.png') });

    // ----------------------------------------------------
    // SCREEN 6: Admin Audit Ledger
    // ----------------------------------------------------
    console.log('6. Navigating to Admin Audit Ledger...');
    const auditLink = await page.$('a[href="/admin/audit"]');
    if (auditLink) {
      await auditLink.click();
      await sleep(1500);
    }
    console.log('Capturing 06_admin_audit_ledger.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_admin_audit_ledger.png') });

    // ----------------------------------------------------
    // SCREEN 7: Interactive OpenAPI 3.0 / Swagger UI Docs
    // ----------------------------------------------------
    console.log('7. Capturing 07_swagger_api_docs.png...');
    const docsPage = await browser.newPage();
    await docsPage.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });
    await docsPage.goto('http://localhost:4000/api-docs/', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await docsPage.screenshot({ path: path.join(SCREENSHOT_DIR, '07_swagger_api_docs.png') });
    await docsPage.close();

    // ----------------------------------------------------
    // SCREEN 8: Holder Dashboard (Account Holder view)
    // ----------------------------------------------------
    console.log('8. Logging in as HOLDER...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await sleep(600);
    await page.click('input[type="email"]', { clickCount: 3 });
    await page.type('input[type="email"]', 'holder@ledgerline.dev');
    await page.click('input[type="password"]', { clickCount: 3 });
    await page.type('input[type="password"]', 'Holder1234!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await sleep(1200);

    console.log('Capturing 08_holder_dashboard.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_holder_dashboard.png') });

    // ----------------------------------------------------
    // SCREEN 9: Auditor Dashboard (Read-Only Compliance view)
    // ----------------------------------------------------
    console.log('9. Logging in as AUDITOR...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await sleep(600);
    await page.click('input[type="email"]', { clickCount: 3 });
    await page.type('input[type="email"]', 'auditor@ledgerline.dev');
    await page.click('input[type="password"]', { clickCount: 3 });
    await page.type('input[type="password"]', 'Audit1234!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await sleep(1200);

    console.log('Capturing 09_auditor_dashboard.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_auditor_dashboard.png') });

    // ----------------------------------------------------
    // SCREEN 10: Mobile Responsive Viewport (390x844)
    // ----------------------------------------------------
    console.log('10. Capturing 10_mobile_responsive_dashboard.png...');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await sleep(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_mobile_responsive_dashboard.png') });

    console.log('SUCCESS: All 10 high-resolution screens captured in:', SCREENSHOT_DIR);
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

capture();
