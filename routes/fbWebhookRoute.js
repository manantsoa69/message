const express = require('express');
const router = express.Router();
require('dotenv').config();
const axios = require('axios');
const { sendMessage } = require('../helper/messengerApi');
const { chatCompletion } = require('../helper/openaiApi');
const { saveChatHistory, getChatHistory, callChatCompletionService } = require('../helper/chatHistory');
const lastProcessedPrompts = {}; // Keeps track of the last processed prompts for each user (fbid)

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

        // Retrieve the chat history for the current user
        const chatHistory = await getChatHistory(fbid);
        const chat = `${chatHistory}\nhuman:${query}\n AI:`;

        try {
          const result = await callChatCompletionService(chat, fbid);

          // Concurrently save the AI response to chat history and send the response back to the user
          await Promise.all([
            saveChatHistory(fbid, query, result.response),
            sendMessage(fbid, result.response),
          ]);
        } catch (error) {
          const rep = await chatCompletion(chat, fbid);
          console.log("ok");
          await Promise.all([
            saveChatHistory(fbid, query, rep),
            sendMessage(fbid, rep),
          ]);
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
  router
};
