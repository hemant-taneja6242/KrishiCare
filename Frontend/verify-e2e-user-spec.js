import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://127.0.0.1:8000';

async function run() {
  console.log('===============================================================');
  console.log('🧪 VERIFYING USER SPECIFICATION END-TO-END');
  console.log('===============================================================\n');

  const browser = await chromium.launch({ headless: true });
  
  const results = [];
  function record(checkId, title, passed, details) {
    results.push({ checkId, title, passed, details });
    const emoji = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${emoji}] ${checkId}: ${title}`);
    console.log(`       Details: ${details}\n`);
  }

  try {
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await adminContext.newPage();

    // -----------------------------------------------------------------
    // 1. Admin Alerts vs Admin Dashboard Distinctness
    // -----------------------------------------------------------------
    console.log('--- Step 1: Comparing Admin Dashboard vs Admin Alerts ---');
    // Login as Admin
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Login as Admin")');
    await page.waitForURL('**/admin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    const dashUrl = page.url();
    const dashH1 = (await page.locator('h1').textContent())?.trim();
    const dashHasCharts = (await page.locator('.recharts-responsive-container').count()) > 0;
    const dashStatsCount = await page.locator('.card:has-text("Total Diagnoses"), .card:has-text("Active Alerts"), .card:has-text("Farms Monitored")').count();
    const dashHasRecentDiags = (await page.locator('text=Recent Diagnoses').count()) > 0;

    // Navigate to Admin Alerts
    await page.click('aside nav button:has-text("Alerts")');
    await page.waitForURL('**/admin/alerts');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    const alertsUrl = page.url();
    const alertsH1 = (await page.locator('h1').textContent())?.trim();
    const alertsCardCount = await page.locator('.admin-content .grid > .card').count();
    const alertsHasFilters = (await page.locator('select:has-text("All Severities")').count()) > 0;
    const alertsHasCharts = (await page.locator('.recharts-responsive-container').count()) > 0;

    const areDistinct = (
      dashUrl !== alertsUrl &&
      dashH1 !== alertsH1 &&
      dashHasCharts === true &&
      alertsHasCharts === false &&
      alertsHasFilters === true &&
      alertsCardCount > 0
    );

    record(
      'REQ-1',
      'Admin Alerts is distinct from Admin Dashboard',
      areDistinct,
      `Dashboard (URL: ${dashUrl}, H1: "${dashH1}", HasCharts: ${dashHasCharts}, StatsCards: ${dashStatsCount}) vs Alerts (URL: ${alertsUrl}, H1: "${alertsH1}", HasFilters: ${alertsHasFilters}, AlertCardsCount: ${alertsCardCount}, HasCharts: ${alertsHasCharts})`
    );

    // -----------------------------------------------------------------
    // 2. Admin Settings: Slider is editable (not disabled) for Admin
    // -----------------------------------------------------------------
    console.log('--- Step 2: Testing Admin Settings Threshold Slider Editability ---');
    await page.click('aside nav button:has-text("Settings")');
    await page.waitForURL('**/admin/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    const settingsUrl = page.url();
    const settingsH1 = (await page.locator('h1').textContent())?.trim();
    const adminSlider = page.locator('input[type="range"]');
    const isSliderVisible = await adminSlider.isVisible();
    const isSliderDisabled = await adminSlider.isDisabled();
    const sliderInitialVal = await adminSlider.inputValue();

    record(
      'REQ-2',
      'Admin Settings Slider is loaded and editable (not disabled)',
      isSliderVisible && !isSliderDisabled && settingsUrl.includes('/admin/settings'),
      `Page: "${settingsH1}" (URL: ${settingsUrl}), Slider visible: ${isSliderVisible}, isDisabled: ${isSliderDisabled}, Initial value: ${sliderInitialVal}%`
    );

    // -----------------------------------------------------------------
    // 3. Change threshold to 70%, save, check queue count & Expert Settings
    // -----------------------------------------------------------------
    console.log('--- Step 3: Changing threshold to 70% on Admin Settings ---');
    // Ensure threshold starts at 85% first
    await fetch(`${API_URL}/api/expert/threshold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: 0.85 }),
    });

    const preRes = await fetch(`${API_URL}/api/expert/queue?status=pending`);
    const preData = await preRes.json();
    const countBefore70 = preData.length;
    console.log(`   Pending count before threshold adjustment (at 85%): ${countBefore70}`);

    // Set slider to 70% and click Save Threshold
    await adminSlider.fill('70');
    await page.waitForTimeout(300);
    await page.click('button:has-text("💾 Save Threshold")');
    await page.waitForTimeout(1000);

    // Read confirmation toast on Admin Settings
    const toastText = await page.locator('.card:has-text("AI Confidence Review Threshold")').textContent();
    const savedConfirmedOnAdmin = toastText?.includes('Threshold set to 70%');

    // Confirm Expert Queue pending count in backend API
    const postRes = await fetch(`${API_URL}/api/expert/queue?status=pending`);
    const postData = await postRes.json();
    const countAfter70 = postData.length;
    console.log(`   Pending count after 70% threshold: ${countAfter70}`);

    // Now open Expert in a fresh session to observe UI
    const expertContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const expertPage = await expertContext.newPage();

    await expertPage.goto(`${BASE_URL}/`);
    await expertPage.waitForLoadState('networkidle');
    await expertPage.click('button:has-text("Login as Expert")');
    await expertPage.waitForURL('**/expert');
    await expertPage.waitForLoadState('networkidle');
    await expertPage.waitForTimeout(600);

    // Check pending count pill and pending filter pill in Expert Queue UI
    const queuePillText = (await expertPage.locator('.admin-content .pill:has-text("Pending")').first().textContent())?.trim();
    const pendingFilterTab = (await expertPage.locator('button:has-text("pending (")').first().textContent())?.trim();

    // Now navigate to Expert Settings page
    await expertPage.click('aside nav button:has-text("Settings")');
    await expertPage.waitForURL('**/expert/settings');
    await expertPage.waitForLoadState('networkidle');
    await expertPage.waitForTimeout(600);

    const expertSettingsThresholdText = (await expertPage.locator('.card:has-text("AI Confidence Review Threshold") span.text-green-700').textContent())?.trim();
    const expertActiveLabel = (await expertPage.locator('.card:has-text("AI Confidence Review Threshold") span:has-text("(Active)")').textContent())?.trim();
    const expertNoteText = (await expertPage.locator('.card:has-text("AI Confidence Review Threshold") p.bg-amber-50').textContent())?.trim();

    const displays70 = (
      expertSettingsThresholdText?.includes('70%') &&
      expertActiveLabel?.includes('70%') &&
      expertNoteText?.includes('70%')
    );

    const queueCountChanged = countAfter70 !== countBefore70;

    record(
      'REQ-3a',
      'Expert Queue pending count actually changes when threshold set to 70%',
      queueCountChanged && (queuePillText?.includes(`${countAfter70}`) || pendingFilterTab?.includes(`${countAfter70}`)),
      `Pending count changed from ${countBefore70} to ${countAfter70} (Queue Header Pill: "${queuePillText}", Filter Tab: "${pendingFilterTab}")`
    );

    record(
      'REQ-3b',
      'Expert Settings page displays 70% live value (not hardcoded 85%)',
      displays70,
      `Header text: "${expertSettingsThresholdText}", Active label: "${expertActiveLabel}", Note text: "${expertNoteText}"`
    );

    // -----------------------------------------------------------------
    // 4. Confirm Expert Settings threshold display is properly disabled
    // -----------------------------------------------------------------
    console.log('--- Step 4: Verifying Expert Settings Slider is Non-Interactive / Disabled ---');
    const expertSlider = expertPage.locator('.card:has-text("AI Confidence Review Threshold") input[type="range"]');
    const expertSliderDisabled = await expertSlider.isDisabled();
    const expertSliderClasses = await expertSlider.getAttribute('class');
    const expertSliderValue = await expertSlider.inputValue();

    // Verify user cannot drag/fill the disabled slider
    let dragPrevented = false;
    try {
      await expertSlider.fill('60', { timeout: 1500 });
    } catch (err) {
      dragPrevented = true;
    }
    const valAfterAttempt = await expertSlider.inputValue();

    record(
      'REQ-4',
      'Expert Settings threshold display is disabled / non-interactive',
      expertSliderDisabled && (dragPrevented || valAfterAttempt === '70') && expertSliderClasses?.includes('cursor-not-allowed'),
      `isDisabled: ${expertSliderDisabled}, Class: "${expertSliderClasses}", Current Value: ${expertSliderValue}%, Attempt to modify blocked: ${dragPrevented || valAfterAttempt === '70'}`
    );

    // Restore threshold back to 85%
    console.log('--- Restoring threshold back to default 85% ---');
    await fetch(`${API_URL}/api/expert/threshold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: 0.85 }),
    });
    console.log('   Threshold successfully restored to 85%.\n');

    await adminContext.close();
    await expertContext.close();

  } catch (err) {
    console.error('❌ Error during execution:', err);
  } finally {
    await browser.close();
  }

  console.log('===============================================================');
  console.log('FINAL RESULTS BREAKDOWN:');
  console.log('===============================================================');
  for (const r of results) {
    console.log(`${r.passed ? '✅ PASS' : '❌ FAIL'} [${r.checkId}] ${r.title}`);
    console.log(`   ${r.details}`);
  }
  const allPassed = results.every(r => r.passed);
  console.log('===============================================================');
  console.log(`OVERALL: ${results.filter(r => r.passed).length} / ${results.length} checks PASSED. Fully Verified: ${allPassed}`);
  console.log('===============================================================\n');
}

run();
