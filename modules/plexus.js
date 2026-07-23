/*
  Plexus de pacientes: membrana orgánica del encabezado.

  Cada nodo representa un paciente y conserva su identidad por `fila`.
  La física, colores y transiciones son puramente visuales: este módulo no
  modifica estado clínico ni habla con Firebase.
*/

export const PLEXUS_DEFAULTS = Object.freeze({
  cohesion: 0.25,
  affinity: 0.80,
  waveAmplitude: 20,
  independence: 0.65,
  speed: 0.70,
  maxConnectionDistance: 80,
  bannerHeight: 168,
  rewireMinMs: 5200,
  rewireMaxMs: 9000
});

const AREA_PALETTE = Object.freeze({
  'SALA DE CHOQUE': Object.freeze({ name: 'SALA DE CHOQUE', solid: '#ef4444' }),
  'OBSERVACION': Object.freeze({ name: 'OBSERVACION', solid: '#10b981' }),
  'TRAUMA MENOR': Object.freeze({ name: 'TRAUMA MENOR', solid: '#eab308' }),
  'PEDIATRIA': Object.freeze({ name: 'PEDIATRIA', solid: '#3b82f6' }),
  'EXTRAS': Object.freeze({ name: 'EXTRAS', solid: '#d946ef' })
});

const FALLBACK_AREA = Object.freeze({ name: 'SIN AREA', solid: '#f8fafc' });
const AREA_POSITIONS = Object.freeze({
  'SALA DE CHOQUE': [0.25, 0.32],
  'OBSERVACION': [0.47, 0.51],
  'TRAUMA MENOR': [0.72, 0.30],
  'PEDIATRIA': [0.70, 0.70],
  'EXTRAS': [0.29, 0.72],
  'SIN AREA': [0.50, 0.50]
});

