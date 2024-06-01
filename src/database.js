// database.js
const { DB_HOST, DB_USER, DB_PASSWORD, DB_PORT, DB_NAME } = require('./config');
const { reverseISO, asignarRow } = require('./validacion');
const moment = require('moment');
const mysql = require('mysql2');

// Configuración de la conexión a la base de datos MySQL
const connection = mysql.createConnection({
    user: DB_USER,
    password: DB_PASSWORD,
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME
});

// Conectar a la base de datos
connection.connect((err) => {
    if (err) {
        console.error('Error de conexión a MySQL:', err);
        return;
    }
    console.log('Conectado a la base de datos MySQL');
});

// Función para registrar un usuario
function registerUser(phone, name) {
    const query = 'INSERT INTO clients (phone, nombre) VALUES (?, ?)';
    connection.query(query, [phone, name], (err, result) => {
        if (err) {
            console.error('Error al registrar usuario:', err);
            return;
        }
        console.log('Usuario registrado exitosamente');
    });
}

// Función para buscar un usuario por su número de teléfono
function lookupUser(phone) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT nombre FROM clients WHERE phone = ?';
        connection.query(query, [phone], (err, rows) => {
            if (err) {
                return reject(err);
            }
            if (rows.length > 0) {
                const name = rows[0].nombre;
                resolve(name);
            } else {
                resolve(undefined); // Si no se encuentra el usuario, devuelve undefined
            }
        });
    });
}

// Método para ejecutar consultas SQL
async function ejecutarConsultaGPT(mensaje) {
    return new Promise((resolve, reject) => {
        connection.query(mensaje, (err, rows) => {
            if (err) {
                reject(new Error('Error al ejecutar la consulta: ' + err.message));
            } else {
                resolve(rows);
            }
        });
    });
}

// Función para consultar las reservas de un usuario
async function getID(row, numero) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM reservations WHERE numero_telefonico = ?`;
        connection.query(query, [numero], (err, rows) => {
            if (err) {
                return reject(err);
            }
            if (rows.length > 0) {
                let response = rows[row-1].id; 
                // response = response.trim();
                resolve(response);
            } else {
                resolve('No hay reservaciones existentes'); // Si no se encuentra el usuario, devuelve undefined
            }
        });
    });
}

// Función para verificar la disponibilidad de la cancha
async function verificarDisponibilidad(cancha, dia, hora) {
    if (!moment(dia, 'YYYY-MM-DD', true).isValid() || !moment(hora, 'HH:mm', true).isValid()) {
        throw new Error('Formato de fecha u hora no válido.');
    } else {
        return new Promise(async (resolve, reject) => {

            const query = 'SELECT * FROM reservations WHERE cancha = ? AND dia = ? AND hora = ?';
            connection.query(query, [cancha, dia, hora], (err, rows) => {
                if (err) {
                    reject(new Error('Error al verificar la disponibilidad de la cancha: ' + err.message))
                } else {
                    resolve (rows.length == 0); // true si la cancha está disponible, false si no
                }
            })
        });
    }
}

// Función para guardar una reserva en la base de datos
async function guardarReservaEnDB(nombre_cliente, cancha, dia, hora, confirmada, num) {
    return new Promise(async (resolve, reject) => {
        try {
            const query = 'INSERT INTO reservations (nombre_cliente, cancha, dia, hora, confirmada, numero_telefonico) VALUES (?, ?, ?, ?, ?, ?)';
            connection.query(query, [nombre_cliente, cancha, dia, hora, confirmada ? 1 : 0, num], async (err, result) => {
                if (err) {
                    return reject(new Error("Error al guardar su reserva: " + err.message));
                }
                const id_reserva = result.insertId;
                // const response = [id_reserva, "Reserva creada con éxito!", `📆 Dia: ${reverseISO(dia)} \n🕑 Hora ${hora} \n🥅 Cancha ${cancha} \n🗒️ Confirmada ${confirmada ? '✅' : '❌'} `];
                const response = [`🔘 ID de reserva: ${id_reserva} \n📆 Dia: ${reverseISO(dia)} \n🕑 Hora ${hora} \n🥅 Cancha ${cancha} \n🗒️ Confirmada ${confirmada ? '✅' : '❌'} `];
                resolve('Reserva creada con éxito! 🎉\n\n' + response);
            });
        } catch (err) {
            reject(new Error("Error al guardar su reserva: " + err.message));
        }
    });
}


// Función para confirmar una reserva
async function confirmarReserva(numero_telefonico, id_reserva) {
    return new Promise((resolve, reject) => {
        const query = 'UPDATE reservations SET confirmada = 1 WHERE numero_telefonico = ? AND id = ?';
        connection.query(query, [numero_telefonico, id_reserva], async (err, result) => {
            if (err) {
                return reject(new Error("Error al confirmar la reserva: " + err.message));
            }
            if (result.affectedRows > 0) {
                resolve(`Reserva ${id_reserva} confirmada ✅`);
            } else {
                resolve('No se encontró la reserva para confirmar');
            }
        });
    });
}

// Función para cancelar una reserva
async function cancelarReserva(numero_cliente, id_reserva) {
    return new Promise(async (resolve, reject) => {

            const query = 'DELETE FROM reservations WHERE numero_telefonico = ? AND id = ?';
            connection.query(query, [numero_cliente, id_reserva], async (err, result) => {
                if (err) {
                    return reject(new Error("Error al cancelar la reserva: " + err.message));
                }
                if (result.affectedRows > 0) {
                    resolve(`Reserva ${id_reserva} cancelada con éxito! ❌`);
                } else {
                    resolve('No se encontró la reserva para cancelar');
                }
            });
    });
}


// Función para consultar si hay duplicados
async function consultaDoble(numero_cliente, id_cliente) {
    return new Promise(async (resolve, reject) => {
        try {
            const query = 'SELECT * FROM reservations WHERE numero_telefonico = ? AND id = ?';
            connection.query(query, [numero_cliente, id_cliente], async (err, rows) => {
                if (err) {
                    return reject(new Error("Error al consultar reservations: " + err.message));
                }
                resolve(rows.length > 0);
            });
        } catch (err) {
            reject(new Error("Error al consultar reservations: " + err.message));
        }
    });
}


// Función para consultar las reservas de un usuario
function consultarReservas(columna, arg) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM reservations WHERE ${columna} = ?`;
        connection.query(query, [arg], (err, rows) => {
            if (err) {
                return reject(err);
            }
            if (rows.length > 0) {
                let response = `Reservaciones para *${rows[0].nombre_cliente}:*\n\n`;
                rows.forEach((row) => {
                    response += `🔘 ID de reserva: ${row.id} \n📆 Dia: ${reverseISO(row.dia)} \n🕑 Hora ${row.hora} \n🥅 Cancha ${row.cancha} \n🗒️ Confirmada ${row.confirmada ? '✅' : '❌'} \n\n`;
                });
                response = response.trim();
                resolve(response);
            } else {
                resolve('No hay reservaciones existentes'); // Si no se encuentra el usuario, devuelve undefined
            }
        });
    });
}

// Función para manejar la reserva de una cancha
async function reservarCancha(nombre_cliente, court, day, hour, num) {
    const disponible = await verificarDisponibilidad(court, day, hour);
    if (disponible) {
        return await guardarReservaEnDB(nombre_cliente, court, day, hour, false, num);
    } else {
        throw new Error('Cancha no disponible, seleccione otro horario');
    }
}


module.exports = { reservarCancha, consultaDoble, consultarReservas, confirmarReserva, cancelarReserva, 
    registerUser, lookupUser, ejecutarConsultaGPT, getID };
