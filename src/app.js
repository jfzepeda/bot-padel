const sqlite3 = require('sqlite3').verbose();
const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');
require("dotenv").config

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const { asignarHora, asignarDia, asignarFecha, asignarCancha } = require('./validacion');
// const { coso } = require('./migration');

const moment = require('moment'); 

const path = require("path")
const fs = require("fs");

const pathMenu = path.join(__dirname, "../messages", "mainMenu.txt")
const mainMenu = fs.readFileSync(pathMenu, "utf8")

const pathRedes = path.join(__dirname, "../messages", "redes.txt")
const redes = fs.readFileSync(pathRedes, "utf8")

const pathServ = path.join(__dirname, "../messages", "servicios.txt")
const serv = fs.readFileSync(pathServ, "utf8")

const pathSubMenu = path.join(__dirname, "../messages", "subMenu.txt")
const subMenu = fs.readFileSync(pathSubMenu, "utf8")



let day, date, hour, court, name;
let nombre = null;

// Función para conectar a la base de datos SQLite
const db = new sqlite3.Database('botpadel.db');
let rReservar = null;
let rConsultar = null;
let rConfirmar = null;
let rCancelar = null;

let saveName = null;
let sucBooked = true;
let vDisponible = false;
let nCoincide = false;

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

function clearText(txt) {
    let res = txt.toLowerCase();
    res = res.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return res;
}

const flowReservar = addKeyword(['reservar', 'rr'])
    .addAnswer('Para qué día te gustaría reservar?', 
    { capture: true, idle: 40000 },
    async (ctx, { gotoFlow, flowDynamic, fallBack }) => {
        if (ctx?.idleFallBack) {
            await flowDynamic("No recibimos su respuesta\nVolviendo al *menu*... ");
            return gotoFlow(flowSubMenu);
        }
        day = asignarDia(ctx.body);
        if (day.includes('válido')) 
            { return fallBack(day) }
        date = asignarFecha(day)
    })
    .addAnswer('A qué hora sería? (6:00 - 22:00 hrs)', 
    { capture: true },
    async (ctx, { fallBack }) => {
        const input = clearText(ctx.body);
        hour = asignarHora(input);
        if (hour === "Ingresa una hora válida por favor") {
            return fallBack(hour);
        }
        console.log("Hora asignada", hour);
    })
    .addAnswer('Cuál cancha prefieres? [1-4]', 
    { capture: true },
    async (ctx, { fallBack }) => {
        const input = clearText(ctx.body);
        court = asignarCancha(input);
        if (court == "Elige una cancha valida") {
            return fallBack(court);
        }
        console.log("Cancha asignada", court);
    })
    .addAnswer('Finalmente, cuál es su nombre?', 
    { capture: true },
    async (ctx, { fallBack }) => {
        const input = ctx.body;
        const num = ctx.from;
        nombre = input;
        reservarCancha(nombre, court, date, hour, num);
    })
    .addAction({ delay: 500 }, async (_, { flowDynamic, gotoFlow }) => {
        if (!sucBooked) {
            await flowDynamic(rReservar);
            return gotoFlow(flowReservar);
        } else {
            return await flowDynamic(rReservar);
        }  
    });

const flowConsultar = addKeyword(['consultar', 'consulta', 'cons'])
    .addAnswer('Escriba su nombre o su número de teléfono para consultar:', 
    { capture: true },
    async (ctx, { gotoFlow }) => {
        const res = ctx.body;
        const num = ctx.from;
        if (!isNaN(res)) {
            ReservaCanchaPadel.consultarReservas('numero_telefonico', num, console.log);
        } else {
            ReservaCanchaPadel.consultarReservas('nombre_cliente', res, console.log);
        }
    })
    .addAnswer('Consultando sus reservas...')
    .addAction({ delay: 100 }, async (_, { flowDynamic }) => {
        return await flowDynamic(rConsultar);
    });

