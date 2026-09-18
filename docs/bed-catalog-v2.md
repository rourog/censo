# Catálogo basal y temporales — v2.64 live

El catálogo activo se calcula como `basalBeds + temporaryBeds`. Los 22 lugares
basales se definen en `modules/bedModule.js` y no se editan desde Administración.
Observación comienza con camas 6–10 como cinco temporales activas.

EXTRAS no tiene ubicaciones basales. El área sigue disponible para agregar o
quitar camas, sillas y cunas temporales. El formulario ya no solicita descripción.
Las descripciones históricas y la etiqueta fija de EFE'S se conservan al leer.

`settings/bedCatalog` guarda el catálogo completo. Ejemplo abreviado:

```json
{
  "schemaVersion": 2,
  "catalogVersion": "basal-20260918",
  "basalBeds": ["22 ubicaciones basales como objetos area/cama"],
  "temporaryBeds": [{ "area": "OBSERVACIÓN", "cama": "CAMA 6" }],
  "beds": ["unión ordenada del basal y las temporales"],
  "revision": 1,
  "updatedBy": "UID",
  "updatedAt": "serverTimestamp"
}
```

Una lista `temporaryBeds: []` conserva solo el basal; no reactiva las camas 6–10.
La ausencia del documento inicializa el basal y las cinco temporales iniciales
en una transacción al iniciar sesión. Los documentos antiguos con `beds` se
migran en ese momento, sin esperar una alta/baja manual. Los documentos v2 que
solo contenían temporales se completan sin reponer las que fueron retiradas.
La transacción relee el documento: dos equipos que inicializan simultáneamente
no sobrescriben una configuración ya guardada. Cada cambio guarda basal,
temporales, catálogo efectivo y revisión juntos. Los esquemas/versiones futuros
se rechazan sin reescribirlos; requieren actualizar el cliente.

El listener incluye cambios de metadatos. Solo confirma el catálogo cuando
Firestore lo entrega desde el servidor y sin escrituras pendientes. Mientras
se sincroniza, falla o solo hay caché, se conserva el último catálogo y el censo
de pacientes, pero no se ofrecen camas para asignar ni se modifica el catálogo.
La pantalla de Administración muestra la revisión confirmada y permite reintentar.
Antes de asignar un destino se relee también `settings/bedCatalog` desde el
servidor para detectar una baja todavía no recibida por el listener.

La migración retira del catálogo activo los antiguos lugares EXTRA 1–5,
las intermedias de Observación, las camas 3–4 y silla 3 de Trauma y los
lugares de Choque distintos de cama 1. Conserva ampliaciones personalizadas de
otras áreas, incluidas camas/sillas personalizadas de EXTRAS, como temporales.
PEDILUVIO y EFE'S se conservan con áreas propias.
CHOQUE 1 se reconoce como CAMA 1. Los alias se aplican en memoria: no se migran,
eliminan ni reubican documentos de pacientes. Los pacientes en lugares retirados
siguen visibles hasta traslado o egreso; sus lugares no se ofrecen como libres.

Al operar la versión live:

- Revisar que las reglas existentes de Firestore admitan los nuevos campos de
  `settings/bedCatalog`. Las reglas no están incluidas en este repositorio y no
  se han comprobado ni cambiado contra producción.
- Actualizar todos los equipos/pestañas. Versiones anteriores no entienden el
  nuevo contrato y podrían volver a escribir el catálogo antiguo. El campo
  `beds` facilita la lectura por clientes anteriores, pero deben recargarse.
- La inicialización requiere acceso de escritura con la sesión autenticada.
  Si las reglas lo deniegan, se muestra el error y no se habilitan asignaciones.
  La validación automática usa Firebase simulado; no demuestra permisos reales
  ni sincronización de sesiones abiertas en equipos del hospital.

Las bajas consultan ocupación en servidor y vuelven a comprobar estado local y
sesión dentro de la transacción. Nuevos ingresos y traslados también verifican
ocupación y que el destino siga activo. Estas comprobaciones no constituyen una
reserva atómica entre documentos de pacientes y configuración: una carrera
estrictamente simultánea requeriría un protocolo de reservas compartido y reglas
de servidor, fuera de este cambio.

Pruebas específicas: `node tests/bed-catalog-behavior.mjs`,
`node tests/bed-catalog-sync.mjs`, `node tests/bed-admin-smoke.mjs`,
`node tests/quick-bed-smoke.mjs` y
`node tests/reconversion-soundboard-smoke.mjs`. Usan datos simulados sin acceso
a producción.
