const { DateTime } = require("luxon");

// VALIDACION DE FECHA ////////////////////////////////
// VALIDACION DE FECHA ////////////////////////////////
// VALIDACION DE FECHA ////////////////////////////////
function asignarDia(dateProvided) {
    
    let frase = dateProvided.toLowerCase()
    const patronSemana = /\b(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|hoy|mañana|pasado mañana)\b/gi;
    const weekMatch = frase.match(patronSemana);

    function convertirMesANombre(mesNumero) {
        const nombresMeses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        if (mesNumero < 1 || mesNumero > 12) {
            return "Mes no válido";
        }
        return nombresMeses[mesNumero - 1];
    }
    
    if (weekMatch !== null) {
  
        // Obtener el día de la semana actual
        let diaActual = DateTime.now().weekday - 1; 
        
        // Convertir el nombre del día a su número correspondiente
        const diasSemana = {'lunes': 0, 'martes': 1, 'miércoles': 2, 'miercoles': 2, 'jueves': 3, 'viernes': 4, 'sábado': 5, 'sabado': 5, 'domingo': 6};
        
        let fechaMasProxima = null;

        const patronMod = /(proximo|próximo|siguiente)/;
        const modMatch = frase.match(patronMod);

        if (weekMatch == "mañana") {
            const fechaPosible = DateTime.now().plus({ days: 1 });
            if (fechaMasProxima === null || fechaPosible < fechaMasProxima) {
                fechaMasProxima = fechaPosible;
            }
            
        } else if (weekMatch == "pasado mañana") {
            const fechaPosible = DateTime.now().plus({ days: 2 });
            if (fechaMasProxima === null || fechaPosible < fechaMasProxima) {
                fechaMasProxima = fechaPosible;
            }
            
        } else if (weekMatch == "hoy") {
            const fechaPosible = DateTime.now();
            if (fechaMasProxima === null || fechaPosible < fechaMasProxima) {
                fechaMasProxima = fechaPosible;
            }
            
        } else {
            weekMatch.forEach(diaSemana => {
                const diaSemanaNumero = diasSemana[diaSemana.toLowerCase()];
                let diferenciaDias = (diaSemanaNumero - diaActual + 7) % 7;
                if (modMatch !== null) { diferenciaDias += 7; }
                const fechaPosible = DateTime.now().plus({ days: diferenciaDias });
                if (fechaMasProxima === null || fechaPosible < fechaMasProxima) {
                    fechaMasProxima = fechaPosible;
                }
            });
        }

        const dia = fechaMasProxima.day
        const mes = convertirMesANombre(fechaMasProxima.month)
        const fecha = (dia + ' de ' + mes);
        // console.log(fecha)
        return fecha
          
    } else {
        const patronDia = /\b-?\d+\b/g;
        let dayMatch = frase.match(patronDia);
        day = parseInt(dayMatch);
        // console.log('Utilizando match day')
        
        if (day < 1 || day > 31) {
            return "Ooops ese día parece no estar en nuestro calendario, ingresa un día válido por favor";
        }
        
        const patronMes = /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/gi;
        let monthMatch = frase.match(patronMes);
        // console.log('Utilizando match month')

        if (monthMatch === null) {
            
            let fechaActual = new Date();
            let mesResultante = fechaActual.getMonth() + 1; // Los meses en JavaScript van de 0 a 11
            
            if (day < fechaActual.getDate()) {
                mesResultante++;
                if (mesResultante === 13) {
                    mesResultante = 1;
                }
            }
            // Construir la fecha resultante
            let mes = convertirMesANombre(mesResultante)
            let fechaResultante = (day + ' de ' + mes);
            return fechaResultante;
        } else {
            let fechaResultante = (day + ' de ' + monthMatch)
            return fechaResultante;
        }

    }
}

// CONVERTIR DIA A FECHA ////////////////////////////////
// CONVERTIR DIA A FECHA ////////////////////////////////
// CONVERTIR DIA A FECHA ////////////////////////////////
function asignarFecha(fechaStr) {
    const meses = {
        "enero": "01",
        "febrero": "02",
        "marzo": "03",
        "abril": "04",
        "mayo": "05",
        "junio": "06",
        "julio": "07",
        "agosto": "08",
        "septiembre": "09",
        "octubre": "10",
        "noviembre": "11",
        "diciembre": "12"
    };

    const year = new Date().getFullYear();
    
    // Dividir la cadena de entrada en día y mes
    const [dia, mes] = fechaStr.split(" de ");
    
    // Obtener el número del mes
    const mesNum = meses[mes.toLowerCase()];
    
    // Formatear el día a dos dígitos
    const diaNum = dia.padStart(2, '0');
    
    // Construir la fecha en el formato deseado
    const fechaFormateada = `${year}-${mesNum}-${diaNum}`;
    
    return fechaFormateada;
    
}

// VALIDACION DE HORA ////////////////////////////////
// VALIDACION DE HORA ////////////////////////////////
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

// VALIDACION DE MESA ////////////////////////////////
// VALIDACION DE MESA ////////////////////////////////
// VALIDACION DE MESA ////////////////////////////////
function asignarCancha(cancha) {
    const canchasPosibles = /\b(1|2|3|4)\b/gi;
    let coincidencia = cancha.match(canchasPosibles);
    
    if (coincidencia == null) {
        return "Elige una cancha valida";
    } else {
        coincidencia = coincidencia.toString();
        return coincidencia;
    }    
}


// Exportar las funciones asignarHora y asignarFecha
module.exports = { asignarFecha, asignarDia, asignarHora, asignarCancha };

