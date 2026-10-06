/* Decorative creatures share the free flight band behind patient content. */
const LANDING_MARGIN = 20;
export function createSeasonalAmbient({ onHit = () => {} } = {}) {
  let layer = null, groundLayer = null, frame = 0, previous = 0, time = 0, bats = [], config = null, batAppearances = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function stop() { document.removeEventListener('pointerdown', clickBackground); cancelAnimationFrame(frame); frame = 0; layer?.remove(); groundLayer?.remove(); layer = null; groundLayer = null; bats = []; document.body.style.removeProperty('--season-floor-offset'); }
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
    const app = document.getElementById('mainAppContainer');
    if (innerWidth > 768 && app?.classList?.contains('table-is-active')) {
      const table = document.getElementById('scrollTableWrapper');
      const header = app.querySelector?.('.header');
      const headerBottom = header?.getBoundingClientRect?.().bottom || 80;
      const tableBottom = table?.getClientRects?.().length ? table.getBoundingClientRect().bottom : headerBottom;
      return { top: Math.max(headerBottom, tableBottom) + 8, bottom: floor - 8, dynamic: true };
    }
    const button = document.getElementById('mainFabBtn');
    const bottom = button?.getClientRects?.().length ? button.getBoundingClientRect?.().bottom : null;
    return { top: Number.isFinite(bottom) ? bottom + 6 : floor - 102, bottom: floor - 4 };
  }
  function fall(bat) {
    if (bat.state !== 'fly') return;
    bat.state = bat.ghost ? 'vanish' : 'fall'; bat.start = time; bat.dropY = bat.drawY;
    bat.button.disabled = true;
    const point = document.createElement('span');
    point.className = 'seasonal-hit-point'; point.textContent = '+1';
    point.setAttribute('aria-hidden', 'true');
    point.style.left = `${bat.x + bat.size / 2}px`;
    point.style.top = `${bat.drawY}px`;
    groundLayer.appendChild(point);
    point.addEventListener('animationend', () => point.remove(), { once: true });
    // Detached from the moving sprite so falling/vanishing never cuts it short.
    setTimeout(() => point.remove(), 1400);
    onHit(bat.ghost ? 'ghosts' : 'bats');
  }
  function clickBackground(event) {
    // Content stays above decoration; only clicks on empty background reach a bat.
    const target = event.target;
    if (!target?.closest?.('#mainAppContainer') || target.closest('button, a, input, select, textarea, [contenteditable], .card, .section, .censo-table, .modal-overlay, .header, .footer, .censo-newsbar')) return;
    const bat = [...bats].reverse().find(bat => bat.state === 'fly' && bat.button.style.visibility !== 'hidden' && event.clientX >= bat.x && event.clientX <= bat.x + bat.size && event.clientY >= bat.drawY && event.clientY <= bat.drawY + bat.size * (bat.ghost ? 19 / 12 : 1.5));
    if (bat) fall(bat);
  }
  function makeBat(index, initial) {
    // A single ghost follows ten bat appearances. The red-eyed slot stays a bat.
    const ghost = !!config.ghosts && index !== 0 && batAppearances >= config.ghosts.batsPerGhost;
    if (ghost) batAppearances = 0; else batAppearances++;
    const settings = ghost ? config.ghosts : config;
    const colorPreference = localStorage.getItem('censo-ghost-color');
    const color = ghost ? (['cyan', 'pink'].includes(colorPreference) ? colorPreference : Math.random() < .5 ? 'cyan' : 'pink') : null;
    const button = document.createElement('button');
    button.style.visibility = 'hidden'; button.tabIndex = -1;
    button.type = 'button'; button.className = ghost ? 'seasonal-bat seasonal-ghost' : 'seasonal-bat';
    button.setAttribute('aria-label', ghost ? `Hacer desaparecer el fantasma ${color === 'pink' ? 'rosa' : 'azul'}` : index === 0 ? 'Hacer caer el murciélago de ojos rojos' : 'Hacer caer un murciélago');
    const sprite = document.createElement('span'); sprite.className = ghost ? 'seasonal-bat-sprite seasonal-ghost-sprite' : 'seasonal-bat-sprite';
    const url = new URL(settings.sprite, import.meta.url);
    url.searchParams.set('v', String(window.CensoBuild?.version || '2.77'));
    sprite.style.backgroundImage = `url("${url.href}")`;
    button.appendChild(sprite); layer.appendChild(button);
    const mix = Math.random(), size = settings.minSize + (settings.maxSize - settings.minSize) * mix;
    // Every new appearance independently chooses its entry edge.
    const dir = Math.random() < .5 ? -1 : 1;
    const bat = { button, sprite, ghost, color, red: index === 0, size, speed: settings.speed * (1.25 - .5 * mix) * (.85 + Math.random() * .3), flap: .9 + Math.random() * .2,
      x: initial ? Math.random() * innerWidth : dir === 1 ? -size : innerWidth + size, altitude: Math.random(), phase: Math.random() * 5, dir, state: 'fly' };
    button.style.width = `${size}px`; button.style.height = `${size * (ghost ? 19 / 12 : 1.5)}px`;
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
    band.bottom = Math.min(band.bottom, floor - LANDING_MARGIN);
    groundLayer.style.clipPath = layer.style.clipPath = `inset(0 0 ${Math.max(0, innerHeight - floor)}px 0)`;
    bats.forEach((bat, index) => {
      const height = bat.size * (bat.ghost ? 19 / 12 : 1.5);
      const fits = band.bottom - band.top >= height;
      const top = band.dynamic ? band.top : Math.min(band.top, band.bottom - height);
      const travel = Math.max(0, band.bottom - height - top);
      let y = top + travel * (.5 + .5 * Math.sin(time * .8 + bat.phase + bat.altitude * Math.PI)), row = bat.red ? 0 : 1;
      let cell = Math.floor(time * config.flapFps * bat.flap + bat.phase) % 5;
      if (bat.state === 'fly') {
        const hidden = band.dynamic && !fits;
        bat.button.style.visibility = hidden ? 'hidden' : '';
        bat.button.tabIndex = hidden ? -1 : 0;
        bat.button.setAttribute('aria-hidden', String(hidden));
        if (band.dynamic && !hidden) {
          const previousY = bat.flightY ?? y;
          y = Math.max(top, Math.min(band.bottom - height, previousY + (y - previousY) * Math.min(1, dt * 4)));
        }
        bat.flightY = y;
        bat.x += bat.speed * bat.dir * dt;
        if (bat.x > innerWidth + bat.size || bat.x < -bat.size) {
          bat.button.remove(); bats[index] = makeBat(index, false); return;
        }
      } else if (bat.state === 'vanish') {
        y = bat.dropY;
        if ((time - bat.start) * config.ghosts.fps >= 13) {
          bat.button.remove(); bats[index] = makeBat(index, false); return;
        }
      } else {
        const elapsed = time - bat.start, ground = floor - height - LANDING_MARGIN;
        y = Math.min(ground, bat.dropY + 210 * elapsed * elapsed);
        row = 2; cell = Math.min(3, Math.floor(elapsed * config.fallFps));
        if (y >= ground) {
          cell = 4; bat.groundAt ??= time;
          // Only the landed sprite rises above content; flying bats remain behind cards.
          if (!bat.onGroundLayer) { groundLayer.appendChild(bat.button); bat.onGroundLayer = true; }
          bat.button.style.visibility = '';
          const rest = time - bat.groundAt;
          bat.button.style.opacity = String(Math.min(1, Math.max(0, (config.groundSeconds - rest) / .6)));
          if (rest > config.groundSeconds + 1) { bat.button.remove(); bats[index] = makeBat(index, false); return; }
        }
      }
      bat.drawY = y;
      bat.button.style.transform = `translate(${bat.x}px,${y}px)`;
      if (bat.ghost) {
        const index = bat.state === 'vanish' ? Math.floor((time - bat.start) * config.ghosts.fps) : Math.floor(time * config.ghosts.fps + bat.phase) % 8;
        const baseColumn = bat.color === 'pink' ? 5 : 2;
        const column = baseColumn + (bat.state === 'vanish' ? index < 8 ? 1 : 2 : 0);
        const spriteRow = bat.state === 'vanish' && index >= 8 ? index - 8 : index;
        bat.sprite.style.backgroundPosition = `${-column * 32}px ${-spriteRow * 32}px`;
        const scale = bat.size / 12;
        // Mirror around the visible body center without moving the click target.
        const mirror = bat.dir < 0;
        bat.sprite.style.transform = `translate(${(mirror ? 22 : -10) * scale}px,${-8 * scale}px) scale(${mirror ? -scale : scale},${scale})`;
      } else {
        bat.sprite.style.backgroundPosition = `${-cell * 16}px ${-row * 24}px`;
        bat.sprite.style.transform = bat.dir < 0 ? `translateX(${bat.size}px) scale(${-bat.size / 16},${bat.size / 16})` : `scale(${bat.size / 16})`;
      }
    });
  }
  function sync(profile, effect) {
    stop(); config = profile?.ambient;
    if (!config || effect !== 'effect-halloween' || reduced.matches) return;
    const app = document.getElementById('mainAppContainer'); if (!app) return;
    layer = document.createElement('div'); layer.className = 'seasonal-bats'; app.appendChild(layer);
    groundLayer = document.createElement('div'); groundLayer.className = 'seasonal-bats-ground'; app.appendChild(groundLayer);
    document.addEventListener('pointerdown', clickBackground);
    time = 0; previous = 0; batAppearances = 0; bats = Array.from({ length: config.count }, (_, index) => makeBat(index, true));
    frame = requestAnimationFrame(tick);
  }
  let currentProfile = null, currentEffect = null;
  reduced.addEventListener('change', () => sync(currentProfile, currentEffect));
  return { sync(profile, effect) { currentProfile = profile; currentEffect = effect; sync(profile, effect); }, stop };
}
