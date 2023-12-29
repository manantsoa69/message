
const express = require('express');
const router = express.Router();
require('dotenv').config();
const { sendMessage } = require('../helper/messengerApi');
const { chatCompletion } = require('../helper/openaiApi');
const { googlechat } = require('../helper/googleApi');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

// Function to save chat history to Redis with a limit of 2 entries
async function saveChatHistory(fbid, query, result) {
  try {
    const chatEntry = `Human:${query}\nAI:${result}`;

    // Set a limit to keep only the latest 2 entries
    await redis.multi()
      .rpush(`${fbid}`, chatEntry)
      .ltrim(`${fbid}`, -1, -1)
      .expire(`${fbid}`, 600) // Set a TTL of 600 seconds (10 minutes) for chat history
      .exec();
  } catch (error) {
    console.error('Error saving chat history to Redis:', error);
  }
}

// Function to retrieve chat history from Redis
async function getChatHistory(fbid) {
  try {
    const chatHistory = await redis.lrange(`${fbid}`, 0, -1);
    return chatHistory || [];
  } catch (error) {
    console.error('Error retrieving chat history from Redis:', error);
    return [];
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
        const { text: query } = message
       // console.log(`Received message from fbid: ${fbid}`);

        if (lastProcessedPrompts[fbid] === query) {
          console.log('Received the same question as the last processed prompt, ignoring new request.');
          return res.sendStatus(200);
        }

        lastProcessedPrompts[fbid] = query;

        const chatHistory = await getChatHistory(fbid);
        const chat = `${chatHistory.join('\n')}\nHuman:${query}\nAI:`;

        try {
          const result = await googlechat(chat, fbid);

          if (result && result.content) {
            const responseText = result.content;

            await Promise.all([
              saveChatHistory(fbid, query, responseText),
              sendMessage(fbid, responseText),
            ]);

          } else {
            console.error('Invalid OpenAI response format:', result);
          }

        } catch (error) {
          const result = await chatCompletion(chat, fbid);

          if (result && result.content) {
            const responseText = result.content;

            await Promise.all([
              saveChatHistory(fbid, query, responseText),
              sendMessage(fbid, responseText),
            ]);
          }
          console.error('Error processing chat with OpenAI:', error);
        }
      }
    }
  } catch (error) {
    if (fbid) {
      delete lastProcessedPrompts[fbid];
    }
    console.error('Error occurred:', error);
  }

  res.sendStatus(200);
});

module.exports = {
  router
};
