const sqlite3 = require('sqlite3').verbose();
const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');
require("dotenv").config

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
// const MongoAdapter = require('@bot-whatsapp/database/mongo')
const moment = require('moment'); 
const { delay } = require('@whiskeysockets/baileys');
const { asignarHora, asignarFecha, asignarCancha } = require('./validacion');

const path = require("path")
const fs = require("fs")
// const chat = require("./chatGPT")
// const { handlerAI } = require("./whisper")

const pathMenu = path.join(__dirname, "mensajes", "menu.txt")
const menu = fs.readFileSync(pathMenu, "utf8")

const pathServ = path.join(__dirname, "mensajes", "servicios.txt")
const serv = fs.readFileSync(pathServ, "utf8")


// Función para conectar a la base de datos SQLite
const db = new sqlite3.Database('botpadel.db');
let rReservar = null;
let rConsultar = null;
let rConfirmar = null;
let rCancelar = null;
// let rDev = null;

let saveName = null;
let sucBooked = true;
let vDisponible = false;
let nCoincide = false;

let name = null;
let court = null;
let date = null;
let hour = null;


// Función para verificar la disponibilidad de la cancha
function verificarDisponibilidad(cancha, dia, hora, callback) {
    callback('Funcion verificar disponibilidad')
    if (!moment(dia, 'YYYY-MM-DD', true).isValid() || !moment(hora, 'HH:mm', true).isValid()) {
        callback(new Error('LOG Formato de fecha u hora no válido.')); 
        rReservar = 'Formato no valido'; vDisponible = false;
    }
    db.all('SELECT * FROM reservas WHERE cancha = ? AND dia = ? AND hora = ?', [cancha, dia, hora], (err, rows) => {
        if (err) {
            callback(err); // vDisponible = false;;
        }
        if (rows.length === 0) { 
            // callback('LOG Cancha disponible')
            vDisponible = true;
        } else {
            // callback('LOG Cancha no disponible')
            rReservar = "Cancha no disponible, seleccione otro horario";
            vDisponible = false; 
        }
    });
}

// Método para interactuar en sql
function devDB(mensaje) {
    console.log(mensaje)
    db.all(mensaje, [], (err, rows) => {
        if (err) {
            console.error("Error en la consulta:", err);
        } else {
            let results = "";
            rows.forEach((row) => {
                results += `${row}`
            });
            rDev = results;
        }
    });
}



// Clase para manejar las reservas
class ReservaCanchaPadel {
    constructor(nombre_cliente, cancha, dia, hora, num) {
        this.nombre_cliente = nombre_cliente;
        this.cancha = cancha;
        this.dia = dia;
        this.hora = hora;
        this.confirmada = false;
        this.num = num;
    }

    // Método para guardar la reserva en la base de datos
    guardarEnDB(callback) {
        callback('Funcion guardar en DB')
        db.run('INSERT INTO reservas (nombre_cliente, cancha, dia, hora, confirmada, numero_telefonico) VALUES (?, ?, ?, ?, ?, ?)',
            [this.nombre_cliente, this.cancha, this.dia, this.hora, this.confirmada ? 1 : 0, this.num],
            (err) => {
                if (err) {
                    rReservar = "Error al guardar su reserva";
                    return callback('Error al guardar la reserva: ' + err.message);
                }
                // callback('Reserva guardada en la base de datos.');
                rReservar = "Reserva creada con exito!";
            });
    }

    // Métodos estáticos para confirmar, cancelar y consultar reservas
    static confirmarReserva(nombre_cliente, id_reserva, callback) {
        callback('Funcion confirmar reservas')
        ReservaCanchaPadel.consultarReservas('id', id_reserva, callback);
        setTimeout(function() {
            if (nCoincide) {
                // callback('La reserva ha sido confirmada exitosamente.\n');
                rConfirmar = ('Reserva ' + id_reserva + ' confirmada ✅');
            } else {
                // callback('Su nombre no coincide con el ID.\n');
                rConfirmar = ('Su nombre no coincide con el ID.');
            }
        }, 300)    
        db.run('UPDATE reservas SET confirmada = 1 WHERE nombre_cliente = ? AND id = ?', [nombre_cliente, id_reserva], (err) => {
            if (err) {
                return callback('Error al confirmar la reserva: ' + err.message);
            }
        });
    }

