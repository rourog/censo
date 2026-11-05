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
- `effects/christmasScene.js`: left-side tree, six gifts and eight walkers rotating through fourteen characters, including a tuxedo cat at 62% scale and two huskies at 90% scale (same normalized frame size). Rotation excludes every character currently assigned to another walker; layout-aware floor, reduced motion and full cleanup; the tree tosses gifts; Santa, Mrs. Claus and Jesus face the user and randomly toss gifts or wreaths (20 total, 30-second lifetime). Grounded gifts open on click using the open-box sprite, close again after five seconds without resetting their expiry. The tree gives a subtle 420ms shake on click, respecting reduced motion.
- `effects/christmasVillage.js`: approved Hospital Regional de Delicias sprite centered, pine and presents at the left quarter, one snowy house at the far left and two on the right. Responsive spacing keeps the hospital, tree and houses clear of one another. Mounted between the second and third snow bands; responsive sizing, clinical-content clearance and full timer cleanup.
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
