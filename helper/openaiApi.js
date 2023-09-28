const { Hercai } = require('hercai');
const client = new Hercai();
const { sendMessage } = require('./messengerApi');
const chatCompletion = async (prompt, fbid) => {
  try {
    
    const response = await client.question({ model: "v2", content: `You repley in 3 sentence${prompt}` });

    let content = response.reply;


    // Send the modified response data
    await sendMessage(fbid, content);

    return {};
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
