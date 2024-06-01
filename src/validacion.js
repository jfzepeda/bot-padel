const { DateTime } = require("luxon");

function clearText(txt) {
    let res = txt.toLowerCase();
    res = res.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return res;
}

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
function asignarISOdate(fechaStr) {
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

// REVERTIR FECHA ISO ////////////////////////////////
// REVERTIR FECHA ISO ////////////////////////////////
// REVERTIR FECHA ISO ////////////////////////////////
function reverseISO(fechaISO) {
    // Check if fechaISO is an object    
    if (fechaISO instanceof Date) {
        const month = fechaISO.getMonth() + 1; // Los meses en JavaScript son 0-indexados
        const day = fechaISO.getDate();

        // Obtener el nombre del mes basado en el número de mes
        const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        const mesNombre = meses[month - 1];

        // Formatear el día a eliminar ceros a la izquierda
        const diaFormateado = day.toString();

        // Construir la fecha en el formato deseado
        const fechaFormateada = `${diaFormateado} de ${mesNombre}`;

        return fechaFormateada;
    } else {
        // Dividir la fecha en año, mes y día
        const [year, month, day] = fechaISO.split("-");
        
        // Obtener el nombre del mes basado en el número de mes
        const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        const mesNombre = meses[parseInt(month) - 1];
        
        // Formatear el día a eliminar ceros a la izquierda
        const diaFormateado = parseInt(day).toString();
        
        // Construir la fecha en el formato deseado
        const fechaFormateada = `${diaFormateado} de ${mesNombre}`;
        
        return fechaFormateada;
    }
    
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
                // Busca cualquier coincidencia numerica
                let match = hora.match(/\d+/g);
                hora = match[0];

                if (!isNaN(hora)) {
                    // console.log('Dentro del IF')
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

// console.log(asignarHora('A las 6'))

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

// VALIDACION DE ID ////////////////////////////////
// VALIDACION DE ID ////////////////////////////////
// VALIDACION DE ID ////////////////////////////////
function asignarRow(frase) {
    const ordinales = {
        "primer": 1,
        "segund": 2,
        "tercer": 3,
        "cuart": 4,
        "quint": 5,
        "sext": 6,
        "septim": 7,
        "octav": 8,
        "noven": 9,
        "decim": 10,
        // "utim": rows.length          FUTURE IMPLEMENTATION
    };

    frase = clearText(frase);
    const patronOrdinales = /(primer|segund|tercer|cuart|quint|sext|septim|octav|noven|decim|utim)/gi;
    const numMatch = frase.match(patronOrdinales);

    // Buscar coincidencias con los números ordinales
    let coincidencia = ordinales[numMatch];
    
    // Si no hay coincidencias, devolver el mismo texto
    if (coincidencia == undefined) {
        return null;
    } else {
        return coincidencia;
    }
}

// Exportar las funciones asignarHora y asignarISOdate
module.exports = { asignarDia, asignarISOdate, reverseISO, asignarHora, asignarCancha, asignarRow };

