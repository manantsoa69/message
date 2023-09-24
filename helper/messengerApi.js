// helper/messengerApi.js
const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

// Create a new instance of NodeCache
const tokenCache = new NodeCache();

// Function to get the cached token
const getCachedToken = () => {
  const cachedToken = tokenCache.get('TOKEN');
  if (cachedToken) {
    return cachedToken;
  }
  // If not cached, retrieve from process.env and cache it
  const TOKEN = process.env.TOKEN;
  tokenCache.set('TOKEN', TOKEN);
  return TOKEN;
};

// Function to get the cached page ID
const getCachedPageID = () => {
  const cachedPageID = tokenCache.get('PAGE_ID');
  if (cachedPageID) {
    return cachedPageID;
  }
  // If not cached, retrieve from process.env and cache it
  const PAGE_ID = process.env.PAGE_ID;
  tokenCache.set('PAGE_ID', PAGE_ID);
  return PAGE_ID;
};

// Create a single HTTP client instance and reuse it
const apiClient = axios.create({
  baseURL: 'https://graph.facebook.com/v11.0/',
});

// Set the access token in the client instance's defaults by calling getCachedToken()
apiClient.defaults.params = {
  access_token: getCachedToken(),
};

const sendMessage = async (fbid, message) => {
  try {
    // Determine the maximum message length (you can adjust this as needed)
    const maxMessageLength = 2000; // Example: Split messages if longer than 300 characters

    if (message.length <= maxMessageLength) {
      // Message is within the length limit, send it as is
      await sendSingleMessage(fbid, message);
    } else {
      // Message is too long, split it into two parts and send separately
      const part1 = message.substring(0, maxMessageLength);
      const part2 = message.substring(maxMessageLength);

      await sendSingleMessage(fbid, part1);
      await sendSingleMessage(fbid, part2);
    }
    return 1;
  } catch (error) {
    console.error('Error occurred while sending message:', error);
    return 0;
  }
};

const sendSingleMessage = async (fbid, message) => {
  return apiClient.post(`${getCachedPageID()}/messages`, {
    recipient: { id: fbid },
    messaging_type: 'RESPONSE',
    message: { text: message },
  });
};

module.exports = {
  sendMessage,
};

