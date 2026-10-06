# Activación del contador Halloween

En Firestore del proyecto `censo-de-urgencias`, añadir el contenido de
`halloween.rules.fragment` dentro del bloque existente
`match /databases/{database}/documents` y publicar las reglas. No reemplazar
las reglas actuales ni conceder acceso general a toda la base de datos.

El cliente crea automáticamente `seasonalStats/halloween-2026` con el primer
clic. No requiere índices, documentos iniciales ni cambios en pacientes.
Los totales se escuchan en tiempo real después de iniciar sesión.
Cada clic crea un documento inmutable en `clicks` y aumenta solo el contador
correspondiente en la misma transacción. Los reintentos usan el mismo ID.

Verificación con dos pantallas autenticadas: hacer clic en un murciélago y
un fantasma; los dos totales deben aumentar en ambas pantallas. Un segundo
clic sobre un sprite que ya cae no debe sumar. Recargar durante una pérdida
de conexión debe conservar los clics pendientes en ese navegador.
La noticia se muestra cuando se reciben valores confirmados del servidor;
si las reglas deniegan acceso, se conserva la cola y no se inventa un total.

No se ha verificado ni desplegado este fragmento con el proyecto Firebase:
este repositorio no contiene las reglas actuales ni acceso administrativo.
Las reglas protegen la integridad de los incrementos, pero un cliente
modificado autenticado podría generar clics ficticios; es un contador lúdico.
