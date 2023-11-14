// Importing necessary modules
const puppeteer = require('puppeteer');
const fs = require('fs');

// Using an asynchronous IIFE (Immediately Invoked Function Expression) for better control of asynchronous operations
(async () => {
  // Launching a headless browser instance using Puppeteer
  const browser = await puppeteer.launch();
  // Opening a new page in the browser
  const page = await browser.newPage();

  // Setting the URL of the blog to be scraped
  const blogUrl = 'https://www.callcentrehelper.com/tag/cx';
  // Navigating to the specified blog URL
  await page.goto(blogUrl);

  // Setting the maximum number of articles to scrape
  const maxArticles = 10;
  // Initializing a counter for the number of scraped articles
  let scrapedArticles = 0;

  // Looping through the articles until the specified number is reached
  while (scrapedArticles < maxArticles) {
    // Waiting for the container that holds the articles to be present in the DOM
    await page.waitForSelector('.category-article-container');

    // Extracting data for each article on the page
    const articleData = await page.$$eval('.category-article-container', (articles) => {
      return articles.slice(0, 10).map((article) => {
        // Extracting title and link for each article
        const title = article.querySelector('.home-article-title a').textContent;
        const link = article.querySelector('.home-article-title a').getAttribute('href');
        return {
          title,
          link,
        };
      });
    });

    // Processing each article concurrently using Promise.all
    const articlePromises = articleData.map(async (data, index) => {
      // Checking if the maximum number of articles has been reached
      if (scrapedArticles >= maxArticles) {
        return;
      }

      // Destructuring title and link from the article data
      const { title, link } = data;
      console.log(`Scraping content for article: ${title}`);

      // Opening a new page for the specific article
      const articlePage = await browser.newPage();
      // Navigating to the article's link
      await articlePage.goto(link);

      // Adjusted selector for waiting for the content to be present
      await articlePage.waitForSelector('.article-content');

      // Adjusted selector for extracting content (paragraphs, h2, h3)
      const content = await articlePage.$$eval('.article-content p, .article-content h2, .article-content h3', (elements) => {
        let paragraphs = [];

        for (const element of elements) {
          // Extracting text content and replacing HTML tags with newlines
          const paragraphText = element.textContent.replace(/<\/?[^>]+(>|$)/g, '\n');
          paragraphs.push(paragraphText.trim());
        }

        return paragraphs;
      });

      // Joining content paragraphs into a formatted string
      const formattedContent = content.join('\n');

      // Adjusted selector for extracting date

      // Creating an object with title, content, and date for the article
      const dataToSave = {
        title: title,
        content: formattedContent,
      };

      // Creating a filename for the JSON file
      const filename = `article_${scrapedArticles + 1}.json`;
      // Converting the data to JSON format and writing it to a file
      const jsonData = JSON.stringify(dataToSave, null, 2);
      fs.writeFileSync(filename, jsonData, 'utf-8');
      console.log(`Content, title, and date from article "${title}" saved to ${filename}`);

      // Closing the article page
      await articlePage.close();
      // Incrementing the counter for scraped articles
      scrapedArticles++;
    });

    // Waiting for all article promises to resolve before moving to the next page
    await Promise.all(articlePromises);

    // Adjusted selector for the "Next" button on the pagination
    const nextPage = await page.$('.category-ribbon .article-next a');
    // Breaking out of the loop if there is no "Next" button
    if (!nextPage) {
      break;
    }

    // Clicking the "Next" button and waiting for navigation to complete
    await nextPage.click();
    await page.waitForNavigation();
  }

  // Closing the browser after scraping is complete
  await browser.close();
})();
