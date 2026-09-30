# Temas estacionales

`modules/seasonalTheme.js` contiene el catálogo. Cada perfil define:

- `months`: meses de activación automática, calculados en America/Mexico_City.
- `defaults`: fondo, acento y animación ambiental predeterminados.
- `banner`: color fijo, texto, acento, fuente del título y símbolo de los nodos del plexus.
- `ambient`: sprite y parámetros de la animación interactiva.
- `confetti`: colores y un ID opcional de animación alternativa.

Halloween se activa automáticamente del 1 al 31 de octubre. Puede probarse cualquier día desde Apariencia > Temporada. Sin temporada recupera la apariencia normal. Se comprueba el cambio de fecha cada minuto y al volver a la pestaña.

Los ajustes normales `censo-base`, `censo-accent`, `censo-effect` se conservan. Cada perfil guarda sus personalizaciones en `censo-season-<id>-<parte>`. Restablecer apariencia elimina solo las personalizaciones del perfil activo. Esto permite un nuevo valor predeterminado por festividad sin sobrescribir los ajustes normales.

Halloween usa seis murciélagos de 35–55 px: uno rojo y cinco blancos. Los pequeños avanzan más rápido; vuelo base 100 px/s, aleteo y caída 12 fps, con variación individual. El último fotograma se reserva para el impacto inferior; el bulto permanece tres segundos y se desvanece sobre el borde superior de la barra de noticias visible, o del pie del censo si aquella está oculta. La capa está detrás del contenido clínico (z-index 1, contenido 10). Los clics sobre tarjetas y controles nunca activan caídas; se permite interactuar con murciélagos visibles en los huecos. Movimiento reducido desactiva los murciélagos y detiene la niebla. La decoración no se imprime.

La niebla reutiliza las olas SVG existentes con desenfoque de 6 px, cuatro capas claras y velocidades de 16–38 segundos para conservar las ondas visibles. El plexus conserva la relación entre pacientes y nodos; únicamente sustituye su representación por un símbolo configurable. Las calabazas se dibujan con el color del grupo original; el grupo sin área usa naranja.

Halloween utiliza Creepster de Google Fonts únicamente para el título. Su @font-face incluye font-display: swap y una fuente serif de respaldo si la descarga no está disponible. El banner combina naranja intenso en los extremos y morado central. El confetti utiliza exclusivamente tonos morados y naranjas. El símbolo de calabaza sigue siendo reemplazable desde banner.nodeGlyph.

`confetti.effect: null` conserva canvas-confetti con la paleta estacional. Una futura animación se registra mediante `registerSeasonalConfetti(id, renderer)`; al no encontrarla se utiliza canvas-confetti. Este cambio no sustituye las animaciones de eliminación de pacientes.

Añadir un perfil al catálogo lo incorpora al selector. Animaciones ambientales nuevas requieren un controlador en `seasonalAmbient.js` y su ID en el catálogo de efectos de `themeModule.js`; las seis responsabilidades permanecen separadas.

El vuelo se limita a una franja inferior entre Nuevo ingreso y el piso. Durante effect-halloween el botón se sitúa a 108 px sobre el piso para reservar espacio a los sprites de 35–55 px; las alturas se recalculan al cambiar el tamaño de pantalla o la barra inferior.

En tabla de escritorio, la franja se calcula desde el borde inferior visible de scrollTableWrapper hasta la barra inferior. Se recalcula durante el vuelo, por lo que responde a filas nuevas, expansión de filas, desplazamiento y cambios de pantalla. Si no cabe el sprite completo, se oculta hasta recuperar espacio. Kanban conserva su franja bajo el botón. Los bultos aterrizados usan una capa de z-index 11, sin capturar clics, y un margen de 20 px sobre la barra; el vuelo permanece detrás del contenido clínico.
