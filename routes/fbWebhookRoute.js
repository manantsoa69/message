const express = require('express');
const router = express.Router();
require('dotenv').config();
const axios = require('axios'); // Import axios
const { sendMessage } = require('../helper/messengerApi');
const { chatCompletion } = require('../helper/openaiApi');
const processingStatus = {};// Corrected variable name
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Function to save chat history to Redis with a limit of 2 entries
async function saveChatHistory(fbid, humanInput, aiQueryResult) {
  try {
    const chatEntry = `Human: ${humanInput}\n AI: ${aiQueryResult}`;
    
    // Set a limit to keep only the latest 2 entries
    await redis.multi()
      .rpush(`${fbid}`, chatEntry) // Append the new chat entry
      .ltrim(`${fbid}`, -2, -1)   // Trim the list to keep only the last 2 entries
      .expire(`${fbid}`, 600)      // Set a TTL of 600 seconds (10 minutes)
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
    const complexionServiceUrl = 'https://python.ntrsoa.repl.co/generate-response';

    const response = await axios.post(
      complexionServiceUrl,
      { prompt, fbid },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data; // Assuming the service responds with JSON data
  } catch (error) {
    console.error('Error calling chat completion service:');
    throw error;
  }
}

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

        // Retrieve the chat history for the current user
        const chatHistory = await getChatHistory(fbid);
        console.log(chatHistory)
        const chat = `last converstion ${chatHistory} + human new qestion :${query}`;

        try {
//const chat = `${chatHistory} + human :${query}`;
          const result = await callChatCompletionService(chat, fbid);

          // Concurrently save the AI response to chat history and send the response back to the user
          await Promise.all([
            saveChatHistory(fbid, query, result.response),
            sendMessage(fbid, result.response),
          ]);

          delete processingStatus[fbid];
        } catch (error) {
          const rep = await chatCompletion(chat, fbid);
          console.log("ok")
          await Promise.all([
            saveChatHistory(fbid, query, rep),
            sendMessage(fbid, rep),
          ]);
          delete processingStatus[fbid];
        }
      }
    }
  } catch (error) {
    console.error('Error occurred:', error);
  }

  res.sendStatus(200);
});

module.exports = {
  router
};
