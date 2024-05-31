const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');
require("dotenv").config

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
// const { ask } = require('./chatgpt');
const { registerUser, lookupUser, getBookings, book } = require('./database');
const { reservarCancha, ReservaCanchaPadel } = require('./migration');
const { getTime, getGender } = require('./saludos');
const { asignarHora, asignarDia, asignarFecha, asignarCancha } = require('./validacion');

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
    .addAnswer('Para qué día quiere reservar?', 
    { capture: true, idle: 40000 },
    async (ctx, { endFlow, flowDynamic, fallBack }) => {
        if (ctx?.idleFallBack) {
            return endFlow("No recibimos su respuesta\nVolviendo al *menu*... ");
        }
        day = asignarDia(ctx.body);
        if (day.includes('válido')) { 
            return fallBack(day); 
        }
        date = asignarFecha(day);
        console.log("Fecha asignada", date);
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
    .addAction( { capture: true },
    async (ctx, { fallBack, flowDynamic, gotoFlow }) => {
        const num = ctx.from;
        try {
            const resultado = await reservarCancha(nombre, court, date, hour, num);
            await flowDynamic(resultado);
        } catch (error) {
            await flowDynamic(error.message);
            return gotoFlow(flowReservar);
        }
    });

const flowConsultar = addKeyword(['consultar', 'consulta', 'cons'])
    .addAnswer('Escriba su nombre o su número de teléfono para consultar:', 
    { capture: true },
    async (ctx, { gotoFlow, flowDynamic }) => {
        const res = ctx.body;
        const num = ctx.from;
        try {
            let resultado;
            if (true) {
                resultado = await ReservaCanchaPadel.consultarReservas('numero_telefonico', num);
            } else {
                resultado = await ReservaCanchaPadel.consultarReservas('nombre_cliente', res);
            }
            return await flowDynamic(resultado);
        } catch (error) {
            await flowDynamic(error.message);
        }
    });

const flowConfirmar = addKeyword(['confirmar', 'conf'])
    .addAnswer('Ingrese su nombre para confirmar su reserva', 
    { capture: true },
    async (ctx, { flowDynamic, gotoFlow }) => {
        numero = ctx.from;
        try {
            const resultado = await ReservaCanchaPadel.consultarReservas('numero_telefonico', numero);
            await flowDynamic(resultado);
            if (resultado.includes('No hay reservas para')) {
                return gotoFlow(flowSubMenu);
            }
        } catch (error) {
            await flowDynamic(error.message);
            return gotoFlow(flowSubMenu);
        }
    })
    .addAnswer('Seleccione la reserva a confirmar', 
    { capture: true },
    async (ctx, { flowDynamic }) => {
        const nId = ctx.body;
        try {
            const exist = await ReservaCanchaPadel.consultaDoble(numero, nId);
            if (exist) {
                try {
                    const resultado = await ReservaCanchaPadel.confirmarReserva(numero, nId);
                    return await flowDynamic(resultado);
                } catch (error) {
                    await flowDynamic(error.message); }
            } else {
                return await flowDynamic('Esa reserva no esta a su nombre'); }
        } catch (error) { 
            await flowDynamic(error.message); }
    });

const flowCancelar = addKeyword(['cancelar'])
    .addAnswer('Ingrese su nombre para cancelar su reserva', 
    { capture: true },
    async (ctx, { flowDynamic, gotoFlow }) => {
        numero = ctx.from;
        try {
            const resultado = await ReservaCanchaPadel.consultarReservas('numero_telefonico', numero);
            await flowDynamic(resultado);
            if (resultado.includes('No hay reservas para')) {
                return gotoFlow(flowSubMenu);
            }
        } catch (error) {
            await flowDynamic(error.message);
            return gotoFlow(flowSubMenu);
        }
    })
    .addAnswer('¿Qué número de reserva desea cancelar?', 
    { capture: true },
    async (ctx, { flowDynamic }) => {
        const nId = ctx.body;
        try {
            const resultado = await ReservaCanchaPadel.cancelarReserva(numero, nId);
            return await flowDynamic(resultado);
        } catch (error) {
            await flowDynamic(error.message);
        }
    });


const flowServicios = addKeyword(['Servicios', 'servicios'])
    .addAnswer(serv);

const flowSubMenu = addKeyword(['menu', 'menú'])
    .addAnswer( subMenu,
        { delay: 500, capture: true },
        async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
            let res = clearText(ctx.body);
            switch (true) {
                case /^1\.?$|consul|ver mis/.test(res):
                    return gotoFlow(flowConsultar);
                case /^2\.?$|conf/.test(res):
                    return gotoFlow(flowConfirmar);
                case /^3\.?$|cance/.test(res):
                    return gotoFlow(flowCancelar);
                case /^4\.?$|redes/.test(res):
                    return await flowDynamic(redes)
                case /^0\.?$|volv|regres|menu/.test(res):
                    await flowDynamic('Volviendo al menu principal...');
                    return gotoFlow(flowMainMenu);
            }
        }
    );

const flowMainMenu = addKeyword(['menu', 'menú','opciones'])
    .addAnswer("🎾 ¡Hola, bienvenido a Colima Padel Club! 🎾")
    .addAnswer(mainMenu,
        { delay: 500, capture: true },
        async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
            let res = clearText(ctx.body);
            switch (true) {
                case /^1\.?$|reser|agenda/.test(res):
                    return gotoFlow(flowReservar);
                case /^2\.?$|serv/.test(res):
                    return gotoFlow(flowServicios);
                case /^3\.?$|ubic|estamos|donde/.test(res):
                    return await flowDynamic("Calle Ignacio Sandoval 1955, Paseo de La Cantera\n\nSolo haz click aquí 👉  https://maps.app.goo.gl/VtGFSZdAvPH2a6529");
                case /^4\.?$|mas/.test(res):
                    return gotoFlow(flowSubMenu);
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
            return await flowDynamic([`🎾 ¡Hola ${saludo}, bienvenido a Hi Padel Club! 🎾\n\nPodría compartinos su nombre por favor?`]);
        } catch (error) {
            console.error("Error buscando usuario:", error);
            return await flowDynamic([`🎾 ¡Hola ${saludo}, bienvenido a Hi Padel Club! 🎾\n\nPodría compartinos su nombre por favor?`]);
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
