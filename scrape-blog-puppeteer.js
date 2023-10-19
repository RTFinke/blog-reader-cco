const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();

  const articleUrls = [
    'https://test.finke.pl/blog/call-center-articles/',
  ];

  for (let i = 0; i < articleUrls.length; i++) {
    const articlePage = await browser.newPage();
    const articleUrl = articleUrls[i];

    await articlePage.goto(articleUrl);

    // Wait for the target element to be available
    await articlePage.waitForSelector('#penci-post-entry-inner');

    // Extract the content
    const content = await articlePage.$$eval('#penci-post-entry-inner p, #penci-post-entry-inner h3', (elements) => {
      let paragraphs = [];
      let currentParagraph = "";

      for (const element of elements) {
        if (element.tagName === 'P') {
          currentParagraph += element.textContent + ' ';
        } else if (element.tagName === 'H3') {
          if (currentParagraph) {
            paragraphs.push(currentParagraph.trim());
            currentParagraph = "";
          }
        }
      }

      if (currentParagraph) {
        paragraphs.push(currentParagraph.trim());
      }

      return paragraphs;
    });

    // Extract the title
    const title = await articlePage.$eval('.header-standard.header-classic.single-header h1', (element) => element.textContent);

    // Extract the publication date if available
    const date = await articlePage.$eval('time', (element) => element.textContent);

    const dataToSave = {
      title: title,
      content: content,
      date: date, // Include the date in the JSON
    };

    const filename = `article_${i + 1}.json`;
    const jsonData = JSON.stringify(dataToSave, null, 2);

    fs.writeFileSync(filename, jsonData, 'utf-8');

    console.log(`Content, title, and date from ${articleUrl} saved to ${filename}`);

    // Add a delay between requests (e.g., 5 seconds)
    await articlePage.waitForTimeout(5000);

    await articlePage.close();
  }

  await browser.close();
})();
