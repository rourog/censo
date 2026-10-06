/* Shared seasonal totals. Events have stable IDs so retries and other tabs
   cannot count the same click twice. No patient or user information is stored. */
export function createHalloweenCounter(firebase, env = globalThis) {
  const { db, auth, doc, onSnapshot, onAuthStateChanged, runTransaction, serverTimestamp } = firebase;
  const prefix = 'censo-halloween-click-v1:';
  const memory = new Map(), listeners = new Set();
  let totals = null, unsubscribe = null, busy = false, retry = null, warned = false;
  const currentYear = () => Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Mexico_City', year: 'numeric' }).format(new Date()));
  let year = currentYear();
  const campaign = value => `halloween-${value}`;
  function publish(value) { totals = value; for (const listener of listeners) listener(value); }
  function pending() {
    const entries = new Map(memory);
    try {
      for (let i = 0; i < env.localStorage.length; i++) {
        const key = env.localStorage.key(i);
        if (!key?.startsWith(prefix)) continue;
        try { const event = JSON.parse(env.localStorage.getItem(key)); if (/^[a-zA-Z0-9-]{10,80}$/.test(event.id) && ['bats', 'ghosts'].includes(event.kind) && Number.isInteger(event.year) && event.year >= 2026 && event.year <= currentYear()) entries.set(event.id, event); } catch {}
      }
    } catch {}
    return [...entries.values()];
  }
  async function drain() {
    if (busy || !auth.currentUser) return;
    busy = true;
    try {
      while (auth.currentUser && pending().length) {
        const event = pending()[0];
        const ref = doc(db, 'seasonalStats', campaign(event.year));
        const eventRef = doc(db, 'seasonalStats', campaign(event.year), 'clicks', event.id);
        await runTransaction(db, async transaction => {
          const existing = await transaction.get(eventRef);
          if (existing.exists()) return;
          const aggregate = await transaction.get(ref);
          const data = aggregate.exists() ? aggregate.data() : { bats: 0, ghosts: 0 };
          transaction.set(eventRef, { kind: event.kind, createdAt: serverTimestamp() });
          transaction.set(ref, { bats: data.bats + (event.kind === 'bats' ? 1 : 0), ghosts: data.ghosts + (event.kind === 'ghosts' ? 1 : 0), lastEvent: event.id, updatedAt: serverTimestamp() });
        });
        memory.delete(event.id);
        try { env.localStorage.removeItem(prefix + event.id); } catch {}
      }
      warned = false;
    } catch (error) {
      if (!warned) console.warn('[HALLOWEEN] Clics pendientes de sincronizar:', error.code || error.message);
      warned = true;
      if (!retry) retry = env.setTimeout(() => { retry = null; drain(); }, 30000);
    } finally { busy = false; }
  }
  function connect() {
    unsubscribe?.(); unsubscribe = null; publish(null);
    if (!auth.currentUser) return;
    year = currentYear();
    unsubscribe = onSnapshot(doc(db, 'seasonalStats', campaign(year)), { includeMetadataChanges: true }, snapshot => {
      // Only confirmed server values become a global headline.
      if (snapshot.metadata?.fromCache || snapshot.metadata?.hasPendingWrites) return;
      const data = snapshot.exists() ? snapshot.data() : { bats: 0, ghosts: 0 };
      if (Number.isSafeInteger(data.bats) && data.bats >= 0 && Number.isSafeInteger(data.ghosts) && data.ghosts >= 0) publish({ year, bats: data.bats, ghosts: data.ghosts });
    }, error => { publish(null); console.warn('[HALLOWEEN] Contador global no disponible:', error.code || error.message); });
    drain();
  }
  return {
    start() {
      onAuthStateChanged(auth, connect);
      env.addEventListener('online', drain);
      env.addEventListener('storage', event => { if (event.key?.startsWith(prefix)) drain(); });
      env.setInterval(() => { if (year !== currentYear() || (!totals && auth.currentUser)) connect(); drain(); }, 60000);
    },
    record(kind) {
      if (!auth.currentUser || !['bats', 'ghosts'].includes(kind)) return;
      const event = { id: env.crypto.randomUUID(), kind, year: currentYear() };
      memory.set(event.id, event);
      try { env.localStorage.setItem(prefix + event.id, JSON.stringify(event)); } catch {}
      drain();
    },
    subscribe(listener) { listeners.add(listener); listener(totals); return () => listeners.delete(listener); },
    headline() {
      if (!totals) return null;
      const number = value => value.toLocaleString('es-MX');
      return { id: campaign(totals.year), kind: 'seasonal', displayTime: '🦇', text: `Halloween ${totals.year}: los usuarios de Urgencias han aniquilado ${number(totals.bats)} murciélagos y ${number(totals.ghosts)} fantasmas` };
    }
  };
}
