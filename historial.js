// historial.js
// Entrada del historial modular.
// Estructura esperada:
//   historial.html
//   historial.js
//   modules/historialModule.js
//   modules/firebaseModule.js
//   modules/utilsModule.js

const BUILD = "historial-admin-v3-2-20260522";

window.HistorialBuild = BUILD;
console.info("[HISTORIAL] historial.js cargado. BUILD:", BUILD);

async function loadHistorialModule() {
  const path = `./modules/historialModule.js?v=${BUILD}`;

  try {
    const module = await import(path);
    console.info("[HISTORIAL] historialModule cargado desde:", path);
    return module;
  } catch (error) {
    console.error("[HISTORIAL] No se pudo cargar:", path, error);
    throw error;
  }
}

function showBootError(error) {
  console.error("[HISTORIAL] Error fatal de arranque:", error);

  const btn = document.getElementById("btnEnter");
  const input = document.getElementById("nipInput");
  const loginScreen = document.getElementById("loginScreen");

  if (input) input.disabled = true;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = "ERROR AL CARGAR HISTORIAL";
  }

  if (loginScreen) {
    const existing = document.getElementById("historialBootError");
    if (existing) existing.remove();

    const box = document.createElement("div");
    box.id = "historialBootError";
    box.style.cssText = [
      "max-width: 420px",
      "margin-top: 14px",
      "padding: 12px",
      "border: 1px solid rgba(239,68,68,.45)",
      "border-radius: 10px",
      "color: #fecaca",
      "background: rgba(239,68,68,.12)",
      "font-family: Fira Code, monospace",
      "font-size: .72rem",
      "line-height: 1.45",
      "text-align: left",
      "white-space: pre-wrap"
    ].join(";");

    box.textContent =
      "No se pudo cargar modules/historialModule.js.\n\n" +
      "Estructura esperada en el root del repo:\n" +
      "historial.html\n" +
      "historial.js\n" +
      "modules/historialModule.js\n" +
      "modules/firebaseModule.js\n" +
      "modules/utilsModule.js\n\n" +
      "Prueba directa:\n" +
      "https://rourog.github.io/censo/modules/historialModule.js?v=" + BUILD + "\n\n" +
      "Detalle: " + (error?.message || String(error));

    loginScreen.appendChild(box);
  }
}

loadHistorialModule()
  .then(({ createHistorialModule }) => {
    if (typeof createHistorialModule !== "function") {
      throw new Error("historialModule.js cargó, pero no exporta createHistorialModule().");
    }

    const historial = createHistorialModule({ build: BUILD });
    window.HistorialApp = historial;

    if (!historial || typeof historial.boot !== "function") {
      throw new Error("createHistorialModule() no devolvió un objeto con boot().");
    }

    historial.boot();
  })
  .catch(showBootError);
