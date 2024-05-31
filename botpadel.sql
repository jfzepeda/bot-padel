-- CREATE TABLE IF NOT EXISTS reservas (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     nombre_cliente TEXT NOT NULL,
--     cancha INTEGER NOT NULL,
--     dia DATE NOT NULL,
--     hora TEXT NOT NULL,
--     confirmada BOOLEAN NOT NULL DEFAULT 0,
--     numero_telefonico INTEGER NOT NULL
-- );

-- SELECT * FROM reservas;s
-- SELECT * FROM reservas WHERE nombre_cliente = "Diego";
-- SELECT * FROM reservas WHERE numero_telefonico = "5213411479199";

-- DELETE FROM reservas;
-- DELETE FROM reservas WHERE numero_telefonico = "5213411479199";
-- DELETE FROM reservas WHERE nombre_cliente = "Felipe";

-- ALTER TABLE reservas ADD numero_telefonico TEXT;

-- DROP TABLE reservas;