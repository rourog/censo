/* Click targets are limited to each bat, never a screen-wide overlay. */
export function createSeasonalAmbient() {
  let layer = null, frame = 0, previous = 0, time = 0, bats = [], config = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function stop() { document.removeEventListener('pointerdown', clickBackground); cancelAnimationFrame(frame); frame = 0; layer?.remove(); layer = null; bats = []; document.body.style.removeProperty('--season-floor-offset'); }
  function floorY() {
    const app = document.getElementById('mainAppContainer');
    const bars = [document.getElementById('censoNewsBar'), app?.querySelector?.('.footer')];
    for (const bar of bars) {
      if (!bar?.getClientRects?.().length) continue;
      const top = bar.getBoundingClientRect?.().top;
      if (Number.isFinite(top) && top > 0 && top <= innerHeight) return top;
    }
    return innerHeight;
  }
  function flightBand(floor) {
    const button = document.getElementById('mainFabBtn');
    const bottom = button?.getClientRects?.().length ? button.getBoundingClientRect?.().bottom : null;
    return { top: Number.isFinite(bottom) ? bottom + 6 : floor - 102, bottom: floor - 4 };
  }
  function fall(bat) {
    if (bat.state !== 'fly') return;
    bat.state = 'fall'; bat.start = time; bat.dropY = bat.drawY;
    bat.button.disabled = true;
  }
  function clickBackground(event) {
    // Content stays above decoration; only clicks on empty background reach a bat.
    const target = event.target;
    if (!target?.closest?.('#mainAppContainer') || target.closest('button, a, input, select, textarea, [contenteditable], .card, .section, .censo-table, .modal-overlay, .header, .footer, .censo-newsbar')) return;
    const bat = [...bats].reverse().find(bat => bat.state === 'fly' && event.clientX >= bat.x && event.clientX <= bat.x + bat.size && event.clientY >= bat.drawY && event.clientY <= bat.drawY + bat.size * 1.5);
    if (bat) fall(bat);
  }
  function makeBat(index, initial) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'seasonal-bat';
    button.setAttribute('aria-label', index === 0 ? 'Hacer caer el murciélago de ojos rojos' : 'Hacer caer un murciélago');
    const sprite = document.createElement('span'); sprite.className = 'seasonal-bat-sprite';
    sprite.style.backgroundImage = `url("${new URL(config.sprite, import.meta.url).href}")`;
    button.appendChild(sprite); layer.appendChild(button);
    const mix = Math.random(), size = config.minSize + (config.maxSize - config.minSize) * mix;
    const bat = { button, sprite, red: index === 0, size, speed: config.speed * (1.25 - .5 * mix) * (.85 + Math.random() * .3), flap: .9 + Math.random() * .2,
      x: initial ? Math.random() * innerWidth : -size, altitude: Math.random(), phase: Math.random() * 5, dir: initial && Math.random() < .5 ? -1 : 1, state: 'fly' };
    button.style.width = `${size}px`; button.style.height = `${size * 1.5}px`;
    button.onclick = () => fall(bat);
    return bat;
  }
  function tick(now) {
    frame = requestAnimationFrame(tick);
    const dt = previous ? Math.min((now - previous) / 1000, .05) : 0; previous = now;
    if (document.hidden || !document.getElementById('mainAppContainer')?.getClientRects().length) return;
    time += dt;
    const floor = floorY();
    document.body.style.setProperty('--season-floor-offset', `${Math.max(0, innerHeight - floor)}px`);
    const band = flightBand(floor);
    layer.style.clipPath = `inset(0 0 ${Math.max(0, innerHeight - floor)}px 0)`;
    bats.forEach((bat, index) => {
      const height = bat.size * 1.5; const top = Math.min(band.top, band.bottom - height), travel = Math.max(0, band.bottom - height - top);
      let y = top + travel * (.5 + .5 * Math.sin(time * .8 + bat.phase + bat.altitude * Math.PI)), row = bat.red ? 0 : 1;
      let cell = Math.floor(time * config.flapFps * bat.flap + bat.phase) % 5;
      if (bat.state === 'fly') {
        bat.x += bat.speed * bat.dir * dt;
        if (bat.x > innerWidth + bat.size) bat.x = -bat.size;
        if (bat.x < -bat.size) bat.x = innerWidth + bat.size;
      } else {
        const elapsed = time - bat.start, ground = floor - height;
        y = Math.min(ground, bat.dropY + 210 * elapsed * elapsed);
        row = 2; cell = Math.min(3, Math.floor(elapsed * config.fallFps));
        if (y >= ground) {
          cell = 4; bat.groundAt ??= time;
          const rest = time - bat.groundAt;
          bat.button.style.opacity = String(Math.min(1, Math.max(0, (config.groundSeconds - rest) / .6)));
          if (rest > config.groundSeconds + 1) { bat.button.remove(); bats[index] = makeBat(index, false); return; }
        }
      }
      bat.drawY = y;
      bat.button.style.transform = `translate(${bat.x}px,${y}px)`;
      bat.sprite.style.backgroundPosition = `${-cell * 16}px ${-row * 24}px`;
      bat.sprite.style.transform = bat.dir < 0 ? `translateX(${bat.size}px) scale(${-bat.size / 16},${bat.size / 16})` : `scale(${bat.size / 16})`;
    });
  }
  function sync(profile, effect) {
    stop(); config = profile?.ambient;
    if (!config || effect !== 'effect-halloween' || reduced.matches) return;
    const app = document.getElementById('mainAppContainer'); if (!app) return;
    layer = document.createElement('div'); layer.className = 'seasonal-bats'; app.appendChild(layer);
    document.addEventListener('pointerdown', clickBackground);
    time = 0; previous = 0; bats = Array.from({ length: config.count }, (_, index) => makeBat(index, true));
    frame = requestAnimationFrame(tick);
  }
  let currentProfile = null, currentEffect = null;
  reduced.addEventListener('change', () => sync(currentProfile, currentEffect));
  return { sync(profile, effect) { currentProfile = profile; currentEffect = effect; sync(profile, effect); }, stop };
}
