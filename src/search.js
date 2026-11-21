// ChatKit Pro — lokalny indeks treści czatów (IndexedDB) i wyszukiwanie pełnotekstowe.
// Indeks leży tylko w tej przeglądarce. Odświeżane są wyłącznie czaty zmienione od ostatniego indeksowania.
(() => {
  const CK = window.CK;
  const DB = "chatkit-pro", STORE = "chats";

  function open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function tx(mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, mode);
      const out = fn(t.objectStore(STORE));
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
    });
  }
  const getAll = () => tx("readonly", s => s.getAll());
  const put = rec => tx("readwrite", s => s.put(rec));
  const del = id => tx("readwrite", s => s.delete(id));
  const clear = () => tx("readwrite", s => s.clear());

  let cache = null;
  async function all() { if (!cache) cache = await getAll(); return cache; }

  CK.search = {
    async stats() {
      const a = await all();
      return { count: a.length, chars: a.reduce((s, r) => s + (r.text?.length || 0), 0), last: Math.max(0, ...a.map(r => r.indexedAt || 0)) };
    },

    // chats: [{key, title, date}] — lista czatów (np. z CK.sources.chats po wczytaniu wszystkich)
    async build(chats, onProgress, shouldStop = () => false) {
      const existing = new Map((await all()).map(r => [r.id, r]));
      const live = new Set(chats.map(c => c.key));
      for (const id of existing.keys()) if (!live.has(id)) { await del(id); }
      const todo = chats.filter(c => {
        const r = existing.get(c.key);
        return !r || (CK.toDate(c.date)?.getTime() || 0) > (r.updated || 0);
      });
      // Tempo: zwykle 1 czat / 1,5 s. Po pierwszym „za dużo zapytań” od ChatGPT — do końca budowy wolno (1 czat / 6 s),
      // żeby nie zjadać limitu, z którego korzysta też samo ChatGPT (inaczej czaty użytkownika przestają się otwierać).
      // Czat odrzucony przez limit nie jest pomijany: po przerwie próbujemy go jeszcze raz (bez limitu prób — budowa może iść sama np. godzinę). Postęp zapisuje się po każdym czacie,
      // więc przerwaną budowę można dokończyć później — zrobione czaty zostają.
      const FAST = 1500, SLOW = 6000;
      let done = 0, fail = 0, slow = CK.limit.recentlyHit();
      for (const c of todo) {
        if (shouldStop()) break;
        for (let tries = 0; ; tries++) {
          try {
            const conv = await CK.getConversation(c.key);
            const msgs = CK.linearize(conv);
            await put({
              id: c.key, title: conv.title || c.title, updated: CK.toDate(c.date)?.getTime() || Date.now(), indexedAt: Date.now(),
              text: msgs.map(m => (m.role === "user" ? "» " : "") + m.text).join("\n\n")
            });
          } catch (e) {
            if (e && e.status === 429 && !shouldStop()) { slow = true; await CK.waitLimit(shouldStop); continue; }
            fail++;
          }
          break;
        }
        done++;
        onProgress && onProgress(done, todo.length, slow);
        if (CK.limit.pausedFor()) slow = true;
        await CK.sleep(slow ? SLOW : FAST);
      }
      cache = null;
      return { indexed: done - fail, fail, skipped: chats.length - todo.length };
    },

    async query(q, limit = 200) {
      const terms = String(q).toLowerCase().split(/\s+/).filter(w => w.length > 1);
      if (!terms.length) return [];
      const out = [];
      for (const r of await all()) {
        const low = (r.title + "\n" + r.text).toLowerCase();
        if (!terms.every(w => low.includes(w))) continue;
        const ti = r.text.toLowerCase().indexOf(terms[0]);
        const start = Math.max(0, ti - 70);
        const snippet = ti >= 0 ? (start ? "…" : "") + r.text.slice(start, ti + 160).replace(/\s+/g, " ") + "…" : r.text.slice(0, 160);
        const hits = terms.reduce((s, w) => s + low.split(w).length - 1, 0);
        out.push({ id: r.id, title: r.title, snippet, hits, updated: r.updated });
      }
      return out.sort((a, b) => b.hits - a.hits || b.updated - a.updated).slice(0, limit);
    },

    async clear() { await clear(); cache = null; }
  };
})();
