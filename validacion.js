const { DateTime } = require("luxon");

function asignarFecha(dia) {
    
    let fechaActual = new Date();
    
    if (isNaN(dia)) {

        console.log("Utilizando NaN")
        function obtenerFechaMasProxima(frase) {
            // Expresión regular para buscar días de la semana en la frase
            frase = frase.toLowerCase()
            const patron = /\b(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|mañana|pasado mañana)\b/gi;
            const coincidencias = frase.match(patron);
            
            if (!coincidencias) {
                return "Ingresa un día válido por favor";
            }
            
            // Obtener el día de la semana actual
            let diaActual = DateTime.now().weekday - 1; // Luxon tiene los días de la semana de 1 (lunes) a 7 (domingo), ajustamos a 0-6
            
            // Convertir el nombre del día a su número correspondiente
            const diasSemana = {'lunes': 0, 'martes': 1, 'miércoles': 2, 'miercoles': 2, 'jueves': 3, 'viernes': 4, 'sábado': 5, 'sabado': 5, 'domingo': 6};
            
            let fechaMasProxima = null;

            if (coincidencias == "mañana") {
                const fechaPosible = DateTime.now().plus({ days: 1 });
                if (fechaMasProxima === null || fechaPosible < fechaMasProxima) {
                    fechaMasProxima = fechaPosible;
                }
                
            } else if (coincidencias == "pasado mañana") {
                const fechaPosible = DateTime.now().plus({ days: 2 });
                if (fechaMasProxima === null || fechaPosible < fechaMasProxima) {
                    fechaMasProxima = fechaPosible;
                }
                
            } else {
                coincidencias.forEach(diaSemana => {
                    const diaSemanaNumero = diasSemana[diaSemana.toLowerCase()];
                    const diferenciaDias = (diaSemanaNumero - diaActual + 7) % 7;
                    const fechaPosible = DateTime.now().plus({ days: diferenciaDias });
                    if (fechaMasProxima === null || fechaPosible < fechaMasProxima) {
                        fechaMasProxima = fechaPosible;
                    }
                });
            }
            
            return fechaMasProxima.toISODate();
        }
        
        const diaXstr = obtenerFechaMasProxima(dia);
        console.log(diaXstr)
        return diaXstr;
          
    } else {
        console.log("Utilizando parseInt")
        dia = parseInt(dia);
    
        if (dia < 1 || dia > 31) {
            return "Ingresa un día válido por favor";
        }
        
        let mesActual = fechaActual.getMonth() + 1; // Los meses en JavaScript van de 0 a 11
        let añoActual = fechaActual.getFullYear();
        
        let mesResultante = mesActual;
        let añoResultante = añoActual;
        
        if (dia < fechaActual.getDate()) {
            mesResultante++;
            if (mesResultante === 13) {
                mesResultante = 1;
                añoResultante++;
            }
        }

        // Construir la fecha resultante
        let fechaResultante =  añoResultante + "-" + mesResultante.toString().padStart(2, '0') + "-" +  dia.toString().padStart(2, '0');
        console.log(fechaResultante)
        return fechaResultante;
    }
    
}



// VALIDACION DE HORA ////////////////////////////////
function asignarHora(hora) {
    try {
        const regex = /(\d+).*?(mañana|tarde|am|pm)/i;
        let match = hora.match(regex);

        if (match) {
            const horaNumero = parseInt(match[1], 10);
            const periodo = match[2].toLowerCase();

            if (["mañana", "am"].includes(periodo) && horaNumero === 12) {
                // Convert 12 AM to 00 hours
                return `00:00`;
            } else if (["mañana", "am"].includes(periodo)) {
                return `${horaNumero.toString().padStart(2, '0')}:00`;
            } else if (["tarde", "pm"].includes(periodo) && horaNumero !== 12) {
                // Convert PM to 24-hour format by adding 12
                return `${(horaNumero + 12).toString().padStart(2, '0')}:00`;
            } else if (horaNumero === 12 && ["tarde", "noche", "pm"].includes(periodo)) {
                return `12:00`;
            } else {
                return "Ingresa una hora válida por favor";
            }
        } else {
            const parsedTime = new Date(`1970-01-01T${hora}`);
            if (!isNaN(parsedTime.getTime())) {
                return parsedTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            } else {
                if (!isNaN(hora)) {
                    hora = hora.trim();
                    let hsm;
                    let len = hora.length;

                    if (len === 1) {
                        hsm = "0" + hora;
                    } else if (len === 2) {
                        hsm = hora;
                    } else if (len > 2) {
                        // Cortar la hora en ":"
                        let parts = hora.split(":");
                        hsm = parts[0]; // Tomar solo la hora

                        // Asegurarse de que tenga dos caracteres
                        if (hsm.length === 1) {
                            hsm = "0" + hsm;
                        }
                    }

                    if (hsm < 6) {
                        hsm = parseInt(hsm);
                        hsm += 12;
                        hsm = hsm.toString();
                    }

                    let hora_final = (hsm + ":00");
                    return hora_final;
                } else {
                    return "Ingresa una hora válida por favor";
                }
            }
        }
    } catch (error) {
        return "Ingresa una hora válida por favor";
    }
}

function asignarCancha(cancha) {
    const canchasPosibles = /\b(1|2|3|4)\b/gi;
    let coincidencia = cancha.match(canchasPosibles);
    
    if (!coincidencia) {
        return "Selecciona un cancha valida";
    } 
    
    coincidencia = coincidencia.toString();
    console.log(coincidencia)
    return coincidencia;
    
    
}

// Exportar las funciones asignarHora y asignarFecha
module.exports = { asignarFecha, asignarHora, asignarCancha };

