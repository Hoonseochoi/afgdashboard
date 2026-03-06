const puppeteer = require('puppeteer');
const path = require('path');

async function capture() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });
  
  const url = 'http://localhost:3001/direct';
  let success = false;
  let retries = 5;

  while (retries > 0 && !success) {
    try {
      console.log(`Navigating to ${url}... (Retries left: ${retries})`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      success = true;
    } catch (error) {
      console.error(`Attempt failed: ${error.message}`);
      retries--;
      if (retries > 0) {
        console.log('Waiting 5 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  if (success) {
    // Dashboard sometimes takes time to load data
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const screenshotPath = path.join('C:\\Users\\chlgn\\.gemini\\antigravity\\brain\\4008bc7f-b2b7-407f-881c-b2e8e8087917', 'dashboard_screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved to ${screenshotPath}`);
  } else {
    console.error('Failed to capture screenshot after multiple attempts.');
  }

  await browser.close();
}

capture();
