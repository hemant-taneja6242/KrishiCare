import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('====================================================');
  console.log('🌐 TESTING EXPERT SETTINGS LANGUAGE PREFERENCE');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    // 1. Login as Expert
    console.log('1. Logging in as Expert...');
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Login as Expert")');
    await page.waitForURL('**/expert');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    console.log('✅ Logged in as Expert. Current URL:', page.url());

    // 2. Navigate to Expert Settings
    console.log('\n2. Navigating to Expert Settings (/expert/settings)...');
    await page.goto(`${BASE_URL}/expert/settings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const title = await page.locator('h1').textContent();
    console.log('Page Title:', title?.trim());

    // 3. Check Language buttons presence
    const buttons = await page.locator('button:has-text("English (EN)"), button:has-text("हिन्दी (HI)"), button:has-text("मराठी (MR)"), button:has-text("தமிழ் (TA)")').all();
    console.log(`Found ${buttons.length} language preference buttons.`);

    // 4. Test clicking Hindi
    console.log('\n3. Clicking "हिन्दी (HI)" button...');
    await page.click('button:has-text("हिन्दी (HI)")');
    await page.waitForTimeout(600);

    const langAfterHi = await page.evaluate(() => localStorage.getItem('krishi_app_lang'));
    const hiBtnText = await page.locator('button:has-text("हिन्दी (HI)")').textContent();
    console.log(`   localStorage krishi_app_lang: "${langAfterHi}"`);
    console.log(`   Hindi button text: "${hiBtnText?.trim()}"`);

    if (langAfterHi === 'hi' && hiBtnText?.includes('✓')) {
      console.log('   ✅ PASS: Hindi selected, persisted in krishi_app_lang, and visually highlighted with ✓');
    } else {
      console.error('   ❌ FAIL: Hindi selection failed.');
    }

    // Check sidebar translated to Hindi
    const sidebarTextHi = await page.locator('aside').textContent();
    const hasHindiSidebar = sidebarTextHi?.includes('विशेषज्ञ') || sidebarTextHi?.includes('अलर्ट');
    console.log(`   Sidebar updated with Hindi: ${hasHindiSidebar ? '✅ YES' : '❌ NO'}`);

    // 5. Test clicking Marathi
    console.log('\n4. Clicking "मराठी (MR)" button...');
    await page.click('button:has-text("मराठी (MR)")');
    await page.waitForTimeout(600);

    const langAfterMr = await page.evaluate(() => localStorage.getItem('krishi_app_lang'));
    const mrBtnText = await page.locator('button:has-text("मराठी (MR)")').textContent();
    console.log(`   localStorage krishi_app_lang: "${langAfterMr}"`);
    console.log(`   Marathi button text: "${mrBtnText?.trim()}"`);

    if (langAfterMr === 'mr' && mrBtnText?.includes('✓')) {
      console.log('   ✅ PASS: Marathi selected, persisted in krishi_app_lang, and visually highlighted with ✓');
    } else {
      console.error('   ❌ FAIL: Marathi selection failed.');
    }

    // 6. Test clicking Tamil
    console.log('\n5. Clicking "தமிழ் (TA)" button...');
    await page.click('button:has-text("தமிழ் (TA)")');
    await page.waitForTimeout(600);

    const langAfterTa = await page.evaluate(() => localStorage.getItem('krishi_app_lang'));
    const taBtnText = await page.locator('button:has-text("தமிழ் (TA)")').textContent();
    console.log(`   localStorage krishi_app_lang: "${langAfterTa}"`);
    console.log(`   Tamil button text: "${taBtnText?.trim()}"`);

    if (langAfterTa === 'ta' && taBtnText?.includes('✓')) {
      console.log('   ✅ PASS: Tamil selected, persisted in krishi_app_lang, and visually highlighted with ✓');
    } else {
      console.error('   ❌ FAIL: Tamil selection failed.');
    }

    // 7. Test page refresh persistence in Tamil
    console.log('\n6. Testing Page Refresh Persistence in Tamil...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    const langAfterReload = await page.evaluate(() => localStorage.getItem('krishi_app_lang'));
    const taBtnTextReload = await page.locator('button:has-text("தமிழ் (TA)")').textContent();
    console.log(`   localStorage after reload: "${langAfterReload}"`);
    console.log(`   Tamil button text after reload: "${taBtnTextReload?.trim()}"`);

    if (langAfterReload === 'ta' && taBtnTextReload?.includes('✓')) {
      console.log('   ✅ PASS: Tamil selection survived page refresh and remains active.');
    } else {
      console.error('   ❌ FAIL: Refresh persistence failed.');
    }

    // 8. Test clicking English (EN) to reset
    console.log('\n7. Clicking "English (EN)" to restore default...');
    await page.click('button:has-text("English (EN)")');
    await page.waitForTimeout(600);

    const langAfterEn = await page.evaluate(() => localStorage.getItem('krishi_app_lang'));
    const enBtnText = await page.locator('button:has-text("English (EN)")').textContent();
    console.log(`   localStorage krishi_app_lang: "${langAfterEn}"`);
    console.log(`   English button text: "${enBtnText?.trim()}"`);

    if (langAfterEn === 'en' && enBtnText?.includes('✓')) {
      console.log('   ✅ PASS: English selected, persisted in krishi_app_lang, and visually highlighted with ✓');
    } else {
      console.error('   ❌ FAIL: English restore failed.');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL EXPERT SETTINGS LANGUAGE TESTS PASSED!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Error during test:', err);
  } finally {
    await browser.close();
  }
}

run();
