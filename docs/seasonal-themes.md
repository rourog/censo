# Temas estacionales

`modules/seasonalTheme.js` contiene el catálogo. Cada perfil define:

- `months`: meses de activación automática, calculados en America/Mexico_City.
- `defaults`: fondo, acento y animación ambiental predeterminados.
- `banner`: color fijo, texto, acento, fuente del título y símbolo de los nodos del plexus.
- `ambient`: sprite y parámetros de la animación interactiva.
- `confetti`: colores y un ID opcional de animación alternativa.

Halloween se activa automáticamente del 1 al 31 de octubre. Puede probarse cualquier día desde Apariencia > Temporada. Sin temporada recupera la apariencia normal. Se comprueba el cambio de fecha cada minuto y al volver a la pestaña.

Los ajustes normales `censo-base`, `censo-accent`, `censo-effect` se conservan. Cada perfil guarda sus personalizaciones en `censo-season-<id>-<parte>`. Restablecer apariencia elimina solo las personalizaciones del perfil activo. Esto permite un nuevo valor predeterminado por festividad sin sobrescribir los ajustes normales.

Halloween usa seis murciélagos de 35–55 px: uno rojo y cinco blancos. Los pequeños avanzan más rápido; vuelo base 100 px/s, aleteo y caída 12 fps, con variación individual. El último fotograma se reserva para el impacto inferior; el bulto permanece tres segundos y se desvanece. La capa completa no captura clics: solo sus botones individuales. Movimiento reducido desactiva los murciélagos y detiene la niebla. La decoración no se imprime.

La niebla reutiliza las olas SVG existentes con blur y máscara gradual. El plexus conserva la relación entre pacientes y nodos; únicamente sustituye su representación por un símbolo configurable.

La fuente serif de Halloween y el símbolo de calabaza son provisionales y reemplazables. Para una fuente propia, añadir su archivo y `@font-face` a `seasonalTheme.css`, y actualizar `banner.titleFont`. No hay fuente remota nueva.

`confetti.effect: null` conserva canvas-confetti con la paleta estacional. Una futura animación se registra mediante `registerSeasonalConfetti(id, renderer)`; al no encontrarla se utiliza canvas-confetti. Este cambio no sustituye las animaciones de eliminación de pacientes.

Añadir un perfil al catálogo lo incorpora al selector. Animaciones ambientales nuevas requieren un controlador en `seasonalAmbient.js` y su ID en el catálogo de efectos de `themeModule.js`; las seis responsabilidades permanecen separadas.
