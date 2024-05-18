import sqlite3
from datetime import datetime

# Conexión a la base de datos
conn = sqlite3.connect('botpadel.db')
cursor = conn.cursor()

# Obtener la fecha actual
fecha_actual = datetime.now().date()

# Corroborar fecha
print(fecha_actual)

# Consulta para eliminar filas con fecha anterior a la actual
consulta = "DELETE FROM reservas WHERE dia < ?"

# Ejecutar la consulta
cursor.execute(consulta, (fecha_actual,))

# Guardar los cambios
conn.commit()

# Cerrar la conexión
conn.close()

print("Se han eliminado las filas con fecha anterior a la actualidad.")