export function normalizePlexusArea(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export function getPlexusPatientId(patient, index = 0) {
  const explicitId = patient?.fila ?? patient?.id;
  return explicitId === null || explicitId === undefined || explicitId === ''
    ? `plexus-index-${index}`
    : String(explicitId);
}

export function createPlexusController(canvas, options = {}) {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return null;

  const settings = { ...PLEXUS_DEFAULTS, ...options };
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const easeOutBack = (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const smoothstep = (t) => t * t * (3 - 2 * t);
  const seededNoise = (seed) => {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  };

  let width = 1;
  let height = 1;
  let dpr = 1;
  let nodes = [];
  let links = [];
  let retiringLinks = [];
  let eventWaves = [];
  let nextNodeId = 1;
  let nextWaveId = 1;
  let layoutDirty = true;
  let linkDirty = true;
  let hasSynced = false;
  let running = true;
  let isVisible = !document.hidden;
  let lastTime = performance.now();
  let nextRewireAt = lastTime + 6500;
  let resizeObserver = null;

  function areaFor(value) {
    return AREA_PALETTE[normalizePlexusArea(value)] || FALLBACK_AREA;
  }

  function activeNodes() {
    return nodes.filter((node) => node.state !== 'gone');
  }

  function makeNode(patientId, area, bornAt = performance.now()) {
    const angle = Math.random() * Math.PI * 2;
    const originRadius = Math.min(width, height) * 0.08;
    const originX = width * 0.5 + Math.cos(angle) * originRadius;
    const originY = height * 0.5 + Math.sin(angle) * originRadius;

    return {
      id: nextNodeId++,
      patientId,
      area,
      x: originX,
      y: originY,
      vx: 0,
      vy: 0,
      anchorX: originX,
      anchorY: originY,
      targetX: originX,
      targetY: originY,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      localRate: 0.68 + Math.random() * 0.52,
      localAmp: 0.72 + Math.random() * 0.70,
      baseRadius: 3.55 + Math.random() * 2.20,
      shapeSeed: Math.random() * 1000,
      shapeIrregularity: 0.055 + Math.random() * 0.055,
      shapeRotation: Math.random() * Math.PI * 2,
      sparkleStart: 0,
      sparkleDuration: 380 + Math.random() * 300,
      sparkleStrength: 0.82 + Math.random() * 0.48,
      nextSparkleAt: bornAt + 700 + Math.random() * 4200,
      layoutAngle: Math.random() * Math.PI * 2,
      layoutRadius: 0.32 + Math.sqrt(Math.random()) * 0.68,
      connectionTarget: 3 + Math.floor(Math.random() * 4),
      bornAt,
      leaveAt: 0,
      state: 'entering',
      alpha: 0,
      scale: 0,
      pulse: 1
    };
  }

  function createAreaCenters() {
    const padX = clamp(width * 0.11, 38, 96);
    const padY = clamp(height * 0.17, 22, 54);
    const usableWidth = Math.max(40, width - padX * 2);
    const usableHeight = Math.max(30, height - padY * 2);
    const centers = new Map();

    Object.entries(AREA_POSITIONS).forEach(([name, [nx, ny]]) => {
      centers.set(name, {
        x: padX + usableWidth * nx,
        y: padY + usableHeight * ny
      });
    });
    return centers;
  }

  function assignLayout() {
    const current = activeNodes().filter((node) => node.state !== 'leaving');
    const centers = createAreaCenters();
    const padX = clamp(width * 0.09, 30, 84);
    const padY = clamp(height * 0.14, 18, 46);
    const spreadX = clamp(width * 0.115, 42, 105);
    const spreadY = clamp(height * 0.24, 26, 58);

    current.forEach((node) => {
      const center = centers.get(node.area.name) || centers.get('SIN AREA');
      const organicX = Math.cos(node.layoutAngle) * spreadX * node.layoutRadius;
      const organicY = Math.sin(node.layoutAngle) * spreadY * node.layoutRadius;
      const globalX = padX + seededNoise(node.id * 2.17) * Math.max(1, width - padX * 2);
      const globalY = padY + seededNoise(node.id * 5.31) * Math.max(1, height - padY * 2);
      const clusterX = center.x + organicX;
      const clusterY = center.y + organicY;

      node.targetX = clamp(
        globalX * (1 - settings.affinity) + clusterX * settings.affinity,
        padX,
        width - padX
      );
      node.targetY = clamp(
        globalY * (1 - settings.affinity) + clusterY * settings.affinity,
        padY,
        height - padY
      );
    });

    const minimumGap = clamp(
      Math.sqrt((width * height) / Math.max(1, current.length)) * 0.28,
      15,
      29
    );

    for (let pass = 0; pass < 14; pass++) {
      for (let i = 0; i < current.length; i++) {
        for (let j = i + 1; j < current.length; j++) {
          const a = current[i];
          const b = current[j];
          let dx = b.targetX - a.targetX;
          let dy = b.targetY - a.targetY;
          let distance = Math.hypot(dx, dy);
          if (distance >= minimumGap) continue;
          if (distance < 0.001) {
            const angle = seededNoise(a.id * b.id) * Math.PI * 2;
            dx = Math.cos(angle);
            dy = Math.sin(angle);
            distance = 1;
          }
          const push = (minimumGap - distance) * 0.24;
          const ux = dx / distance;
          const uy = dy / distance;
          a.targetX = clamp(a.targetX - ux * push, padX, width - padX);
          a.targetY = clamp(a.targetY - uy * push, padY, height - padY);
          b.targetX = clamp(b.targetX + ux * push, padX, width - padX);
          b.targetY = clamp(b.targetY + uy * push, padY, height - padY);
        }
      }
    }

    layoutDirty = false;
    linkDirty = true;
  }

  function distanceSquared(a, b) {
    const dx = a.targetX - b.targetX;
    const dy = a.targetY - b.targetY;
    return dx * dx + dy * dy;
  }

  function isWithinConnectionRange(a, b) {
    return distanceSquared(a, b) <= settings.maxConnectionDistance ** 2;
  }

  function edgeKey(a, b) {
    return a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
  }

  function scheduleNextRewire(now = performance.now()) {
    nextRewireAt = now + settings.rewireMinMs
      + Math.random() * (settings.rewireMaxMs - settings.rewireMinMs);
  }

  function createEventWave(x, y, type, color) {
    if (reducedMotion) return;
    const farthestX = Math.max(x, width - x);
    const farthestY = Math.max(y, height - y);
    eventWaves.push({
      id: nextWaveId++,
      x,
      y,
      type,
      color,
      startedAt: performance.now(),
      duration: type === 'admission' ? 1180 : 1080,
      maxRadius: Math.hypot(farthestX, farthestY) + 42,
      hitNodes: new Set()
    });
  }

  function countComponents(currentNodes, currentLinks, removedKey = null) {
    if (currentNodes.length < 2) return currentNodes.length;
    const adjacency = new Map(currentNodes.map((node) => [node.id, []]));
    currentLinks.forEach((link) => {
      if (edgeKey(link.a, link.b) === removedKey) return;
      adjacency.get(link.a.id)?.push(link.b.id);
      adjacency.get(link.b.id)?.push(link.a.id);
    });

    const visited = new Set();
    let components = 0;
    currentNodes.forEach((node) => {
      if (visited.has(node.id)) return;
      components += 1;
      const queue = [node.id];
      visited.add(node.id);
      while (queue.length) {
        const id = queue.shift();
        for (const neighbor of adjacency.get(id) || []) {
          if (visited.has(neighbor)) continue;
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    });
    return components;
  }

  function rotateOneLink(now = performance.now()) {
    const currentNodes = activeNodes().filter((node) => node.state === 'stable');
    const nodeIds = new Set(currentNodes.map((node) => node.id));
    const currentLinks = links.filter((link) => nodeIds.has(link.a.id) && nodeIds.has(link.b.id));
    if (currentNodes.length < 5 || currentLinks.length < currentNodes.length) return false;

    const degree = new Map(currentNodes.map((node) => [node.id, 0]));
    const used = new Set(currentLinks.map((link) => edgeKey(link.a, link.b)));
    const initialComponents = countComponents(currentNodes, currentLinks);
    currentLinks.forEach((link) => {
      degree.set(link.a.id, degree.get(link.a.id) + 1);
      degree.set(link.b.id, degree.get(link.b.id) + 1);
    });

    for (const oldLink of [...currentLinks].sort(() => Math.random() - 0.5)) {
      const oldKey = edgeKey(oldLink.a, oldLink.b);
      // Puede haber varios grupos legítimos por el límite de 80 px. Sólo se
      // descartan enlaces cuya retirada fragmentaría aún más la topología.
      if (countComponents(currentNodes, currentLinks, oldKey) > initialComponents) continue;

      const orientations = Math.random() < 0.5
        ? [[oldLink.a, oldLink.b], [oldLink.b, oldLink.a]]
        : [[oldLink.b, oldLink.a], [oldLink.a, oldLink.b]];

      for (const [fixed, losing] of orientations) {
        const minimum = Math.min(3, currentNodes.length - 1);
        if (degree.get(losing.id) <= minimum) continue;

        const candidates = currentNodes
          .filter((candidate) => candidate !== fixed && candidate !== losing)
          .filter((candidate) => !used.has(edgeKey(fixed, candidate)))
          .filter((candidate) => isWithinConnectionRange(fixed, candidate))
          .filter((candidate) => degree.get(candidate.id) < Math.min(6, currentNodes.length - 1))
          .map((candidate) => {
            const sameArea = fixed.area.name === candidate.area.name;
            const affinityBonus = sameArea ? 1 - settings.affinity * 0.30 : 1;
            return {
              candidate,
              sameArea,
              score: distanceSquared(fixed, candidate) * affinityBonus * (0.84 + Math.random() * 0.34)
            };
          })
          .sort((a, b) => a.score - b.score)
          .slice(0, 5);

        if (!candidates.length) continue;
        const chosen = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
        links = links.filter((link) => edgeKey(link.a, link.b) !== oldKey);
        retiringLinks.push({
          ...oldLink,
          fade: Math.max(0.7, oldLink.fade ?? 1),
          mode: 'breaking',
          transitionStart: now
        });
        links.push({
          a: fixed,
          b: chosen.candidate,
          d2: distanceSquared(fixed, chosen.candidate),
          score: chosen.score,
          sameArea: chosen.sameArea,
          fade: 0,
          mode: 'connecting',
          transitionStart: now
        });
        return true;
      }
    }
    return false;
  }

  function buildLinks() {
    const current = activeNodes().filter((node) => node.state !== 'leaving');
    const nextLinks = [];
    const used = new Set();
    const previousByKey = new Map(links.map((link) => [edgeKey(link.a, link.b), link]));
    const now = performance.now();

    if (current.length > 1) {
      const candidates = [];
      for (let i = 0; i < current.length; i++) {
        for (let j = i + 1; j < current.length; j++) {
          const a = current[i];
          const b = current[j];
          const d2 = distanceSquared(a, b);
          if (d2 > settings.maxConnectionDistance ** 2) continue;
          const sameArea = a.area.name === b.area.name;
          const affinityBonus = sameArea ? 1 - settings.affinity * 0.34 : 1;
          const irregularity = 0.88 + seededNoise(a.id * 31 + b.id * 17) * 0.24;
          candidates.push({ a, b, d2, score: d2 * affinityBonus * irregularity, sameArea });
        }
      }
      candidates.sort((a, b) => a.score - b.score);

      const degree = new Map(current.map((node) => [node.id, 0]));
      const parent = new Map(current.map((node) => [node.id, node.id]));
      const find = (id) => {
        let root = id;
        while (parent.get(root) !== root) root = parent.get(root);
        while (parent.get(id) !== id) {
          const next = parent.get(id);
          parent.set(id, root);
          id = next;
        }
        return root;
      };
      const connect = (edge) => {
        const key = edgeKey(edge.a, edge.b);
        if (used.has(key)) return false;
        used.add(key);
        nextLinks.push(edge);
        degree.set(edge.a.id, degree.get(edge.a.id) + 1);
        degree.set(edge.b.id, degree.get(edge.b.id) + 1);
        return true;
      };

      // El esqueleto sólo une vecinos dentro de 80 px. Nunca inventa puentes largos.
      for (const edge of candidates) {
        const rootA = find(edge.a.id);
        const rootB = find(edge.b.id);
        if (rootA === rootB) continue;
        connect(edge);
        parent.set(rootB, rootA);
      }

      // Cada nodo busca de 3 a 6 conexiones, pero el alcance físico tiene prioridad.
      for (const node of [...current].sort((a, b) => a.connectionTarget - b.connectionTarget || a.id - b.id)) {
        const target = Math.min(current.length - 1, node.connectionTarget);
        for (const edge of candidates) {
          if (degree.get(node.id) >= target) break;
          if (edge.a !== node && edge.b !== node) continue;
          const partner = edge.a === node ? edge.b : edge.a;
          const partnerLimit = Math.min(current.length - 1, partner.connectionTarget);
          if (degree.get(partner.id) >= partnerLimit) continue;
          connect(edge);
        }
      }

      const minimum = Math.min(3, current.length - 1);
      for (const node of current) {
        for (const edge of candidates) {
          if (degree.get(node.id) >= minimum) break;
          if (edge.a !== node && edge.b !== node) continue;
          const partner = edge.a === node ? edge.b : edge.a;
          if (degree.get(partner.id) >= Math.min(6, current.length - 1)) continue;
          connect(edge);
        }
      }
    }

    const nextKeys = new Set(nextLinks.map((link) => edgeKey(link.a, link.b)));
    links.forEach((oldLink) => {
      if (!nextKeys.has(edgeKey(oldLink.a, oldLink.b))) {
        retiringLinks.push({
          ...oldLink,
          fade: oldLink.fade ?? 1,
          mode: 'breaking',
          transitionStart: now
        });
      }
    });

    links = nextLinks.map((link) => {
      const previous = previousByKey.get(edgeKey(link.a, link.b));
      return previous
        ? {
            ...link,
            fade: previous.fade ?? 1,
            mode: previous.mode ?? 'stable',
            transitionStart: previous.transitionStart ?? now
          }
        : { ...link, fade: 0, mode: 'connecting', transitionStart: now };
    });
    linkDirty = false;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutDirty = true;
  }

  function updateNode(node, now, dt) {
    const time = now * 0.001 * settings.speed;
    const enteringProgress = clamp((now - node.bornAt) / 820, 0, 1);

    if (node.state === 'entering') {
      node.alpha = enteringProgress;
      node.scale = easeOutBack(enteringProgress);
      node.pulse = 1 - enteringProgress;
      if (enteringProgress >= 1) node.state = 'stable';
    } else if (node.state === 'leaving') {
      const leaveProgress = clamp((now - node.leaveAt) / 680, 0, 1);
      node.alpha = 1 - leaveProgress;
      node.scale = 1 - leaveProgress * 0.82;
      node.pulse = leaveProgress * 0.45;
      node.targetX += (width * 0.5 - node.targetX) * 0.018;
      node.targetY += (height * 0.5 - node.targetY) * 0.018;
      if (leaveProgress >= 1) node.state = 'gone';
    } else {
      node.alpha = 1;
      node.scale = 1;
      node.pulse = Math.max(0, node.pulse - dt * 0.0015);
    }

    node.anchorX += (node.targetX - node.anchorX) * Math.min(1, dt * 0.0036);
    node.anchorY += (node.targetY - node.anchorY) * Math.min(1, dt * 0.0036);

    const spatialX = node.anchorX / Math.max(1, width);
    const spatialY = node.anchorY / Math.max(1, height);
    const globalX =
      Math.sin(time * 1.15 + spatialY * 5.8) * settings.waveAmplitude * 0.63 +
      Math.sin(time * 0.58 + spatialX * 3.1) * settings.waveAmplitude * 0.25;
    const globalY =
      Math.cos(time * 0.92 + spatialX * 5.2) * settings.waveAmplitude * 0.55 +
      Math.sin(time * 0.51 + spatialY * 4.4) * settings.waveAmplitude * 0.28;
    const localAmplitude = settings.waveAmplitude * settings.independence * node.localAmp;
    const localX = Math.sin(time * node.localRate * 1.7 + node.phaseX) * localAmplitude;
    const localY = Math.cos(time * node.localRate * 1.45 + node.phaseY) * localAmplitude;
    let desiredX = node.anchorX + globalX * settings.cohesion + localX;
    let desiredY = node.anchorY + globalY * settings.cohesion + localY;

    for (const wave of eventWaves) {
      const progress = clamp((now - wave.startedAt) / wave.duration, 0, 1);
      const radius = easeOutCubic(progress) * wave.maxRadius;
      const dx = node.anchorX - wave.x;
      const dy = node.anchorY - wave.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const bandWidth = clamp(Math.min(width, height) * 0.16, 18, 38);
      const proximity = 1 - clamp(Math.abs(distance - radius) / bandWidth, 0, 1);
      const envelope = smoothstep(proximity);
      const ux = dx / distance;
      const uy = dy / distance;
      const strength = wave.type === 'admission' ? 15 : 12;

      desiredX += ux * strength * envelope;
      desiredY += uy * strength * envelope;
      if (radius >= distance && !wave.hitNodes.has(node.id)) {
        wave.hitNodes.add(node.id);
        node.vx += ux * (wave.type === 'admission' ? 0.52 : 0.42);
        node.vy += uy * (wave.type === 'admission' ? 0.52 : 0.42);
        node.pulse = Math.max(node.pulse, 0.72);
      }
    }

    if (reducedMotion) {
      node.anchorX = node.targetX;
      node.anchorY = node.targetY;
      node.x = node.targetX;
      node.y = node.targetY;
      node.vx = 0;
      node.vy = 0;
      return;
    }

    const spring = 0.0022 + settings.cohesion * 0.0018;
    node.vx += (desiredX - node.x) * spring * dt;
    node.vy += (desiredY - node.y) * spring * dt;

    // Límites elásticos: permiten separarse, pero no perderse fuera del banner.
    const edgeMargin = 10;
    if (node.x < edgeMargin) node.vx += (edgeMargin - node.x) * 0.0016 * dt;
    if (node.x > width - edgeMargin) node.vx -= (node.x - width + edgeMargin) * 0.0016 * dt;
    if (node.y < edgeMargin) node.vy += (edgeMargin - node.y) * 0.0016 * dt;
    if (node.y > height - edgeMargin) node.vy -= (node.y - height + edgeMargin) * 0.0016 * dt;

    const damping = Math.pow(0.84, dt / 16.67);
    node.vx *= damping;
    node.vy *= damping;
    node.x += node.vx * dt * 0.055;
    node.y += node.vy * dt * 0.055;
  }

  function isLightTheme() {
    return /\bbase-(?:light|pure-white|gray-light|sand|rose|mint|lavender)\b/u
      .test(document.body.className);
  }

  function hexToRgba(hex, alpha) {
    const value = Number.parseInt(hex.slice(1), 16);
    return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
  }

  function drawLink(link, now, lightTheme) {
    const { a, b } = link;
    const transitionAge = Math.max(0, now - (link.transitionStart ?? now));
    const isBreaking = link.mode === 'breaking';
    const isConnecting = link.mode === 'connecting';
    const transitionProgress = isBreaking
      ? clamp(transitionAge / 760, 0, 1)
      : isConnecting
        ? clamp(transitionAge / 620, 0, 1)
        : 1;
    const breakFade = isBreaking ? Math.pow(1 - transitionProgress, 0.72) : 1;
    const alpha = Math.min(a.alpha, b.alpha) * link.fade * breakFade;
    if (alpha <= 0.01) return;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    const restLength = Math.sqrt(link.d2);
    const strain = clamp(Math.abs(length - restLength) / Math.max(1, restLength), 0, 1);
    const lineAlpha = (lightTheme ? 0.16 : 0.095) + strain * 0.055;
    const finalAlpha = lineAlpha * alpha;
    const baseWidth = (0.75 + strain * 0.28) * (isBreaking ? 1 - transitionProgress * 0.72 : 1);
    const middleColor = lightTheme
      ? `rgba(71,85,105,${finalAlpha})`
      : `rgba(178,196,219,${finalAlpha})`;
    const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    gradient.addColorStop(0, hexToRgba(a.area.solid, finalAlpha * 0.72));
    gradient.addColorStop(0.5, middleColor);
    gradient.addColorStop(1, hexToRgba(b.area.solid, finalAlpha * 0.72));

    const pointAt = (t) => ({ x: a.x + dx * t, y: a.y + dy * t });
    const strokeSegment = (from, to) => {
      if (to - from <= 0.002) return;
      const start = pointAt(from);
      const end = pointAt(to);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineWidth = Math.max(0.12, baseWidth);
      ctx.strokeStyle = gradient;
      ctx.stroke();
    };

    if (isBreaking) {
      const splitProgress = smoothstep(clamp((transitionProgress - 0.14) / 0.86, 0, 1));
      const halfGap = 0.015 + splitProgress * 0.19;
      strokeSegment(0, 0.5 - halfGap);
      strokeSegment(0.5 + halfGap, 1);
      if (transitionProgress > 0.12 && transitionProgress < 0.68) {
        const middle = pointAt(0.5);
        const sparkAlpha = Math.sin(((transitionProgress - 0.12) / 0.56) * Math.PI) * 0.42;
        ctx.beginPath();
        ctx.arc(middle.x, middle.y, 1.2 + transitionProgress * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = lightTheme
          ? `rgba(71,85,105,${sparkAlpha})`
          : `rgba(230,240,255,${sparkAlpha})`;
        ctx.fill();
      }
      return;
    }

    if (isConnecting) {
      const growth = easeOutCubic(transitionProgress);
      strokeSegment(0, growth * 0.5);
      strokeSegment(1 - growth * 0.5, 1);
      return;
    }
    strokeSegment(0, 1);
  }

  function drawEventWave(wave, now, lightTheme) {
    const progress = clamp((now - wave.startedAt) / wave.duration, 0, 1);
    if (progress >= 1) return;
    const radius = easeOutCubic(progress) * wave.maxRadius;
    const fade = Math.sin(progress * Math.PI) * (1 - progress * 0.34);

    ctx.save();
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, Math.max(0.5, radius), 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(wave.color, 0.38 * fade);
    ctx.lineWidth = 1.8 - progress * 0.9;
    ctx.shadowColor = wave.color;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, Math.max(0.5, radius - 5), 0, Math.PI * 2);
    ctx.strokeStyle = lightTheme
      ? `rgba(51,65,85,${0.18 * fade})`
      : `rgba(238,247,255,${0.20 * fade})`;
    ctx.lineWidth = 0.65;
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  }

  function sparkleEnvelope(node, now) {
    if (reducedMotion) return 0.18;
    if (!node.sparkleStart && now >= node.nextSparkleAt) {
      node.sparkleStart = now;
      node.sparkleDuration = 380 + Math.random() * 300;
      node.sparkleStrength = 0.82 + Math.random() * 0.48;
    }
    if (!node.sparkleStart) return 0;

    const progress = (now - node.sparkleStart) / node.sparkleDuration;
    if (progress >= 1) {
      node.sparkleStart = 0;
      node.nextSparkleAt = now + 1900 + Math.random() * 5200;
      return 0;
    }
    const envelope = progress < 0.16
      ? smoothstep(progress / 0.16)
      : Math.pow(1 - (progress - 0.16) / 0.84, 2.7);
    return envelope * node.sparkleStrength;
  }

  function traceOrbPath(node, radius, now) {
    const points = 10;
    const wobble = reducedMotion ? 0 : Math.sin(now * 0.00042 + node.shapeSeed) * 0.022;
    const rotation = node.shapeRotation + wobble;
    const coords = [];
    for (let i = 0; i < points; i++) {
      const angle = rotation + (i / points) * Math.PI * 2;
      const organic =
        Math.sin(angle * 3 + node.shapeSeed) * node.shapeIrregularity +
        Math.sin(angle * 5 - node.shapeSeed * 0.73) * node.shapeIrregularity * 0.42;
      const pointRadius = radius * (1 + organic);
      coords.push({
        x: node.x + Math.cos(angle) * pointRadius,
        y: node.y + Math.sin(angle) * pointRadius
      });
    }

    ctx.beginPath();
    const firstMidX = (coords[0].x + coords[1].x) * 0.5;
    const firstMidY = (coords[0].y + coords[1].y) * 0.5;
    ctx.moveTo(firstMidX, firstMidY);
    for (let i = 0; i < points; i++) {
      const next = coords[(i + 1) % points];
      const following = coords[(i + 2) % points];
      ctx.quadraticCurveTo(next.x, next.y, (next.x + following.x) * 0.5, (next.y + following.y) * 0.5);
    }
    ctx.closePath();
  }

  function drawNode(node, now) {
    if (node.alpha <= 0.005) return;
    const radius = (node.baseRadius + (node.area.name === 'SALA DE CHOQUE' ? 0.30 : 0)) * node.scale;
    const sparkle = sparkleEnvelope(node, now);
    const idleShimmer = reducedMotion ? 0.12 : 0.10 + Math.sin(now * 0.0011 + node.shapeSeed) * 0.035;
    const brightness = clamp(idleShimmer + sparkle, 0, 1.35);
    const glowRadius = radius + 7.5 + brightness * 5.5;

    ctx.globalAlpha = node.alpha;
    const halo = ctx.createRadialGradient(node.x, node.y, radius * 0.25, node.x, node.y, glowRadius);
    halo.addColorStop(0, `rgba(255,255,255,${0.10 + brightness * 0.18})`);
    halo.addColorStop(0.18, hexToRgba(node.area.solid, 0.24 + brightness * 0.25));
    halo.addColorStop(0.52, hexToRgba(node.area.solid, 0.08 + brightness * 0.10));
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.ellipse(node.x, node.y, glowRadius * 1.08, glowRadius * 0.92, node.shapeRotation, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();

    const glass = ctx.createRadialGradient(
      node.x - radius * 0.34,
      node.y - radius * 0.38,
      radius * 0.05,
      node.x,
      node.y,
      radius * 1.08
    );
    glass.addColorStop(0, `rgba(255,255,255,${clamp(0.96 + brightness * 0.08, 0, 1)})`);
    glass.addColorStop(0.24, `rgba(248,252,255,${clamp(0.78 + brightness * 0.18, 0, 1)})`);
    glass.addColorStop(0.51, hexToRgba(node.area.solid, 0.48 + brightness * 0.18));
    glass.addColorStop(0.80, hexToRgba(node.area.solid, 0.84));
    glass.addColorStop(1, hexToRgba(node.area.solid, 0.34));

    traceOrbPath(node, Math.max(0.2, radius), now);
    ctx.fillStyle = glass;
    ctx.shadowColor = node.area.solid;
    ctx.shadowBlur = 5 + brightness * 11;
    ctx.fill();
    ctx.shadowBlur = 0;

    traceOrbPath(node, Math.max(0.2, radius), now);
    ctx.strokeStyle = `rgba(255,255,255,${0.22 + brightness * 0.20})`;
    ctx.lineWidth = 0.42;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      node.x - radius * 0.30,
      node.y - radius * 0.35,
      Math.max(0.40, radius * (0.15 + brightness * 0.035)),
      Math.max(0.24, radius * 0.085),
      -0.55,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = `rgba(255,255,255,${clamp(0.70 + brightness * 0.26, 0, 1)})`;
    ctx.fill();

    if (sparkle > 0.06) {
      const flash = ctx.createRadialGradient(
        node.x - radius * 0.10,
        node.y - radius * 0.12,
        0,
        node.x - radius * 0.10,
        node.y - radius * 0.12,
        radius * (0.72 + sparkle * 0.28)
      );
      flash.addColorStop(0, `rgba(255,255,255,${clamp(sparkle * 0.88, 0, 0.94)})`);
      flash.addColorStop(0.34, `rgba(255,255,255,${clamp(sparkle * 0.36, 0, 0.46)})`);
      flash.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(node.x - radius * 0.10, node.y - radius * 0.12, radius * (0.72 + sparkle * 0.28), 0, Math.PI * 2);
      ctx.fillStyle = flash;
      ctx.fill();
    }

    if (node.pulse > 0.01) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + (1 - node.pulse) * 18, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(node.area.solid, node.pulse * 0.42);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function syncPatients(patients = []) {
    const incoming = new Map();
    patients.forEach((patient, index) => {
      const patientId = getPlexusPatientId(patient, index);
      incoming.set(patientId, { patientId, area: areaFor(patient?.area) });
    });

    if (!hasSynced) {
      const now = performance.now();
      nodes = [...incoming.values()].map(({ patientId, area }) => {
        const node = makeNode(patientId, area, now - 900 - Math.random() * 700);
        node.state = 'stable';
        node.alpha = 1;
        node.scale = 1;
        node.pulse = 0;
        return node;
      });
      hasSynced = true;
      layoutDirty = true;
      scheduleNextRewire(now);
      return;
    }

    const now = performance.now();
    const currentByPatient = new Map(
      nodes.filter((node) => node.state !== 'gone').map((node) => [node.patientId, node])
    );
    let changed = false;

    for (const node of activeNodes()) {
      const next = incoming.get(node.patientId);
      if (!next && node.state !== 'leaving') {
        createEventWave(node.x, node.y, 'discharge', node.area.solid);
        node.state = 'leaving';
        node.leaveAt = now;
        changed = true;
        continue;
      }
      if (!next) continue;
      if (node.state === 'leaving') {
        node.state = 'stable';
        node.leaveAt = 0;
        node.alpha = 1;
        node.scale = 1;
        changed = true;
      }
      if (node.area.name !== next.area.name) {
        node.area = next.area;
        changed = true;
      }
    }

    incoming.forEach(({ patientId, area }) => {
      if (currentByPatient.has(patientId)) return;
      const node = makeNode(patientId, area, now);
      nodes.push(node);
      createEventWave(node.x, node.y, 'admission', area.solid);
      changed = true;
    });

    if (changed) {
      layoutDirty = true;
      linkDirty = true;
    }
  }

  function animate(now) {
    if (!running) return;
    requestAnimationFrame(animate);
    if (!isVisible) return;

    const dt = clamp(now - lastTime, 0, 34);
    lastTime = now;
    if (layoutDirty) assignLayout();
    if (linkDirty) buildLinks();

    if (!reducedMotion && now >= nextRewireAt) {
      rotateOneLink(now);
      scheduleNextRewire(now);
    }

    links.forEach((link) => { link.fade = Math.min(1, link.fade + dt * 0.0032); });
    links.forEach((link) => {
      if (link.mode === 'connecting' && now - link.transitionStart >= 620) link.mode = 'stable';
    });
    retiringLinks = retiringLinks.filter((link) => now - link.transitionStart < 780);
    eventWaves = eventWaves.filter((wave) => now - wave.startedAt < wave.duration);
    nodes.forEach((node) => updateNode(node, now, dt));

    if (nodes.some((node) => node.state === 'gone')) {
      nodes = nodes.filter((node) => node.state !== 'gone');
      layoutDirty = true;
    }

    const lightTheme = isLightTheme();
    ctx.clearRect(0, 0, width, height);
    eventWaves.forEach((wave) => drawEventWave(wave, now, lightTheme));
    retiringLinks.forEach((link) => drawLink(link, now, lightTheme));
    links.forEach((link) => drawLink(link, now, lightTheme));
    activeNodes().forEach((node) => drawNode(node, now));
  }

  function onVisibilityChange() {
    isVisible = !document.hidden;
    lastTime = performance.now();
  }

  function destroy() {
    running = false;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    globalThis.removeEventListener?.('resize', resizeCanvas);
    resizeObserver?.disconnect();
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  if (globalThis.ResizeObserver) {
    resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas.parentElement || canvas);
  }
  globalThis.addEventListener?.('resize', resizeCanvas, { passive: true });
  resizeCanvas();
  requestAnimationFrame(animate);

  return {
    syncPatients,
    destroy,
    getDebugState: () => ({
      nodes: activeNodes().length,
      links: links.length,
      settings: { ...settings }
    })
  };
}
