const { Hercai } = require("hercai");

async function askHercai(content) {
    const herc = new Hercai(); // Using default values for model and apiKey

    return herc.question({ model: "turbo-16k", content }).then(response => {
        return response.reply;
    });
}

module.exports = {askHercai};
