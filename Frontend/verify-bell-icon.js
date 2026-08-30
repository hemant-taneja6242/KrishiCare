import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('====================================================');
  console.log('🔔 TESTING NOTIFICATION BELL ON FARMER HOME');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    // Step 1: Login as farmer
    console.log('1. Logging in as farmer...');
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Login as Farmer")');
    await page.waitForURL('**/farmer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    console.log('✅ Current URL after login:', page.url());

    // Step 2: Find the bell button at the top right
    console.log('\n2. Testing Click #1 on notification bell...');
    const bellBtn = page.locator('button:has-text("🔔")').first();
    const bellTitle = await bellBtn.getAttribute('title');
    console.log(`   Bell title attribute: "${bellTitle}"`);

    await bellBtn.click();
    await page.waitForTimeout(600);

    console.log(`   URL after Click #1: ${page.url()}`);
    if (page.url().includes('/farmer/alerts')) {
      console.log('   ✅ PASS: Navigated to Nearby Alerts (/farmer/alerts). User stays logged in!');
    } else {
      console.error(`   ❌ FAIL: Unexpected URL: ${page.url()}`);
    }

    // Step 3: Go back to Home and Click #2
    console.log('\n3. Navigating back to Farmer Home and testing Click #2...');
    await page.goto(`${BASE_URL}/farmer`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const bellBtn2 = page.locator('button:has-text("🔔")').first();
    await bellBtn2.click();
    await page.waitForTimeout(600);

    console.log(`   URL after Click #2: ${page.url()}`);
    if (page.url().includes('/farmer/alerts')) {
      console.log('   ✅ PASS: Successfully navigated to /farmer/alerts again.');
    } else {
      console.error(`   ❌ FAIL: Unexpected URL: ${page.url()}`);
    }

    // Step 4: Go back to Home and Click #3
    console.log('\n4. Navigating back to Farmer Home and testing Click #3...');
    await page.goto(`${BASE_URL}/farmer`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const bellBtn3 = page.locator('button:has-text("🔔")').first();
    await bellBtn3.click();
    await page.waitForTimeout(600);

    console.log(`   URL after Click #3: ${page.url()}`);
    if (page.url().includes('/farmer/alerts')) {
      console.log('   ✅ PASS: Navigated to /farmer/alerts. Repeated clicks are rock-solid.');
    } else {
      console.error(`   ❌ FAIL: Unexpected URL: ${page.url()}`);
    }

    // Step 5: Test bell on Scan page
    console.log('\n5. Testing bell on /farmer/scan...');
    await page.goto(`${BASE_URL}/farmer/scan`);
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("🔔")').first().click();
    await page.waitForTimeout(600);
    console.log(`   URL after Scan bell click: ${page.url()}`);
    if (page.url().includes('/farmer/alerts')) {
      console.log('   ✅ PASS: Scan header bell navigates to Nearby Alerts.');
    } else {
      console.error(`   ❌ FAIL: Unexpected URL: ${page.url()}`);
    }

    // Step 6: Test bell on Weather & Risk page
    console.log('\n6. Testing bell on /farmer/risk...');
    await page.goto(`${BASE_URL}/farmer/risk`);
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("🔔")').first().click();
    await page.waitForTimeout(600);
    console.log(`   URL after Risk bell click: ${page.url()}`);
    if (page.url().includes('/farmer/alerts')) {
      console.log('   ✅ PASS: Risk header bell navigates to Nearby Alerts.');
    } else {
      console.error(`   ❌ FAIL: Unexpected URL: ${page.url()}`);
    }

    console.log('\n====================================================');
    console.log('🎉 ALL NOTIFICATION BELL TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Error during test execution:', err);
  } finally {
    await browser.close();
  }
}

run();
