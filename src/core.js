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

  // ---------- API ----------
  let token = null, accountId = null, tokenAt = 0;

  CK.getToken = async () => {
    if (token && Date.now() - tokenAt < 10 * 60 * 1000) return token;
    const r = await fetch("/api/auth/session", { credentials: "include" });
    if (!r.ok) throw new Error(CK.t("err.session", { s: r.status }));
    const j = await r.json();
    if (!j.accessToken) throw new Error(CK.t("err.noToken"));
    token = j.accessToken; tokenAt = Date.now();
    accountId = (j.account && (j.account.id || j.account.account_id)) || CK.cookie("_account") || null;
    return token;
  };

  CK.api = async (path, opts = {}) => {
    const headers = {
      Authorization: "Bearer " + (await CK.getToken()),
      "Content-Type": "application/json",
      ...(opts.headers || {})
    };
    const did = CK.cookie("oai-did");
    if (did) { headers["oai-device-id"] = did; headers["oai-did"] = did; }
    if (accountId) headers["chatgpt-account-id"] = accountId;
    const r = await fetch("/backend-api" + path, { cache: "no-store", ...opts, headers, credentials: "include" });
    if (r.status === 401) token = null;
    return r;
  };

  // Ponawia przy limitach (429) i błędach serwera (5xx).
  CK.withRetry = async fn => {
    let r;
    for (let attempt = 0; attempt < 5; attempt++) {
      r = await fn();
      if (r.ok) return r;
      if (r.status === 429 || r.status >= 500) { await CK.sleep(1500 * (attempt + 1)); continue; }
      return r;
    }
    return r;
  };

  CK.getConversation = async id => {
    const r = await CK.withRetry(() => CK.api("/conversation/" + id));
    if (!r.ok) throw new Error(CK.t("err.chat", { s: r.status }));
    return r.json();
  };

  CK.patchConversation = async (id, body) => {
    const r = await CK.withRetry(() => CK.api("/conversation/" + id, { method: "PATCH", body: JSON.stringify(body) }));
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

  CK.download = (name, text, mime = "text/plain") => {
    const url = URL.createObjectURL(new Blob([text], { type: mime + ";charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

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
    settings: { timestamps: true, showFab: true, lang: "auto", classicDark: false, minimap: true, sidebarMarks: true }
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
  CK.emitConv = (conv, id) => { CK.lastConv = { id: id || conv.conversation_id || null, conv }; CK.convBus.forEach(f => { try { f(conv); } catch (e) { console.error(e); } }); };

  CK.uid = (p = "x") => p + "_" + Math.random().toString(36).slice(2, 10);

  CK.ready = CK.store.load().catch(e => console.error("[ChatKit Pro] storage", e));
})();
