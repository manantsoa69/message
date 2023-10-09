// helper/openaiApi.js
const { Hercai } = require('hercai');
const client = new Hercai();
const { sendMessage } = require('./messengerApi');
const chatCompletion = async (prompt, fbid) => {
  try {
    
    const response = await client.question({ model: "v2", content: `You repley in 3 sentence${prompt}` });

    let content = response.reply;
  //  await sendMessage(fbid, content);

    return content; // Return the content directly
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
