// helper/googleApi.js
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const NodeCache = require('node-cache');
const { chatCompletion } = require('./openaiApi');
const myCache = new NodeCache();
//AIzaSyCP9iulOmu8kPM2qY4iEsoKkmJ6QnQPamM
// Function to retrieve the API key from the cache or environment variables
const getApiKey = () => {
  const cachedApiKey = myCache.get('api_key');

  if (cachedApiKey) {
    return cachedApiKey;
  } else {
    const apiKey = process.env.API_KEY1; // Update to your environment variable
    myCache.set('api_key', apiKey);
    return apiKey;
  }
};

const genAI = new GoogleGenerativeAI(getApiKey());

const googlechat1 = async (prompt) => {
  try {
    const generationConfig = {
      maxOutputTokens: 1500,
      temperature: 0.9,
      topP: 0.1,
      topK: 1,
    };

    const model = genAI.getGenerativeModel({ model: "gemini-pro", generationConfig });

    const result = await model.generateContent(`answer directly :${prompt}`);
    const response = await result.response;
    
    const content = response.text();
    console.log('GOOGLE1');
    return { content };
  } catch (googleError) {
    console.error('Error occurred while using GoogleGenerativeAI:', googleError);

    try {
      // Use chatCompletion as a fallback
      const result = await chatCompletion(prompt);
      console.log("Using OpenAI's chatCompletion");

      const content = result.content;
      return { content };
    } catch (openaiError) {
      console.error('Error occurred during chatCompletion fallback:', openaiError);
      throw openaiError;
    }
  }
};

module.exports = {
  googlechat1,
};
