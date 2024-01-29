// helper/openaiApi.js
require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');
const NodeCache = require('node-cache'); 
const { sendMessage } = require('./messengerApi');
const myCache = new NodeCache(); 

// Function to retrieve the API key from the cache or environment variables
const getApiKey = () => {
  // Try to retrieve the API key from the cache
  const cachedApiKey = myCache.get('api_key');

  if (cachedApiKey) {
    return cachedApiKey;
  } else {
    const apiKey = process.env.OPENAI_API_KEY;
    myCache.set('api_key', apiKey);
    return apiKey;
  }
};

const configuration = new Configuration({
  apiKey: getApiKey(),
});

const openai = new OpenAIApi(configuration);

const chatCompletion = async (prompt, fbid) => {
  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo-0301',
      messages: [
        { role: 'system', content: `answer directly with short  exemple  ` },
        { role: 'user', content: ` ${prompt}` },
      ],
      max_tokens: 200,
      temperature: 0.5,
      top_p: 0.5,
      frequency_penalty: 1.1,
      presence_penalty: 0.,
      stop: ["\n "]
    });

    let content = response.data.choices[0].message.content;
   // await sendMessage(fbid, content)
    //console.log('openAI');
    //console.log('resulte:' + content);
    //const res = result.content;
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
  chatCompletion,
};
//aq
//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
