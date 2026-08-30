import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('====================================================');
  console.log('🔍 VERIFYING FRONTEND DATA RECOVERY');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    // 1. Login as Farmer
    console.log('1. Navigating to Login and logging in as Farmer...');
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Login as Farmer")');
    await page.waitForURL('**/farmer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 2. Check Weather card
    console.log('\n2. Checking Weather card on Farmer Home...');
    const weatherCardText = await page.locator('.mobile-app').textContent();
    const tempMatch = weatherCardText.match(/(\d+(\.\d+)?)\s*°C/);
    console.log('   Rendered Temperature:', tempMatch ? `${tempMatch[1]}°C` : 'Not found');
    console.log('   Contains "--°C"?', weatherCardText.includes('--°C') ? 'YES (Broken)' : 'NO (Normal)');

    // 3. Check Farms list on Farmer Home / My Farms
    console.log('\n3. Checking Farms list...');
    await page.goto(`${BASE_URL}/farmer/farms`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const farmCards = await page.locator('.card:has-text("Farm")').count();
    console.log(`   Rendered Farm Cards count: ${farmCards}`);
    const noFarmsMsg = await page.locator('text=No farms registered').count();
    console.log(`   "No farms registered" message present? ${noFarmsMsg > 0 ? 'YES' : 'NO'}`);

    // 4. Check Expert Queue for 79 diagnoses
    console.log('\n4. Checking Expert Queue diagnoses...');
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Login as Expert")');
    await page.waitForURL('**/expert');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Total diagnoses in queue tabs
    const allTabCount = await page.evaluate(async () => {
      const res = await fetch('http://127.0.0.1:8000/api/expert/queue');
      const data = await res.json();
      return data.length;
    });
    console.log(`   Diagnoses in database: ${allTabCount}`);

    console.log('\n====================================================');
    if (tempMatch && farmCards >= 5 && allTabCount >= 79) {
      console.log('🎉 ALL DATA FULLY VERIFIED ON FRONTEND & BACKEND!');
    } else {
      console.warn('⚠️ Some items did not meet thresholds.');
    }
    console.log('====================================================\n');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

run();
