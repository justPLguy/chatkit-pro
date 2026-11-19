// ChatKit Pro — rdzeń: API ChatGPT, pamięć (chrome.storage), narzędzia.
// Wszystkie zapytania idą wyłącznie do chatgpt.com z sesji zalogowanego użytkownika.
(() => {
  if (window.CK) return;
  const CK = (window.CK = {});

  CK.VERSION = chrome.runtime.getManifest().version;
  CK.sleep = ms => new Promise(r => setTimeout(r, ms));

  CK.cookie = name => {
    const m = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
    return m ? decodeURIComponent(m[1]) : null;
  };

  // Firefox: zapytania z kontekstu strony (content.fetch), żeby ChatGPT widział je jak własne.
  // Odpowiedź przepisujemy na zwykły Response, żeby reszta kodu działała bez zmian. W Chrome — zwykły fetch.
  CK.fetch = async (url, opts = {}) => {
    const pf = typeof content !== "undefined" && content && typeof content.fetch === "function" ? content.fetch : null;
    if (!pf) return fetch(url, opts);
    const o = typeof cloneInto === "function" ? cloneInto(opts, content) : opts;
    const r = await pf.call(content, new URL(url, location.href).href, o);
    const body = [204, 205, 304].includes(r.status) ? null : await r.text();
    return new Response(body, { status: r.status, statusText: r.statusText, headers: { "content-type": r.headers.get("content-type") || "application/json" } });
  };

  // ---------- API ----------
  let token = null, accountId = null, tokenAt = 0;

  CK.getToken = async () => {
    if (token && Date.now() - tokenAt < 10 * 60 * 1000) return token;
    const r = await CK.fetch("/api/auth/session", { credentials: "include" });
    if (!r.ok) throw new Error(CK.t("err.session", { s: r.status }));
    const j = await r.json();
    if (!j.accessToken) throw Object.assign(new Error(CK.t("err.noToken")), { code: "NOAUTH" });
    token = j.accessToken; tokenAt = Date.now();
    accountId = (j.account && (j.account.id || j.account.account_id)) || CK.cookie("_account") || null;
    return token;
  };

  // ---------- Ochrona przed limitem zapytań (HTTP 429) ----------
  // Po 429 cała wtyczka (wszystkie karty) robi przerwę: tyle, ile każe serwer (Retry-After), min. 60 s,
  // a przy kolejnych 429 z rzędu dwa razy dłużej (maks. 10 min). W czasie przerwy:
  //  - zapytania w tle (znaczniki czasu, minimapa, odświeżanie listy) w ogóle nie idą do serwera,
  //  - operacje uruchomione przez użytkownika (usuwanie, eksport, indeks) czekają i ruszają same po przerwie.
  // Do tego minimalny odstęp między naszymi zapytaniami, żeby nigdy nie robić „serii”.
  const PAUSE_KEY = "ckp.pauseUntil", STREAK_KEY = "ckp.pauseStreak";
  const MIN_GAP = 400, MIN_PAUSE = 60000, MAX_PAUSE = 10 * 60000;
  const lsGet = k => { try { return parseInt(localStorage.getItem(k), 10) || 0; } catch { return 0; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, String(v)); } catch {} };
  let pauseUntilMem = 0, lastStart = 0, gateChain = Promise.resolve();
  const limitListeners = new Set();
  CK.limit = {
    pausedFor() { return Math.max(0, Math.max(pauseUntilMem, lsGet(PAUSE_KEY)) - Date.now()); },
    onChange(fn) { limitListeners.add(fn); return () => limitListeners.delete(fn); },
    hit(r) {
      const ra = r && r.headers && typeof r.headers.get === "function" ? r.headers.get("retry-after") : null;
      let ms = 0;
      if (ra) { const n = Number(ra); ms = isFinite(n) ? n * 1000 : Math.max(0, Date.parse(ra) - Date.now()) || 0; }
      const streak = Math.min(lsGet(STREAK_KEY) + 1, 6);
      ms = Math.min(MAX_PAUSE, Math.max(ms, MIN_PAUSE * 2 ** (streak - 1)));
      const until = Date.now() + ms;
      pauseUntilMem = Math.max(pauseUntilMem, until);
      lsSet(PAUSE_KEY, pauseUntilMem); lsSet(STREAK_KEY, streak);
      console.warn(`[ChatKit Pro] ChatGPT ograniczył zapytania (429) — przerwa ${Math.round(ms / 1000)} s`);
      limitListeners.forEach(f => { try { f(ms); } catch {} });
    },
    ok() { if (lsGet(STREAK_KEY)) lsSet(STREAK_KEY, 0); },
    _reset() { pauseUntilMem = 0; lsSet(PAUSE_KEY, 0); lsSet(STREAK_KEY, 0); } // testy
  };
  const rateResponse = () => ({ ok: false, status: 429, statusText: "Paused (ChatKit Pro)", headers: { get: () => null },
    json: async () => ({ detail: "ChatKit Pro: paused after 429" }), text: async () => "ChatKit Pro: paused after 429" });
  // Kolejka: zapytania startują po kolei, co najmniej MIN_GAP ms od poprzedniego.
  const gate = () => {
    const p = gateChain.then(async () => {
      const wait = lastStart + MIN_GAP - Date.now();
      if (wait > 0) await CK.sleep(wait);
      lastStart = Date.now();
    });
    gateChain = p.catch(() => {});
    return p;
  };
  // Czeka do końca przerwy (dla operacji użytkownika). Zwraca false, gdy przerwano (stop()).
  CK.waitLimit = async (stop = () => false) => {
    // operacja czeka na koniec przerwy → panel pokazuje komunikat z odliczaniem
    if (CK.limit.pausedFor() > 0) limitListeners.forEach(f => { try { f(CK.limit.pausedFor(), "wait"); } catch {} });
    while (CK.limit.pausedFor() > 0) {
      if (stop()) return false;
      await CK.sleep(Math.min(1000, CK.limit.pausedFor()));
    }
    return true;
  };

  // opts.bg = true → zapytanie w tle: przy przerwie nie wychodzi do serwera (zwraca 429 bez sieci).
  CK.api = async (path, opts = {}) => {
    const { bg, ...fo } = opts;
    if (CK.limit.pausedFor() > 0) {
      if (bg) return rateResponse();
      await CK.waitLimit();
    }
    await gate();
    const headers = {
      Authorization: "Bearer " + (await CK.getToken()),
      "Content-Type": "application/json",
      ...(fo.headers || {})
    };
    const did = CK.cookie("oai-did");
    if (did) { headers["oai-device-id"] = did; headers["oai-did"] = did; }
    if (accountId) headers["chatgpt-account-id"] = accountId;
    const r = await CK.fetch("/backend-api" + path, { cache: "no-store", ...fo, headers, credentials: "include" });
    if (r.status === 401) token = null;
    if (r.status === 429) CK.limit.hit(r); else if (r.ok) CK.limit.ok();
    return r;
  };

  // Ponawia tylko przy błędach serwera (5xx): maks. 2 razy, 2 s i 4 s. Przy 429 NIE ponawia od razu —
  // CK.api ustawia przerwę; zapytanie użytkownika poczeka do jej końca i spróbuje jeszcze raz (raz).
  CK.withRetry = async (fn, { bg = false } = {}) => {
    let r = await fn(), tries5xx = 0, tries429 = 0;
    while (!r.ok) {
      if (r.status >= 500 && tries5xx < 2) { tries5xx++; await CK.sleep(2000 * tries5xx); }
      else if (r.status === 429 && !bg && tries429 < 1) { tries429++; await CK.waitLimit(); }
      else break;
      r = await fn();
    }
    return r;
  };

  // Pamięć rozmów: jedna odpowiedź dla znaczników, minimapy, zakładek i eksportu; dwa jednoczesne
  // zapytania o ten sam czat idą jako jedno. Ważność 2 min (zmiany przez PATCH czyszczą wpis).
  const CONV_TTL = 2 * 60000, convCache = new Map(), convInflight = new Map();
  CK.convCache = {
    get(id) { const e = convCache.get(id); if (e && Date.now() - e.t < CONV_TTL) return e.conv; return null; },
    put(id, conv) { if (!id || !conv) return; convCache.delete(id); convCache.set(id, { t: Date.now(), conv }); while (convCache.size > 30) convCache.delete(convCache.keys().next().value); },
    drop(id) { convCache.delete(id); },
    clear() { convCache.clear(); }
  };
  // opts: { bg, fresh } — fresh pomija pamięć (np. po nowej wiadomości).
  CK.getConversation = async (id, { bg = false, fresh = false } = {}) => {
    if (!fresh) { const c = CK.convCache.get(id); if (c) return c; }
    if (convInflight.has(id)) return convInflight.get(id);
    const p = (async () => {
      const r = await CK.withRetry(() => CK.api("/conversation/" + id, { bg }), { bg });
      if (!r.ok) throw Object.assign(new Error(r.status === 429 ? CK.t("err.rate") : CK.t("err.chat", { s: r.status })), { status: r.status });
      const conv = await r.json();
      CK.convCache.put(id, conv);
      return conv;
    })();
    convInflight.set(id, p);
    try { return await p; } finally { convInflight.delete(id); }
  };

  CK.patchConversation = async (id, body) => {
    const r = await CK.withRetry(() => CK.api("/conversation/" + id, { method: "PATCH", body: JSON.stringify(body) }));
    CK.convCache.drop(id);
    return r.ok;
  };

  // ---------- rozmowa -> lista wiadomości ----------
  function partsToText(content) {
    if (!content) return "";
    const ct = content.content_type;
    if (ct !== "text" && ct !== "multimodal_text") return "";
    return (content.parts || []).map(p => {
      if (typeof p === "string") return p;
      if (p && typeof p.text === "string") return p.text;
      if (p && p.content_type === "image_asset_pointer") return "[obraz]";
      return "";
    }).filter(Boolean).join("\n");
  }

  // Zwraca widoczną gałąź rozmowy (od korzenia do current_node).
  CK.linearize = conv => {
    const out = [];
    const mapping = conv.mapping || {};
    let node = conv.current_node;
    const seen = new Set();
    while (node && mapping[node] && !seen.has(node)) {
      seen.add(node);
      const n = mapping[node];
      const m = n.message;
      if (m && m.author && (m.author.role === "user" || m.author.role === "assistant")) {
        const hidden = m.metadata && (m.metadata.is_visually_hidden_from_conversation || m.metadata.is_user_system_message);
        const toOther = m.recipient && m.recipient !== "all";
        const text = partsToText(m.content);
        if (!hidden && !toOther && text.trim()) out.push({ id: m.id, role: m.author.role, text, time: m.create_time });
      }
      node = n.parent;
    }
    return out.reverse();
  };

  // ---------- formatowanie ----------
  CK.toDate = t => {
    if (t == null || t === "") return null;
    const d = typeof t === "number" ? new Date(t > 1e12 ? t : t * 1000) : new Date(t);
    return isNaN(d) ? null : d;
  };
  CK.fmtDate = (t, withTime = false) => {
    const d = CK.toDate(t);
    if (!d) return "";
    return withTime
      ? d.toLocaleString(CK.locale || "pl-PL", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString(CK.locale || "pl-PL", { year: "numeric", month: "2-digit", day: "2-digit" });
  };
  CK.fmtSize = b => {
    if (!b) return "";
    const u = ["B", "KB", "MB", "GB"];
    let i = 0; while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return b.toLocaleString(CK.locale || "pl-PL", { maximumFractionDigits: i ? 1 : 0, minimumFractionDigits: i ? 1 : 0 }) + " " + u[i];
  };
  CK.esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  CK.safeName = s => String(s || "export").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80).trim() || "export";

  // Podświetlanie fraz bez innerHTML: zwraca DocumentFragment z tekstem i elementami <tag> dla trafień.
  CK.highlight = (text, query, tag = "mark", cls = "") => {
    const frag = document.createDocumentFragment(), s = String(text);
    const terms = String(query || "").toLowerCase().split(/\s+/).filter(w => w.length > 0).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (!terms.length) { frag.append(s); return frag; }
    const re = new RegExp("(" + terms.join("|") + ")", "gi");
    let last = 0, m;
    while ((m = re.exec(s))) {
      if (!m[0]) { re.lastIndex++; continue; }
      if (m.index > last) frag.append(s.slice(last, m.index));
      const h = document.createElement(tag); if (cls) h.className = cls; h.textContent = m[0]; frag.append(h);
      last = m.index + m[0].length;
    }
    if (last < s.length) frag.append(s.slice(last));
    return frag;
  };

  // text: string albo gotowy Blob (np. ZIP).
  CK.download = (name, text, mime = "text/plain") => {
    const blob = text instanceof Blob ? text : new Blob([text], { type: mime + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // ---------- włącznik i „strażnik” elementów wtyczki ----------
  // Oficjalny sklep tej przeglądarki (pusty = jeszcze nie ma) — w wersji z GitHuba pokazujemy link w ustawieniach.
  CK.STORE_URL = "https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh";
  CK.on = () => !(CK.store && CK.store.data && CK.store.data.enabled === false);
  // ChatGPT po odświeżeniu potrafi przebudować <html> (hydracja Reacta) i usunąć nasze elementy — wtedy je przywracamy.
  const kept = new Set();
  const reattach = () => { for (const n of kept) if (!n.isConnected) document.documentElement.appendChild(n); };
  CK.keepAttached = node => {
    kept.add(node); reattach();
    if (!CK._keepObs) {
      CK._keepObs = new MutationObserver(reattach);
      CK._keepObs.observe(document.documentElement, { childList: true });
      setInterval(reattach, 1500);
    }
    return node;
  };

  // ---------- ZIP (bez kompresji, nazwy w UTF-8) ----------
  const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  CK.crc32 = bytes => { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC_T[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  // files: [{ name, data: string | Uint8Array, date? }] → Blob (application/zip). Powtórzone nazwy dostają „ (2)”.
  CK.zip = files => {
    const enc = new TextEncoder(), chunks = [], central = [], used = new Set();
    let offset = 0;
    for (const f of files) {
      let name = String(f.name).replace(/^\/+/, "");
      if (used.has(name.toLowerCase())) {
        const dot = name.lastIndexOf("."), stem = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : "";
        let n = 2; while (used.has((stem + " (" + n + ")" + ext).toLowerCase())) n++;
        name = stem + " (" + n + ")" + ext;
      }
      used.add(name.toLowerCase());
      const nameB = enc.encode(name), data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
      const crc = CK.crc32(data), d = f.date instanceof Date && !isNaN(f.date) ? f.date : new Date();
      const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
      const dosDate = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
      const head = (sig, central) => {
        const b = new DataView(new ArrayBuffer(central ? 46 : 30));
        b.setUint32(0, sig, true); let p = 4;
        if (central) { b.setUint16(p, 20, true); p += 2; }
        b.setUint16(p, 20, true); b.setUint16(p + 2, 0x0800, true); b.setUint16(p + 4, 0, true);
        b.setUint16(p + 6, dosTime, true); b.setUint16(p + 8, dosDate, true); b.setUint32(p + 10, crc, true);
        b.setUint32(p + 14, data.length, true); b.setUint32(p + 18, data.length, true); b.setUint16(p + 22, nameB.length, true);
        if (central) b.setUint32(42, offset, true);
        return new Uint8Array(b.buffer);
      };
      const local = head(0x04034b50, false);
      chunks.push(local, nameB, data);
      central.push(head(0x02014b50, true), nameB);
      offset += local.length + nameB.length + data.length;
    }
    const cdSize = central.reduce((a, c) => a + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
  };

  // ---------- kod z odpowiedzi ----------
  const EXT = { python: "py", py: "py", javascript: "js", js: "js", node: "js", typescript: "ts", ts: "ts", tsx: "tsx", jsx: "jsx", html: "html", xml: "xml", svg: "svg",
    css: "css", scss: "scss", sass: "sass", less: "less", json: "json", jsonc: "json", yaml: "yml", yml: "yml", toml: "toml", ini: "ini", markdown: "md", md: "md",
    bash: "sh", sh: "sh", shell: "sh", zsh: "sh", console: "sh", powershell: "ps1", ps1: "ps1", pwsh: "ps1", bat: "bat", batch: "bat", cmd: "bat",
    sql: "sql", java: "java", kotlin: "kt", kt: "kt", swift: "swift", c: "c", h: "h", cpp: "cpp", "c++": "cpp", cc: "cpp", hpp: "hpp", csharp: "cs", "c#": "cs", cs: "cs",
    go: "go", golang: "go", rust: "rs", rs: "rs", ruby: "rb", rb: "rb", php: "php", perl: "pl", lua: "lua", r: "r", dart: "dart", scala: "scala",
    vue: "vue", svelte: "svelte", graphql: "graphql", dockerfile: "dockerfile", docker: "dockerfile", makefile: "mk", vb: "vb", vbnet: "vb", lisp: "lisp",
    latex: "tex", tex: "tex", csv: "csv", diff: "diff", mermaid: "mmd", plaintext: "txt", text: "txt", txt: "txt" };
  CK.codeExt = lang => EXT[String(lang || "").trim().toLowerCase()] || "txt";
  CK.codeFileName = (base, lang, n) => {
    const ext = CK.codeExt(lang);
    if (ext === "dockerfile") return (n ? n + "-" : "") + "Dockerfile";
    return CK.safeName(base).slice(0, 60) + (n ? "-" + n : "") + "." + ext;
  };
  // Bloki ``` z tekstu wiadomości → [{ lang, code }]
  CK.extractCode = text => {
    const out = [], re = /(^|\n)[ \t]*```([^\n`]*)\n([\s\S]*?)\n[ \t]*```/g;
    let m;
    while ((m = re.exec(String(text || "")))) { const code = m[3]; if (code.trim()) out.push({ lang: m[2].trim().split(/\s+/)[0] || "", code: code + "\n" }); }
    return out;
  };

  // ---------- liczniki ----------
  CK.chatStats = msgs => {
    const st = { messages: msgs.length, user: 0, assistant: 0, words: 0, chars: 0, tokens: 0 };
    for (const m of msgs) {
      st[m.role === "user" ? "user" : "assistant"]++;
      const tx = String(m.text || "");
      st.chars += tx.length;
      st.words += (tx.match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu) || []).length;
    }
    st.tokens = Math.round(st.chars / 4); // przybliżenie: ~4 znaki na token
    return st;
  };
  // Czytelny znacznik nad wiadomością: „Dziś, 01:30”, „Wczoraj, 23:10”, „pon., 13 lis, 01:30”, „13 lis 2025, 01:30”.
  CK.fmtStamp = (t, nowD = new Date()) => {
    const d = CK.toDate(t);
    if (!d) return "";
    const loc = CK.locale || "pl-PL";
    const time = d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
    const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((day(nowD) - day(d)) / 86400000);
    if (diff === 0) return CK.t("ts.today") + ", " + time;
    if (diff === 1) return CK.t("ts.yesterday") + ", " + time;
    const opts = d.getFullYear() === nowD.getFullYear() ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" };
    return d.toLocaleDateString(loc, opts) + ", " + time;
  };
  CK.fmtNum = n => Number(n).toLocaleString(CK.locale || "pl-PL");

  // ---------- pamięć (foldery, gwiazdki, ustawienia) ----------
  const DEFAULTS = () => ({
    folders: [],            // [{id, name, color, parent}]
    chatFolder: {},         // chatId -> folderId
    stars: {},              // chatId -> true
    prompts: null,          // [{id, title, text, cat, uses}] — null = jeszcze nie zainicjowane (pakiet startowy)
    bookmarks: {},          // "convId:msgId" -> {conv, msg, convTitle, snippet, role, time, added}
    notes: [],              // [{id, conv, convTitle, msg, quote, text, added}]
    chatNotes: {},          // convId -> tekst notatki do całego czatu
    rules: [],              // [{id, name, target, olderDays, keepStarred, keepFoldered, onlyAI, action}]
    enabled: true,          // włącznik całej wtyczki (ikona na pasku przeglądarki)
    settings: { timestamps: true, showFab: true, lang: "auto", classicDark: false, minimap: true, sidebarMarks: true, chatWidth: 0, fontSize: 0, codeSave: true, backupEvery: 7 }
  });

  CK.store = {
    data: DEFAULTS(),
    listeners: new Set(),
    async load() {
      const keys = Object.keys(DEFAULTS());
      const r = await chrome.storage.local.get(keys);
      const d = DEFAULTS();
      for (const k of keys) if (r[k] !== undefined) d[k] = k === "settings" ? { ...d.settings, ...r[k] } : r[k];
      this.data = d;
      this.emit();
    },
    async save(...keys) {
      const obj = {};
      for (const k of keys.length ? keys : Object.keys(this.data)) obj[k] = this.data[k];
      await chrome.storage.local.set(obj);
      this.emit();
    },
    onChange(fn) { this.listeners.add(fn); },
    emit() { this.listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }
  };

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    let touched = false;
    for (const [k, v] of Object.entries(changes)) {
      if (k in CK.store.data) { CK.store.data[k] = v.newValue ?? DEFAULTS()[k]; touched = true; }
    }
    if (touched) CK.store.emit();
  });

  // ---------- foldery ----------
  CK.folders = {
    all: () => CK.store.data.folders,
    get: id => CK.store.data.folders.find(f => f.id === id),
    children: parent => CK.store.data.folders.filter(f => (f.parent || null) === (parent || null)).sort((a, b) => a.name.localeCompare(b.name, "pl")),
    subtree(id) {
      const out = new Set([id]);
      let added = true;
      while (added) {
        added = false;
        for (const f of CK.store.data.folders) if (f.parent && out.has(f.parent) && !out.has(f.id)) { out.add(f.id); added = true; }
      }
      return out;
    },
    // lista w kolejności drzewa z głębokością (do selectów)
    flat(parent = null, depth = 0, acc = []) {
      for (const f of this.children(parent)) { acc.push({ ...f, depth }); this.flat(f.id, depth + 1, acc); }
      return acc;
    },
    async create(name, parent = null) {
      const colors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#eab308"];
      const f = { id: "f_" + Math.random().toString(36).slice(2, 10), name, parent, color: colors[CK.store.data.folders.length % colors.length] };
      CK.store.data.folders.push(f);
      await CK.store.save("folders");
      return f;
    },
    async update(id, patch) {
      const f = this.get(id); if (!f) return;
      Object.assign(f, patch);
      await CK.store.save("folders");
    },
    async remove(id) {
      const ids = this.subtree(id);
      CK.store.data.folders = CK.store.data.folders.filter(f => !ids.has(f.id));
      for (const [chat, fid] of Object.entries(CK.store.data.chatFolder)) if (ids.has(fid)) delete CK.store.data.chatFolder[chat];
      await CK.store.save("folders", "chatFolder");
    },
    async assign(chatIds, folderId) {
      for (const id of chatIds) {
        if (folderId) CK.store.data.chatFolder[id] = folderId;
        else delete CK.store.data.chatFolder[id];
      }
      await CK.store.save("chatFolder");
    },
    chatsIn(folderId) {
      const ids = this.subtree(folderId);
      return Object.entries(CK.store.data.chatFolder).filter(([, f]) => ids.has(f)).map(([c]) => c);
    }
  };

  // Ostatnio pobrana rozmowa (znaczniki czasu i minimapa korzystają z jednej odpowiedzi).
  CK.convBus = new Set();
  CK.lastConv = null;
  CK.emitConv = (conv, id) => { CK.lastConv = { id: id || conv.conversation_id || null, conv }; CK.convCache.put(CK.lastConv.id, conv); CK.convBus.forEach(f => { try { f(conv); } catch (e) { console.error(e); } }); };

  CK.uid = (p = "x") => p + "_" + Math.random().toString(36).slice(2, 10);

  CK.ready = CK.store.load().catch(e => console.error("[ChatKit Pro] storage", e));
})();
