# Seasonal Engine 2.0 (beta)

The engine is independent of the clinical workflow and **must never write to Firestore**.

## Layout

- `calendar.js`: date matching in `America/Chihuahua`, including ranges crossing New Year.
- `preferences.js`: local persistent enable/disable, tab-scoped beta preview, November legacy switch compatibility.
- `registry.js`: declares available seasons and lazy-loads only the active renderer.
- `engine.js`: the single lifecycle manager. It starts/stops seasons, forwards read-only patient snapshots, checks the calendar every 60 seconds and rechecks on tab focus.
- `effects/lifecycle.js`: cleanup scope for timers, animation frames, DOM observers and event listeners in **new** effects. November still uses its existing internal cleanup, now owned by the engine.
- `seasons/november/config.js`: declarative palette, calendar, decorations and celebration settings.
- `seasons/christmas/config.js`: December calendar, graphite/red defaults and Christmas celebration.
- `seasons/christmas/visuals.js`: Christmas header, snow and interactive lights controller.
- `effects/snowfall.js`: one low-DPR Canvas with denser layered snow (up to 240 flakes, about twice the original density), larger flakes, and opaque blue/white depth tones.
- `effects/christmasLights.js`: 30 fixed multicolor patient bulbs on continuous green U-shaped garlands, clear unlit glass, transient pointer/keyboard illumination, 20s shuffle, glass shards/electric sparks and 2s repair.
- `effects/christmasScene.js`: complete standalone snowy tree on the left (136×192 padded frame), six presents, three dedicated people (Santa, Mrs. Claus, Jesus) and at most three animals. Animal replacements happen only fully off screen, without duplicates; the tuxedo cat and two huskies get priority, interleaved with every deer variant. Gnomes are inactive. Cat scale is 62%, huskies 90%. The tree tosses gifts and gives a subtle 420ms shake; the three givers face the user then toss a random gift or wreath (20 total, 30-second lifetime). Grounded gifts open and close after five seconds. Layout, reduced motion and disposal are preserved.
- `effects/christmasVillage.js`: the snowy Hospital Regional de Delicias remains centered behind the closest snow band. Houses are temporarily removed; their assets are retained for later use. Responsive sizing, clinical-content clearance and full timer cleanup.
- `effects/christmasSky.js`: blue day/night sky with the approved pixel sun/moon. Beta starts at 09:00; one real minute equals one simulated hour (24-minute loop). Clicking the sun advances 12 simulated hours; clicking the moon rewinds 12 hours. Both follow opposite positions on an elliptical orbit, animating a 180-degree turn over 2.4 seconds while the palette follows the intermediate time. Subtle transparency increases near the horizon. Celestial art uses 1.8px blur in a separate background layer beneath the snow, landscape and actors; transparent safe-area controls preserve interaction. Dawn/dusk palettes use golden/orange horizons, coral middle bands and violet upper skies. Repeated clicks are blocked while turning; reduced motion applies the time change immediately. Layout stays below clinical content; no record writes or system-clock changes.
- `effects/christmasFireworks.js`: explicit 5s celebration with disposable Canvas.

## Renderer interface

```js
export function initSeason(app, {managed=true}={}) {
  // Create decorative DOM/canvas; never modify patient state.
  return {
    syncPatients(patients) { /* render only */ },
    getStatus() { return { /* diagnostics */ }; },
    dispose() { /* remove DOM, clear timers/observers */ }
  };
}
```

Register a new season's configuration in `registry.js` and a lazy loader in `loadSeasonController`; do not add season-specific code to `appModule.js` or `themeModule.js`.

## Beta laboratory

Appearance → **SEASONAL ENGINE 2.0 · BETA**:
- **Automático** uses the real Chihuahua calendar.
- **Vista previa: Día de Muertos** forces the registered November renderer for this tab without changing the system date.
- **Vista previa: Navidad** activates Christmas visuals in November without changing the system date.
- **Decoración de temporada** toggles decorations and persists locally.

Only beta includes this control. `main` remains independent, and both sites still share their existing Firebase backend; avoid clinical test writes.

## Deployment

Publishing a change to `beta` triggers GitHub Pages: `/censo/beta/`.
For every beta build, change beta's `version.json` build to bust cached modules and styles. Promote to main only after reviewing the beta change.
