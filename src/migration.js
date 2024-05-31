const sqlite3 = require('sqlite3').verbose();
const path = require("path")
const dbPath = path.join(__dirname, "..", 'botpadel.db');

const db = new sqlite3.Database(dbPath);

// Función para verificar la disponibilidad de la cancha
function verificarDisponibilidad(cancha, dia, hora) {
    return new Promise((resolve, reject) => {
        if (!moment(dia, 'YYYY-MM-DD', true).isValid() || !moment(hora, 'HH:mm', true).isValid()) {
            reject(new Error('Formato de fecha u hora no válido.'));
        } else {
            db.all('SELECT * FROM reservas WHERE cancha = ? AND dia = ? AND hora = ?', [cancha, dia, hora], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.length === 0); // true si la cancha está disponible, false si no
                }
            });
        }
    });
}

// Método para ejecutar consultas SQL
function ejecutarConsulta(mensaje) {
    return new Promise((resolve, reject) => {
        db.all(mensaje, [], (err, rows) => {
            if (err) {
                reject("Error en la consulta: " + err.message);
            } else {
                resolve(rows);
            }
        });
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
    guardarEnDB() {
        return new Promise((resolve, reject) => {
            db.run('INSERT INTO reservas (nombre_cliente, cancha, dia, hora, confirmada, numero_telefonico) VALUES (?, ?, ?, ?, ?, ?)',
                [this.nombre_cliente, this.cancha, this.dia, this.hora, this.confirmada ? 1 : 0, this.num],
                (err) => {
                    if (err) {
                        reject("Error al guardar su reserva: " + err.message);
                    } else {
                        resolve("Reserva creada con éxito!");
                    }
                });
        });
    }

    // Métodos estáticos para confirmar, cancelar y consultar reservas
    static confirmarReserva(numero_telefonico, id_reserva) {
        return new Promise((resolve, reject) => {
            db.run('UPDATE reservas SET confirmada = 1 WHERE numero_telefonico = ? AND id = ?', [numero_telefonico, id_reserva], (err) => {
                if (err) {
                    reject("Error al confirmar la reserva: " + err.message);
                } else {
                    resolve(`Reserva ${id_reserva} confirmada ✅`);
                }
            });
        });
        
    }

    static cancelarReserva(numero_cliente, id_reserva) {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM reservas WHERE numero_telefonico = ? AND id = ?', [numero_cliente, id_reserva], (err) => {
                if (err) {
                    reject("Error al cancelar la reserva: " + err.message);
                } else {
                    resolve(`Reserva ${id_reserva} cancelada con éxito. Recuerda que siempre puedes volver a reservar desde el MENÚ`);
                }
            });
        });
    }

    static consultaDoble(numero_cliente, id_cliente) {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM reservas WHERE numero_telefonico = ? AND id = ?`, [numero_cliente, id_cliente], (err, rows) => {
                if (err) {
                    reject("Error al consultar reservas: " + err.message);
                } else {
                    if (rows.length > 0) {
                        resolve(true)
                    } else {
                        resolve(false);
                    }
                }
            });
        });
    }

    static consultarReservas(columna, arg) {
        return new Promise((resolve, reject) => {
            db.all(`SELECT * FROM reservas WHERE ${columna} = ?`, [arg], (err, rows) => {
                if (err) {
                    reject("Error al consultar reservas: " + err.message);
                } else {
                    if (rows.length > 0) {
                        let response = `RESERVAS PARA *${rows[0].nombre_cliente}:*\n\n`;
                        rows.forEach((row) => {
                            response += `${row.id}. Cancha: ${row.cancha}, Día: ${row.dia}, Hora: ${row.hora}, Confirmada: ${row.confirmada ? 'Sí' : 'No'}\n\n`;
                        });
                        // if (!isNaN(arg)){
                        //     if (saveName == rows[0].nombre_cliente) { // PROBLEMA ////////////////////////////
                        //         nCoincide = true;
                        //     } else { 
                        //         nCoincide = false; 
                        //     }
                        //     // callback(saveName);
                        // }
                        resolve(response.trim());
                    } else {
                        reject("No hay reservas para " + arg);
                    }
                }
            });
        });
    }
}

// Función para manejar la reserva de una cancha
function reservarCancha(nombre_cliente, cancha, dia, hora, num) {
    return verificarDisponibilidad(cancha, dia, hora)
        .then(disponible => {
            if (disponible) {
                const reserva = new ReservaCanchaPadel(nombre_cliente, cancha, dia, hora, num);
                return reserva.guardarEnDB();
            } else {
                throw new Error('Cancha no disponible, seleccione otro horario');
            }
        });
}

module.exports = { reservarCancha, ReservaCanchaPadel };