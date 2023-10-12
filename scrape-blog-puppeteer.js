const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Navigate to the blog page
  await page.goto('https://www.timedoctor.com/blog/how-to-start-a-call-center/');

  // Wait for the target element to be available
  await page.waitForSelector('#penci-post-entry-inner');

  // Extract the content
  const content = await page.$eval('#penci-post-entry-inner', (element) => element.textContent);

  console.log('Article Content:', content);

  await browser.close();
})();
