const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeArticleContent(page, link) {
  await page.goto(link);

  await page.waitForSelector('#penci-post-entry-inner');

  const content = await page.$$eval('#penci-post-entry-inner p, #penci-post-entry-inner h2, #penci-post-entry-inner h3', (elements) => {
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

  const date = await page.$eval('time', (element) => element.textContent);

  return { content, date };
}

async function scrapeAndSaveArticle(page, link, articleIndex) {
  console.log(`Scraping content for article ${articleIndex}`);

  const dataToSave = await scrapeArticleContent(page, link);

  const filename = `article_${articleIndex}.json`;
  const jsonData = JSON.stringify(dataToSave, null, 2);

  fs.writeFileSync(filename, jsonData, 'utf-8');

  console.log(`Content, title, and date from article saved to ${filename}`);
}

async function scrapeArticles() {
  const browser = await puppeteer.launch();
  const blogUrl = 'https://test.finke.pl/blog/category/bpo/';
  const maxArticles = 30;
  let scrapedArticles = 0;

  const page = await browser.newPage();
  await page.goto(blogUrl);

  while (scrapedArticles < maxArticles) {
    await page.waitForSelector('.penci-entry-title a');

    const articleLinks = await page.$$eval('.penci-entry-title a', (links) => links.slice(0, 5).map((link) => link.href));

    for (const link of articleLinks) {
      if (scrapedArticles >= maxArticles) {
        break;
      }

      await scrapeAndSaveArticle(page, link, scrapedArticles + 1);
      scrapedArticles++;
    }

    const nextPage = await page.$('.next.page-numbers');
    if (!nextPage) {
      break;
    }

    await nextPage.click();
    await page.waitForNavigation();
  }

  await browser.close();
}

scrapeArticles();
