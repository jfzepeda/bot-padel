const { DB_HOST, DB_USER, DB_PASSWORD, DB_PORT, DB_NAME } = require('./config');
const { reverseISO } = require('./validacion');
const mysql = require('mysql2/promise');
const moment = require('moment');

const dbConfig = {
    user: DB_USER,
    password: DB_PASSWORD,
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME
};

// Función para crear una conexión a la base de datos
async function getConnection() {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
}

// Función para verificar la disponibilidad de la cancha
async function verificarDisponibilidad(cancha, dia, hora) {
    if (!moment(dia, 'YYYY-MM-DD', true).isValid() || !moment(hora, 'HH:mm', true).isValid()) {
        throw new Error('Formato de fecha u hora no válido.');
    } else {
        const connection = await getConnection();
        const [rows] = await connection.execute(
            'SELECT * FROM reservations WHERE cancha = ? AND dia = ? AND hora = ?',
            [cancha, dia, hora]
        );
        await connection.end();
        return rows.length === 0; // true si la cancha está disponible, false si no
    }
}

// Método para ejecutar consultas SQL
async function ejecutarConsulta(mensaje) {
    const connection = await getConnection();
    const [rows] = await connection.execute(mensaje);
    await connection.end();
    return rows;
}

// Clase para manejar las reservations
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
    async guardarEnDB() {
        const connection = await getConnection();
        try {
            await connection.execute(
                'INSERT INTO reservations (nombre_cliente, cancha, dia, hora, confirmada, numero_telefonico) VALUES (?, ?, ?, ?, ?, ?)',
                [this.nombre_cliente, this.cancha, this.dia, this.hora, this.confirmada ? 1 : 0, this.num]
            );
            await connection.end();
            return ["Reserva creada con éxito!", `📆 Dia: ${reverseISO(this.dia)} \n🕑 Hora ${this.hora} \n🥅 Cancha ${this.cancha} \n🗒️ Confirmada ${this.confirmada ? '✅' : '❌'} `];
        } catch (err) {
            await connection.end();
            throw new Error("Error al guardar su reserva: " + err.message);
        }
    }

    // Métodos estáticos para confirmar, cancelar y consultar reservations
    static async confirmarReserva(numero_telefonico, id_reserva) {
        const connection = await getConnection();
        try {
            await connection.execute(
                'UPDATE reservations SET confirmada = 1 WHERE numero_telefonico = ? AND id = ?',
                [numero_telefonico, id_reserva]
            );
            await connection.end();
            return `Reserva ${id_reserva} confirmada ✅`;
        } catch (err) {
            await connection.end();
            throw new Error("Error al confirmar la reserva: " + err.message);
        }
    }

    static async cancelarReserva(numero_cliente, id_reserva) {
        const connection = await getConnection();
        try {
            await connection.execute(
                'DELETE FROM reservations WHERE numero_telefonico = ? AND id = ?',
                [numero_cliente, id_reserva]
            );
            await connection.end();
            return `Reserva ${id_reserva} cancelada con éxito. Recuerda que siempre puedes volver a reservar desde el MENÚ`;
        } catch (err) {
            await connection.end();
            throw new Error("Error al cancelar la reserva: " + err.message);
        }
    }

    static async consultaDoble(numero_cliente, id_cliente) {
        const connection = await getConnection();
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM reservations WHERE numero_telefonico = ? AND id = ?',
                [numero_cliente, id_cliente]
            );
            await connection.end();
            return rows.length > 0;
        } catch (err) {
            await connection.end();
            throw new Error("Error al consultar reservations: " + err.message);
        }
    }

    static async consultarReservas(columna, arg) {
        const connection = await getConnection();
        try {
            const [rows] = await connection.execute(
                `SELECT * FROM reservations WHERE ${columna} = ?`,
                [arg]
            );
            await connection.end();
            if (rows.length > 0) {
                // console.log('Dentro de las rows')
                let response = `RESERVACIONES PARA *${rows[0].nombre_cliente}:*\n\n`;
                rows.forEach((row) => {
                    response += `🔘 ${row.id}. \n📆 Dia: ${reverseISO(this.dia)} \n🕑 Hora ${this.hora} \n🥅 Cancha ${this.cancha} \n🗒️ Confirmada ${this.confirmada ? '✅' : '❌'} \n\n`;
                });
                console.log(response);
                return response.trim();
            } else {
                throw new Error("No hay reservations para " + arg);
            }
        } catch (err) {
            await connection.end();
            throw new Error("Error al consultar reservations: " + err.message);
        }
    }
}

// Función para manejar la reserva de una cancha
async function reservarCancha(nombre_cliente, cancha, dia, hora, num) {
    console.log('Funcion reservarCancha');
    const disponible = await verificarDisponibilidad(cancha, dia, hora);
    if (disponible) {
        const reserva = new ReservaCanchaPadel(nombre_cliente, cancha, dia, hora, num);
        return reserva.guardarEnDB();
    } else {
        throw new Error('Cancha no disponible, seleccione otro horario');
    }
}

module.exports = { reservarCancha, ReservaCanchaPadel };
