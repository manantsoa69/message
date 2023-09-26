const express = require('express');
const router = express.Router();
require('dotenv').config();
const axios = require('axios'); // Import axios

const { sendMessage } = require('../helper/messengerApi');

async function callChatCompletionService(prompt, fbid) {
  try {
    const complexionServiceUrl = 'https://response-qqh1.onrender.com/generate-response';

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
    console.error('Error calling chat completion service:', error);
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

        // Make the call to callChatCompletionService asynchronous
        try {
          const result = await callChatCompletionService(query, fbid);
          await sendMessage(fbid, result.response);
          res.status(200).send('OK');
        } catch (error) {
          console.error(error);
          res.status(500).send('Internal Server Error');
        }
      } else {
        res.status(200).send('OK');
      }
    } else {
      res.status(200).send('OK');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = {
  router
};
