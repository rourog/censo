# Celebraciones al borrar

La escucha de Firestore confirma el borrado en cada pantalla conectada. Primera carga, caché, cambios pendientes y snapshots repetidos no reproducen efectos. Un borrado en lote provoca un efecto por pantalla; modalModule ya no añade otro disparo local.

En Apariencia se elige la celebración habitual: confeti existente (por defecto), Caleb Miller/Crossette durante 5 segundos o globos Artur Bień durante 5 segundos. Halloween sustituye la elección habitual por un estallido de murciélagos durante 3 segundos.

Caleb conserva el motor original. Durante los últimos 850 ms la capa reduce gradualmente su opacidad antes de limpiar partículas y retirarse. Globos y murciélagos también desaparecen gradualmente. Las capas no capturan clics; las modales permanecen encima.

Sonido de murciélagos opcional y apagado por defecto. Aleteo/chillidos sintetizados audibles; no son grabaciones ultrasónicas reales. Cada dispositivo debe habilitarlo y haber interactuado con la página para permitir audio. Si no puede reproducirse, el efecto visual continúa.

Las pestañas ocultas o desconectadas no reproducen celebraciones atrasadas. La sincronización depende de la confirmación recibida por dispositivo, sin simultaneidad exacta. No se añaden colecciones ni datos clínicos.

Créditos y licencias en assets/celebrations/vendor/NOTICE.md. Laboratorio independiente: https://rourog.github.io/labs/experimentos/confetti/.
