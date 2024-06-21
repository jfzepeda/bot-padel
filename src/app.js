const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');
require("dotenv").config

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const { getAvailableHours, getAvailableCourt } = require('./calendar');
const { ask } = require('./chatgpt');
const { reservarCancha, consultaDoble, consultarReservas, confirmarReserva, cancelarReserva, 
    registerUser, lookupUser, deleteFromCalendar, getID } = require('./database');
const { getTime, getGender } = require('./saludos');
const { asignarHora, asignarDia, asignarISOdate, asignarCancha, asignarRow } = require('./validacion');

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


let date, hour, court, canchas, name, sinReserva;
let saveHour = null;
let nombre = null;

function clearText(txt) {
    let res = txt.toLowerCase();
    res = res.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return res;
}

// const flowDev = addKeyword('devflowjf').addAnswer('Terminal...',
//     {capture: true},
//     async (ctx, {gotoFlow}) => {
//         console.log('Estas en el flow DEV')
//         const res = ctx.body;
//         if (res !== 'Killer10') {
//         // if (res == 'Salir') {
//             return gotoFlow(flowWelcome);
//         }
//         console.log('Contraseña aceptada')
// })
// .addAction({capture: true}, 
//     async (ctx ) => {
//     const mst = ctx.body;
//     console.log('Mensaje enviado a la Terminal')
//     devDB(mst);
// });

const flowGracias = addKeyword('gracias', 'gracais', 'grax', 'agradezco')
    .addAnswer('No hay de que, estamos para servirle!')
    newChat = true

// const flowReservar = addKeyword(['reservar', 'rr'])
const flowReservar = addKeyword(EVENTS.ACTION)
    .addAnswer('Para qué día quiere reservar?', 
    { capture: true },
    async (ctx, { flowDynamic, fallBack }) => {
        date = asignarDia(ctx.body);
        if (date.includes('válido')) { 
            return fallBack(date); }

        const horarios = await getAvailableHours(date)
        if (horarios.includes('ocupados')) { 
            return fallBack(horarios); }

        return await flowDynamic(horarios)
    })
    .addAnswer('A qué hora sería?', 
    { capture: true },
    async (ctx, { fallBack, flowDynamic }) => {
        let input = clearText(ctx.body);
        if (saveHour !== null) { 
            input = saveHour + ' ' + input; 
        }
        
        hour = asignarHora(input);
        if (hour.includes("válida")) { 
            return fallBack(hour); 
        } else if (hour === 'AM o PM?') { 
            saveHour = input; return fallBack(hour); 
        }

        canchas = await getAvailableCourt(date, hour);
        return await flowDynamic(canchas)
    })
    .addAction( { capture: true },  // CANCHA
    async (ctx, { fallBack, endFlow }) => {
        const input = clearText(ctx.body);
        court = asignarCancha(input, canchas);
        console.log(court)

        if (court.includes('problema')) { 
            return endFlow(court); 
        } else if (court.length > 1) { 
            return fallBack(court);
        }
    })
    .addAction( async (ctx, { flowDynamic }) => { // QUERY
        const num = ctx.from;
        court = parseInt(court);
        nombre = await lookupUser(num);

        try {
            let resultado = await reservarCancha(nombre, court, date, hour, num);
            return await flowDynamic(resultado);
        } catch (error) {
            await flowDynamic(error.message);
        }
    });

// const flowConsultar = addKeyword(['consulta', 'checar', 'ver mis', 'cs'])
const flowConsultar = addKeyword(EVENTS.ACTION)
    .addAnswer('Buscando sus reservas...', {capture: false},
    async (ctx, { gotoFlow, flowDynamic }) => {
        const num = ctx.from;
        const resultado = await consultarReservas('numero_telefonico', num);

        if (resultado.includes('No hay reservas')) {
            return gotoFlow(flowSinReserva);
        }
        return await flowDynamic(resultado);
    });

