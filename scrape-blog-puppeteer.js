const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();

  const blogUrl = 'https://test.finke.pl/blog/category/bpo/';
  const maxArticles = 30; // Maximum number of articles to scrape
  let scrapedArticles = 0; // Counter for scraped articles

  const page = await browser.newPage();
  await page.goto(blogUrl);

  while (scrapedArticles < maxArticles) {
    // Wait for the target elements to be available
    await page.waitForSelector('.penci-entry-title a');

    const articleData = await page.$$eval('.penci-entry-title a', (links) => {
      return links.slice(0, 5).map((link) => {
        return {
          title: link.textContent,
          link: link.href,
        };
      });
    });

    const articlePromises = articleData.map(async (data, index) => {
      if (scrapedArticles >= maxArticles) {
        return;
      }

      const { title, link } = data;
      console.log(`Scraping content for article: ${title}`);

      const articlePage = await browser.newPage();
      await articlePage.goto(link);

      // Wait for the target element to be available on the article page
      await articlePage.waitForSelector('#penci-post-entry-inner');

      const content = await articlePage.$$eval('#penci-post-entry-inner p, #penci-post-entry-inner h2, #penci-post-entry-inner h3', (elements) => {
        let paragraphs = [];
        let currentParagraph = "";

        for (const element of elements) {
          if (element.tagName === 'P' || element.tagName === 'H2' || element.tagName === 'H3') {
            currentParagraph += element.textContent + ' ';
          }
        }

        if (currentParagraph) {
          paragraphs.push(currentParagraph.trim());
        }

        return paragraphs;
      });

      const date = await articlePage.$eval('time', (element) => element.textContent);

      const dataToSave = {
        title: title,
        content: content,
        date: date,
      };

      const filename = `article_${scrapedArticles + 1}.json`;
      const jsonData = JSON.stringify(dataToSave, null, 2);

      fs.writeFileSync(filename, jsonData, 'utf-8');

      console.log(`Content, title, and date from article "${title}" saved to ${filename}`);

      await articlePage.close();
      scrapedArticles++;
    });

    await Promise.all(articlePromises);

    // Navigate to the next page
    const nextPage = await page.$('.next.page-numbers');
    if (!nextPage) {
      break; // No more pages to scrape
    }
    await nextPage.click();
    await page.waitForNavigation();
  }

  await browser.close();
})();
