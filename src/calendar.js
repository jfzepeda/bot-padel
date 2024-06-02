const { google } = require('googleapis');
const { oauth2Client, setCredentials } = require('./auth');
const { asignarISOdate, reverseISO } = require('./validacion');
require('dotenv').config();

setCredentials();

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

async function getEvents() {
  try {
    const response = await calendar.events.list({
      calendarId: 'primary', // ID del calendario del que deseas obtener los eventos
      timeMin: new Date().toISOString(), // Fecha y hora mínima para incluir eventos (puedes ajustar esto según tus necesidades)
      maxResults: 10, // Número máximo de eventos que deseas obtener
      singleEvents: true,
      orderBy: 'startTime',
    });

    const eventos = response.data.items;
    if (eventos.length) {
      console.log('Próximos 10 eventos:');
      eventos.forEach((evento, i) => {
        const inicio = evento.start.dateTime || evento.start.date;
        console.log(`${inicio} - ${evento.summary}`);
      });
    } else {
      console.log('No se encontraron eventos.');
    }
  } catch (error) {
    console.error('Error al obtener los eventos:', error);
  }
}

async function createEventCal(sum, startDateTime, court) {
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
    console.log('Event created: %s', response.data.htmlLink);
  } catch (error) {
    console.error('Error creating event:', error);
  }
}

// Función para eliminar un evento a partir de la fecha y hora de inicio
async function deleteEventCal(startDateTime, court) {
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

const calendario = {
  1: '1c79ed2d161cc5cb5fa7ddbeba52b6009510f1ae5fc5a7702fdee77f546f576d@group.calendar.google.com',
  2: 'dc798bfd52b5fe77df8583eb97af1db8c9e3d8aa6b32eb947f6c7a34ca7bbb53@group.calendar.google.com',
  3: '1cb3d89e037e73ff544582365e1e5c4982df002e40d9a7e62442e8b0bc3c02fd@group.calendar.google.com',
  4: 'cc99b34850776364f88c465d53a3e9971b6e5add23367b039f9eeae6e40bf004@group.calendar.google.com'
}


function createEvent(nombre_cliente, fechaObj, hora, cancha, id) {
  let fechaStr = fechaObj.toString();
  const fechaISO = `${fechaStr}T${hora}:00-06:00`;
  const sum = `${nombre_cliente} - ID: ${id}`;
  createEventCal(sum, fechaISO, calendario[cancha]);
}

function deleteEvent(fechaObj, hora, cancha) {
  const dia = reverseISO(fechaObj);
  const fechaStr = asignarISOdate(dia);
  const dateTimeISO = `${fechaStr}T${hora}:00-06:00`;
  deleteEventCal(dateTimeISO, calendario[cancha])
}


module.exports = { createEvent, deleteEvent, calendario };

