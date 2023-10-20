const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');
const { OpenAI } = require('openai');
const fs = require('fs');

// Function to split text into chunks
function splitTextIntoChunks(text, chunkSize) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Adjust the path to your Chrome executable
  });

  // Define MongoDB and OpenAI settings
  const mongoURI = 'mongodb://127.0.0.1:27017'; // Update with your MongoDB URI
  const dbName = 'school';
  const originalsCollectionName = 'Originals';
  const translatedCollectionName = 'Translated';
  const openAIKey = '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';

  const openai = new OpenAI({ apiKey: openAIKey });

  const articleUrls = [
    'https://www.timedoctor.com/blog/how-to-start-a-call-center/',
  ];

  // Create a MongoDB client
  const mongoClient = new MongoClient(mongoURI);

  try {
    await mongoClient.connect();
    console.log('Connected to MongoDB');

    const db = mongoClient.db(dbName);
    const originalsCollection = db.collection(originalsCollectionName);
    const translatedCollection = db.collection(translatedCollectionName);

    for (let i = 0; i < articleUrls.length; i++) {
      const articlePage = await browser.newPage();
      const articleUrl = articleUrls[i];

      await articlePage.goto(articleUrl);

      // Wait for the target element to be available
      await articlePage.waitForSelector('#penci-post-entry-inner');

      // Extract the content
      const content = await articlePage.$$eval('#penci-post-entry-inner p, #penci-post-entry-inner h3', (elements) => {
        let paragraphs = [];
        let currentParagraph = '';

        for (const element of elements) {
          if (element.tagName === 'P') {
            currentParagraph += element.textContent + ' ';
          } else if (element.tagName === 'H3') {
            if (currentParagraph) {
              paragraphs.push(currentParagraph.trim());
              currentParagraph = '';
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

      // Save the original article content to MongoDB
      const originalArticle = {
        title,
        content,
        date,
      };
      const insertedOriginal = await originalsCollection.insertOne(originalArticle);
      console.log(`Original article saved to MongoDB with _id: ${insertedOriginal.insertedId}`);

      // Split the content into smaller chunks (adjust chunk size as needed)
      const contentChunks = splitTextIntoChunks(content.join(' '), 3000);

      let translatedText = '';

      // Translate each chunk
      for (const chunk of contentChunks) {
        // Generate a prompt for the translation
        const prompt = `Translate the following text to Polish as well as possible. You're a polish native speaker: ${chunk}`;

        // Generate the translation using GPT-3
        const response = await openai.completions.create({
          model: 'text-davinci-003',
          prompt,
          max_tokens: 3000, // Adjust the desired length of the translation
        });

        // Get the translated text from the response
        const translation = response.choices[0]?.text || ''; // Ensure it doesn't crash if the translation is undefined
        translatedText += translation;
      }

      // Save the translated text in a new document in the 'Translated' collection
      const translationDocument = {
        title,
        story: translatedText,
        generatedAt: new Date(),
      };

      const insertedTranslation = await translatedCollection.insertOne(translationDocument);
      console.log(`Translation saved to MongoDB with _id: ${insertedTranslation.insertedId}`);

      // Add a delay between requests (e.g., 5 seconds)
      await articlePage.waitForTimeout(5000);
      await articlePage.close();
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    // Close the MongoDB connection and browser
    await mongoClient.close();
    console.log('Closed MongoDB connection');
    await browser.close();
  }
})();




/*
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Adjust the path to your Chrome executable
  });
  

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
*/