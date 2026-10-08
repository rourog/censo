# Solicitud subrogada

Disponible desde la acción Subrogar de cada paciente, en tabla y tarjetas. Abre un diálogo con una copia de nombre, edad y diagnóstico. Sus cambios no modifican Firebase ni el censo.

El usuario selecciona grupo y servicio, médico, justificación y pronóstico. Otro permite texto libre. Se conserva únicamente la preferencia de médico en almacenamiento local; una nueva solicitud de otro paciente empieza sin servicio ni destino. Las edades que no se pueden separar en número y unidad se conservan como texto.

Imprimir solicitud abre una hoja independiente con los logos del Word institucional, tabla de datos, fundamentación y firmas. Espera las imágenes y fuentes, abre el diálogo de impresión y conserva el modal. Permite imprimir ambulancia y estudio por separado. Cada hoja contiene una copia independiente de los datos del momento. No descarga archivos automáticamente.

La hoja usa tamaño carta y Arial Narrow si está instalada; Nimbus Sans Narrow y Arial son alternativas. Los textos extensos pueden ocupar más de una página. Desactivar los encabezados/pies del navegador evita añadir su URL a la hoja.

## Mantenimiento

- `modules/subrogadaModule.js`: servicios, médicos, justificaciones, texto institucional, formulario e impresión.
- `modules/subrogada.css`: presentación del modal con las variables del tema actual.
- `assets/subrogada/`: logotipos extraídos del Word; ICHISAL conserva el recorte del original.
- `modules/modalModule.js`: acción delegada del botón por identificador de paciente.

## Validación

`node tests/subrogada-behavior.mjs` comprueba edades, escape de texto, catálogos y estructura imprimible.

`node tests/subrogada-browser.mjs` necesita Playwright y Chromium. Puede indicarse `CHROMIUM_EXECUTABLE` para usar un ejecutable existente. Prueba tabla/tarjetas, teclado, móvil, ventanas bloqueadas, dos impresiones sin cierre y aislamiento entre pacientes. Las capturas y PDFs de prueba se escriben en `/tmp/censo-subrogada-qa` o en `SUBROGADA_QA_DIR`.

## Formato desde v2.85

Al abrir el modal, el nombre se capitaliza respetando partículas como «de la» y el diagnóstico pasa a formato de oración, conservando las siglas del catálogo local. Ambos siguen siendo editables y sus correcciones manuales se respetan al imprimir. El censo original no se modifica.

Las firmas se imprimen en el pie de cada hoja, con un margen inferior reservado para evitar superposición con el contenido. El encabezado del modal muestra únicamente la cama y se elimina el aviso de éxito posterior a imprimir.