const flowSinReserva = addKeyword(EVENTS.ACTION)
    .addAnswer('No hay reservas a su nombre')
    .addAnswer('Le gustaría agendar una?', {capture: true},
    async (ctx, { gotoFlow, flowDynamic }) => {
        const res = clearText(ctx.body);
        if (res.includes('si' || 'claro')) {
            return gotoFlow(flowReservar);
        } else {
            return await flowDynamic('Gracias por su visita, que tenga un buen día');
        }
    });

// const flowConfirmar = addKeyword(['confirmar', 'cf'])
const flowConfirmar = addKeyword(EVENTS.ACTION)
    .addAnswer('Ingrese su nombre para confirmar su reserva', 
    { capture: true },
    async (ctx, { flowDynamic, endFlow, gotoFlow  }) => {
        numero = ctx.from;
        try {
            const resultado = await consultarReservas('numero_telefonico', numero);
            if (resultado.includes('No hay reservas')) {
                return gotoFlow(flowSinReserva);
            }
            await flowDynamic(resultado);
        } catch (error) {
            await flowDynamic(error.message);
            return endFlow();
        }
    })
    .addAnswer('Escriba el ID de la reserva a confirmar', 
    { capture: true },
    async (ctx, { flowDynamic, endFlow, fallBack }) => {
        const response = ctx.body;
        const numero = ctx.from;
        const handleConfirmReserva = async (nId) => {
            try {
                const resultado = await confirmarReserva(numero, nId);
                return await flowDynamic(resultado);
            } catch (error) {
                return await flowDynamic(error.message);
            }
        };
        if (!isNaN(response)) {
            const exist = await consultaDoble(numero, response);
            if (exist) {
                return await handleConfirmReserva(response);
            } else {
                return await flowDynamic('Esa reserva no esta a su nombre');
            }
        } else {
            let rowIndex = await asignarRow(response);
            if (response === '.') {
                rowIndex = 1;
            } else if (rowIndex === null) {
                return await flowDynamic('No existe ese ID');
            }
            const nId = await getID(rowIndex, numero);
            return await handleConfirmReserva(nId);
        }
    });


// const flowCancelar = addKeyword(['cancelar','cn'])
const flowCancelar = addKeyword([EVENTS.ACTION, 'ccc'])
    .addAnswer('Ingrese su nombre para cancelar su reserva', 
    { capture: true },
    async (ctx, { flowDynamic, endFlow, gotoFlow  }) => {
        numero = ctx.from;
        try {
            const resultado = await consultarReservas('numero_telefonico', numero);
            if (resultado.includes('No hay reservas')) {
                return gotoFlow(flowSinReserva);
            }
            await flowDynamic(resultado);
        } catch (error) {
            await flowDynamic(error.message);
            return endFlow();
        }
    })
    .addAnswer('Escriba el ID de reserva desea cancelar?', 
    { capture: true },
    async (ctx, { flowDynamic, endFlow, fallBack }) => {
        const response = ctx.body;
        const numero = ctx.from;
        const handleCancelReserva = async (nId) => {
            try {
                const resultado = await cancelarReserva(numero, nId);
                return await flowDynamic(resultado);
            } catch (error) {
                return await flowDynamic(error.message);
            }
        };
        if (!isNaN(response)) {
            const exist = await consultaDoble(numero, response);
            if (exist) {
                return await handleCancelReserva(response);
            } else {
                return await flowDynamic('Esa reserva no esta a su nombre');
            }
        } else {
            let rowIndex = await asignarRow(response);
            if (response === '.') {
                rowIndex = 1;
            } else if (rowIndex === null) {
                return await flowDynamic('No existe ese ID');
            }
            const nId = await getID(rowIndex, numero);
            return await handleCancelReserva(nId);
        }
    });
    

const flowSubMenu = addKeyword(EVENTS.ACTION)
    .addAnswer( subMenu,
    { delay: 300, capture: true },
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
    });

