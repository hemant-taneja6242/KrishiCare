import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('================================================================');
  console.log('🔒 VERIFYING EXPERT THRESHOLD TWO-WAY DYNAMIC SYNC & READ-ONLY UI');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = [];
  function record(step, title, passed, details) {
    results.push({ step, title, passed, details });
    const emoji = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${emoji}] ${step}: ${title}`);
    console.log(`       Details: ${details}\n`);
  }

  try {
    // -------------------------------------------------------------
    // Phase 1: Direct Expert Settings Inspection (Baseline 85%)
    // -------------------------------------------------------------
    console.log('--- Phase 1: Inspecting Expert Settings Read-Only Slider ---');
    await page.goto(`${BASE_URL}/`);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Login as Expert")');
    await page.waitForURL('**/expert');
    await page.waitForLoadState('networkidle');

    await page.click('aside nav button:has-text("Settings")');
    await page.waitForURL('**/expert/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    const slider = page.locator('.card:has-text("AI Confidence Review Threshold") input[type="range"]');
    const isDisabled = await slider.isDisabled();
    const isReadOnly = await slider.getAttribute('readonly') !== null || await slider.getAttribute('aria-readonly') === 'true';
    const classList = await slider.getAttribute('class');
    const initialVal = await slider.inputValue();
    const badgeText = await page.locator('.card:has-text("AI Confidence Review Threshold") span.pill').textContent();
    const lockedLabel = await page.locator('text=🔒 Locked for Expert').textContent();
    const thresholdHeader = await page.locator('.card:has-text("AI Confidence Review Threshold") span.text-green-700').textContent();

    // Verify inability to drag/modify slider
    let dragBlocked = false;
    try {
      await slider.fill('60', { timeout: 1500 });
    } catch {
      dragBlocked = true;
    }
    const valAfterAttempt = await slider.inputValue();

    const phase1Pass = (
      isDisabled &&
      isReadOnly &&
      classList?.includes('cursor-not-allowed') &&
      classList?.includes('opacity-60') &&
      classList?.includes('pointer-events-none') &&
      (dragBlocked || valAfterAttempt === initialVal) &&
      lockedLabel?.includes('Locked')
    );

    record(
      'PHASE-1',
      'Expert Slider is strictly Read-Only, Disabled, Grayed out with locked badge',
      phase1Pass,
      `Disabled: ${isDisabled}, ReadOnly: ${isReadOnly}, Classes: "${classList}", Badges: "${badgeText?.trim()}" / "${lockedLabel?.trim()}", Value: ${initialVal}%, Modify blocked: ${dragBlocked || valAfterAttempt === initialVal}`
    );

    // -------------------------------------------------------------
    // Phase 2: Change Threshold to 70% in Admin Settings
    // -------------------------------------------------------------
    console.log('--- Phase 2: Changing Threshold to 70% from Admin Settings ---');
    await page.click('button:has-text("Logout"), button:has-text("←")');
    await page.waitForURL('**/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Login as Admin")');
    await page.waitForURL('**/admin');
    await page.waitForLoadState('networkidle');

    await page.click('aside nav button:has-text("Settings")');
    await page.waitForURL('**/admin/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    const adminSlider = page.locator('input[type="range"]');
    await adminSlider.fill('70');
    await page.waitForTimeout(200);
    await page.click('button:has-text("💾 Save Threshold")');
    await page.waitForTimeout(1000);

    const adminToast = await page.locator('.card:has-text("AI Confidence Review Threshold")').textContent();
    record(
      'PHASE-2',
      'Admin Settings updated threshold to 70% and saved successfully',
      adminToast?.includes('Threshold set to 70%'),
      `Admin Toast feedback confirmed 70% update.`
    );

    // -------------------------------------------------------------
    // Phase 3: Switch back to Expert Settings and verify live 70%
    // -------------------------------------------------------------
    console.log('--- Phase 3: Switching to Expert Settings & Verifying 70% Sync ---');
    await page.click('button:has-text("Logout"), button:has-text("←")');
    await page.waitForURL('**/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Login as Expert")');
    await page.waitForURL('**/expert');
    await page.waitForLoadState('networkidle');

    await page.click('aside nav button:has-text("Settings")');
    await page.waitForURL('**/expert/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    const expertVal70 = await page.locator('.card:has-text("AI Confidence Review Threshold") input[type="range"]').inputValue();
    const expertHeader70 = await page.locator('.card:has-text("AI Confidence Review Threshold") span.text-green-700').textContent();
    const activePill70 = await page.locator('.card:has-text("AI Confidence Review Threshold") span:has-text("(Active)")').textContent();
    const note70 = await page.locator('.card:has-text("AI Confidence Review Threshold") p.bg-amber-50').textContent();

    const phase3Pass = (
      expertVal70 === '70' &&
      expertHeader70?.includes('70%') &&
      activePill70?.includes('70%') &&
      note70?.includes('0.70') &&
      note70?.includes('70%')
    );

    record(
      'PHASE-3',
      'Expert Settings dynamically displays live 70% set by Admin',
      phase3Pass,
      `Slider Input: ${expertVal70}%, Header: "${expertHeader70?.trim()}", Active Indicator: "${activePill70?.trim()}", System Note: "${note70?.trim()}"`
    );

    // -------------------------------------------------------------
    // Phase 4: Change Threshold to 90% in Admin Settings & Re-check
    // -------------------------------------------------------------
    console.log('--- Phase 4: Changing Threshold to 90% from Admin Settings ---');
    await page.click('button:has-text("Logout"), button:has-text("←")');
    await page.waitForURL('**/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Login as Admin")');
    await page.waitForURL('**/admin');
    await page.waitForLoadState('networkidle');

    await page.click('aside nav button:has-text("Settings")');
    await page.waitForURL('**/admin/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    await adminSlider.fill('90');
    await page.waitForTimeout(200);
    await page.click('button:has-text("💾 Save Threshold")');
    await page.waitForTimeout(1000);

    // Now go back to Expert Settings
    console.log('--- Phase 5: Re-checking Expert Settings for 90% ---');
    await page.click('button:has-text("Logout"), button:has-text("←")');
    await page.waitForURL('**/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Login as Expert")');
    await page.waitForURL('**/expert');
    await page.waitForLoadState('networkidle');

    await page.click('aside nav button:has-text("Settings")');
    await page.waitForURL('**/expert/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    const expertVal90 = await page.locator('.card:has-text("AI Confidence Review Threshold") input[type="range"]').inputValue();
    const expertHeader90 = await page.locator('.card:has-text("AI Confidence Review Threshold") span.text-green-700').textContent();
    const activePill90 = await page.locator('.card:has-text("AI Confidence Review Threshold") span:has-text("(Active)")').textContent();
    const note90 = await page.locator('.card:has-text("AI Confidence Review Threshold") p.bg-amber-50').textContent();

    const phase5Pass = (
      expertVal90 === '90' &&
      expertHeader90?.includes('90%') &&
      activePill90?.includes('90%') &&
      note90?.includes('0.90') &&
      note90?.includes('90%')
    );

    record(
      'PHASE-4-5',
      'Expert Settings dynamically displays updated 90% set by Admin without code changes',
      phase5Pass,
      `Slider Input: ${expertVal90}%, Header: "${expertHeader90?.trim()}", Active Indicator: "${activePill90?.trim()}", System Note: "${note90?.trim()}"`
    );

    // -------------------------------------------------------------
    // Restore Baseline: 85%
    // -------------------------------------------------------------
    console.log('--- Restoring Threshold back to 85% ---');
    await page.click('button:has-text("Logout"), button:has-text("←")');
    await page.waitForURL('**/');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Login as Admin")');
    await page.waitForURL('**/admin');
    await page.waitForLoadState('networkidle');

    await page.click('aside nav button:has-text("Settings")');
    await page.waitForURL('**/admin/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    await adminSlider.fill('85');
    await page.click('button:has-text("💾 Save Threshold")');
    await page.waitForTimeout(1000);
    console.log('   Restored Admin Threshold to 85%.');

  } catch (err) {
    console.error('❌ Error during test:', err);
  } finally {
    await browser.close();
  }

  console.log('================================================================');
  console.log('RESULTS SUMMARY:');
  console.log('================================================================');
  for (const r of results) {
    console.log(`${r.passed ? '✅ PASS' : '❌ FAIL'} [${r.step}] ${r.title}`);
    console.log(`   ${r.details}`);
  }
  const allPassed = results.every(r => r.passed);
  console.log('================================================================');
  console.log(`TOTAL: ${results.filter(r => r.passed).length} / ${results.length} checks passed. Fully Verified: ${allPassed}`);
  console.log('================================================================\n');
}

run();
