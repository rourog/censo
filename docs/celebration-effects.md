# Celebraciones al borrar

La escucha de Firestore confirma el borrado en cada pantalla conectada. Primera carga, caché, cambios pendientes y snapshots repetidos no reproducen efectos. Un borrado en lote provoca un efecto por pantalla; modalModule ya no añade otro disparo local.

En Apariencia se elige la celebración habitual: confeti existente (por defecto), Caleb Miller/Crossette durante 5 segundos o globos Artur Bień durante 5 segundos. Halloween sustituye la elección habitual por un estallido de murciélagos durante 3 segundos.

Caleb conserva el motor original. Durante los últimos 850 ms la capa reduce gradualmente su opacidad antes de limpiar partículas y retirarse. Globos y murciélagos también desaparecen gradualmente. Las capas no capturan clics; las modales permanecen encima.

Sonido de murciélagos opcional y apagado por defecto. Aleteo/chillidos sintetizados audibles; no son grabaciones ultrasónicas reales. Cada dispositivo debe habilitarlo y haber interactuado con la página para permitir audio. Si no puede reproducirse, el efecto visual continúa.

Las pestañas ocultas o desconectadas no reproducen celebraciones atrasadas. La sincronización depende de la confirmación recibida por dispositivo, sin simultaneidad exacta. No se añaden colecciones ni datos clínicos.

Créditos y licencias en assets/celebrations/vendor/NOTICE.md. Laboratorio independiente: https://rourog.github.io/labs/experimentos/confetti/.

## Controles de apariencia

El tema se controla con botones Estacional/Normal. Estacional conserva el calendario automático (o la selección manual anterior). Celebraciones permite todas las animaciones, elegidas al azar entre confeti, fuegos artificiales y globos, añadiendo murciélagos si hay temporada activa; el modo estacional conserva la celebración habitual fuera de temporada.

Sonidos ON/OFF usa la preferencia existente `censo-celebration-sound` para murciélagos y respuesta de botones. El clic dura 120 ms y el pop al pasar el cursor 45 ms; el hover requiere audio previamente desbloqueado por un gesto. No hay pop en pantallas táctiles ni botones deshabilitados.

## Fantasmas ambientales de Halloween

El vuelo ambiental conserva seis criaturas simultáneas. Cada diez apariciones de murciélagos se programa un fantasma; el puesto de ojos rojos permanece reservado a un murciélago, por lo que puede demorar una aparición adicional. Los fantasmas usan el sheet original del usuario de 256×256, celdas de 32×32, a 12 FPS; vuelan más despacio y se disuelven en el mismo punto al hacer clic.

Apariencia → Fantasmas permite azules, rosas o ambos (`censo-ghost-color`, local). Se mantiene la banda dinámica debajo de pacientes y el límite del banner. Esta incorporación afecta al ambiente, sin cambiar las celebraciones al borrar.
