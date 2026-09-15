/*
  CENSO · CIE-10 lesiones · cargador local
  El catálogo permanece comprimido y se descarga solo al abrir la herramienta.
*/

const BUILD = String(window.CensoBuild?.version || `runtime-${Date.now()}`);
let catalogCache = null;
let catalogPromise = null;

function moduleUrl(name) {
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

async function readCompressedCatalog() {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('Este navegador no permite descomprimir el catálogo CIE-10 local.');
  }

  const modules = await Promise.all(
    Array.from({ length: 8 }, (_, index) => import(moduleUrl(`cie10DataPart${index + 1}`)))
  );
  const encoded = modules.map(module => module.default || '').join('');
  if (!encoded || encoded.length < 40000) throw new Error('Catálogo CIE-10 incompleto.');

  const bytes = base64ToBytes(encoded);
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  const json = await new Response(stream).text();
  const parsed = JSON.parse(json);

  if (!Array.isArray(parsed) || parsed.length < 3000) {
    throw new Error('El catálogo CIE-10 no superó la validación de integridad.');
  }
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
        throw error;
      });
  }
  return catalogPromise;
}
