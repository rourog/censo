/*
  CENSO · CIE-10 lesiones · cargador local
  El catálogo permanece comprimido y se descarga solo al abrir la herramienta.

  v2.55:
  - Evita import() para los fragmentos del catálogo.
  - Usa fetch() same-origin con timeout y validación explícita.
  - Añade timeout también a la descompresión para impedir loaders infinitos.
*/

const BUILD = String(window.CensoBuild?.version || `runtime-${Date.now()}`);
const PARTS = 8;
const FETCH_TIMEOUT_MS = 8000;
const DECOMPRESS_TIMEOUT_MS = 8000;

let catalogCache = null;
let catalogPromise = null;

function assetUrl(name) {
  const url = new URL(`./${name}.js`, import.meta.url);
  url.searchParams.set('v', BUILD);
  return url.href;
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function fetchTextWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al cargar ${new URL(url).pathname.split('/').pop()}`);
    }
    return await response.text();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Tiempo agotado al cargar ${new URL(url).pathname.split('/').pop()}`);
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function extractEncodedPart(source, index) {
  const match = String(source).match(/^\s*export\s+default\s+'([^']*)';\s*$/s);
  if (!match?.[1]) throw new Error(`Fragmento CIE-10 ${index} inválido.`);
  return match[1];
}

function withTimeout(promise, timeoutMs, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

async function readCompressedCatalog() {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('Este navegador no permite descomprimir el catálogo CIE-10 local.');
  }

  console.info('[CENSO][CIE10] Descargando catálogo local…');
  const sources = await Promise.all(
    Array.from({ length: PARTS }, (_, index) => fetchTextWithTimeout(assetUrl(`cie10DataPart${index + 1}`)))
  );

  const encoded = sources.map((source, index) => extractEncodedPart(source, index + 1)).join('');
  if (!encoded || encoded.length < 40000) {
    throw new Error('Catálogo CIE-10 incompleto después de descargar los fragmentos.');
  }

  console.info('[CENSO][CIE10] Descomprimiendo catálogo…');
  const bytes = base64ToBytes(encoded);
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));

  const json = await withTimeout(
    new Response(stream).text(),
    DECOMPRESS_TIMEOUT_MS,
    'Tiempo agotado al descomprimir el catálogo CIE-10.'
  );

  console.info('[CENSO][CIE10] Validando catálogo…');
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed) || parsed.length !== 3700) {
    throw new Error(`Catálogo CIE-10 inválido: ${Array.isArray(parsed) ? parsed.length : 0} registros.`);
  }

  console.info(`[CENSO][CIE10] Catálogo listo: ${parsed.length} códigos.`);
  return parsed;
}

export async function loadCie10LesionesRaw() {
  if (catalogCache) return catalogCache;
  if (!catalogPromise) {
    catalogPromise = readCompressedCatalog()
      .then(data => {
        catalogCache = data;
        return data;
      })
      .catch(error => {
        catalogPromise = null;
        console.error('[CENSO][CIE10] Error de carga:', error);
        throw error;
      });
  }
  return catalogPromise;
}
