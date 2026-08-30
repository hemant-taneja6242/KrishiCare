import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('=== STARTING ALERT RADIUS VERIFICATION ON', BASE_URL, '===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const networkRequests = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/alerts/nearby')) {
      networkRequests.push({
        timestamp: new Date().toISOString(),
        url: req.url(),
        method: req.method(),
      });
      console.log(`📡 [NETWORK] ${req.method()} ${req.url()}`);
    }
  });

  page.on('response', async (res) => {
    if (res.url().includes('/api/alerts/nearby')) {
      try {
        const json = await res.json();
        console.log(`📥 [RESPONSE] ${res.status()} -> Returned ${Array.isArray(json) ? json.length : json.count} items`);
      } catch (e) {}
    }
  });

  try {
    // 1. Login as farmer
    console.log('\n1. Navigating to Login page...');
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    console.log('Clicking "Login as Farmer"...');
    await page.click('button:has-text("Login as Farmer")');
    await page.waitForURL('**/farmer');
    await page.waitForLoadState('networkidle');
    console.log('✅ Logged in successfully. Current URL:', page.url());

    // 2. Navigate to Alert Radius Settings
    console.log('\n2. Navigating to Alert Radius Settings...');
    await page.goto(`${BASE_URL}/farmer/profile/alerts`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const title = await page.locator('h1').textContent();
    console.log('Page Title:', title);

    // 3. Test Setting Radius to 20km
    console.log('\n3. Setting radius to 20 km...');
    // Click the 20 km preset button
    const btn20 = page.locator('button:has-text("20 km")');
    await btn20.click();
    await page.waitForTimeout(300);

    const radiusDisplay = await page.locator('.text-4xl').textContent();
    console.log('Current Radius Display:', radiusDisplay);

    // Click Save Alert Radius
    console.log('Clicking "Save Alert Radius"...');
    await page.click('button:has-text("Save Alert Radius")');
    await page.waitForTimeout(600);

    // Verify localStorage
    const savedLocalStorage20 = await page.evaluate(() => localStorage.getItem('krishi_alert_radius'));
    console.log('localStorage krishi_alert_radius:', savedLocalStorage20);

    // 4. Navigate to Nearby Alerts (/farmer/alerts)
    console.log('\n4. Navigating to Nearby Alerts (/farmer/alerts)...');
    networkRequests.length = 0; // reset tracker
    await page.goto(`${BASE_URL}/farmer/alerts`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('\n--- VERIFICATION AT 20 KM ---');
    console.log('Network calls captured:', JSON.stringify(networkRequests, null, 2));
    const bannerText20 = await page.locator('.rounded-2xl p.font-bold').first().textContent();
    console.log('Banner text:', bannerText20);

    const alertCards20 = await page.locator('.card').allTextContents();
    console.log(`Total alert cards rendered: ${alertCards20.length}`);
    alertCards20.forEach((text, i) => {
      console.log(`  [Alert ${i + 1}] ${text.replace(/\s+/g, ' ').trim()}`);
    });

    const hasEsca = alertCards20.some((t) => t.includes('Esca'));
    const hasEarlyBlight = alertCards20.some((t) => t.includes('Early Blight'));
    console.log(`- Esca detected 12.4 km present: ${hasEsca ? '✅ YES' : '❌ NO'}`);
    console.log(`- Early Blight 18.2 km present: ${hasEarlyBlight ? '✅ YES' : '❌ NO'}`);

    // 5. Navigate back to Settings and set Radius to 2km
    console.log('\n5. Navigating back to Alert Radius Settings to set radius to 2 km...');
    await page.goto(`${BASE_URL}/farmer/profile/alerts`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click 2 km preset button
    const btn2 = page.locator('button:has-text("2 km")');
    await btn2.click();
    await page.waitForTimeout(300);

    const radiusDisplay2 = await page.locator('.text-4xl').textContent();
    console.log('Current Radius Display:', radiusDisplay2);

    console.log('Clicking "Save Alert Radius"...');
    await page.click('button:has-text("Save Alert Radius")');
    await page.waitForTimeout(600);

    const savedLocalStorage2 = await page.evaluate(() => localStorage.getItem('krishi_alert_radius'));
    console.log('localStorage krishi_alert_radius:', savedLocalStorage2);

    // 6. Navigate to Nearby Alerts (/farmer/alerts)
    console.log('\n6. Navigating to Nearby Alerts (/farmer/alerts) with 2 km...');
    networkRequests.length = 0; // reset tracker
    await page.goto(`${BASE_URL}/farmer/alerts`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('\n--- VERIFICATION AT 2 KM ---');
    console.log('Network calls captured:', JSON.stringify(networkRequests, null, 2));
    const bannerText2 = await page.locator('.rounded-2xl p.font-bold').first().textContent();
    console.log('Banner text:', bannerText2);

    const alertCards2 = await page.locator('.card').allTextContents();
    console.log(`Total alert cards rendered: ${alertCards2.length}`);
    alertCards2.forEach((text, i) => {
      console.log(`  [Alert ${i + 1}] ${text.replace(/\s+/g, ' ').trim()}`);
    });

    const hasEsca2 = alertCards2.some((t) => t.includes('Esca'));
    const hasEarlyBlight2 = alertCards2.some((t) => t.includes('Early Blight'));
    console.log(`- Esca detected 12.4 km disappeared: ${!hasEsca2 ? '✅ YES' : '❌ NO'}`);
    console.log(`- Early Blight 18.2 km disappeared: ${!hasEarlyBlight2 ? '✅ YES' : '❌ NO'}`);

    // 7. Reset to 5 km default
    console.log('\n7. Setting radius back to default 5 km...');
    await page.goto(`${BASE_URL}/farmer/profile/alerts`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: '5 km ★ Default' }).click();
    await page.click('button:has-text("Save Alert Radius")');
    await page.waitForTimeout(600);

    networkRequests.length = 0;
    await page.goto(`${BASE_URL}/farmer/alerts`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('\n--- VERIFICATION AT 5 KM (DEFAULT) ---');
    console.log('Network calls captured:', JSON.stringify(networkRequests, null, 2));
    const bannerText5 = await page.locator('.rounded-2xl p.font-bold').first().textContent();
    console.log('Banner text:', bannerText5);

    const alertCards5 = await page.locator('.card').allTextContents();
    console.log(`Total alert cards rendered: ${alertCards5.length}`);
    alertCards5.forEach((text, i) => {
      console.log(`  [Alert ${i + 1}] ${text.replace(/\s+/g, ' ').trim()}`);
    });

    console.log('\n🎉 ALL VERIFICATION STEPS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Error during verification:', err);
  } finally {
    await browser.close();
  }
}

run();
