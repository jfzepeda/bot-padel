const OpenAI = require('openai');
const { ejecutarConsultaGPT } = require('./migration');
require('dotenv').config(); // Cargar las variables de entorno .env

const path = require("path")
const fs = require("fs");

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
  const prompt = fs.readFileSync(pathPrompt, "utf8")
  
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// async function ask(messaje) {
async function ask(messaje, aciton) {
  const prompt = await getDirectory(aciton)

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