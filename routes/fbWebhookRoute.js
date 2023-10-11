const express = require('express');
const router = express.Router();
require('dotenv').config();

// Handle POST requests
router.post('/', (req, res) => {
  try {
    const { entry } = req.body;
    if (entry && entry.length > 0 && entry[0].messaging && entry[0].messaging.length > 0) {
      const { sender: { id: fbid }, message } = entry[0].messaging[0];
      if (message && message.text) {
        // Respond with the specific message for all incoming messages
        const responseMessage = "Je suis actuellement en développement, mais je vous invite à utiliser notre service sur https://www.facebook.com/Ahibot101.";
        
        // Send the response message to the sender (you'll need to implement this)
        await sendMessage(fbid, responseMessage);

        // You can add more logic here if needed.

        res.sendStatus(200);
      }
    }
  } catch (error) {
    console.error('Error occurred:', error);
    res.sendStatus(500);
  }
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