    static cancelarReserva(nombre_cliente, id_reserva, callback) {
        callback('Funcion cancelar reservas')
        ReservaCanchaPadel.consultarReservas('id', id_reserva, callback);
        setTimeout(function() {
            if (nCoincide) {
                // callback('La reserva ha sido cancelada exitosamente.\n');
                rCancelar = ('Reserva ' + id_reserva + ' cancelada con exito\n\nRecuerda que siempre puedes volver a reservar desde el MENÚ')
            } else {
                // callback('Su nombre no coincide con el ID.\n');
                rCancelar = ('Su nombre no coincide con el ID.');
            }
        }, 300)
        db.run('DELETE FROM reservas WHERE nombre_cliente = ? AND id = ?', [nombre_cliente, id_reserva], (err) => {
            if (err) {
                return callback('Error al cancelar la reserva: ' + err.message);
            }
        });
    }

    static consultarReservas(columna, arg, callback) {
        callback('Funcion consultar reservas')
        db.all(`SELECT * FROM reservas WHERE ${columna} = ?`, [arg], (err, rows) => {
            if (err) {
                return callback('Error al consultar reservas: ' + err.message);
            }
            if (rows.length > 0) {
                let response = `Reservas para ${rows[0].nombre_cliente}:\n`;
                rows.forEach((row) => {
                    response += `${row.id}. Cancha: ${row.cancha}, Día: ${row.dia}, Hora: ${row.hora}, Confirmada: ${row.confirmada ? 'Sí' : 'No'}\n`;
                });
                // callback(response);
                rConsultar = response.trim();

                if (!isNaN(arg)){
                    if (saveName == rows[0].nombre_cliente) { // PROBLEMA ////////////////////////////
                        nCoincide = true;
                    } else { 
                        nCoincide = false; 
                    }
                    // callback(saveName);
                }

            } else {
                // callback('No hay reservas para ' + arg);
                rConsultar = "No hay reservas para este cliente volviendo al *menu*...";
            }
        });
    }
    
}

// Función para manejar la reserva de una cancha
function reservarCancha(nombre_cliente, cancha, dia, hora, num) {
    verificarDisponibilidad(cancha, dia, hora, console.log);

    setTimeout(function() {
        if (vDisponible) {
            const reserva = new ReservaCanchaPadel(nombre_cliente, cancha, dia, hora, num);
            reserva.guardarEnDB(console.log);
            sucBooked = true;
        } else {
            console.log('LOG No se reservó la cancha.');
            sucBooked = false; 
        }
    }, 300);
}

const flowDev = addKeyword('devflowjf').addAnswer('Terminal...',
    {capture: true},
    async (ctx, {gotoFlow}) => {
        console.log('Estas en el flow DEV')
        const res = ctx.body;
        if (res !== 'Killer10') {
        // if (res == 'Salir') {
            return gotoFlow(flowWelcome);
        }
        console.log('Contraseña aceptada')
})
.addAction({capture: true}, 
    async (ctx ) => {
    const mst = ctx.body;
    console.log('Mensaje enviado a la Terminal')
    devDB(mst);
});

// Configuración y creación del bot   // Definir los flujos para las acciones
// const flowReserar = addKeyword(['reservar', 'rr'])
//     .addAnswer('Por favor, introduce tu nombre, cancha, día y hora para la reserva. Ejemplo: Juan, 1, 2024-05-15, 18:00', 
//     { capture: true },
//     async (ctx, {gotoFlow, fallBack}) => {

//         const num = ctx.from;
//         // Suponemos que el usuario responde en un solo mensaje con todos los datos separados por comas
//         const details = ctx.body.split(',').map(item => item.trim());
//         if (details.length === 4) {
//             /*Log*/console.log(details)
//             const [nombre_cliente, cancha, dia, hora] = details;
//             reservarCancha(nombre_cliente, cancha, dia, hora, num);
//         } else if ( ["salir","Salir", "SALIR"].includes(ctx.body) ) {
//             return gotoFlow(flowMenu);
//         } else {
//             return fallBack("Respuesta no válida, por favor utilize el formato correcto:\n*Juan, 1, 2024-05-15, 18:00*\n \nSi quiere volver al menu escriba SALIR"); }
//     })
//     .addAction({ delay: 500 }, async (_, { flowDynamic, gotoFlow }) => {
//         if (!sucBooked) {
//             await flowDynamic(rReservar)  
//             return gotoFlow(flowReservar);
//         } else {
//             return await flowDynamic(rReservar)  }  
//     });
// Configuración y creación del bot   // Definir los flujos para las acciones

