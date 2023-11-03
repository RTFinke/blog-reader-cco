const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  // Inicjalizacja przeglądarki Puppeteer
  const browser = await puppeteer.launch();

  // Adres URL strony, z której będą pobierane artykuły
  const blogUrl = 'https://test.finke.pl/blog/category/bpo/';

  // Maksymalna liczba artykułów do wyodrębnienia
  const maxArticles = 30;

  // Licznik wyodrębnionych artykułów
  let scrapedArticles = 0;

  // Tworzenie nowej strony w przeglądarce
  const page = await browser.newPage();

  // Przejście do strony głównej
  await page.goto(blogUrl);

  // Rozpoczęcie pętli wyodrębniania artykułów
  while (scrapedArticles < maxArticles) {
    // Oczekiwanie na dostępność elementów docelowych
    await page.waitForSelector('.penci-entry-title a');

    // Wyodrębnienie informacji o artykułach na stronie
    const articleData = await page.$$eval('.penci-entry-title a', (links) => {
      return links.slice(0, 5).map((link) => {
        return {
          title: link.textContent,
          link: link.href,
        };
      });
    });

    // Iteracja po wyodrębnionych danych artykułów
    const articlePromises = articleData.map(async (data, index) => {
      if (scrapedArticles >= maxArticles) {
        return;
      }

      const { title, link } = data;
      console.log(`Scraping content for article: ${title}`);

      // Tworzenie nowej strony dla artykułu
      const articlePage = await browser.newPage();
      await articlePage.goto(link);

      // Oczekiwanie na dostępność elementu docelowego na stronie artykułu
      await articlePage.waitForSelector('#penci-post-entry-inner');

      // Wyodrębnienie treści artykułu
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

      // Wyodrębnienie daty artykułu
      const date = await articlePage.$eval('time', (element) => element.textContent);

      // Przygotowanie danych do zapisu w formacie JSON
      const dataToSave = {
        title: title,
        content: content,
        date: date,
      };

      // Generowanie nazwy pliku JSON
      const filename = `article_${scrapedArticles + 1}.json`;

      // Konwersja danych do formatu JSON
      const jsonData = JSON.stringify(dataToSave, null, 2);

      // Zapis danych do pliku
      fs.writeFileSync(filename, jsonData, 'utf-8');

      console.log(`Content, title, and date from article "${title}" saved to ${filename}`);

      // Zamknięcie strony artykułu
      await articlePage.close();
      scrapedArticles++;
    });

    // Oczekiwanie na zakończenie wszystkich obietnic (asynchronicznych operacji)
    await Promise.all(articlePromises);

    // Nawigacja do następnej strony
    const nextPage = await page.$('.next.page-numbers');
    if (!nextPage) {
      break; // Brak kolejnych stron do przeszukania
    }

    // Kliknięcie na przycisk "Następna strona"
    await nextPage.click();
    await page.waitForNavigation();
  }

  // Zamknięcie przeglądarki
  await browser.close();
})();
