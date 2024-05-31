const { getNextPreKeys } = require('@whiskeysockets/baileys');

const dotenv = require('dotenv');
dotenv.config();

// Obtener la hora actual
function getTime() {
    const now = new Date();
    let hour = now.getHours();
    
    if (hour < 6) {
      hour += 18
    } else {
      hour -= 6
    }

    // Determinar si es día o tarde
    let saludo;
    if (hour < 12) {
        saludo = "buenos días";
    } else if (hour > 19) {
        saludo = "buenas noches";
    } else {
        saludo = "buenas tardes";
    }
    // Incluir en un string
    return saludo
}

// OBTENER EL NOMBRE
function getName(cadena) {
  // Elimina los espacios en blanco al principio y al final de la cadena
  cadena = cadena.trim();
  
  // Divide la cadena en un array de palabras
  const palabras = cadena.split(/\s+/);
  
  // Retorna la última palabra
  let name = palabras.pop();
  return name
}

// OBTENER EL GENERO
async function getGender(phrase) {
  nombre = getName(phrase)
  const apiKey = process.env.GENDER_API_KEY;
  const url = `https://api.genderapi.io/api/?name=${nombre}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Error al conectar con la API');
    }
    const data = await response.json();
    let saludo;
    if (data.gender === 'male') {
      saludo = 'Sr. ' + nombre;
    } else if (data.gender === 'female') {
      saludo = 'Srita. ' + nombre;
    } else {
      console.log('No se pudo determinar el genero');
      saludo = ''; // 
    }
    return saludo
  } catch (error) {
    return '';
  }
}
getGender('Hola mi nombre es Maria')

module.exports = { getTime, getGender };