const flowReservar = addKeyword(['reservar', 'rr'])
    .addAnswer('Para qué día te gustaría reservar?', 
    { capture: true,  idle: 40000  },
    async (ctx, {gotoFlow, flowDynamic, fallBack}) => {
        if (ctx?.idleFallBack) {
            await flowDynamic("No recibimos su respuesta\nVolviendo al *menu*... ")
            return gotoFlow(flowMenu)
        }
        const input = ctx.body;
        date = asignarFecha(input);
        if (date === "Ingresa un día válido por favor") {
            return fallBack(date);
        }
        console.log("Fecha asignada")
    })
    .addAnswer('A que hora sería? (6:00 - 22:00 hrs)', 
    { capture: true },
    async (ctx, {fallBack}) => {
        const input = ctx.body;
        hour = asignarHora(input);
        if (hour === "Ingresa una hora válida por favor") {
            return fallBack(hour);
        }
        console.log(hour)
        console.log("Hora asignada")
    })
    .addAnswer('Cual cancha prefieres? [1-4]', 
    { capture: true },
    async (ctx, {fallBack}) => {
        const input = ctx.body;
        court = asignarCancha(input);
        if (court === "Selecciona un cancha valida") {
            return fallBack(court);
        }
        console.log("Cancha asignada")
    })
    .addAnswer('Finalmente cual es su nombre?', 
    { capture: true },
    async (ctx, {fallBack}) => {
        const input = ctx.body;
        const num = ctx.from;
        name = input;
        reservarCancha(name, court, date, hour, num);
    })
    .addAction({ delay: 500 }, async (_, { flowDynamic, gotoFlow }) => {
        if (!sucBooked) {
            await flowDynamic(rReservar)  
            return gotoFlow(flowReservar);
        } else {
            return await flowDynamic(rReservar)  }  
    });
        
const flowConsultar = addKeyword(['consultar', 'consulta', 'cons'])
    .addAnswer('Escriba su nombre o su numero de telefono para consultar:', 
    { capture: true },
    async (ctx, {gotoFlow}) => {
        const res = ctx.body;
        const num = ctx.from;
        if (!isNaN(res)){
            ReservaCanchaPadel.consultarReservas('numero_telefonico', num, console.log);
        } else {
            // return gotoFlow(flowConsultarPorNombre)
            ReservaCanchaPadel.consultarReservas('nombre_cliente', res, console.log); }
    })
    .addAnswer('Consultando sus reservas...')
    .addAction({ delay: 100 }, async (_, { flowDynamic }) => {
        return await flowDynamic(rConsultar)  });

const flowConfirmar = addKeyword(['confirmar', 'conf'])
    .addAnswer('Ingrese su nombre para confirmar su reservas', 
    { capture: true },
    async (ctx) => {
        const nombre = ctx.body;
        saveName = nombre;
        ReservaCanchaPadel.consultarReservas('nombre_cliente', nombre, console.log);
    })
    .addAction({ delay: 300 }, async (_, { flowDynamic, gotoFlow }) => {
        await flowDynamic(rConsultar);
        if (rConsultar == 'No hay reservas para este cliente, volviendo al *menu*...') {
            return gotoFlow(flowMenu); }
    })
    .addAnswer('Seleccione la reserva a confirmar', 
    { capture: true },
    async (ctx) => {
        const nId = ctx.body;
        ReservaCanchaPadel.confirmarReserva(saveName, nId, console.log);
    })
    .addAction({ delay: 500 }, async (_, { flowDynamic }) => {
        return await flowDynamic(rConfirmar);
    });

