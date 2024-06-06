const { google } = require('googleapis');
const { oauth2Client, setCredentials } = require('./auth');
const { asignarISOdate, reverseISO } = require('./validacion');
require('dotenv').config();

setCredentials();

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

const calendarID = {
  1: '1c79ed2d161cc5cb5fa7ddbeba52b6009510f1ae5fc5a7702fdee77f546f576d@group.calendar.google.com',
  2: 'dc798bfd52b5fe77df8583eb97af1db8c9e3d8aa6b32eb947f6c7a34ca7bbb53@group.calendar.google.com',
  3: '1cb3d89e037e73ff544582365e1e5c4982df002e40d9a7e62442e8b0bc3c02fd@group.calendar.google.com',
  4: 'cc99b34850776364f88c465d53a3e9971b6e5add23367b039f9eeae6e40bf004@group.calendar.google.com'
}

// CREAR EVENTO
async function createEventGoo(sum, startDateTime, court) {
  // const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const endDateTime = new Date(new Date(startDateTime).getTime() + 60 * 60000).toISOString();

  const event = {
    summary: sum,
    start: {
      dateTime: startDateTime,
      timeZone: 'America/Los_Angeles',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'America/Los_Angeles',
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: court,
      resource: event,
    });
    console.log('Event created');
  } catch (error) {
    console.error('Error creating event:', error);
  }
}

// ELIMINAR EVENTO
async function deleteEventGoo(startDateTime, court) {
  try {
    const response = await calendar.events.list({
      calendarId: court,
      timeMin: startDateTime,
      timeMax: new Date(new Date(startDateTime).getTime() + 60 * 60000).toISOString(),
    });

    const eventos = response.data.items;
    if (eventos.length) {
      const eventId = eventos[0].id;
      calendar.events.delete({
        calendarId: court,
        eventId,
      });
      console.log('Evento eliminado');
    } else {
      console.log('No se encontraron eventos para eliminar.');
    }
  } catch (error) {
    console.error('Error al eliminar el evento:', error);
  }
}

// DEVUELVE HORARIOS LIBRES
async function checkHours(day, court) {
  const timeMin = `${day}T00:00:00-06:00`;
  const timeMax = `${day}T23:59:59-06:00`;

  try {
    const response = await calendar.events.list({
      calendarId: court,
      timeMin,
      timeMax,
    });

    const eventos = response.data.items;
    const horariosOcupados = eventos.map((evento) => {
      const inicio = evento.start.dateTime || evento.start.date;
      return new Date(inicio).getHours();
    });

    const horariosDisponibles = Array.from({ length: 16 }, (_, i) => i + 6).filter((hora) => !horariosOcupados.includes(hora)).join(', ');    
    return horariosDisponibles;

  } catch (error) {
    console.error('Error al obtener los horarios disponibles:', error);
  }
}

// VERIFICAR SI UNA CANCHA ESTÁ DISPONIBLE
async function checkCourt(startDateTime, court) {

  try {
    const response = await calendar.events.list({
      calendarId: court,
      timeMin: startDateTime,
      timeMax: new Date(new Date(startDateTime).getTime() + 60 * 60000).toISOString(),
    });
    const eventos = response.data.items;
    return eventos.length === 0;

  } catch (error) {
    console.error('Error al verificar la disponibilidad:', error);
  }
}

// FUNCIONES OPERATIVAS /////////////
// FUNCIONES OPERATIVAS /////////////
// FUNCIONES OPERATIVAS /////////////
function createEvent(nombre_cliente, fechaObj, hora, cancha, id) {
  const fechaStr = fechaObj.toString();
  const dateTimeISO = `${fechaStr}T${hora}:00-06:00`;
  const sum = `${nombre_cliente} - ID: ${id}`;
  createEventGoo(sum, dateTimeISO, calendarID[cancha]);
}

function deleteEvent(fechaObj, hora, cancha) {
  const dia = reverseISO(fechaObj);
  const fechaStr = asignarISOdate(dia);
  const dateTimeISO = `${fechaStr}T${hora}:00-06:00`;
  deleteEventGoo(dateTimeISO, calendarID[cancha])
}

async function createRandomEvents(fechaStr) {
  for (let i = 1; i < 5; i++) {
    let hour1 = (i) * 3 + 5
    let hour2 = (5-i) * 3 + 5
    
    function adh(hora) {
      const horaStr = hora.toString().length === 1 ? `0${hora}:00` : `${hora}:00`;
      createEvent(`Evento ${i}`, fechaStr, horaStr, i);
    }
  
    for (let j = 0; j < 2; j++) {
      adh(hour1-j*2);
      adh(hour2-j*2);
    }
  }
}
// createRandomEvents('2024-06-07');

async function deleteAllEvents(fechaStr) {
  for (let c = 1; c < 5; c++) {
    for (let i = 7; i < 23; i++) {
      let hora = i
      const horaStr = hora.toString().length === 1 ? `0${hora}:00` : `${hora}:00`;
      deleteEvent(fechaStr, horaStr, c);
      
    } 
  } 
}
// deleteAllEvents('2024-06-07')

async function getAvailableHours(fechaStr) {
  let horariosDisponibles = [];
  
  for (let i = 1; i < 5; i++) {
    const horarios = await checkHours(fechaStr, calendarID[i]);
    // agrega los items que no estén en horariosDisponibles 
    horariosDisponibles = horariosDisponibles.concat(horarios.split(',').filter((hora) => !horariosDisponibles.includes(hora))); }

  horariosDisponibles.sort((a, b) => a - b); horariosDisponibles.shift(); let mensaje;

  if (horariosDisponibles.length === 15) {
    mensaje = 'Tenemos todos los horarios disponibles de 7 a 21 horas';
  } else if (horariosDisponibles.length === 0) {
    mensaje = 'Lo sentimos tenemos todos los horarios ocupados para este día';
  } else {
    mensaje = `Tenemos los siguientes horarios disponible: \n\n${horariosDisponibles}`;
  } 

  return mensaje;
}
// getAvailableHours('2024-06-06');

async function getAvailableCourt(fecha, hora) {
  const dateTimeISO = `${fecha}T${hora}:00-06:00`;
  let freeCourts = [];
  let message = '';
  
  for (let i = 1; i < 5; i++) {
    const isFree = await checkCourt(dateTimeISO, calendarID[i])
    if (isFree) {
      freeCourts.push(` ${i}`);  
    }
  }
  
  if (freeCourts.length === 1) {
    message = [`Tenemos libre la cancha${freeCourts[0]}`, 'Está bien esa?'];
  } else {
    freeCourts[freeCourts.length - 2] += ' y' + freeCourts[freeCourts.length - 1];
    freeCourts.pop();
    message = [`Tenemos libres las canchas${freeCourts}`, 'Cuál prefiere?'];
  }

  return message;
}
// getAvailableCourt('2024-06-06', '17:00');

module.exports = { createEvent, deleteEvent, getAvailableHours, getAvailableCourt };

