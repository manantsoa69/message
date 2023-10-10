const express = require('express');
const router = express.Router();
require('dotenv').config();
const axios = require('axios');
const { sendMessage } = require('../helper/messengerApi');
const { chatCompletion } = require('../helper/openaiApi');
const processingStatus = {}; // Corrected variable name
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);
const emojiRegex = /[\uD800-\uDFFF]./g;
// Function to save chat history to Redis with a limit of 2 entries
async function saveChatHistory(fbid, humanInput, aiQueryResult) {
  try {
    const chatEntry = `Human: ${humanInput}\n AI: ${aiQueryResult}`;

    // Set a limit to keep only the latest 2 entries
    await redis.multi()
      .rpush(`${fbid}`, chatEntry) // Append the new chat entry
      .ltrim(`${fbid}`, -2, -1)   // Trim the list to keep only the last 2 entries
      .expire(`${fbid}`, 600)      // Set a TTL of 600 seconds (10 minutes) for chat history
      .exec();
  } catch (error) {
    console.error('Error saving chat history to Redis:', error);
  }
}

// Function to retrieve chat history from Redis
async function getChatHistory(fbid) {
  try {
    // Retrieve the entire chat history for the user
    const chatHistory = await redis.lrange(`${fbid}`, 0, -1);
    return chatHistory || [];
  } catch (error) {
    console.error('Error retrieving chat history from Redis:', error);
    return [];
  }
}

async function callChatCompletionService(prompt, fbid) {
  try {
    const complexionServiceUrl = 'https://repc.onrender.com/generate-response';

    const response = await axios.post(
      complexionServiceUrl,
      { prompt, fbid },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const responseData = response.data;

    // Check if the response contains an emoji
    const hasEmoji = emojiRegex.test(responseData.response);

    return { ...responseData, hasEmoji };
  } catch (error) {
    console.error('Error calling chat completion service:', error);
    throw error;
  }
}

// Handle POST requests
router.post('/', async (req, res) => {
  try {
    const { entry } = req.body;
    if (entry && entry.length > 0 && entry[0].messaging && entry[0].messaging.length > 0) {
      const { sender: { id: fbid }, message } = entry[0].messaging[0];
      if (message && message.text) {
        let { text: query } = message;
        console.log(`${fbid}`);
        // If fbid is processing, ignore the new request
        if (processingStatus[fbid]) {
          console.log('Already processing, ignoring new request.');
          return res.sendStatus(200);
        }

        // Set processing status to true for the current fbid
        processingStatus[fbid] = true;

        // Set a TTL of 20 seconds for processing status
        setTimeout(() => {
          delete processingStatus[fbid];
        }, 40000); // 20 seconds in milliseconds

        // Retrieve the chat history for the current user
        const chatHistory = await getChatHistory(fbid);
        console.log(chatHistory);
        const chat = `${chatHistory}\nhuman:${query}\nAI:`;

        try {
          const result = await callChatCompletionService(chat, fbid);

          // Check if the response contains an emoji
          if (result.hasEmoji) {
            await Promise.all([
              saveChatHistory(fbid, query, result.response),
              sendMessage(fbid, result.response),
            ]);            
            // Handle the emoji case here
            delete processingStatus[fbid];
            console.log('Response contains an emoji', result.response)
          } else {
            const updateProviderUrl = 'https://repc.onrender.com/update_provider';

            await axios.get(updateProviderUrl);
            // The response does not contain an emoji, call the chatCompletion service
            const rep = await chatCompletion(chat, fbid);
            console.log("ok");
            await Promise.all([
              saveChatHistory(fbid, query, rep),
              sendMessage(fbid, rep),
            ]);
          }

          delete processingStatus[fbid];
        } catch (error) {
          console.error('Error occurred:', error);
          delete processingStatus[fbid];
        }
      }
    }
  } catch (error) {
    console.error('Error occurred:', error);
    delete processingStatus[fbid];
  }

  res.sendStatus(200);
});
// Handle GET requests for verification
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

module.exports = {
  router
};
