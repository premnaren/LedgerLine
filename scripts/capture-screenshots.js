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

async function loginAsRole(page, roleName) {
  console.log(`Logging in as ${roleName}...`);
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await sleep(600);

  // Click the seed quick login button
  const seedBtns = await page.$$('button[type="button"]');
  let clicked = false;
  for (const b of seedBtns) {
    const text = await page.evaluate((el) => el.innerText, b);
    if (text.trim().toUpperCase() === roleName.toUpperCase()) {
      await b.click();
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    throw new Error(`Could not find seed button for role ${roleName}`);
  }

  await sleep(300);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 10000 });
  await sleep(1500);
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
    await loginAsRole(page, 'ADMIN');
    console.log('Capturing 02_admin_dashboard.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_admin_dashboard.png') });

    // ----------------------------------------------------
    // SCREEN 3: Verify Ledger Integrity Modal (System Reconciliation)
    // ----------------------------------------------------
    console.log('3. Opening Verify Ledger Integrity Modal...');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Verify Ledger Integrity')) {
        await btn.click();
        break;
      }
    }
    await sleep(1000);
    console.log('Capturing 03_admin_ledger_integrity_modal.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_admin_ledger_integrity_modal.png') });

    // Close modal
    const closeBtns = await page.$$('button');
    for (const btn of closeBtns) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Close Audit Report') || text.includes('Audit Report')) {
        await btn.click();
        break;
      }
    }
    await sleep(600);

    // ----------------------------------------------------
    // SCREEN 4: Create Account Modal
    // ----------------------------------------------------
    console.log('4. Opening Create Account Modal...');
    const dashBtns = await page.$$('button');
    for (const btn of dashBtns) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('New Account')) {
        await btn.click();
        break;
      }
    }
    await sleep(600);
    console.log('Capturing 04_create_account_modal.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_create_account_modal.png') });

    // Close modal
    const cancelBtns = await page.$$('button');
    for (const btn of cancelBtns) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Cancel')) {
        await btn.click();
        break;
      }
    }
    await sleep(400);

    // ----------------------------------------------------
    // SCREEN 5: Account Statement (Account A)
    // ----------------------------------------------------
    console.log('5. Navigating to Account Statement...');
    const accountLinks = await page.$$('a[href^="/accounts/"]');
    if (accountLinks.length > 0) {
      await accountLinks[0].click();
      await sleep(1500);
    }
    console.log('Capturing 05_account_statement.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_account_statement.png') });

    // ----------------------------------------------------
    // SCREEN 6: Account Reconciliation Modal
    // ----------------------------------------------------
    console.log('6. Opening Account Reconciliation Modal...');
    const stmtBtns = await page.$$('button');
    for (const btn of stmtBtns) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Reconcile')) {
        await btn.click();
        break;
      }
    }
    await sleep(1000);
    console.log('Capturing 06_account_reconciliation_modal.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_account_reconciliation_modal.png') });

    // Close report
    const closeAccBtn = await page.$$('button');
    for (const btn of closeAccBtn) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Close Report')) {
        await btn.click();
        break;
      }
    }
    await sleep(400);

    // ----------------------------------------------------
    // SCREEN 7: Transfer Money Page
    // ----------------------------------------------------
    console.log('7. Navigating to Transfer Page...');
    const transferLink = await page.$('a[href$="/transfer"]');
    if (transferLink) {
      await transferLink.click();
      await sleep(1500);
    }
    console.log('Capturing 07_transfer_money_page.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_transfer_money_page.png') });

    // ----------------------------------------------------
    // SCREEN 8: Admin Audit Ledger
    // ----------------------------------------------------
    console.log('8. Navigating to Admin Audit Ledger...');
    const auditLink = await page.$('a[href="/admin/audit"]');
    if (auditLink) {
      await auditLink.click();
      await sleep(1500);
    }
    console.log('Capturing 08_admin_audit_ledger.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_admin_audit_ledger.png') });

    // ----------------------------------------------------
    // SCREEN 9: Reversal Confirmation Modal
    // ----------------------------------------------------
    console.log('9. Opening Reversal Confirmation Modal...');
    const revBtns = await page.$$('button');
    for (const btn of revBtns) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Reverse')) {
        await btn.click();
        break;
      }
    }
    await sleep(800);
    console.log('Capturing 09_reversal_confirmation_modal.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_reversal_confirmation_modal.png') });

    // Close reversal modal
    const cancelRev = await page.$$('button');
    for (const btn of cancelRev) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Cancel')) {
        await btn.click();
        break;
      }
    }
    await sleep(400);

    // ----------------------------------------------------
    // SCREEN 10: Interactive OpenAPI 3.0 / Swagger UI Docs
    // ----------------------------------------------------
    console.log('10. Capturing 10_swagger_api_docs_expanded.png...');
    const docsPage = await browser.newPage();
    await docsPage.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 2 });
    await docsPage.goto('http://localhost:4000/api-docs/', { waitUntil: 'networkidle2' });
    await sleep(1800);
    await docsPage.screenshot({ path: path.join(SCREENSHOT_DIR, '10_swagger_api_docs_expanded.png') });
    await docsPage.close();

    // ----------------------------------------------------
    // SCREEN 11: Holder Dashboard
    // ----------------------------------------------------
    console.log('11. Logging in as HOLDER...');
    await loginAsRole(page, 'HOLDER');
    console.log('Capturing 11_holder_dashboard.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_holder_dashboard.png') });

    // ----------------------------------------------------
    // SCREEN 12: Auditor Dashboard
    // ----------------------------------------------------
    console.log('12. Logging in as AUDITOR...');
    await loginAsRole(page, 'AUDITOR');
    console.log('Capturing 12_auditor_dashboard.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_auditor_dashboard.png') });

    // ----------------------------------------------------
    // SCREEN 13, 14, 15: Mobile Viewports (390x844)
    // ----------------------------------------------------
    console.log('13. Capturing Mobile Dashboard...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await loginAsRole(mobilePage, 'ADMIN');
    console.log('Capturing 13_mobile_dashboard.png, URL:', mobilePage.url());
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '13_mobile_dashboard.png') });

    console.log('14. Capturing Mobile Statement...');
    const mobileAccLinks = await mobilePage.$$('a[href^="/accounts/"]');
    if (mobileAccLinks.length > 0) {
      await mobileAccLinks[0].click();
      await sleep(1500);
    }
    console.log('Capturing 14_mobile_statement.png, URL:', mobilePage.url());
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '14_mobile_statement.png') });

    console.log('15. Capturing Mobile Transfer...');
    // Navigate to transfer from statement or dashboard
    const mTransferLink = await mobilePage.$('a[href$="/transfer"]');
    if (mTransferLink) {
      await mTransferLink.click();
      await sleep(1500);
    }
    console.log('Capturing 15_mobile_transfer.png, URL:', mobilePage.url());
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '15_mobile_transfer.png') });
    await mobilePage.close();

    console.log('SUCCESS: All 15 high-resolution screens captured in:', SCREENSHOT_DIR);
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

capture();
