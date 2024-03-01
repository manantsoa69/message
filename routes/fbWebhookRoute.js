const express = require('express');
const router = express.Router();
require('dotenv').config();
const { sendMessage } = require('../helper/messengerApi');
const { googlechat } = require('../helper/googleApi');
const { googlechat1 } = require('../helper/googleApi1');
const { googlechat2 } = require('../helper/googleApi2');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URLCAT);
// Function to save chat history to Redis with a limit of 1 entry
async function saveChatHistory(fbid, query, result) {
  try {


    // Check if the message is an object with a 'content' property
    const chatEntry = `${query}/:/${result}`;

    // Set a limit to keep only the latest 1 entry
    await redis.multi()
      .rpush(`${fbid}`, chatEntry)
      .ltrim(`${fbid}`, -1, -1)
      .expire(`${fbid}`, 600) // Set a TTL of 600 seconds (10 minutes) for chat history
      .exec();
  } catch (error) {
    console.error('Error saving chat history to Redis:', error);
    throw error; // Rethrow the error to propagate it to the caller
  }
}

// Function to retrieve chat history from Redis
async function getChatHistory(fbid) {
  try {
    const chatHistory = await redis.lrange(`${fbid}`, 0, -1);
    return chatHistory.length > 0 ? chatHistory : [/:/];
  } catch (error) {
    console.error('Error retrieving chat history from Redis:', error);
    throw error; // Rethrow the error to propagate it to the caller
  }
}

const lastProcessedPrompts = {}; 
// Handle GET requests for verification
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});
// Handle POST requests for chat messages
router.post('/', async (req, res) => {
  try {
    const { entry } = req.body;

    if (entry && entry.length > 0 && entry[0].messaging && entry[0].messaging.length > 0) {
      const { sender: { id: fbid }, message } = entry[0].messaging[0];

      if (message && message.text) {
        const { text: query } = message;
        console.log(`${fbid}`);

        // Check if the user's question is the same as the last processed prompt
        if (lastProcessedPrompts[fbid] === query) {
          console.log('Received the same question as the last processed prompt, ignoring new request.');
          return res.sendStatus(200);
        }

        // Set the last processed prompt for the current user
        lastProcessedPrompts[fbid] = query;
        const chatHistory = await getChatHistory(fbid);
        const chathistory = `${chatHistory}`;

        try {
          let result;
          const random = Math.random();
          if (random < 0.33) {
            result = await googlechat(chathistory, query);
          } else if (random < 0.66) {
            result = await googlechat1(chathistory, query);
          } else {
            result = await googlechat2(chathistory, query);
          }

          if (typeof result === 'object' && result.content) {
            result = result.content;
          }

          await Promise.all([
            saveChatHistory(fbid, query, result),
            sendMessage(fbid, result),
          ]);
        } catch (error) {
          console.error('Error occurred:', error);
          throw error; // Rethrow the error to propagate it to the caller
        }
      }
    }
  } catch (error) {
    if (fbid) {
      delete lastProcessedPrompts[fbid]; // Remove the last processed prompt on error
    }
    console.error('Error occurred:', error);
  }

  res.sendStatus(200);
});



module.exports = {
  router,
};