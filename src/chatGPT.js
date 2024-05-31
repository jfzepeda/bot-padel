const OpenAI = require('openai');
require('dotenv').config(); // Cargar las variables de entorno .env

const path = require("path")
const fs = require("fs");

const pathPrompt = path.join(__dirname, "../messages", "prompt.txt")
const prompt = fs.readFileSync(pathPrompt, "utf8")

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function ask(messaje) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: messaje },
    ],
    model: 'gpt-3.5-turbo-0125',
    max_tokens: 100,
    temperature: 1,
  });
  console.log('ChatGPT', completion.choices[0].message.content); // MFR
  return (completion.choices[0].message.content);
}

module.exports = { ask };