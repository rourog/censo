/* Click targets are limited to each bat, never a screen-wide overlay. */
export function createSeasonalAmbient() {
  let layer = null, frame = 0, previous = 0, time = 0, bats = [], config = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function stop() { cancelAnimationFrame(frame); frame = 0; layer?.remove(); layer = null; bats = []; }
  function makeBat(index, initial) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'seasonal-bat';
    button.setAttribute('aria-label', index === 0 ? 'Hacer caer el murciélago de ojos rojos' : 'Hacer caer un murciélago');
    const sprite = document.createElement('span'); sprite.className = 'seasonal-bat-sprite';
    sprite.style.backgroundImage = `url("${new URL(config.sprite, import.meta.url).href}")`;
    button.appendChild(sprite); layer.appendChild(button);
    const mix = Math.random(), size = config.minSize + (config.maxSize - config.minSize) * mix;
    const bat = { button, sprite, red: index === 0, size, speed: config.speed * (1.25 - .5 * mix) * (.85 + Math.random() * .3), flap: .9 + Math.random() * .2,
      x: initial ? Math.random() * innerWidth : -size, y: innerHeight * (.15 + Math.random() * .55), phase: Math.random() * 5, dir: initial && Math.random() < .5 ? -1 : 1, state: 'fly' };
    button.style.width = `${size}px`; button.style.height = `${size * 1.5}px`;
    button.onclick = () => { if (bat.state !== 'fly') return; bat.state = 'fall'; bat.start = time; bat.dropY = bat.drawY; button.disabled = true; };
    return bat;
  }
  function tick(now) {
    frame = requestAnimationFrame(tick);
    const dt = previous ? Math.min((now - previous) / 1000, .05) : 0; previous = now;
    if (document.hidden || !document.getElementById('mainAppContainer')?.getClientRects().length) return;
    time += dt;
    bats.forEach((bat, index) => {
      const height = bat.size * 1.5; let y = bat.y + Math.sin(time * 1.6 + bat.phase) * 10, row = bat.red ? 0 : 1;
      let cell = Math.floor(time * config.flapFps * bat.flap + bat.phase) % 5;
      if (bat.state === 'fly') {
        bat.x += bat.speed * bat.dir * dt;
        if (bat.x > innerWidth + bat.size) bat.x = -bat.size;
        if (bat.x < -bat.size) bat.x = innerWidth + bat.size;
      } else {
        const elapsed = time - bat.start, ground = innerHeight - height;
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
    time = 0; previous = 0; bats = Array.from({ length: config.count }, (_, index) => makeBat(index, true));
    frame = requestAnimationFrame(tick);
  }
  let currentProfile = null, currentEffect = null;
  reduced.addEventListener('change', () => sync(currentProfile, currentEffect));
  return { sync(profile, effect) { currentProfile = profile; currentEffect = effect; sync(profile, effect); }, stop };
}
