import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('====================================================');
  console.log('🌐 KRISHICARE GLOBAL MULTI-LANGUAGE (i18n) TEST SUITE');
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
    // -------------------------------------------------------------------
    // 1. Initial Load in English
    // -------------------------------------------------------------------
    console.log('\n--- 1. Testing Default English UI ---');
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Check Login page text
    const farmerLoginBtn = await page.locator('button:has-text("Login as Farmer")').textContent();
    record('Login in English', farmerLoginBtn?.includes('Login as Farmer'), `Button text: "${farmerLoginBtn?.trim()}"`);

    await page.click('button:has-text("Login as Farmer")');
    await page.waitForURL('**/farmer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Check Farmer Home English tabs & actions
    const homeTab = await page.locator('.bottom-tab-bar .tab-item').first().textContent();
    const scanAction = await page.locator('button:has-text("Scan Crop")').count();
    record('Farmer Home English Tabs', homeTab?.includes('Home'), `First tab: "${homeTab?.trim()}"`);
    record('Farmer Home English Quick Actions', scanAction > 0, `Scan Crop button count: ${scanAction}`);

    // -------------------------------------------------------------------
    // 2. Switch to Hindi (hi)
    // -------------------------------------------------------------------
    console.log('\n--- 2. Switching to Hindi (hi) via Language Settings ---');
    await page.goto(`${BASE_URL}/farmer/profile/language`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    // Click Hindi card
    await page.click('button:has-text("हिन्दी")');
    await page.waitForTimeout(600);

    // Verify localStorage
    const savedLangHi = await page.evaluate(() => localStorage.getItem('krishi_app_lang'));
    record('Hindi LocalStorage Persistence', savedLangHi === 'hi', `krishi_app_lang = "${savedLangHi}"`);

    // Verify Language page title in Hindi
    const langTitleHi = await page.locator('h1').textContent();
    record('Language Settings Header in Hindi', langTitleHi?.includes('भाषा सेटिंग्स'), `Header text: "${langTitleHi?.trim()}"`);

    // Verify Bottom Tab Bar in Hindi
    const tabTextsHi = await page.locator('.bottom-tab-bar .tab-item').allTextContents();
    const cleanTabsHi = tabTextsHi.map(t => t.trim());
    record(
      'Bottom Tabs in Hindi',
      cleanTabsHi.includes('होम') && cleanTabsHi.includes('खेत') && cleanTabsHi.includes('प्रोफाइल'),
      `Tabs: [${cleanTabsHi.join(', ')}]`
    );

    // Navigate to Farmer Home in Hindi
    await page.goto(`${BASE_URL}/farmer`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const hiScanAction = await page.locator('button:has-text("फसल स्कैन करें")').count();
    const hiFarmsAction = await page.locator('button:has-text("मेरे खेत")').count();
    const hiRiskHeader = await page.locator('text=आज का रोग जोखिम').count();
    record(
      'Farmer Home in Hindi',
      hiScanAction > 0 && hiFarmsAction > 0,
      `Found "फसल स्कैन करें" (${hiScanAction}) and "मेरे खेत" (${hiFarmsAction})`
    );

    // Navigate to Alert Radius Settings in Hindi
    await page.goto(`${BASE_URL}/farmer/profile/alerts`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    const radiusTitleHi = await page.locator('h1').textContent();
    const radiusSaveBtnHi = await page.locator('button.btn-primary').textContent();
    record(
      'Alert Radius Settings in Hindi',
      radiusTitleHi?.includes('अलर्ट दायरा सेटिंग्स'),
      `Title: "${radiusTitleHi?.trim()}", Save button: "${radiusSaveBtnHi?.trim()}"`
    );

    // Navigate to Scan Page in Hindi
    await page.goto(`${BASE_URL}/farmer/scan`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    const scanTitleHi = await page.locator('h1').textContent();
    const uploadPromptHi = await page.locator('text=फोटो लें या अपलोड करें').count();
    record(
      'Scan Page in Hindi',
      scanTitleHi?.includes('पत्ती रोग की जांच करें') && uploadPromptHi > 0,
      `Title: "${scanTitleHi?.trim()}", Upload hint visible: ${uploadPromptHi > 0}`
    );

    // -------------------------------------------------------------------
    // 3. Switch to Marathi (mr)
    // -------------------------------------------------------------------
    console.log('\n--- 3. Switching to Marathi (mr) via Language Settings ---');
    await page.goto(`${BASE_URL}/farmer/profile/language`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    // Click Marathi card
    await page.click('button:has-text("मराठी")');
    await page.waitForTimeout(600);

    const savedLangMr = await page.evaluate(() => localStorage.getItem('krishi_app_lang'));
    record('Marathi LocalStorage Persistence', savedLangMr === 'mr', `krishi_app_lang = "${savedLangMr}"`);

    // Verify Language page title in Marathi
    const langTitleMr = await page.locator('h1').textContent();
    record('Language Settings Header in Marathi', langTitleMr?.includes('भाषा सेटिंग्ज'), `Header text: "${langTitleMr?.trim()}"`);

    // Verify Bottom Tab Bar in Marathi
    const tabTextsMr = await page.locator('.bottom-tab-bar .tab-item').allTextContents();
    const cleanTabsMr = tabTextsMr.map(t => t.trim());
    record(
      'Bottom Tabs in Marathi',
      cleanTabsMr.includes('होम') && cleanTabsMr.includes('शेती') && cleanTabsMr.includes('प्रोफाइल'),
      `Tabs: [${cleanTabsMr.join(', ')}]`
    );

    // Navigate to Farmer Home in Marathi
    await page.goto(`${BASE_URL}/farmer`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const mrScanAction = await page.locator('button:has-text("पीक स्कॅन करा")').count();
    const mrFarmsAction = await page.locator('button:has-text("माझी शेती")').count();
    record(
      'Farmer Home in Marathi',
      mrScanAction > 0 && mrFarmsAction > 0,
      `Found "पीक स्कॅन करा" (${mrScanAction}) and "माझी शेती" (${mrFarmsAction})`
    );

    // Navigate to Scan Page in Marathi
    await page.goto(`${BASE_URL}/farmer/scan`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    const scanTitleMr = await page.locator('h1').textContent();
    record(
      'Scan Page in Marathi',
      scanTitleMr?.includes('पानावरील रोगाचे निदान'),
      `Title: "${scanTitleMr?.trim()}"`
    );

    // -------------------------------------------------------------------
    // 4. Switch to Tamil (ta)
    // -------------------------------------------------------------------
    console.log('\n--- 4. Switching to Tamil (ta) via Language Settings ---');
    await page.goto(`${BASE_URL}/farmer/profile/language`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    // Click Tamil card
    await page.click('button:has-text("தமிழ்")');
    await page.waitForTimeout(600);

    const savedLangTa = await page.evaluate(() => localStorage.getItem('krishi_app_lang'));
    record('Tamil LocalStorage Persistence', savedLangTa === 'ta', `krishi_app_lang = "${savedLangTa}"`);

    // Verify Language page title in Tamil
    const langTitleTa = await page.locator('h1').textContent();
    record('Language Settings Header in Tamil', langTitleTa?.includes('மொழி அமைப்புகள்'), `Header text: "${langTitleTa?.trim()}"`);

    // Verify Bottom Tab Bar in Tamil
    const tabTextsTa = await page.locator('.bottom-tab-bar .tab-item').allTextContents();
    const cleanTabsTa = tabTextsTa.map(t => t.trim());
    record(
      'Bottom Tabs in Tamil',
      cleanTabsTa.includes('முகப்பு') && cleanTabsTa.includes('பண்ணைகள்') && cleanTabsTa.includes('சுயவிவரம்'),
      `Tabs: [${cleanTabsTa.join(', ')}]`
    );

    // Navigate to Farmer Home in Tamil
    await page.goto(`${BASE_URL}/farmer`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const taScanAction = await page.locator('button:has-text("பயிரை ஸ்கேன் செய்க")').count();
    const taFarmsAction = await page.locator('button:has-text("என் பண்ணைகள்")').count();
    record(
      'Farmer Home in Tamil',
      taScanAction > 0 && taFarmsAction > 0,
      `Found "பயிரை ஸ்கேன் செய்க" (${taScanAction}) and "என் பண்ணைகள்" (${taFarmsAction})`
    );

    // Navigate to Scan Page in Tamil
    await page.goto(`${BASE_URL}/farmer/scan`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);

    const scanTitleTa = await page.locator('h1').textContent();
    record(
      'Scan Page in Tamil',
      scanTitleTa?.includes('இலை நோயைக் கண்டறிதல்'),
      `Title: "${scanTitleTa?.trim()}"`
    );

    // -------------------------------------------------------------------
    // 5. Test Persistence Across Page Reload in Tamil
    // -------------------------------------------------------------------
    console.log('\n--- 5. Testing Persistence Across Page Reload ---');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const reloadedScanTitle = await page.locator('h1').textContent();
    record(
      'Persistence after Reload',
      reloadedScanTitle?.includes('இலை நோயைக் கண்டறிதல்'),
      `Title retained in Tamil: "${reloadedScanTitle?.trim()}"`
    );

    // -------------------------------------------------------------------
    // 6. Reset back to English
    // -------------------------------------------------------------------
    console.log('\n--- 6. Resetting Language back to English ---');
    await page.goto(`${BASE_URL}/farmer/profile/language`);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("English")');
    await page.waitForTimeout(500);

    const finalTabs = await page.locator('.bottom-tab-bar .tab-item').allTextContents();
    record('Restored English', finalTabs[0]?.includes('Home'), `First tab restored to: "${finalTabs[0]?.trim()}"`);

    console.log('\n====================================================');
    const passedCount = results.filter(r => r.passed).length;
    console.log(`SUMMARY: ${passedCount} / ${results.length} tests passed.`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Error during multi-language test execution:', err);
  } finally {
    await browser.close();
  }
}

run();
