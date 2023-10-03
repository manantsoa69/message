const express = require('express');
const router = express.Router();
require('dotenv').config();
const axios = require('axios'); // Import axios
const { sendMessage } = require('../helper/messengerApi');
const { chatCompletion } = require('../helper/openaiApi');
const processingStatus = {};// Corrected variable name

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


        // Make the call to callChatCompletionService asynchronous
        try {
          const result = await callChatCompletionService(query, fbid);

          // Send the response back to the user
          await sendMessage(fbid, result.response);
          delete processingStatus[fbid];
        } catch (error) {
          await chatCompletion(query, fbid);

          delete processingStatus[fbid];
          console.log('chat');
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
