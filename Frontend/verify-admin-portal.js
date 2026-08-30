import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('====================================================');
  console.log('🛡️ TESTING ADMIN PORTAL: ALERTS & SETTINGS PAGES');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const results = [];
  function record(testName, passed, details = '') {
    results.push({ testName, passed, details });
    const emoji = passed ? '✅' : '❌';
    console.log(`${emoji} ${testName}: ${details}`);
  }

  try {
    // Reset baseline state for idempotent execution
    await fetch('http://127.0.0.1:8000/api/alerts/reset', { method: 'POST' }).catch(() => {});
    await fetch('http://127.0.0.1:8000/api/expert/threshold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: 0.85 }),
    }).catch(() => {});

    // -------------------------------------------------------------------
    // 1. Login as Admin
    // -------------------------------------------------------------------
    console.log('--- 1. Logging in as Admin ---');
    await page.goto(`${BASE_URL}/`);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Login as Admin")');
    await page.waitForURL('**/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    const dashboardTitle = await page.locator('h1').textContent();
    record('Admin Dashboard Loaded', page.url().endsWith('/admin'), `URL: ${page.url()}, Title: "${dashboardTitle?.trim()}"`);

    // Check stats consistency
    const activeAlertsStat = await page.locator('.card:has-text("Active Alerts") p.text-3xl').textContent();
    const activeExpertsStat = await page.locator('.card:has-text("Experts Active") p.text-3xl').textContent();
    record('Dashboard Active Alerts Stat', activeAlertsStat?.trim() === '12', `Count: ${activeAlertsStat?.trim()}`);
    record('Dashboard Experts Active Stat', activeExpertsStat?.trim() === '8', `Count: ${activeExpertsStat?.trim()}`);

    // -------------------------------------------------------------------
    // 2. Test Admin Alerts Route & Page Distinctness
    // -------------------------------------------------------------------
    console.log('\n--- 2. Navigating to Admin Alerts (/admin/alerts) ---');
    // Click Alerts in Sidebar
    await page.click('aside nav button:has-text("Alerts")');
    await page.waitForURL('**/admin/alerts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    const alertsPageTitle = await page.locator('h1').textContent();
    record('Admin Alerts Route Distinctness', page.url().includes('/admin/alerts') && alertsPageTitle?.includes('Active Alerts'), `URL: ${page.url()}, Title: "${alertsPageTitle?.trim()}"`);

    // Check count badge
    const headerBadge = await page.locator('h1 + span').textContent();
    record('Alerts Count Badge', headerBadge?.includes('12 Active Alerts'), `Badge text: "${headerBadge?.trim()}"`);

    // Count alert cards
    const initialCards = await page.locator('.admin-content .grid > .card').count();
    record('Rendered 12 Alert Cards', initialCards === 12, `Total cards: ${initialCards}`);

    // Check first card details
    const firstCardTitle = await page.locator('.admin-content .grid > .card h3').first().textContent();
    const firstCardDistrict = await page.locator('.admin-content .grid > .card').first().textContent();
    record('Alert Card Content', firstCardTitle?.length > 0 && firstCardDistrict?.includes('Farms Affected'), `Disease: "${firstCardTitle?.trim()}"`);

    // Test Severity Filter
    console.log('\n--- 3. Testing Alert Filters ---');
    await page.selectOption('select:has-text("All Severities")', 'Critical');
    await page.waitForTimeout(400);

    const criticalCards = await page.locator('.admin-content .grid > .card').count();
    record('Critical Severity Filter', criticalCards > 0 && criticalCards < 12, `Critical cards shown: ${criticalCards}`);

    // Reset filter
    await page.selectOption('select:has-text("Critical")', 'All');
    await page.waitForTimeout(400);

    // Test Alert Actions: Resolve & Escalate
    console.log('\n--- 4. Testing Alert Actions (Resolve & Escalate) ---');
    const resolveBtn = page.locator('button:has-text("✓ Resolve")').first();
    await resolveBtn.click();
    await page.waitForTimeout(800);

    const updatedBadge = await page.locator('h1 + span').textContent();
    const resolvedBadgeCount = await page.locator('.pill:has-text("✓ Resolved")').count();
    record('Resolve Action Decrements Active Count', updatedBadge?.includes('11 Active Alerts') && resolvedBadgeCount > 0, `Badge: "${updatedBadge?.trim()}", Resolved cards: ${resolvedBadgeCount}`);

    const escalateBtn = page.locator('button:has-text("🚨 Escalate")').first();
    await escalateBtn.click();
    await page.waitForTimeout(800);

    const escalatedBadgeCount = await page.locator('.pill:has-text("🚨 Escalated")').count();
    record('Escalate Action Flags Alert', escalatedBadgeCount > 0, `Escalated cards: ${escalatedBadgeCount}`);

    // -------------------------------------------------------------------
    // 5. Test Admin Settings Route & AI Confidence Review Threshold
    // -------------------------------------------------------------------
    console.log('\n--- 5. Navigating to Admin Settings (/admin/settings) ---');
    await page.click('aside nav button:has-text("Settings")');
    await page.waitForURL('**/admin/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    const settingsTitle = await page.locator('h1').textContent();
    record('Admin Settings Route Distinctness', page.url().includes('/admin/settings') && settingsTitle?.includes('System Admin Settings'), `URL: ${page.url()}, Title: "${settingsTitle?.trim()}"`);

    // Verify Slider and Initial Value
    const sliderVal = await page.locator('input[type="range"]').inputValue();
    record('Initial Threshold Slider Value', sliderVal === '85', `Slider: ${sliderVal}%`);

    // Fetch initial pending queue count from API directly from Node
    const initialQueueRes = await fetch('http://127.0.0.1:8000/api/expert/queue?status=pending');
    const initialQueueData = await initialQueueRes.json();
    const initialQueue = initialQueueData.length;
    console.log(`   Initial pending queue count in API: ${initialQueue}`);

    // Change Threshold to 95%
    console.log('   Adjusting slider to 95% and clicking Save Threshold...');
    await page.locator('input[type="range"]').fill('95');
    await page.click('button:has-text("💾 Save Threshold")');
    await page.waitForTimeout(1000);

    const toastText95 = await page.locator('.card:has-text("AI Confidence Review Threshold")').textContent();
    record('Threshold Save Toast', toastText95?.includes('Threshold set to 95%'), `Card feedback includes confirmation.`);

    // Verify Expert Queue pending count changed dynamically
    const updatedQueueRes95 = await fetch('http://127.0.0.1:8000/api/expert/queue?status=pending');
    const updatedQueueData95 = await updatedQueueRes95.json();
    const updatedQueue95 = updatedQueueData95.length;
    record('Pending Queue Shifted at 95%', updatedQueue95 > initialQueue, `Pending count changed from ${initialQueue} to ${updatedQueue95}`);

    // Restore threshold back to 85%
    console.log('   Restoring threshold back to 85%...');
    await page.locator('input[type="range"]').fill('85');
    await page.click('button:has-text("💾 Save Threshold")');
    await page.waitForTimeout(1000);

    const updatedQueueRes85 = await fetch('http://127.0.0.1:8000/api/expert/queue?status=pending');
    const updatedQueueData85 = await updatedQueueRes85.json();
    const updatedQueue85 = updatedQueueData85.length;
    record('Restored Threshold at 85%', updatedQueue85 === initialQueue, `Pending count restored to ${updatedQueue85}`);

    // -------------------------------------------------------------------
    // 6. Test Escalation Contact
    // -------------------------------------------------------------------
    console.log('\n--- 6. Testing Escalation Contact (DAO) ---');
    const daoNameInput = await page.locator('input[value*="Pawar"], input[value*="Shri"]').inputValue();
    record('DAO Escalation Contact Form Loaded', daoNameInput.length > 0, `DAO Officer: "${daoNameInput}"`);

    await page.click('button:has-text("💾 Save Escalation Contact")');
    await page.waitForTimeout(500);
    const daoSavedNotice = await page.locator('text=District Agriculture Officer contact saved').count();
    record('DAO Contact Save Feedback', daoSavedNotice > 0, 'Confirmation banner rendered');

    // -------------------------------------------------------------------
    // 7. Test Active Experts List
    // -------------------------------------------------------------------
    console.log('\n--- 7. Testing Active Experts Roster ---');
    const expertCards = await page.locator('.card:has-text("Active Expert Reviewers") .p-3\\.5').count();
    record('Active Experts Roster Count', expertCards === 8, `Found ${expertCards} active experts matching Dashboard (8)`);

    const expertPill = await page.locator('.card:has-text("Active Expert Reviewers") .pill:has-text("● Online")').count();
    record('Online Status Indicators', expertPill === 8, `All ${expertPill} experts displaying Online status`);

    // -------------------------------------------------------------------
    // 8. Test Global Language Selector on Admin Settings
    // -------------------------------------------------------------------
    console.log('\n--- 8. Testing Language Selector on Admin Settings ---');
    await page.click('button:has-text("हिन्दी (HI)")');
    await page.waitForTimeout(600);

    const savedLang = await page.evaluate(() => localStorage.getItem('krishi_app_lang'));
    const hindiBtn = await page.locator('button:has-text("हिन्दी (HI)")').textContent();
    const sidebarText = await page.locator('aside').textContent();
    record('Admin Settings Hindi Switch', savedLang === 'hi' && hindiBtn?.includes('✓'), `krishi_app_lang = "${savedLang}", button has ✓`);
    record('Admin Sidebar Localized to Hindi', sidebarText?.includes('डैशबोर्ड') || sidebarText?.includes('अलर्ट'), 'Sidebar reflected Hindi translations');

    // Restore to English
    await page.click('button:has-text("English (EN)")');
    await page.waitForTimeout(500);

    console.log('\n====================================================');
    const passed = results.filter((r) => r.passed).length;
    console.log(`SUMMARY: ${passed} / ${results.length} tests passed.`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Error during test:', err);
  } finally {
    await fetch('http://127.0.0.1:8000/api/alerts/reset', { method: 'POST' }).catch(() => {});
    await fetch('http://127.0.0.1:8000/api/expert/threshold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: 0.85 }),
    }).catch(() => {});
    await browser.close();
  }
}

run();