const flowCancelar = addKeyword(['cancelar'])
    .addAnswer('Ingrese su nombre para cancelar su reservas', 
    { capture: true },
    async (ctx) => {
        const nombre = ctx.body;
        saveName = nombre;    
        ReservaCanchaPadel.consultarReservas('nombre_cliente', nombre, console.log);
    })
    .addAction({ delay: 300 }, async (_, { flowDynamic, gotoFlow }) => {
        await flowDynamic(rConsultar);
        if (rConsultar == 'No hay reservas para este cliente volviendo al *menu*...') {
            return gotoFlow(flowMenu); }
    })
    .addAnswer('Que número de reserva desea cancelar?', 
    { capture: true },
    async (ctx) => {
        const nId = ctx.body;
        ReservaCanchaPadel.cancelarReserva(saveName, nId, console.log);
    })
    .addAction({ delay: 500 }, async (_, { flowDynamic }) => {
        return await flowDynamic(rCancelar);
    });

const flowServicios = addKeyword(['Servicios', 'servicios'])
    .addAnswer(serv)
    // .addAnswer('Estos son nuestros servicios', {
    //     media: "https://lh5.googleusercontent.com/p/AF1QipPbmxVtZGjpqI9AEPJc0oPNkRYdIDKtaiRI7LJV=w1200-h642-p-k-no"
    // })

const flowMenu = addKeyword(['menu', 'menú']).addAnswer(
    "Este es nuestro menú:\n1. Reservar cancha\n2. Consultar reservas\n3. Confirmar\n4. Cancelar\n\n0. Salir",
    { delay: 500, capture: true },
    async (ctx, {gotoFlow, fallBack, flowDynamic }) => {
        // if (!["1","2","3","4","0"].includes(ctx.body)) {
        //     return fallBack(
        //         "Respuesta no válida, por favor selecciona una de las opciones.");
        // }
        switch (ctx.body) {
            case "1":
                return gotoFlow(flowReservar);
            case "2":
                return gotoFlow(flowConsultar);
            case "3":
                return gotoFlow(flowConfirmar);
            case "4":
                return gotoFlow(flowCancelar);
            case "0":
                return await flowDynamic(
                    "Saliendo...Puedes volver a acceder a este menú escribiendo '*Menu*'"
                );
        }
});

const flowWelcome = addKeyword(EVENTS.WELCOME)
    .addAnswer("🎾 ¡Hola bienvenido a\nColima Padel Club! 🎾")
    // .addAnswer("🎾 ¡Hola bienvenido a\n Hi Padel Club! 🎾")
    .addAnswer(menu,
    { delay: 500, capture: true },
    async (ctx, {gotoFlow, fallBack, flowDynamic }) => {

        switch (ctx.body) {
            case "1":
                return gotoFlow(flowMenu);
            case "2":
                return gotoFlow(flowServicios);
            case '3':
            case 'Dónde estamos':
                return await flowDynamic("Calle Ignacio Sandoval 1955, Paseo de La Cantera\n\nSolo haz click aquí 👉  https://maps.app.goo.gl/VtGFSZdAvPH2a6529")
                // return await flowDynamic("Av. Arquitecto Pedro Ramírez Vázquez 2014, Cd. Guzmán Jal.\n\nSolo haz click aquí 👉  https://maps.app.goo.gl/pq94K1Q14D9MJKo4A")
            case '4':
            case 'Web':
            case 'Nuestra web':
                return await flowDynamic("¡Eleva tu juego en Colima Padel Club! https://colimapadelclub.com")
                // return await flowDynamic("Síguenos en instagram 📸👣📱 https://www.instagram.com/hipadelclub/")
            case "0":
                return await flowDynamic()
        }
    });

// Creación del bot
const main = async () => {
    // const adapterDB = new MongoAdapter({
    //     dbUri: process.env.MONGO_DB_URI,
    //     dbUri: "YoutubeTest"
    // })
    const adapterDB = new MockAdapter();
    const adapterProvider = createProvider(BaileysProvider);
    const adapterFlow = createFlow([flowWelcome, flowMenu, flowReservar, flowConsultar, flowConfirmar, flowCancelar, flowDev, flowServicios]);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB
    });
    
    QRPortalWeb()
};

main();
