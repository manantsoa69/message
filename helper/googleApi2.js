require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const NodeCache = require('node-cache');
const { chatCompletion } = require('./openaiApi');
const myCache = new NodeCache();

const getApiKey = () => {
  const cachedApiKey = myCache.get('api_key');

  if (cachedApiKey) {
    return cachedApiKey;
  } else {
    const apiKey = process.env.API_KEY2; // Update to your environment variable
    myCache.set('api_key', apiKey);
    return apiKey;
  }
};

const googlechat2 = async (chathistory, query) => {
  console.log('googlechat2')
  try {
    const genAI = new GoogleGenerativeAI(getApiKey());
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const [userPart, modelPart] = chathistory.split(/\/:\//);

    const chat = model.startChat({
      history: [
        { role: "user", parts: userPart },
        { role: "model", parts: modelPart }
      ],
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    const result = await chat.sendMessage(` ${query}`);
    const response = result.response;
    const content = response.text();

    if (!content) {
      console.warn('GoogleGenerativeAI returned an empty response.');
      return await handleFallback(chathistory, query);
    }

    return { content };

  } catch (googleError) {
    console.error('Error occurred while using GoogleGenerativeAI:');
    return await handleFallback(chathistory, query);
  }
};

const handleFallback = async (chathistory, query) => {
  try {
    const [userPart, modelPart] = chathistory.split(/\/:\//);
    const prompt = `user:${userPart}\nmodel:${modelPart}\nuser:${query}\nmodel:`;
    const result = await chatCompletion(prompt);
    console.log("Using OpenAI's chatCompletion");

    return { content: result.content };

  } catch (openaiError) {
    console.error('Error occurred during chatCompletion fallback:', openaiError);
    throw openaiError;
  }
};

module.exports = { googlechat2 };