const flowConfirmar = addKeyword(['confirmar', 'conf'])
    .addAnswer('Ingrese su nombre para confirmar su reserva', 
    { capture: true },
    async (ctx) => {
        const nombre = ctx.body;
        saveName = nombre;
        ReservaCanchaPadel.consultarReservas('nombre_cliente', nombre, console.log);
    })
    .addAction({ delay: 300 }, async (_, { flowDynamic, gotoFlow }) => {
        await flowDynamic(rConsultar);
        if (rConsultar == 'No hay reservas para este cliente, volviendo al *menu*...') {
            return gotoFlow(flowSubMenu);
        }
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
    .addAnswer('Ingrese su nombre para cancelar su reserva', 
    { capture: true },
    async (ctx) => {
        const nombre = ctx.body;
        saveName = nombre;    
        ReservaCanchaPadel.consultarReservas('nombre_cliente', nombre, console.log);
    })
    .addAction({ delay: 300 }, async (_, { flowDynamic, gotoFlow }) => {
        await flowDynamic(rConsultar);
        if (rConsultar == 'No hay reservas para este cliente, volviendo al *menu*...') {
            return gotoFlow(flowSubMenu);
        }
    })
    .addAnswer('¿Qué número de reserva desea cancelar?', 
    { capture: true },
    async (ctx) => {
        const nId = ctx.body;
        ReservaCanchaPadel.cancelarReserva(saveName, nId, console.log);
    })
    .addAction({ delay: 500 }, async (_, { flowDynamic }) => {
        return await flowDynamic(rCancelar);
    });

const flowServicios = addKeyword(['Servicios', 'servicios'])
    .addAnswer(serv);

const flowSubMenu = addKeyword(['menu', 'menú'])
    .addAnswer( subMenu,
        { delay: 500, capture: true },
        async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
            const res = clearText(ctx.body);
            switch (true) {
                case /^1$|consul|ver mis/.test(res):
                    return gotoFlow(flowConsultar);
                case /^2$|conf/.test(res):
                    return gotoFlow(flowConfirmar);
                case /^3$|cance/.test(res):
                    return gotoFlow(flowCancelar);
                case /^4$|redes/.test(res):
                    return await flowDynamic(redes)
                case /^0$|volv|regres|menu/.test(res):
                    await flowDynamic('Volviendo al menu principal...');
                    return gotoFlow(flowMainMenu);
            }
        }
    );

const flowMainMenu = addKeyword()
    .addAnswer("🎾 ¡Hola, bienvenido a Colima Padel Club! 🎾")
    .addAnswer(mainMenu,
        { delay: 500, capture: true },
        async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
            const res = clearText(ctx.body);
            switch (true) {
                case /^1$|reser|agenda/.test(res):
                    return gotoFlow(flowReservar);
                case /^2$|serv/.test(res):
                    return gotoFlow(flowServicios);
                case /^3$|ubic|estamos|donde/.test(res):
                    return await flowDynamic("Calle Ignacio Sandoval 1955, Paseo de La Cantera\n\nSolo haz click aquí 👉  https://maps.app.goo.gl/VtGFSZdAvPH2a6529");
                case /^4$|web/.test(res):
                    return await flowDynamic("¡Eleva tu juego en Colima Padel Club! https://colimapadelclub.com");
            }
        }
    );

const flowWelcome = addKeyword([EVENTS.WELCOME,'hola', 'buenas', 'buenos'])
    .addAction(async (ctx, { flowDynamic, endFlow, gotoFlow }) => {
        let saludo = getTime();
        let telefono = ctx.from;
        try {
            nombre = await lookupUser(telefono);
            if (nombre !== undefined) {
                await flowDynamic(`Hola ${saludo} ${nombre}! En qué podemos servirle? 😊`)
                return gotoFlow(flowMainMenu);
            }
            return await flowDynamic([`Hola ${saludo}! 🙋🏻‍♀️\n🎾 ¡Hola, bienvenido a Hi Padel Club! 🎾\n\nPodría compartinos su nombre por favor?`]);
        } catch (error) {
            console.error("Error buscando usuario:", error);
            return await flowDynamic([`Hola ${saludo}! 🙋🏻‍♀️\n🎾 ¡Hola, bienvenido a Hi Padel Club! 🎾\n\nPodría compartinos su nombre por favor?`]);
        }
    })
    .addAction( {capture: true},
        async (ctx, {flowDynamic}) => {
            let res = ctx.body
            let telefono = ctx.from;
            nombre = await getGender(res)
            registerUser(telefono, nombre)
            return await flowDynamic([`Gracias ${nombre}!`, 'En qué podemos servirle? 😊'])
    })

const main = async () => {
    const adapterDB = new MockAdapter();
    const adapterProvider = createProvider(BaileysProvider);
    const adapterFlow = createFlow([flowWelcome, flowMainMenu,flowSubMenu, flowReservar, flowConsultar, flowConfirmar, flowCancelar, flowServicios]);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB
    });

    QRPortalWeb();
};

main();
