// helper/googleApi.js
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const NodeCache = require('node-cache');

const myCache = new NodeCache();

// Function to retrieve the API key from the cache or environment variables
const getApiKey = () => {
  // Try to retrieve the API key from the cache
  const cachedApiKey = myCache.get('api_key');

  if (cachedApiKey) {
    return cachedApiKey;
  } else {
    const apiKey = process.env.API_KEY; // Update to your environment variable
    myCache.set('api_key', apiKey);
    return apiKey;
  }
};

const genAI = new GoogleGenerativeAI(getApiKey());

const googlechat = async (prompt) => {
  try {
    // Define generation configuration
    const generationConfig = {
      //stopSequences: ["red"],
      maxOutputTokens: 200,
      temperature: 0.9,
      topP: 0.1,
      topK: 16,
    };

    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-pro", generationConfig });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    // Uncomment the following lines if you want to send the generated content
    // to the messenger API
    // await sendMessage(fbid, content);
    // console.log('Google Generative AI');
    // console.log('result:', content);

    return { content };
  } catch (error) {
    console.error('Error occurred while generating chat completion:', error);
    return {
      status: 0,
      response: '',
    };
  }
};

module.exports = {
  googlechat,
};
