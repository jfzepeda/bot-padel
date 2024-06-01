const OpenAI = require('openai');
require('dotenv').config(); // Cargar las variables de entorno .env

const path = require("path")
const fs = require("fs");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Crear una funcion para asignar directorios de mensajes
async function getDirectory(aciton) {
  // crea un diccionario de mensajes
  const diccMensajes = {
    "confirmar": "confirmar.txt",
    "info": "info.txt",
    "nav": "nav.txt",
    "prompt": "prompt.txt",
    "querys": "querys.txt",
    "reserva": "reserva.txt",
  }
  const pathPrompt = path.join(__dirname, "../prompts", diccMensajes[aciton])
  let file = fs.readFileSync(pathPrompt, "utf8")
  return file
  
}

ask('Caunto mide la torre Eiffel?', 'prompt')

// async function ask(messaje) {
async function ask(messaje, file) {
  const prompt = await getDirectory(file)

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: messaje },
    ],
    model: 'gpt-3.5-turbo-0125',
    max_tokens: 100,
    temperature: 1,
  });
  let res = (completion.choices[0].message.content);
  return (res);
}

module.exports = { ask };