const flowMainMenu = addKeyword(['menu', 'menú','opciones'])
    .addAnswer(mainMenu,
        { delay: 300, capture: true },
        async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
            let res = clearText(ctx.body);
            switch (true) {
                case /^1\.?$|reser|agenda/.test(res):
                    return gotoFlow(flowReservar);
                case /^2\.?$|serv/.test(res):
                    return await flowDynamic(serv);
                case /^3\.?$|ubic|estamos|donde/.test(res):
                    return await flowDynamic("Av. Arquitecto Pedro Ramírez Vázquez 2014, Cdad. Guzmán.\n\Haz click aquí 👉  https://maps.app.goo.gl/yLx1F5He4BGYhyUK9");
                case /^4\.?$|mas/.test(res):
                    return gotoFlow(flowSubMenu);
                case /consult|ver mis/.test(res):
                    return gotoFlow(flowConsultar);
                case /confirm/.test(res):
                    return gotoFlow(flowConfirmar);
                case /cancel/.test(res):
                    return gotoFlow(flowCancelar);
            }
        }
    );

const flowWelcome = addKeyword([EVENTS.WELCOME])
    .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
        let saludo = getTime();
        let telefono = ctx.from;
        try {
            nombre = await lookupUser(telefono);
            if (nombre !== undefined) {
                await flowDynamic(`Hola ${saludo} ${nombre}! \nEn qué podemos servirle? 😊`)
                return gotoFlow(flowGPT);
            }
            return await flowDynamic([`🎾 ¡Hola ${saludo}, bienvenido a Hi Padel Club! 🎾\n\nPodría compartinos su nombre por favor?`]);
        } catch (error) {
            console.error("Error buscando usuario:", error);
            return await flowDynamic([`🎾 ¡Hola ${saludo}, bienvenido a Hi Padel Club! 🎾\n\nPodría compartinos su nombre por favor?`]);
        }
    })
    .addAction( {capture: true},
        async (ctx, {flowDynamic, gotoFlow}) => {
            let res = ctx.body
            let telefono = ctx.from;
            nombre = await ask(ctx.body, 'nombres');
            registerUser(telefono, nombre)
            await flowDynamic([`Gracias ${nombre}!`, 'En qué podemos servirle? 😊'])
            return gotoFlow(flowGPT);
    })

const flowGPT = addKeyword('GPT').addAction(
    // .addAnswer("Haz tu consulta: ",
    { delay: 500, capture: true },
    async (ctx, { flowDynamic, gotoFlow }) => {
        let resGPT = await ask(ctx.body, 'nav');
        resGPT = resGPT.trim();
        switch (true) {
            case resGPT == 'flowReservar':
                return gotoFlow(flowReservar);
            case resGPT == 'flowConsultar':
                return gotoFlow(flowConsultar);
            case resGPT == 'flowConfirmar':
                return gotoFlow(flowConfirmar);
            case resGPT == 'flowCancelar':
                return gotoFlow(flowCancelar);
            case resGPT == 'flowMainMenu':
                return gotoFlow(flowMainMenu);
            case resGPT == 'flowSubMenu':
                return gotoFlow(flowSubMenu);
            case resGPT == 'flowGracias':
                return gotoFlow(flowGracias);
            case resGPT == 'NO ENTIENDO':
                await flowDynamic("Disculpe no logré comprender su solicitud, le comparto nuestras opciones");
                return gotoFlow(flowMainMenu);
            default:
                return await flowDynamic(resGPT);
        }
    });

const main = async () => {
    const adapterDB = new MockAdapter();
    const adapterProvider = createProvider(BaileysProvider);
    const adapterFlow = createFlow([flowWelcome, flowMainMenu,flowSubMenu, flowReservar, flowConsultar, flowConfirmar, flowCancelar, flowGracias, flowGPT, flowSinReserva]);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB
    });

    QRPortalWeb();
};

main();
