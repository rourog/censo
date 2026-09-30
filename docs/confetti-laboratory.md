# Laboratorio de confetti y sincronización propuesta

La página de prueba está en https://rourog.github.io/labs/experimentos/confetti/. Es independiente del censo y usa datos ficticios.

Ocho efectos: confetti normal, morado/naranja, telarañas, telarañas con confetti, murciélagos, remolino, chispas y humo violeta. Los controles permiten cambiar cantidad, duración, apertura y fondo, descargar los ajustes y probar varias pantallas.

La demo usa BroadcastChannel para otras pestañas del mismo navegador y origen. No sincroniza dispositivos diferentes; las tres mini vistas son una simulación del mismo evento. La integración preparada para el censo utiliza su escucha existente de Firestore.

## Integración en el censo

patientModule mantiene un conjunto de IDs de la última colección confirmada por servidor. Ignora la primera carga, snapshots de caché y escrituras pendientes. Una eliminación confirmada dispara una sola animación por lote en cada pantalla conectada. El emisor también la recibe; modalModule deja de lanzar su segundo efecto local.

Se solicita includeMetadataChanges para recibir la confirmación aunque la eliminación ya se hubiese visto de forma optimista. Tras una carga de caché sin escrituras pendientes se reinicia la referencia, evitando reproducir borrados antiguos al reconectar.

No se añaden colecciones ni se requieren reglas nuevas. No se transmiten datos clínicos adicionales. Los filtros y la edición inline no desactivan esta detección porque se observa la colección original.

Esto proporciona reproducción tras la confirmación recibida por cada dispositivo, con pequeñas diferencias por latencia; no promete simultaneidad exacta. Las pantallas cerradas u offline no reproducen eventos que ocurrieron mientras estaban desconectadas. Una pestaña oculta puede tener su animación limitada por el navegador.

La versión 2.74 incorpora la selección habitual y la celebración de Halloween; consulta celebration-effects.md.

## Validación

El controlador del laboratorio se ejecutó con un canvas simulado para las ocho opciones y se verificó la reproducción en las cuatro vistas y la deduplicación. El detector de eliminaciones se probó con primera carga, escritura pendiente, confirmación, repetición, caché/reconexión y borrado en lote.

La integración final se verificó con la suite completa del repositorio y pruebas de duraciones, limpieza y desvanecimiento antes de publicar.
