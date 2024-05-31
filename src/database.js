// database.js
const { DB_HOST, DB_USER, DB_PASSWORD, DB_PORT, DB_NAME } = require('./config');
const { asignarFecha, asignarDia } = require('./validacion');
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

function book(fecha, message) {
    const query = 'INSERT INTO reservas (fecha, reserva) VALUES (?, ?)';
    connection.query(query, [fecha, message], (err, result) => {
        if (err) {
            console.error('Error al registrar usuario:', err);
            return;
        }
        console.log('Reservación registrada exitosamente');
    });
}

function getBookings() {
    let fecha = asignarDia('hoy')
    fecha = asignarFecha(fecha)

    return new Promise((resolve, reject) => {
        const query = 'SELECT reserva FROM reservas WHERE fecha > ?';
        connection.query(query, [fecha], (err, rows) => {
            if (err) {
                return reject(err);
            }
            // if (rows.length > 0) {
            //     const name = rows[0].name;
            //     resolve(name);
            if (rows.length > 0) {
                let response = `Reservas para el ${fecha}:\n\n`;
                rows.forEach((row) => {
                    response += `${row.reserva}\n\n`;
                });
                console.log(response);
                resolve(response);
            } else {
                resolve(undefined); // Si no se encuentra el usuario, devuelve undefined
            }
        });
    });
}

module.exports = { registerUser, lookupUser, getBookings, book };
