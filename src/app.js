const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');
require("dotenv").config

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const { ask } = require('./chatgpt');
const { reservarCancha, consultaDoble, consultarReservas, confirmarReserva, cancelarReserva, 
    registerUser, lookupUser, ejecutarConsultaGPT, getID } = require('./database');
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


let day, date, hour, court, name;
let nombre = null;

function clearText(txt) {
    let res = txt.toLowerCase();
    res = res.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return res;
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

const flowGracias = addKeyword('gracias', 'gracais', 'grax', 'agradezco')
    .addAnswer('No hay de que, estamos para servirle!')
    newChat = true

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
        date = asignarISOdate(day);
    })
    .addAnswer('A qué hora sería? (6:00 - 22:00 hrs)', 
    { capture: true },
    async (ctx, { fallBack }) => {
        const input = clearText(ctx.body);
        hour = asignarHora(input);
        if (hour === "Ingresa una hora válida por favor") {
            return fallBack(hour);
        }
    })
    .addAnswer('Cuál cancha prefieres? [1-4]', 
    { capture: true },
    async (ctx, { fallBack }) => {
        const input = clearText(ctx.body);
        court = asignarCancha(input);
        if (court == "Elige una cancha valida") {
            return fallBack(court);
        }
    })
    .addAction( async (ctx, { flowDynamic }) => {
        const num = ctx.from;
        court = parseInt(court);
        nombre = await lookupUser(num);
        try {
            const resultado = await reservarCancha(nombre, court, date, hour, num);
            return await flowDynamic(resultado);
        } catch (error) {
            await flowDynamic(error.message);
        }
    });

const flowConsultar = addKeyword(['consulta', 'checar', 'ver mis', 'cs'])
    .addAnswer('Buscando sus reservas...', {capture: false},
    async (ctx, { gotoFlow, flowDynamic }) => {
        const num = ctx.from;
        try {
            const resultado = await consultarReservas('numero_telefonico', num);
            return await flowDynamic(resultado);
        } catch (error) {
            await flowDynamic(error.message);
        }
    });

const flowConfirmar = addKeyword(['confirmar', 'cf'])
    .addAnswer('Ingrese su nombre para confirmar su reserva', 
    { capture: true },
    async (ctx, { flowDynamic, gotoFlow }) => {
        numero = ctx.from;
        try {
            const resultado = await consultarReservas('numero_telefonico', numero);
            await flowDynamic(resultado);
            if (resultado.includes('No hay reservas para')) {
                return gotoFlow(flowSubMenu);
            }
        } catch (error) {
            await flowDynamic(error.message);
            return gotoFlow(flowSubMenu);
        }
    })
    .addAnswer('Escriba el ID de la reserva a confirmar', 
    { capture: true },
    async (ctx, { flowDynamic, endFlow, fallBack }) => {
        const response = ctx.body;
        const numero = ctx.from;
        const exist = await consultaDoble(numero, response);
        if (exist && !isNaN(response)){
            let nId = response
            try {
                const resultado = await confirmarReserva(numero, nId);
                return await flowDynamic(resultado);
            } catch (error) {
                return await flowDynamic(error.message); }
        } else if (!exist && !isNaN(response)) {
            return await flowDynamic('Esa reserva no esta a su nombre');
        } else {
            let rowIndex = await asignarRow(response);
            if (response == '.') {
                rowIndex = 1;
            } else if (rowIndex ==  null) {
                return await flowDynamic('No existe ese ID');
            }
            let nId = await getID(rowIndex, numero);
            try {
                const resultado = await confirmarReserva(numero, nId);
                return await flowDynamic(resultado);
            } catch (error) {
                return await flowDynamic(error.message); }
        }
    });


const flowCancelar = addKeyword(['cancelar','cn'])
    .addAnswer('Ingrese su nombre para cancelar su reserva', 
    { capture: true },
    async (ctx, { flowDynamic, gotoFlow }) => {
        numero = ctx.from;
        try {
            const resultado = await consultarReservas('numero_telefonico', numero);
            await flowDynamic(resultado);
            if (resultado.includes('No hay reservas para')) {
                return gotoFlow(flowSubMenu);
            }
        } catch (error) {
            await flowDynamic(error.message);
            return gotoFlow(flowSubMenu);
        }
    })
    .addAnswer('¿Qué ID de reserva desea cancelar?', 
    { capture: true },
    async (ctx, { flowDynamic, endFlow, fallBack }) => {
        const response = ctx.body;
        const numero = ctx.from;
        const exist = await consultaDoble(numero, response);
        if (exist && !isNaN(response)){
            let nId = response
            try {
                const resultado = await cancelarReserva(numero, nId);
                return await flowDynamic(resultado);
            } catch (error) {
                return await flowDynamic(error.message); }
        } else if (!exist && !isNaN(response)) {
            return await flowDynamic('Esa reserva no esta a su nombre');
        } else {
            let rowIndex = await asignarRow(response);
            if (response == '.') {
                rowIndex = 1;
            } else if (rowIndex ==  null) {
                return await flowDynamic('No existe ese ID');
            }
            let nId = await getID(rowIndex, numero);
            try {
                const resultado = await cancelarReserva(numero, nId);
                return await flowDynamic(resultado);
            } catch (error) {
                return await flowDynamic(error.message); }
        }
    });

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
    });

const flowMainMenu = addKeyword(['menu', 'menú','opciones'])
    .addAnswer(mainMenu,
        { delay: 500, capture: true },
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

const flowGPT = addKeyword('GPT')
    .addAnswer("Estoy aquí para asistirle con el menú",
    { delay: 500, capture: true },
    async (ctx, { flowDynamic }) => {
        let resGPT = await ask(ctx.body)
        if (resGPT.includes('null')) {
            return await flowDynamic("No entiendo, ¿podrías repetirlo de otra forma?");
        } else {
            ejecutarConsultaGPT(resGPT)
            return await flowDynamic(resGPT);
        }
    });

const main = async () => {
    const adapterDB = new MockAdapter();
    const adapterProvider = createProvider(BaileysProvider);
    const adapterFlow = createFlow([flowWelcome, flowMainMenu,flowSubMenu, flowReservar, flowConsultar, flowConfirmar, flowCancelar, flowGracias, flowGPT]);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB
    });

    QRPortalWeb();
};

main();
