const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();

  const articleUrls = [
    'https://www.timedoctor.com/blog/how-to-get-call-center-contracts/',
    'https://www.timedoctor.com/blog/responsible-outsourcing/',
    'https://www.timedoctor.com/blog/call-center-workforce-management/',
    'https://www.timedoctor.com/blog/call-center-workforce-management/',

  ];

  for (let i = 0; i < articleUrls.length; i++) {
    const articlePage = await browser.newPage();
    const articleUrl = articleUrls[i];

    await articlePage.goto(articleUrl);

    // Wait for the target element to be available
    await articlePage.waitForSelector('#penci-post-entry-inner');

    // Extract the content
    const content = await articlePage.$eval('#penci-post-entry-inner', (element) => element.textContent);

    const dataToSave = {
      content: content,
    };

    const filename = `article_${i + 1}.json`;
    const jsonData = JSON.stringify(dataToSave, null, 2);

    fs.writeFileSync(filename, jsonData, 'utf-8');

    console.log(`Content from ${articleUrl} saved to ${filename}`);

    // Add a delay between requests (e.g., 5 seconds)
    await articlePage.waitForTimeout(5000);

    await articlePage.close();
  }

  await browser.close();
})();

