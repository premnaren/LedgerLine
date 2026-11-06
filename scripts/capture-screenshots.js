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
  await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
  await sleep(400);

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
  await page.waitForSelector('a[href^="/accounts/"]', { timeout: 10000 });
  await sleep(1000);
}

async function navigateViaUI(page, targetUrl, requiredSelector) {
  if (page.url().includes('/login')) {
    await loginAsRole(page, 'ADMIN');
  }

  // Look for matching link
  const link = await page.$(`a[href="${targetUrl}"]`);
  if (link) {
    await link.click();
  } else {
    // If not found in current DOM, navigate directly and re-auth if redirected
    await page.goto(`http://localhost:3000${targetUrl}`, { waitUntil: 'networkidle2' });
    if (page.url().includes('/login')) {
      await loginAsRole(page, 'ADMIN');
      if (targetUrl !== '/dashboard') {
        const reLink = await page.$(`a[href="${targetUrl}"]`);
        if (reLink) {
          await reLink.click();
        } else {
          await page.goto(`http://localhost:3000${targetUrl}`, { waitUntil: 'networkidle2' });
        }
      }
    }
  }

  if (requiredSelector) {
    await page.waitForSelector(requiredSelector, { timeout: 10000 });
  }
  await sleep(1000);
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
    // SCREEN 1: Login Screen (Apple Fluid Material Design)
    // ----------------------------------------------------
    console.log('1. Capturing 01_login_screen.png...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
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
    // SCREEN 3: Command Palette Modal (Cmd+K)
    // ----------------------------------------------------
    console.log('3. Triggering Command Palette (Cmd+K)...');
    const cmdKBtns = await page.$$('button');
    let openedCmdK = false;
    for (const btn of cmdKBtns) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('⌘K') || text.includes('Quick Actions')) {
        await btn.click();
        openedCmdK = true;
        break;
      }
    }
    if (!openedCmdK) {
      await page.keyboard.down('Control');
      await page.keyboard.press('k');
      await page.keyboard.up('Control');
    }
    await sleep(800);
    console.log('Capturing 03_command_palette_modal.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_command_palette_modal.png') });

    // Close Command Palette via Escape
    await page.keyboard.press('Escape');
    await sleep(400);

    // ----------------------------------------------------
    // SCREEN 4: Verify Ledger Integrity Modal (SHA-256 Cryptographic Chain)
    // ----------------------------------------------------
    console.log('4. Opening Verify Ledger Integrity Modal...');
    const dashButtons = await page.$$('button');
    for (const btn of dashButtons) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Verify Ledger Integrity')) {
        await btn.click();
        break;
      }
    }
    await sleep(1500);
    console.log('Capturing 04_admin_ledger_integrity_modal.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_admin_ledger_integrity_modal.png') });

    // Close modal
    const closeBtns = await page.$$('button');
    for (const btn of closeBtns) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Close Audit Report') || text.includes('Audit Report')) {
        await btn.click();
        break;
      }
    }
    await sleep(500);

    // ----------------------------------------------------
    // SCREEN 5: Engine Stress & Concurrency Workbench (Live Telemetry)
    // ----------------------------------------------------
    console.log('5. Navigating to Engine Stress Lab (/admin/stress-lab)...');
    await navigateViaUI(page, '/admin/stress-lab', 'button');
    await sleep(800);

    // Execute the benchmark to generate live real-time ACID telemetry
    console.log('Triggering Live Concurrency Benchmark...');
    const stressBtns = await page.$$('button');
    for (const btn of stressBtns) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Concurrent Transfers') || text.includes('Run 10')) {
        await btn.click();
        break;
      }
    }
    await sleep(3500);
    console.log('Capturing 05_stress_lab_workbench.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_stress_lab_workbench.png') });

    // ----------------------------------------------------
    // SCREEN 6: Account Statement with Slide-over T-Account Drawer
    // ----------------------------------------------------
    console.log('6. Navigating to Account Statement and opening T-Account Drawer...');
    await navigateViaUI(page, '/dashboard', 'a[href^="/accounts/"]');

    const accountLinks = await page.$$('a[href^="/accounts/"]');
    if (accountLinks.length > 0) {
      await accountLinks[0].click();
      await page.waitForSelector('table tbody tr', { timeout: 10000 });
      await sleep(1200);
    }

    // Click on a transaction row in the statement table to slide open the T-Account Drawer
    const statementRows = await page.$$('table tbody tr');
    if (statementRows.length > 0) {
      await statementRows[0].click();
      await sleep(800);
    }
    console.log('Capturing 06_account_statement_with_drawer.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_account_statement_with_drawer.png') });

    // Close drawer via Escape
    await page.keyboard.press('Escape');
    await sleep(400);

    // ----------------------------------------------------
    // SCREEN 7: Admin Audit Ledger with Slide-over T-Account Drawer & Hash Badges
    // ----------------------------------------------------
    console.log('7. Navigating to Admin Audit Ledger...');
    await navigateViaUI(page, '/admin/audit', 'table tbody tr');

    // Click on a row to open the T-Account Drawer
    const auditRows = await page.$$('table tbody tr');
    if (auditRows.length > 1) {
      await auditRows[1].click();
      await sleep(800);
    } else if (auditRows.length > 0) {
      await auditRows[0].click();
      await sleep(800);
    }
    console.log('Capturing 07_admin_audit_ledger_with_drawer.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_admin_audit_ledger_with_drawer.png') });

    // Close drawer
    await page.keyboard.press('Escape');
    await sleep(400);

    // ----------------------------------------------------
    // SCREEN 8: Account Reconciliation Modal
    // ----------------------------------------------------
    console.log('8. Opening Account Reconciliation Modal...');
    await navigateViaUI(page, '/dashboard', 'a[href^="/accounts/"]');
    const accs = await page.$$('a[href^="/accounts/"]');
    if (accs.length > 0) {
      await accs[0].click();
      await page.waitForSelector('table tbody tr', { timeout: 10000 });
      await sleep(1000);
    }

    const stmtBtns = await page.$$('button');
    for (const btn of stmtBtns) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Reconcile')) {
        await btn.click();
        break;
      }
    }
    await sleep(1200);
    console.log('Capturing 08_account_reconciliation_modal.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_account_reconciliation_modal.png') });

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
    // SCREEN 9: Transfer Money Page
    // ----------------------------------------------------
    console.log('9. Navigating to Transfer Page from Statement...');
    const transferLink = await page.$('a[href$="/transfer"]');
    if (transferLink) {
      await transferLink.click();
      await page.waitForSelector('form', { timeout: 10000 });
      await sleep(1200);
    }
    console.log('Capturing 09_transfer_money_page.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_transfer_money_page.png') });

    // ----------------------------------------------------
    // SCREEN 10: Reversal Confirmation Modal
    // ----------------------------------------------------
    console.log('10. Opening Reversal Confirmation Modal on Audit Ledger...');
    await navigateViaUI(page, '/admin/audit', 'table tbody tr');

    const revBtns = await page.$$('button');
    for (const btn of revBtns) {
      const text = await page.evaluate((el) => el.innerText, btn);
      if (text.includes('Reverse')) {
        await btn.click();
        break;
      }
    }
    await sleep(800);
    console.log('Capturing 10_reversal_confirmation_modal.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_reversal_confirmation_modal.png') });

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
    // SCREEN 11: Interactive OpenAPI 3.0 / Swagger UI Docs
    // ----------------------------------------------------
    console.log('11. Capturing 11_swagger_api_docs_expanded.png...');
    const docsPage = await browser.newPage();
    await docsPage.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 2 });
    await docsPage.goto('http://localhost:4000/api-docs/', { waitUntil: 'networkidle2' });
    await sleep(1800);
    await docsPage.screenshot({ path: path.join(SCREENSHOT_DIR, '11_swagger_api_docs_expanded.png') });
    await docsPage.close();

    // ----------------------------------------------------
    // SCREEN 12: Holder Dashboard
    // ----------------------------------------------------
    console.log('12. Logging in as HOLDER...');
    await loginAsRole(page, 'HOLDER');
    console.log('Capturing 12_holder_dashboard.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_holder_dashboard.png') });

    // ----------------------------------------------------
    // SCREEN 13: Auditor Dashboard
    // ----------------------------------------------------
    console.log('13. Logging in as AUDITOR...');
    await loginAsRole(page, 'AUDITOR');
    console.log('Capturing 13_auditor_dashboard.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_auditor_dashboard.png') });

    // ----------------------------------------------------
    // SCREEN 14: Mobile Dashboard (390x844)
    // ----------------------------------------------------
    console.log('14. Capturing Mobile Dashboard...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
    await loginAsRole(mobilePage, 'ADMIN');
    console.log('Capturing 14_mobile_dashboard.png...');
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '14_mobile_dashboard.png') });

    // ----------------------------------------------------
    // SCREEN 15: Mobile Stress Lab
    // ----------------------------------------------------
    console.log('15. Capturing Mobile Stress Lab...');
    await mobilePage.evaluate(() => {
      const link = document.querySelector('a[href="/admin/stress-lab"]');
      if (link) link.click();
    });
    await mobilePage.waitForSelector('button', { timeout: 10000 });
    await sleep(1200);
    console.log('Capturing 15_mobile_stress_lab.png...');
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '15_mobile_stress_lab.png') });
    await mobilePage.close();

    console.log('SUCCESS: All 15 high-resolution screens captured in:', SCREENSHOT_DIR);
  } catch (error) {
    console.error('Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

capture();
