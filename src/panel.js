// ChatKit Pro — panel główny: czaty, archiwum, biblioteka + rejestr dodatkowych zakładek (CK.ui.registerTab).
(() => {
  const CK = window.CK;
  const { sleep } = CK;
  const t = (...a) => CK.t(...a);

  const ls = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem("ckp." + k)); return v ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("ckp." + k, JSON.stringify(v)); } catch {} }
  };

  // =====================================================================
  //  ŹRÓDŁA DANYCH
  // =====================================================================
  function chatSource(archived) {
    return {
      items: [], offset: 0, done: false, total: null,
      // od 1.5.1: lista zapamiętana lokalnie (per konto) → panel pokazuje od razu wszystkie czaty,
      // a w tle (spokojnie, jako zapytania „bg”) dociąga i sprawdza całą listę z ChatGPT
      gone: new Set(), syncing: false, syncedAt: 0, saveT: 0, noCache: false,
      // po przeniesieniu czatów między listami (archiwizacja/przywracanie) pamięć jest nieaktualna → wczytaj od nowa
      reset() { this.items = []; this.offset = 0; this.done = false; this.total = null; this.syncedAt = 0; this.noCache = true; this.gen = (this.gen || 0) + 1; },
      async cacheKey() { await CK.getToken(); return "ckp.list." + (archived ? "archive" : "chats") + "." + (CK.acct || "default"); },
      async restore() {
        try {
          const k = await this.cacheKey();
          const r = (await chrome.storage.local.get(k))[k];
          if (this.noCache || !r || !Array.isArray(r.i) || !r.i.length || this.items.length) return false;
          this.items = r.i.filter(a => !this.gone.has(a[0])).map(a => ({ key: a[0], title: a[1] || t("untitled"), date: a[2], created: a[3] }));
          this.offset = this.items.length; this.total = typeof r.t === "number" ? r.t : null; this.done = !!r.c; this.syncedAt = r.s || 0;
          return true;
        } catch (e) { return false; }
      },
      persist() {
        clearTimeout(this.saveT);
        this.saveT = setTimeout(async () => {
          try {
            if (!this.items.length) return;
            const k = await this.cacheKey();
            await chrome.storage.local.set({ [k]: { i: this.items.map(c => [c.key, c.title, c.date, c.created]), t: this.total, c: this.done, s: this.syncedAt } });
          } catch (e) { /* pamięć listy jest tylko udogodnieniem */ }
        }, 800);
      },
      forget(key) { this.gone.add(key); },
      async sync(onDone) {
        // raz na każde wczytanie ChatGPT, potem najwyżej co 15 min (zmiany z telefonu/innej karty)
        if (this.syncing || (this.syncedOnce && this.done && Date.now() - this.syncedAt < 15 * 60 * 1000)) return;
        this.syncing = true; const gen = this.gen;
        try {
          const all = []; let off = 0, total = null;
          for (let guard = 0; guard < 1000; guard++) {
            const { list, total: tt } = await this.fetchPage(off, true);
            if (tt !== null) total = tt;
            all.push(...list); off += list.length;
            if (!list.length || (total !== null && off >= total)) break;
            await sleep(800);
          }
          if (gen !== this.gen) return; // lista wyczyszczona w międzyczasie (np. przywrócenie z archiwum) — wynik nieaktualny
          const seen = new Set();
          const fresh = all.filter(c => !this.gone.has(c.key) && !seen.has(c.key) && seen.add(c.key));
          this.items = fresh; this.offset = fresh.length; this.total = fresh.length; this.done = true; this.syncedAt = Date.now(); this.noCache = false; this.syncedOnce = true;
          this.persist();
          onDone && onDone();
        } catch (e) { /* przerwa po 429 albo brak sieci — zostaje to, co było; spróbujemy przy następnym otwarciu */ }
        finally { this.syncing = false; }
      },
      async fetchPage(offset, bg = false) {
        const r = await CK.withRetry(() => CK.api(`/conversations?offset=${offset}&limit=100&order=updated${archived ? "&is_archived=true" : ""}`, { bg }), { bg });
        if (!r.ok) throw new Error(t("err.chatList", { s: r.status }));
        const j = await r.json();
        const list = (j.items || []).map(c => ({ key: c.id, title: c.title || t("untitled"), date: c.update_time, created: c.create_time }));
        return { list, total: typeof j.total === "number" ? j.total : null };
      },
      async loadPage() {
        const { list, total } = await this.fetchPage(this.offset);
        const known = new Set(this.items.map(i => i.key));
        list.forEach(c => { if (!known.has(c.key)) this.items.push(c); });
        this.offset += list.length;
        if (total !== null) this.total = total;
        if (!list.length || (this.total !== null && this.offset >= this.total)) this.done = true;
        this.persist();
        return list.length;
      },
      async refreshTop(bg = false) {
        const { list, total } = await this.fetchPage(0, bg);
        const byKey = new Map(this.items.map(i => [i.key, i]));
        let added = 0;
        for (const c of list) { const old = byKey.get(c.key); if (old) Object.assign(old, c); else { this.items.push(c); added++; } }
        this.offset += added;
        if (total !== null) { this.total = total; this.done = this.offset >= total; }
        this.persist();
        return added;
      },
      async loadEverything(onProgress) {
        while (!this.done) { const n = await this.loadPage(); onProgress && onProgress(this.items.length); if (!n) break; await sleep(500); }
      }
    };
  }

  function nextCursor(j) {
    for (const k of ["cursor", "next_cursor", "next", "nextCursor"]) if (typeof j?.[k] === "string" && j[k]) return j[k];
    for (const [k, v] of Object.entries(j || {})) if (/cursor/i.test(k) && typeof v === "string" && v) return v;
    return null;
  }

  // Rodzaj pliku w Bibliotece (od 1.4.0): image / pdf / doc / sheet / slides / text / code / zip / video / audio / other
  const EXT_KIND = {
    pdf: "pdf", doc: "doc", docx: "doc", odt: "doc", rtf: "doc", pages: "doc",
    xls: "sheet", xlsx: "sheet", ods: "sheet", csv: "sheet", tsv: "sheet", numbers: "sheet",
    ppt: "slides", pptx: "slides", odp: "slides", key: "slides",
    txt: "text", md: "text", log: "text", json: "code", xml: "code", yaml: "code", yml: "code", html: "code", htm: "code", css: "code",
    js: "code", ts: "code", jsx: "code", tsx: "code", py: "code", java: "code", c: "code", cpp: "code", h: "code", cs: "code", go: "code",
    rs: "code", rb: "code", php: "code", sh: "code", ps1: "code", sql: "code", kt: "code", swift: "code", lua: "code",
    png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", heic: "image", bmp: "image", svg: "image",
    zip: "zip", rar: "zip", "7z": "zip", tar: "zip", gz: "zip",
    mp4: "video", mov: "video", webm: "video", mkv: "video", avi: "video", m4b: "audio", mp3: "audio", wav: "audio", m4a: "audio", ogg: "audio", flac: "audio"
  };
  function libKind(cat, mime, name) {
    const ext = String(name || "").split(".").pop().toLowerCase();
    if (cat === "image" || /^image\//.test(mime || "")) return "image";
    if (EXT_KIND[ext]) return EXT_KIND[ext];
    if (cat === "pdf" || mime === "application/pdf") return "pdf";
    if (cat === "video" || /^video\//.test(mime || "")) return "video";
    if (cat === "audio" || /^audio\//.test(mime || "")) return "audio";
    if (/^text\//.test(mime || "")) return "text";
    return "other";
  }
  const KIND_ICON = { pdf: "📕", doc: "📝", sheet: "📊", slides: "📽️", text: "📄", code: "💻", zip: "🗜️", video: "🎬", audio: "🎵", other: "📎", image: "🖼️" };

  function librarySource() {
    return {
      items: [], cursor: null, done: false, cat: ["image", "file", "all", "trash"].includes(ls.get("libcat", "image")) ? ls.get("libcat", "image") : "image", lastRaw: null,
      reset() { this.items = []; this.cursor = null; this.done = false; this.gen = (this.gen || 0) + 1; },
      async refreshTop() {
        const saved = { cursor: this.cursor, done: this.done }, before = this.items.length;
        this.cursor = null;
        try { await this.loadPage(); } finally { this.cursor = saved.cursor; this.done = saved.done; }
        return this.items.length - before;
      },
      async loadPage() {
        const body = {
          cursor: this.cursor, limit: 50, categories: this.cat === "image" ? ["image"] : null, source: null,
          include_hidden_files: false, include_saved_entities: true, include_sites: false, trashed_only: this.cat === "trash", external_account_keys: {}
        };
        const gen = this.gen;
        const r = await CK.withRetry(() => CK.api("/files/library", { method: "POST", body: JSON.stringify(body) }));
        if (!r.ok) throw new Error(t("err.library", { s: r.status }));
        const j = await r.json();
        if (gen !== this.gen) return 0; // w międzyczasie zmieniono Obrazy/Pliki/Wszystko — ta strona jest już nieaktualna
        this.lastRaw = j;
        const arr = Array.isArray(j.items) ? j.items : [];
        const list = [];
        for (const o of arr) {
          if (o.kind === "directory") continue;
          const id = o.library_file_id || (typeof o.id === "string" && o.id.startsWith("libfile_") ? o.id : null);
          if (!id) continue;
          // od 1.4.0: Obrazy / Pliki / Wszystko — „Pliki” = wszystko poza obrazami (kategoria z ChatGPT albo typ MIME)
          const name = o.file_name || o.name || id;
          const kind = libKind(o.library_file_category, o.mime_type, name);
          if (this.cat === "file" && kind === "image") continue;
          let dir = o.parent_directory_id || o.directory_id || null;
          if (dir && !String(dir).startsWith("libdir_")) dir = "libdir_" + dir;
          list.push({
            key: id, title: name, kind, chat: o.origination_thread_id || null, date: o.record_creation_time || o.file_upload_time || o.updated_at,
            size: o.file_size_bytes || 0, generated: !!o.image_gen_attribution, project: o.is_project ? (o.gizmo_id || "?") : null,
            thumb: o.thumbnail_url || o.thumbnail_preview_url || null, mime: o.mime_type || null,
            payload: { library_file_id: id, file_id: o.file_id, parent_directory_id: dir, file_name: name }
          });
        }
        const known = new Set(this.items.map(i => i.key));
        list.forEach(c => { if (!known.has(c.key)) this.items.push(c); });
        const nc = nextCursor(j);
        if (!arr.length || !nc || nc === this.cursor) this.done = true;
        this.cursor = nc;
        return arr.length; // liczba pozycji z serwera (część może być odfiltrowana — np. obrazy w trybie „Pliki”)
      },
      async loadEverything(onProgress) {
        while (!this.done) { const n = await this.loadPage(); onProgress && onProgress(this.items.length); if (!n && !this.done) break; await sleep(500); }
      },
      async remove(keys, onProgress) {
        const byKey = new Map(this.items.map(i => [i.key, i]));
        const BATCH = 25;
        let ok = 0, fail = 0;
        const send = files => CK.withRetry(() => CK.api("/files/library/files/delete-batch", { method: "POST", body: JSON.stringify({ files }) }));
        for (let i = 0; i < keys.length; i += BATCH) {
          const chunk = keys.slice(i, i + BATCH).map(k => byKey.get(k)).filter(Boolean);
          let r = await send(chunk.map(c => c.payload));
          if (!r.ok && r.status >= 400 && r.status < 500) r = await send(chunk.map(c => ({ ...c.payload, parent_directory_id: undefined })));
          if (r.ok) { ok += chunk.length; const gone = new Set(chunk.map(c => c.key)); this.items = this.items.filter(c => !gone.has(c.key)); }
          else { fail += chunk.length; console.warn("[ChatKit Pro] delete-batch", r.status); }
          onProgress(ok + fail, keys.length);
          await sleep(400);
        }
        return { ok, fail };
      }
    };
  }

  const sources = { chats: chatSource(false), archive: chatSource(true), lib: librarySource() };
  // pliki z usuniętych czatów (od 1.4.0) — stan wyszukiwania, patrz orphanFlow()
  const orphan = { done: false, running: false, stop: false, gone: new Set(ls.get("libgone", [])) };

  CK.sources = sources;
  const LIST_TABS = ["chats", "archive", "lib"];
  const sel = Object.fromEntries(LIST_TABS.map(k => [k, new Set(ls.get("sel." + k, []))]));
  const saveSel = k => ls.set("sel." + k, [...sel[k]]);
  const filters = {
    chats: { q: "", sort: "new", star: false, folder: "all", tag: "", older: "" },
    archive: { q: "", sort: "new", star: false, older: "" },
    lib: { q: "", sort: "new", type: "all", proj: "all", older: "", kind: "all", chat: "all" }
  };
  let current = "chats", busy = false, lastClicked = null, visibleNow = [], notLoggedIn = false;
  const view = { big: false, size: 180, ...ls.get("view", {}) };
  const extraTabs = []; // {id, icon, label(), render(container, ui), footer?(actions, ui)}

  // =====================================================================
  //  UI — szkielet
  // =====================================================================
  const host = document.createElement("div");
  host.id = "chatkit-pro-host";
  CK.keepAttached(host);
  const root = host.attachShadow({ mode: "open" });

  root.innerHTML = `
  <style>
    :host { all: initial; }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
    #fab { position: fixed; right: 18px; bottom: 90px; z-index: 2147483646; width: 48px; height: 48px; border-radius: 50%;
      border: none; background: var(--ck-acc, #ef4444); color: #fff; font-size: 20px; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.35); }
    #fab:hover { background: var(--ck-acc2, #dc2626); }
    #panel { position: fixed; right: 18px; bottom: 150px; z-index: 2147483647; width: 660px; max-width: calc(100vw - 36px);
      height: 80vh; display: none; flex-direction: column; background: var(--ck-bg, #1f1f1f); color: var(--ck-tx, #eee); border: 1px solid var(--ck-bg5, #3a3a3a);
      border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,.5); font-size: 13px; overflow: hidden; }
    #panel.open { display: flex; }
    #panel.big { width: min(1400px, 94vw); height: 88vh; right: 3vw; bottom: 6vh; }
    header { padding: 6px 10px 0; display: flex; align-items: center; gap: 4px; }
    header b { font-size: 13px; margin-right: 6px; color: var(--ck-acctx, #f87171); }
    header b small { font-weight: 400; font-size: 11px; color: var(--ck-mut2, #888); margin-left: 2px; }
    #tabs { display: flex; flex-wrap: wrap; gap: 0 2px; padding: 0 8px; border-bottom: 1px solid var(--ck-line, #333); }
    #tabs.fit1 .tab { padding: 6px 5px !important; font-size: 12px !important; }
    #tabs.fit2 .tab { padding: 6px 3px !important; font-size: 11.5px !important; letter-spacing: -.01em; }
    .tab { background: none !important; border: none !important; border-bottom: 2px solid transparent !important; border-radius: 0 !important; padding: 6px 7px !important; font-size: 12.5px !important; color: var(--ck-mut, #bbb) !important; }
    .tab.active { border-bottom-color: var(--ck-acc, #ef4444) !important; font-weight: 600; color: var(--ck-strong, #fff) !important; }
    .sp { flex: 1; }
    #upd { margin: 6px 10px 0; padding: 7px 10px; border-radius: 8px; background: rgba(34,197,94,.12); border: 1px solid rgba(34,197,94,.45); color: #bbf7d0; display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
    #upd a { background: #16a34a; color: #fff; border-radius: 6px; padding: 4px 10px; text-decoration: none; font-weight: 600; font-size: 12px; }
    #upd a:hover { background: #15803d; }
    .rnprev { margin-top: 8px; border-top: 1px solid var(--ck-line, #333); padding-top: 6px; max-height: 200px; overflow-y: auto; }
    .rnrow { font-size: 12px; padding: 3px 0; color: var(--ck-tx2, #ddd); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rnrow s { color: var(--ck-mut2, #888); } .rnrow b { color: #86efac; font-weight: 600; } .rnrow.same b { color: var(--ck-mut2, #999); font-weight: 400; }
    #bak { margin: 6px 10px 0; padding: 7px 10px; border-radius: 8px; background: rgba(245,158,11,.10); border: 1px solid rgba(245,158,11,.45); color: #fde68a; display: flex; align-items: center; gap: 8px; font-size: 12.5px; flex-wrap: wrap; }
    #bak button.go { background: #d97706; color: #fff; border-color: #d97706; font-weight: 600; }
    #bak button.go:hover { background: #b45309; }
    #viewctl { display: none; align-items: center; gap: 6px; color: var(--ck-mut, #aaa); font-size: 12px; }
    #panel.big.lib #viewctl { display: flex; }
    #viewctl input { width: 110px; }
    .filters { padding: 6px 10px; display: flex; gap: 6px; align-items: center; border-bottom: 1px solid var(--ck-line, #333); flex-wrap: wrap; }
    input[type=text], input[type=number], input[type=search], select, textarea { background: var(--ck-bg3, #2a2a2a); border: 1px solid var(--ck-line2, #444); color: var(--ck-tx, #eee); border-radius: 6px; padding: 5px 7px; font-size: 12px; }
    textarea { width: 100%; resize: vertical; font-family: inherit; line-height: 1.45; }
    input[type=text], input[type=search] { flex: 1; min-width: 140px; }
    input[type=number] { width: 64px; }
    label.chk { display: flex; align-items: center; gap: 4px; color: var(--ck-tx2, #ccc); font-size: 12px; cursor: pointer; }
    button { background: var(--ck-bg4, #2f2f2f); color: var(--ck-tx, #eee); border: 1px solid var(--ck-line2, #444); border-radius: 6px; padding: 5px 9px; cursor: pointer; font-size: 12px; white-space: nowrap; }
    button:hover:not(:disabled) { background: var(--ck-bg5, #3a3a3a); }
    button:disabled { opacity: .4; cursor: default; }
    button.danger { background: #b91c1c; border-color: #b91c1c; }
    button.danger:hover:not(:disabled) { background: #dc2626; }
    button.primary { background: #2563eb; border-color: #2563eb; }
    button.x { background: none; border: none; font-size: 18px; padding: 0 4px; }
    #body { flex: 1; display: flex; min-height: 0; }
    #folders { width: 170px; flex-shrink: 0; border-right: 1px solid var(--ck-line, #333); overflow-y: auto; padding: 6px 0; font-size: 12px; }
    #panel.big #folders { width: 230px; }
    .fhead { display: flex; align-items: center; padding: 2px 8px 6px; color: var(--ck-mut2, #999); text-transform: uppercase; font-size: 10px; letter-spacing: .05em; }
    .fhead button { padding: 1px 7px; font-size: 13px; }
    .frow { display: flex; align-items: center; gap: 6px; padding: 5px 8px; cursor: pointer; border-left: 3px solid transparent; }
    .frow:hover { background: var(--ck-bg3, #2a2a2a); }
    .frow.active { background: var(--ck-actv, #2f2626); border-left-color: var(--ck-acc, #ef4444); }
    .frow.drop { background: var(--ck-sel, #3b1d1d); outline: 1px dashed var(--ck-acc, #ef4444); }
    .frow .n { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .frow .c { color: var(--ck-mut3, #777); font-size: 11px; }
    .frow .a { display: none; gap: 2px; }
    .frow:hover .a { display: flex; }
    .frow .a span { padding: 0 2px; opacity: .7; }
    .frow .a span:hover { opacity: 1; }
    .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; background: var(--c, var(--ck-mut3, #666)); }
    #list { flex: 1; overflow-y: auto; min-width: 0; }
    .item { display: flex; gap: 8px; padding: 6px 10px; align-items: center; cursor: pointer; border-bottom: 1px solid var(--ck-bg3, #2a2a2a); user-select: none; }
    .item:hover { background: var(--ck-bg3, #2a2a2a); }
    .item.sel { background: var(--ck-sel, #3b1d1d); }
    .item input { pointer-events: none; margin: 0; }
    .item .t { flex: 1; word-break: break-word; min-width: 0; }
    .item .d { color: var(--ck-mut2, #888); font-size: 11px; white-space: nowrap; }
    .item .sz { color: var(--ck-mut, #aaa); font-size: 11px; white-space: nowrap; min-width: 56px; text-align: right; }
    .ic { opacity: .5; font-size: 12px; padding: 0 2px; cursor: pointer; }
    .ic:hover { opacity: 1; }
    .star { color: var(--ck-mut3, #777); font-size: 15px; line-height: 1; }
    .star.on { color: #fbbf24; }
    .tag { display: inline-block; margin-left: 6px; font-size: 10px; padding: 1px 6px; border-radius: 8px; background: color-mix(in srgb, var(--c) 30%, transparent); color: var(--ck-tx, #eee); border: 1px solid var(--c); vertical-align: middle; }
    .badge { font-size: 10px; padding: 1px 5px; border-radius: 6px; background: var(--ck-line, #333); color: var(--ck-mut, #bbb); margin-left: 4px; }
    img.th { width: 44px; height: 44px; object-fit: cover; border-radius: 4px; flex-shrink: 0; background: var(--ck-line, #333); }
    .ph { width: 44px; height: 44px; border-radius: 4px; flex-shrink: 0; background: var(--ck-bg3, #2a2a2a); color: var(--ck-mut3, #666); font-size: 10px; display: flex; align-items: center; justify-content: center; }
    .ph.fk { flex-direction: column; gap: 1px; } .ph .fi { font-size: 18px; line-height: 1; } #list.grid .ph .fi { font-size: 46px; }
    a.badge.lnk { text-decoration: none; cursor: pointer; } a.badge.lnk:hover { color: var(--ck-tx, #eee); }
    .badge.gone { color: #f87171; border-color: rgba(248,113,113,.35); }
    #list.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--sz, 180px), 1fr)); gap: 10px; padding: 10px; align-content: start; }
    #list.grid .item { flex-direction: column; align-items: stretch; gap: 4px; padding: 6px; border: 2px solid var(--ck-bg3, #2a2a2a); border-radius: 8px; position: relative; }
    #list.grid .item.sel { border-color: var(--ck-acc, #ef4444); }
    #list.grid .item input { position: absolute; top: 10px; left: 10px; width: 18px; height: 18px; z-index: 1; }
    #list.grid img.th, #list.grid .ph { width: 100%; height: var(--sz, 180px); object-fit: contain; background: var(--ck-bg0, #111); border-radius: 6px; }
    #list.grid .t { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #list.grid .meta { display: flex; justify-content: space-between; gap: 8px; white-space: nowrap; }
    #list.grid .bdg { position: absolute; top: 10px; right: 10px; display: flex; gap: 3px; }
    #list.grid .bdg .badge { background: rgba(0,0,0,.65); color: var(--ck-tx, #eee); margin: 0; }
    .empty { padding: 30px; text-align: center; color: var(--ck-mut3, #777); line-height: 1.6; }
    footer { padding: 6px 10px 8px; border-top: 1px solid var(--ck-line, #333); }
    #actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    #actions select { max-width: 170px; text-overflow: ellipsis; }
    progress { width: 100%; height: 6px; display: none; margin-top: 6px; }
    #status { color: var(--ck-mut, #aaa); font-size: 12px; margin-top: 6px; }
    #msg { color: #fbbf24; font-size: 12px; margin-top: 2px; }
    #zoom { position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,.85); display: none; align-items: center; justify-content: center; cursor: zoom-out; }
    #zoom img { max-width: 92vw; max-height: 92vh; border-radius: 8px; }
    .pane { padding: 14px 16px; line-height: 1.55; }
    .pane h3 { font-size: 13px; margin: 18px 0 6px; color: var(--ck-acctx, #f87171); }
    .pane h3:first-child { margin-top: 0; }
    .pane p, .muted { color: var(--ck-mut2, #999); margin: 4px 0; font-size: 12px; }
    .rowb { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; align-items: center; }
    .pal { max-height: 55vh; overflow: auto; margin-top: 8px; }
    .palrow { display: flex; gap: 9px; align-items: center; padding: 7px 9px; border-radius: 7px; cursor: pointer; }
    .palrow.on { background: var(--ck-bg4, #2f2f2f); }
    .palrow .pi { width: 18px; text-align: center; color: #9db4ff; flex-shrink: 0; }
    .palrow .pl { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .palrow .ps { color: var(--ck-mut2, #888); font-size: 11px; flex-shrink: 0; max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    a.ic { color: inherit; text-decoration: none; }
    .htag { display: inline-block; margin-left: 5px; font-size: 10.5px; padding: 0 6px; border-radius: 8px; background: #2b3245; color: #9db4ff; border: 1px solid #3b4a72; vertical-align: middle; cursor: pointer; }
    .htag:hover { border-color: #7f9cff; }
    .htag.big { font-size: 12px; padding: 2px 8px; margin: 3px 4px 3px 0; }
    .htag.part { opacity: .65; border-style: dashed; }
    .htag b { cursor: pointer; color: var(--ck-acctx, #f87171); }
    .tgbox { margin: 6px 0; line-height: 1.9; }
    .card { border: 1px solid var(--ck-line, #333); border-radius: 8px; padding: 9px 11px; margin: 0 0 8px; background: var(--ck-bg2, #242424); }
    .card:hover { border-color: var(--ck-line2, #444); }
    .card .h { display: flex; gap: 8px; align-items: center; }
    .card .h b { flex: 1; font-size: 13px; }
    .card.pr .h b { cursor: default; }
    .card.pr .drag { cursor: grab; color: var(--ck-mut3, #666); padding: 0 2px; user-select: none; font-size: 14px; }
    .card.pr .drag:hover { color: var(--ck-tx2, #ccc); }
    .card.pr .fav { cursor: pointer; font-size: 15px; color: var(--ck-mut3, #666); }
    .card.pr .fav.on { color: #fbbf24; }
    .card.pr.dragging { opacity: .45; }
    .card.pr.over { border-color: var(--ck-acc, #ef4444); box-shadow: 0 -2px 0 var(--ck-acc, #ef4444); }
    .card.pr.favd { border-color: rgba(251,191,36,.35); }
    .tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .tag { font-size: 11px; padding: 1px 7px; border-radius: 999px; background: #1e3a5f; color: #bfdbfe; cursor: pointer; border: 1px solid transparent; }
    .tag:hover, .tag.on { border-color: #60a5fa; }
    .tagbar { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; margin: 0 0 10px; }
    .card .body { color: var(--ck-mut, #bbb); font-size: 12px; white-space: pre-wrap; margin-top: 4px; max-height: 6.5em; overflow: hidden; }
    .quote { border-left: 3px solid var(--ck-acc, #ef4444); padding-left: 8px; color: var(--ck-tx2, #ccc); font-style: italic; margin: 4px 0; white-space: pre-wrap; }
    .hl { background: #854d0e; color: #fff; border-radius: 2px; }
    .bar { height: 8px; background: var(--ck-acc, #ef4444); border-radius: 4px; }
    .barrow { display: grid; grid-template-columns: 90px 1fr 60px; gap: 8px; align-items: center; font-size: 12px; margin: 3px 0; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
    .kpi { background: var(--ck-bg2, #242424); border: 1px solid var(--ck-line, #333); border-radius: 8px; padding: 10px; }
    .kpi b { display: block; font-size: 20px; color: var(--ck-strong, #fff); }
    .kpi span { color: var(--ck-mut2, #999); font-size: 11px; }
    .form { display: grid; gap: 8px; }
    .form label { font-size: 12px; color: var(--ck-mut, #bbb); display: grid; gap: 3px; }
    .modal { position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; }
    .modal .box { background: var(--ck-bg, #1f1f1f); border: 1px solid var(--ck-bg5, #3a3a3a); border-radius: 12px; padding: 16px; width: min(520px, 92vw); max-height: 86vh; overflow: auto; color: var(--ck-tx, #eee); font-size: 13px; }
    .modal h4 { margin: 0 0 10px; font-size: 14px; }
  </style>
  <button id="fab">🧰</button>
  <div id="panel">
    <header>
      <b>ChatKit Pro <small>by JustPLGuy</small></b>
      <span class="sp"></span>
      <span id="viewctl"><span id="sizelbl"></span> <input type="range" id="size" min="100" max="420" step="20"></span>
      <button id="bigbtn"></button>
      <button id="jumpbtn" class="x" style="font-size:15px">⌕</button>
      <button id="setbtn" class="x" style="font-size:16px">⚙</button>
      <button class="x" id="close">×</button>
    </header>
    <div id="upd" style="display:none"></div>
    <div id="bak" style="display:none"></div>
    <div id="tabs"></div>
    <div class="filters" id="filters"></div>
    <div id="body"><div id="folders"></div><div id="list"></div></div>
    <footer>
      <div id="actions"></div>
      <progress id="prog" value="0" max="1"></progress>
      <div id="status"></div>
      <div id="msg"></div>
    </footer>
  </div>
  <div id="zoom"><img></div>`;

  const $ = s => root.querySelector(s);
  const panel = $("#panel"), list = $("#list"), prog = $("#prog"), zoom = $("#zoom");

  function el(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    for (const [k, v] of Object.entries(props)) {
      if (v == null) continue;
      if (k === "class") e.className = v;
      else if (k === "style") e.style.cssText = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (k in e) e[k] = v;
      else e.setAttribute(k, v);
    }
    return e;
  }
  const button = (label, onclick, props = {}) => el("button", { onclick, ...props }, label);
  const select = (opts, value, onchange, props = {}) => {
    const s = el("select", props, opts.map(([v, l]) => el("option", { value: v }, l)));
    s.value = value;
    s.addEventListener("change", e => onchange(e.target.value));
    return s;
  };
  const setMsg = m => { $("#msg").textContent = m || ""; };
  const copy = async (txt, okMsg) => { try { await navigator.clipboard.writeText(txt); setMsg(okMsg || t("msg.copied")); } catch { setMsg(txt); } };

  // Okno dialogowe (formularz) wewnątrz naszego Shadow DOM.
  function modal(title, buildBody, actions) {
    return new Promise(resolve => {
      const close = v => { m.remove(); resolve(v); };
      const box = el("div", { class: "box" }, el("h4", {}, title));
      const body = buildBody(close);
      box.append(body);
      const row = el("div", { class: "rowb", style: "justify-content:flex-end;margin-top:12px" });
      for (const a of actions) row.append(button(a.label, () => { const v = a.value ? a.value() : a.result; if (v !== false) close(v); }, { class: a.cls || "" }));
      box.append(row);
      const m = el("div", { class: "modal", onclick: e => { if (e.target === m) close(null); } }, box);
      root.appendChild(m);
      setTimeout(() => box.querySelector("input, textarea, select")?.focus(), 30);
    });
  }

  // =====================================================================
  //  WIDOK
  // =====================================================================
  function applyView() {
    panel.classList.toggle("big", view.big);
    panel.classList.toggle("lib", current === "lib");
    list.style.setProperty("--sz", view.size + "px");
    $("#size").value = view.size;
    $("#sizelbl").textContent = t("ui.size");
    $("#bigbtn").textContent = view.big ? t("ui.smallView") : t("ui.bigView");
    $("#close").title = t("ui.closeEsc");
    $("#fab").title = "ChatKit Pro by JustPLGuy (Alt+Shift+K)";
    ls.set("view", view);
  }

  const allTabs = () => [
    { id: "chats", label: t("tab.chats") }, { id: "archive", label: t("tab.archive") }, { id: "lib", label: t("tab.library") },
    ...extraTabs.map(x => ({ id: x.id, label: x.label() }))
  ];

  function renderTabs() {
    const box = $("#tabs"); box.replaceChildren();
    for (const x of allTabs()) box.append(button(x.label, () => { if (!busy) switchTab(x.id); }, { class: "tab" + (current === x.id ? " active" : ""), title: x.title || "" }));
    $("#jumpbtn").title = t("pal.title") + " (Alt+Shift+J)";
    const sb = $("#setbtn"); sb.title = t("tab.settings"); sb.style.color = current === "settings" ? "#f87171" : "";
    fitTabs();
  }
  // Zakładki w jednym wierszu w każdym języku: gdy się zawijają, lekko zmniejsz odstępy i czcionkę (2 stopnie).
  addEventListener("resize", () => { clearTimeout(fitTabs._t); fitTabs._t = setTimeout(fitTabs, 200); });
  function fitTabs() {
    const box = $("#tabs"); if (!box || !box.firstElementChild) return;
    const wrapped = () => box.lastElementChild.offsetTop > box.firstElementChild.offsetTop + 4;
    box.classList.remove("fit1", "fit2");
    requestAnimationFrame(() => {
      if (!box.isConnected || !box.offsetWidth) return;
      if (wrapped()) box.classList.add("fit1");
      if (wrapped()) { box.classList.remove("fit1"); box.classList.add("fit2"); }
    });
  }

  // ---------- filtry ----------
  function renderFilters() {
    const box = $("#filters"); box.replaceChildren();
    if (!LIST_TABS.includes(current)) { box.style.display = "none"; return; }
    box.style.display = "";
    const f = filters[current];
    const rerender = () => renderList();
    box.append(
      el("input", { type: "text", placeholder: t("ui.searchName"), value: f.q, oninput: e => { f.q = e.target.value; rerender(); } }),
      button(t("ui.selectVisible"), () => { visibleNow.forEach(i => sel[current].add(i.key)); saveSel(current); renderList(); }),
      button(t("ui.deselect"), () => {
        const n = sel[current].size;
        if (n > 50 && !confirm(t("confirm.deselect", { n }))) return;
        sel[current].clear(); saveSel(current); renderList();
      })
    );
    const sorts = current === "lib"
      ? [["new", t("sort.newest")], ["old", t("sort.oldest")], ["big", t("sort.largest")], ["small", t("sort.smallest")], ["az", t("sort.nameAZ")]]
      : [["new", t("sort.updatedNew")], ["old", t("sort.updatedOld")], ["az", t("sort.titleAZ")]];
    box.append(select(sorts, f.sort, v => { f.sort = v; rerender(); }));
    box.append(el("label", { class: "chk", title: t("ui.olderTip") }, t("ui.olderThan"),
      el("input", { type: "number", min: 0, placeholder: t("ui.days"), value: f.older, oninput: e => { f.older = e.target.value; rerender(); } }), t("ui.days")));
    if (current !== "lib") {
      box.append(el("label", { class: "chk" }, el("input", { type: "checkbox", checked: f.star, onchange: e => { f.star = e.target.checked; rerender(); } }), t("ui.onlyStar")));
    } else {
      const src = sources.lib;
      box.append(...[
        select([["image", "🖼️ " + t("lib.catImages")], ["file", "📎 " + t("lib.catFiles")], ["all", t("lib.catAll")], ["trash", "🗑 " + t("lib.catTrash")]], src.cat, v => {
          if (v === src.cat) return;
          src.cat = v; ls.set("libcat", v); src.reset(); sel.lib.clear(); saveSel("lib"); f.kind = "all"; f.type = "all"; setMsg(""); renderFilters(); renderFooter(); rerender(); loadOne();
        }, { title: t("lib.catTip") }),
        src.cat === "image" ? null : select([["all", t("lib.kindAll")], ["pdf", "📕 PDF"], ["doc", "📝 " + t("lib.kindDoc")], ["sheet", "📊 " + t("lib.kindSheet")],
          ["slides", "📽️ " + t("lib.kindSlides")], ["text", "📄 " + t("lib.kindText")], ["code", "💻 " + t("lib.kindCode")], ["zip", "🗜️ " + t("lib.kindZip")],
          ["video", "🎬 " + t("lib.kindVideo")], ["audio", "🎵 " + t("lib.kindAudio")], ["other", "📎 " + t("lib.kindOther")]], f.kind, v => { f.kind = v; rerender(); }),
        src.cat === "file" ? null : select([["all", t("lib.allOrigins")], ["gen", t("lib.generated")], ["up", t("lib.uploaded")]], f.type, v => { f.type = v; rerender(); }),
        select([["all", t("lib.projAll")], ["in", t("lib.projIn")], ["out", t("lib.projOut")]], f.proj, v => { f.proj = v; rerender(); }),
        orphan.done ? select([["all", t("lib.chAll")], ["gone", "🗑 " + t("lib.chGone")], ["alive", t("lib.chAlive")]], f.chat, v => { f.chat = v; rerender(); }) : null,
      ].filter(Boolean));
    }
  }

  // ---------- foldery ----------
  function renderFolders() {
    const a = $("#folders");
    if (current !== "chats") { a.style.display = "none"; return; }
    a.style.display = ""; a.replaceChildren();
    const f = filters.chats, data = CK.store.data;
    a.append(el("div", { class: "fhead" }, el("span", { class: "sp" }, t("fold.title")),
      button("+", async () => { const n = prompt(t("fold.newPrompt")); if (n && n.trim()) await CK.folders.create(n.trim()); }, { title: t("fold.new") })));

    const row = (id, label, extra = {}) => {
      const r = el("div", { class: "frow" + (f.folder === id ? " active" : "") }, ...(extra.prefix || []), el("span", { class: "n", title: label }, label), extra.count != null ? el("span", { class: "c" }, extra.count) : null, extra.actions || null);
      if (extra.depth) r.style.paddingLeft = (8 + extra.depth * 14) + "px";
      r.addEventListener("click", () => { f.folder = id; renderFolders(); renderList(); });
      r.addEventListener("dragover", e => { e.preventDefault(); r.classList.add("drop"); });
      r.addEventListener("dragleave", () => r.classList.remove("drop"));
      r.addEventListener("drop", async e => {
        e.preventDefault(); r.classList.remove("drop");
        let keys = []; try { keys = JSON.parse(e.dataTransfer.getData("text/ck-keys") || "[]"); } catch {}
        if (!keys.length || id === "all") return;
        await CK.folders.assign(keys, id === "none" ? null : id);
        setMsg(id === "none" ? t("fold.removed", { n: keys.length }) : t("fold.moved", { n: keys.length, name: CK.folders.get(id)?.name }));
      });
      return r;
    };
    a.append(row("all", t("fold.all")), row("none", t("fold.none")));
    for (const fo of CK.folders.flat()) {
      const color = el("input", { type: "color", value: fo.color, style: "display:none", onchange: e => CK.folders.update(fo.id, { color: e.target.value }) });
      const dot = el("span", { class: "dot", style: `--c:${fo.color}`, title: t("fold.color"), onclick: e => { e.stopPropagation(); color.click(); } });
      const act = (sym, title, fn) => el("span", { title, onclick: e => { e.stopPropagation(); fn(); } }, sym);
      const actions = el("span", { class: "a" },
        act("＋", t("fold.sub"), async () => { const n = prompt(t("fold.subPrompt", { name: fo.name })); if (n && n.trim()) await CK.folders.create(n.trim(), fo.id); }),
        act("✎", t("fold.rename"), async () => { const n = prompt(t("fold.renamePrompt"), fo.name); if (n && n.trim()) await CK.folders.update(fo.id, { name: n.trim() }); }),
        act("⬇", t("fold.export"), () => exportFlow(CK.folders.chatsIn(fo.id), ls.get("expfmt", "md").replace("pick", "obs"), fo.name)),
        act("✕", t("fold.delete"), async () => {
          if (confirm(t("confirm.folderDelete", { name: fo.name }))) {
            if (CK.folders.subtree(fo.id).has(f.folder)) f.folder = "all";
            await CK.folders.remove(fo.id);
          }
        })
      );
      a.append(row(fo.id, fo.name, { depth: fo.depth, prefix: [color, dot], count: CK.folders.chatsIn(fo.id).length, actions }));
    }
    if (!data.folders.length) a.append(el("p", { style: "color:var(--ck-mut3, #777);padding:6px 10px;font-size:11px;line-height:1.4" }, t("fold.hint")));
    // ---------- tagi ----------
    const all = CK.tags.all();
    if (f.tag && !all.some(([g]) => g === f.tag)) f.tag = "";
    a.append(el("div", { class: "fhead", style: "margin-top:10px" }, el("span", { class: "sp" }, t("tg.title"))));
    for (const [g, n] of all) {
      const act = (sym, title, fn) => el("span", { title, onclick: e => { e.stopPropagation(); fn(); } }, sym);
      const r = el("div", { class: "frow" + (f.tag === g ? " active" : "") }, el("span", { class: "n", title: "#" + g }, "#" + g), el("span", { class: "c" }, n),
        el("span", { class: "a" },
          act("✎", t("tg.rename"), async () => { const v = prompt(t("tg.renamePrompt"), g); if (v && v.trim()) { await CK.tags.rename(g, v); if (f.tag === g) f.tag = CK.tags.norm(v)[0] || ""; } }),
          act("✕", t("tg.delete"), async () => { if (confirm(t("tg.confirmDelete", { tag: g, n }))) await CK.tags.remove(Object.keys(data.chatTags), [g]); })));
      r.addEventListener("click", () => { f.tag = f.tag === g ? "" : g; renderFolders(); renderList(); });
      r.addEventListener("dragover", e => { e.preventDefault(); r.classList.add("drop"); });
      r.addEventListener("dragleave", () => r.classList.remove("drop"));
      r.addEventListener("drop", async e => {
        e.preventDefault(); r.classList.remove("drop");
        let keys = []; try { keys = JSON.parse(e.dataTransfer.getData("text/ck-keys") || "[]"); } catch {}
        if (keys.length) { await CK.tags.add(keys, [g]); setMsg(t("tg.added", { n: keys.length, tag: g })); }
      });
      a.append(r);
    }
    if (!all.length) a.append(el("p", { style: "color:var(--ck-mut3, #777);padding:6px 10px;font-size:11px;line-height:1.4" }, t("tg.hint")));
  }

  // ---------- lista ----------
  const rowEls = new Map();

  function visibleItems() {
    const src = sources[current], f = filters[current], data = CK.store.data;
    let arr = src.items;
    let q = f.q.trim().toLowerCase();
    // „#tag” w polu wyszukiwania = filtr po tagu (tylko Czaty)
    const qTags = current === "chats" ? (q.match(/#[^\s#]+/g) || []).map(x => x.slice(1)) : [];
    if (qTags.length) { q = q.replace(/#[^\s#]+/g, "").trim(); arr = arr.filter(i => { const g = CK.tags.of(i.key); return qTags.every(x => g.some(y => y.startsWith(x))); }); }
    if (q) arr = arr.filter(i => i.title.toLowerCase().includes(q));
    if (current === "chats" && f.tag) arr = arr.filter(i => CK.tags.of(i.key).includes(f.tag));
    if (f.older !== "" && +f.older >= 0) {
      const lim = Date.now() - (+f.older) * 864e5;
      arr = arr.filter(i => { const d = CK.toDate(i.date); return d && d.getTime() < lim; });
    }
    if (current === "lib") {
      if (f.kind && f.kind !== "all" && sources.lib.cat !== "image") arr = arr.filter(i => i.kind === f.kind);
      if (orphan.done && f.chat === "gone") arr = arr.filter(i => i.chat && orphan.gone.has(i.chat));
      if (orphan.done && f.chat === "alive") arr = arr.filter(i => !(i.chat && orphan.gone.has(i.chat)));
      if (f.type === "gen") arr = arr.filter(i => i.generated);
      if (f.type === "up") arr = arr.filter(i => !i.generated);
      if (f.proj === "in") arr = arr.filter(i => i.project);
      if (f.proj === "out") arr = arr.filter(i => !i.project);
    } else {
      if (f.star) arr = arr.filter(i => data.stars[i.key]);
      if (current === "chats" && f.folder !== "all") {
        if (f.folder === "none") arr = arr.filter(i => !data.chatFolder[i.key]);
        else { const ids = CK.folders.subtree(f.folder); arr = arr.filter(i => ids.has(data.chatFolder[i.key])); }
      }
    }
    const ts = i => CK.toDate(i.date)?.getTime() || 0;
    const sorters = {
      new: (a, b) => ts(b) - ts(a), old: (a, b) => ts(a) - ts(b), az: (a, b) => a.title.localeCompare(b.title, CK.lang),
      big: (a, b) => (b.size || 0) - (a.size || 0), small: (a, b) => (a.size || 0) - (b.size || 0)
    };
    return [...arr].sort(sorters[f.sort] || sorters.new);
  }

  function chatRow(it) {
    const s = sel[current], data = CK.store.data;
    const star = !!data.stars[it.key];
    const fo = current === "chats" && data.chatFolder[it.key] ? CK.folders.get(data.chatFolder[it.key]) : null;
    const r = el("div", { class: "item" + (s.has(it.key) ? " sel" : ""), draggable: current === "chats" },
      el("input", { type: "checkbox", checked: s.has(it.key), tabIndex: -1 }),
      el("span", { class: "star" + (star ? " on" : ""), title: t("ui.star"), onclick: e => { e.stopPropagation(); toggleStars([it.key]); } }, star ? "★" : "☆"),
      el("span", { class: "t" }, it.title, fo ? el("span", { class: "tag", style: `--c:${fo.color}` }, fo.name) : null,
        ...(current === "chats" ? CK.tags.of(it.key).map(g => el("span", { class: "htag", title: t("tg.filterTip"), onclick: e => { e.stopPropagation(); filters.chats.tag = filters.chats.tag === g ? "" : g; renderFolders(); renderList(); } }, "#" + g)) : [])),
      el("span", { class: "d", title: t("ui.created") + ": " + CK.fmtDate(it.created, true) }, CK.fmtDate(it.date, true)),
      el("span", { class: "ic", title: t("ui.copyLink"), onclick: e => { e.stopPropagation(); copy("https://chatgpt.com/c/" + it.key, t("msg.linkCopied")); } }, "🔗"),
      el("span", { class: "ic", title: t("ui.openTip"), onclick: e => { e.stopPropagation(); CK.openChat(it.key, e); },
        onauxclick: e => { if (e.button === 1) { e.preventDefault(); e.stopPropagation(); CK.openChat(it.key, e); } } }, "↗")
    );
    r.addEventListener("click", e => onRowClick(it.key, e));
    r.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/ck-keys", JSON.stringify(s.has(it.key) ? [...s] : [it.key]));
      e.dataTransfer.effectAllowed = "move";
    });
    return r;
  }

  const dlIcon = it => el("span", { class: "ic", title: t("lib.downloadOne"), onclick: e => { e.stopPropagation(); libDownload([it.key]); } }, "⬇");

  function libRow(it) {
    const s = sel.lib, grid = view.big;
    let thumb;
    const ext = (it.title.split(".").pop() || "").toUpperCase();
    if (it.thumb) {
      thumb = el("img", { class: "th", src: it.thumb, loading: "lazy", title: t("lib.dblPreview") });
      thumb.onerror = () => thumb.replaceWith(el("div", { class: "ph" }, ext));
      thumb.addEventListener("dblclick", e => { e.stopPropagation(); zoom.querySelector("img").src = it.thumb; zoom.style.display = "flex"; });
    } else thumb = el("div", { class: "ph" + (it.kind && it.kind !== "image" ? " fk" : "") }, it.kind && it.kind !== "image" ? el("span", { class: "fi" }, KIND_ICON[it.kind] || "📎") : null, el("span", {}, ext || t("lib.file")));
    const badges = [it.generated ? el("span", { class: "badge" }, "AI") : null, it.project ? el("span", { class: "badge" }, t("lib.project")) : null,
      it.chat && orphan.gone.has(it.chat) ? el("span", { class: "badge gone", title: t("lib.chatGoneTip") }, "🗑 " + t("lib.chatGone"))
        : it.chat ? el("a", { class: "badge lnk", href: "/c/" + it.chat, title: t("lib.openChat"), onclick: e => e.stopPropagation() }, "↗ " + t("lib.chat")) : null];
    const cb = el("input", { type: "checkbox", checked: s.has(it.key), tabIndex: -1 });
    const chatOk = it.chat && !orphan.gone.has(it.chat);
    const goChat = () => el("a", { class: "ic", href: "/c/" + it.chat, title: t("lib.openChat"), onclick: e => e.stopPropagation() }, "↗");
    const r = grid
      ? el("div", { class: "item" + (s.has(it.key) ? " sel" : "") }, cb, thumb, el("div", { class: "bdg" }, ...badges), el("span", { class: "t", title: it.title }, it.title),
          el("div", { class: "meta" }, el("span", { class: "d" }, CK.fmtDate(it.date)), el("span", { class: "d" }, CK.fmtSize(it.size), " ", dlIcon(it), chatOk ? goChat() : null)))
      : el("div", { class: "item" + (s.has(it.key) ? " sel" : "") }, cb, thumb, el("span", { class: "t" }, it.title, ...badges),
          el("span", { class: "sz" }, CK.fmtSize(it.size)), el("span", { class: "d" }, CK.fmtDate(it.date, true)), dlIcon(it), chatOk ? goChat() : null);
    r.addEventListener("click", e => onRowClick(it.key, e));
    if (chatOk) r.addEventListener("dblclick", () => { location.href = "/c/" + it.chat; });
    return r;
  }

  function renderList() {
    rowEls.clear();
    applyView();
    if (!LIST_TABS.includes(current)) {
      list.className = "";
      const tab = extraTabs.find(x => x.id === current);
      const box = el("div");
      if (current === "settings") box.append(renderSettings());
      else if (tab) { try { tab.render(box, ui); } catch (e) { console.error(e); box.append(el("div", { class: "empty" }, t("msg.error", { e: e.message }))); } }
      list.replaceChildren(box);
      updateStatus();
      return;
    }
    list.className = current === "lib" && view.big ? "grid" : "";
    const vis = visibleNow = visibleItems();
    const frag = document.createDocumentFragment();
    if (!vis.length) {
      const src = sources[current];
      if (notLoggedIn && !src.items.length) frag.append(el("div", { class: "empty" }, "🔒 " + t("ui.loginNeeded"), el("br"), el("br"),
        el("a", { href: "https://chatgpt.com/auth/login", style: "color:var(--ck-acctx, #f87171)" }, t("ui.loginBtn"))));
      else frag.append(el("div", { class: "empty" }, src.items.length ? t("ui.noResults") : busy ? t("ui.loading") : t("ui.emptyLoad")));
    }
    for (const it of vis) { const r = current === "lib" ? libRow(it) : chatRow(it); rowEls.set(it.key, r); frag.append(r); }
    list.replaceChildren(frag);
    updateStatus();
  }

  function setRowSel(key, on) {
    const r = rowEls.get(key); if (!r) return;
    r.classList.toggle("sel", on);
    const cb = r.querySelector("input"); if (cb) cb.checked = on;
  }

  function onRowClick(key, e) {
    const s = sel[current];
    if (e.shiftKey && lastClicked) {
      const a = visibleNow.findIndex(i => i.key === lastClicked), b = visibleNow.findIndex(i => i.key === key);
      if (a !== -1 && b !== -1) {
        const val = !s.has(key);
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) { const k = visibleNow[i].key; val ? s.add(k) : s.delete(k); setRowSel(k, val); }
      }
    } else { const on = !s.has(key); on ? s.add(key) : s.delete(key); setRowSel(key, on); }
    lastClicked = key;
    saveSel(current);
    updateStatus();
  }

  const selectedLoaded = () => {
    if (!LIST_TABS.includes(current)) return [];
    const keys = new Set(sources[current].items.map(i => i.key));
    return [...sel[current]].filter(k => keys.has(k));
  };

  function updateStatus() {
    const st = $("#status");
    root.querySelectorAll("[data-needsel]").forEach(b => { b.disabled = busy || !selectedLoaded().length; });
    root.querySelectorAll("[data-load]").forEach(b => { b.disabled = busy || (LIST_TABS.includes(current) && sources[current].done); });
    if (!LIST_TABS.includes(current)) { if (!busy) st.textContent = "ChatKit Pro by JustPLGuy v" + CK.VERSION; return; }
    if (busy) return;
    const src = sources[current];
    const n = selectedLoaded().length;
    let txt = t("status.line", {
      n: src.items.length, total: src.total != null ? t("status.of", { n: src.total }) : "", all: src.done ? t("status.all") : "",
      what: current === "lib" ? t("status.files") : t("status.chats"), vis: visibleNow.length, sel: n
    });
    if (current === "lib") {
      const byKey = new Map(src.items.map(i => [i.key, i]));
      const selSize = selectedLoaded().reduce((s, k) => s + (byKey.get(k)?.size || 0), 0);
      const all = src.items.reduce((s, i) => s + (i.size || 0), 0);
      txt += " " + t("status.size", { sel: CK.fmtSize(selSize) || "0 B", all: CK.fmtSize(all) || "0 B" });
    }
    st.textContent = txt;
  }

  // ---------- akcje ----------
  function renderFooter() {
    const a = $("#actions"); a.replaceChildren();
    const tab = extraTabs.find(x => x.id === current);
    if (tab) { tab.footer && tab.footer(a, ui); return; }
    if (!LIST_TABS.includes(current)) return;
    a.append(button("↻", () => quietRefresh(true), { title: t("ui.refreshTip") }),
      button(t("ui.loadMore"), loadOne, { "data-load": 1 }), button(t("ui.loadAll"), loadAll, { "data-load": 1 }), el("span", { class: "sp" }));
    const need = { "data-needsel": 1 };
    if (current === "chats" || current === "archive") {
      a.append(button("★", () => toggleStars(selectedLoaded()), { ...need, title: t("ui.starSelected") }));
      if (current === "chats") {
        const fsel = select([["", t("fold.moveTo")], ["__none", t("fold.removeFrom")], ...CK.folders.flat().map(f => [f.id, "  ".repeat(f.depth) + f.name]), ["__new", t("fold.newDots")]], "", async v => {
          fsel.value = "";
          const keys = selectedLoaded(); if (!keys.length) return setMsg(t("msg.selectFirst"));
          let id = v;
          if (v === "__new") { const n = prompt(t("fold.newPrompt")); if (!n || !n.trim()) return; id = (await CK.folders.create(n.trim())).id; }
          await CK.folders.assign(keys, id === "__none" ? null : id);
          setMsg(id === "__none" ? t("fold.removed", { n: keys.length }) : t("fold.moved", { n: keys.length, name: CK.folders.get(id)?.name }));
        });
        a.append(fsel);
      }
      const efmt = select([["md", "Markdown"], ["obs", t("exp.obs")], ["html", "HTML"], ["pdf", t("exp.pdf")], ["zip-md", t("exp.zip", { f: "Markdown" })], ["zip-html", t("exp.zip", { f: "HTML" })], ["zip-json", t("exp.zip", { f: "JSON" })], ["pick", t("exp.pick")]], ls.get("expfmt", "md"), v => ls.set("expfmt", v));
      a.append(efmt, button("⬇ " + t("ui.export"), () => exportFlow(selectedLoaded(), efmt.value), need));
      a.append(button("✏ " + t("rn.btn"), () => renameFlow(selectedLoaded()), need));
      a.append(button("📋 " + t("cl.btn"), () => copyLinks(selectedLoaded()), { ...need, title: t("cl.tip") }));
      if (current === "chats") a.append(button("# " + t("tg.btn"), () => tagFlow(selectedLoaded()), { ...need, title: t("tg.btnTip") }));
      if (current === "chats") a.append(button("📂 " + t("pj.btn"), () => projectFlow(selectedLoaded()), { ...need, title: t("pj.btnTip") }));
      if (current === "chats") a.append(button(t("ui.archive"), () => chatBulk("archive"), need));
      else a.append(button("↩ " + t("ui.restore"), () => chatBulk("unarchive"), need));
      a.append(button(t("ui.delete"), () => chatBulk("delete"), { ...need, class: "danger" }));
    } else {
      const trash = sources.lib.cat === "trash"; // od 1.4.0: kosz Biblioteki — tylko podgląd (bez usuwania i przywracania)
      a.append(button(t("ui.diagnostics"), diag, { title: t("ui.diagTip") }));
      if (!trash) a.append(button(orphan.running ? "⏹ " + t("orph.stop") : "🔎 " + t("orph.btn"), orphanFlow, { title: t("orph.tip") }));
      a.append(button("⬇ " + t("lib.downloadSel"), () => libDownload(selectedLoaded()), need));
      if (!trash) a.append(button(t("ui.deleteSelected"), libDelete, { ...need, class: "danger" }));
      else a.append(el("span", { class: "muted", style: "font-size:11px" }, t("lib.trashNote")));
    }
    updateStatus();
  }

  async function safe(fn) {
    if (busy) return;
    busy = true; updateStatus();
    try { await fn(); notLoggedIn = false; }
    catch (e) {
      if (e.code === "NOAUTH") { notLoggedIn = true; setMsg(""); }
      else { console.error("[ChatKit Pro]", e); setMsg(t("msg.error", { e: e.message })); }
    }
    finally { busy = false; prog.style.display = "none"; renderList(); if (pendingLoad) { pendingLoad = false; setTimeout(loadOne, 0); } }
  }

  const progress = (done, all, label) => {
    prog.style.display = "block"; prog.max = all; prog.value = done;
    $("#status").textContent = `${label} ${done}/${all}…`;
  };

  let pendingLoad = false;
  function loadOne() {
    if (!LIST_TABS.includes(current)) return;
    if (busy) { pendingLoad = true; return; }
    return safe(async () => { $("#status").textContent = t("ui.loading"); await sources[current].loadPage(); });
  }
  function loadAll() {
    if (!LIST_TABS.includes(current)) return;
    return safe(async () => { await sources[current].loadEverything(n => { $("#status").textContent = t("ui.loadingN", { n }); }); });
  }

  async function toggleStars(keys) {
    if (!keys.length) return;
    const stars = CK.store.data.stars, allOn = keys.every(k => stars[k]);
    keys.forEach(k => { if (allOn) delete stars[k]; else stars[k] = true; });
    await CK.store.save("stars");
  }

  // od 1.4.0: ostrzeżenie, gdy część zaznaczonych jest ukryta przez filtry (łatwo usunąć coś, czego nie widać)
  function hiddenNote(keys) {
    const vis = new Set(visibleNow.map(i => i.key));
    const n = keys.filter(k => !vis.has(k)).length;
    return n ? "\n\n⚠ " + t("confirm.hiddenSel", { n, des: t("ui.deselect"), sel: t("ui.selectVisible") }) : "";
  }

  async function chatBulk(mode, keysArg, tabArg) {
    const tab = tabArg || current, src = sources[tab];
    const keys = keysArg || selectedLoaded(); if (!keys.length) return;
    if (!confirm(t("confirm.chat." + mode, { n: keys.length }) + (keysArg ? "" : hiddenNote(keys)))) return;
    const body = { delete: { is_visible: false }, archive: { is_archived: true }, unarchive: { is_archived: false } }[mode];
    let ok = 0, fail = 0;
    const done = [];
    await safe(async () => {
      for (const k of keys) {
        if (await CK.patchConversation(k, body)) {
          ok++; done.push(k);
          src.items = src.items.filter(i => i.key !== k);
          if (src.forget) src.forget(k);
          src.offset = Math.max(0, src.offset - 1);
          if (src.total != null) src.total--;
          sel[tab].delete(k);
        } else fail++;
        progress(ok + fail, keys.length, t("prog." + mode));
        await sleep(300);
      }
      saveSel(tab);
      if (src.persist) src.persist();
      if (mode === "delete") { keys.forEach(k => { delete CK.store.data.stars[k]; delete CK.store.data.chatFolder[k]; }); await CK.store.save("stars", "chatFolder"); }
      if (mode === "archive") sources.archive.reset();
      if (mode === "unarchive") sources.chats.reset();
      if (mode === "delete" && CK.tags) await CK.tags.drop(done);
    });
    // Usunięte/zarchiwizowane znikają z paska ChatGPT od razu; przywrócone pokaże ChatGPT po odświeżeniu swojej listy.
    if (mode !== "unarchive" && CK.sidebarGone) CK.sidebarGone(done);
    setMsg(t(mode === "unarchive" ? "msg.doneChats" : "msg.doneChats2", { ok, fail: fail ? t("msg.failPart", { n: fail }) : "" }));
    // przywróconych czatów wtyczka nie dopisze do listy ChatGPT — przycisk przeładowuje stronę, a panel wraca w to samo miejsce
    if (mode === "unarchive" && ok) $("#msg").append(" ", button("↻ " + t("ui.reloadNow"), () => { saveRestore(); location.reload(); }, { class: "primary", style: "padding:2px 8px;font-size:11px" }));
  }

  // ---------- przenoszenie do Projektu ChatGPT ----------
  // ---------- pliki z usuniętych czatów (od 1.4.0) ----------
  // Usunięcie czatu w ChatGPT nie usuwa jego plików. Szukamy plików, których czat (origination_thread_id) już nie istnieje:
  // 1) wczytujemy całą Bibliotekę oraz listy czatów i archiwum; 2) czaty spoza list (np. z projektów) sprawdzamy pojedynczo
  // (GET /conversation/{id}: 404 = usunięty); 3) tylko czaty POTWIERDZONE jako usunięte trafiają do filtra „Z usuniętych czatów”.
  // Tempo jak przy indeksie: 1,2 s / czat, po limicie ChatGPT wolniej; wynik (usunięte czaty) zapamiętujemy w tej przeglądarce.
  async function orphanFlow() {
    if (orphan.running) { orphan.stop = true; return; }
    if (busy) return;
    const lib = sources.lib;
    // szukamy we wszystkim (obrazy + pliki), żeby nie przeoczyć żadnego pliku z usuniętego czatu
    if (lib.cat !== "all") { lib.cat = "all"; ls.set("libcat", "all"); lib.reset(); sel.lib.clear(); saveSel("lib"); }
    orphan.running = true; orphan.stop = false; renderFilters(); renderFooter();
    let checked = 0, todo = [];
    try {
      await safe(async () => {
        setMsg(t("orph.loadingLib"));
        await lib.loadEverything(n => { $("#status").textContent = t("ui.loadingN", { n }); });
        const threads = new Set(lib.items.map(i => i.chat).filter(Boolean));
        if (!threads.size) return;
        setMsg(t("orph.loadingChats"));
        for (const k of ["chats", "archive"]) await sources[k].loadEverything(n => { $("#status").textContent = t("ui.loadingN", { n }); });
        const known = new Set([...sources.chats.items, ...sources.archive.items].map(i => i.key));
        todo = [...threads].filter(id => !known.has(id) && !orphan.gone.has(id));
        let slow = CK.limit.recentlyHit();
        for (const id of todo) {
          if (orphan.stop) break;
          for (;;) {
            let r = null;
            try { r = await CK.api("/conversation/" + encodeURIComponent(id)); } catch {}
            if (r && r.status === 429) { slow = true; if (!(await CK.waitLimit(() => orphan.stop))) break; continue; }
            if (r && (r.status === 404 || r.status === 410)) orphan.gone.add(id);
            else if (r && r.ok) { const j = await r.json().catch(() => null); if (j && j.is_visible === false) orphan.gone.add(id); }
            break;
          }
          checked++;
          progress(checked, todo.length, t("orph.checking"));
          if (CK.limit.pausedFor()) slow = true;
          await sleep(slow ? 6000 : 1200);
        }
        ls.set("libgone", [...orphan.gone].slice(-5000));
        orphan.done = true;
      });
    } finally { orphan.running = false; }
    const files = lib.items.filter(i => i.chat && orphan.gone.has(i.chat));
    const size = files.reduce((a, i) => a + (i.size || 0), 0);
    if (orphan.done) {
      const f = filters.lib;
      f.chat = files.length ? "gone" : "all";
      if (files.length) { f.kind = "all"; f.type = "all"; f.proj = "all"; f.q = ""; f.older = ""; } // żeby wszystkie znalezione pliki były widoczne
      renderFilters(); renderList();
    }
    renderFooter();
    setMsg(orphan.stop && checked < todo.length ? t("orph.stopped", { d: checked, a: todo.length })
      : files.length ? t("orph.found", { n: files.length, size: CK.fmtSize(size) || "0 B", sel: t("ui.selectVisible"), del: t("ui.deleteSelected") }) : t("orph.none"));
  }

  // ---------- kopiowanie linków zaznaczonych czatów (od 1.4.0) — bez zapytań do ChatGPT ----------
  async function copyLinks(keys) {
    if (!keys.length) return setMsg(t("msg.selectFirst"));
    const byKey = new Map(sources[current].items.map(i => [i.key, i]));
    const lines = keys.map(k => { const it = byKey.get(k); return (it ? it.title : t("untitled")) + " — https://chatgpt.com/c/" + k; });
    const text = lines.join("\n");
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {}
    if (!ok) {
      const ta = el("textarea", { style: "position:fixed;left:-9999px" }); ta.value = text; root.append(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch {} ta.remove();
    }
    setMsg(ok ? t("cl.done", { n: keys.length }) : t("cl.fail"));
  }

  async function projectFlow(keys) {
    if (!keys.length) return setMsg(t("msg.selectFirst"));
    setMsg(t("pj.loading"));
    let list = [];
    try { list = await CK.projects.list(); } catch {}
    setMsg("");
    let chosen = null;
    // od 1.4.0: na górze „Bez projektu” — wyjmuje czaty z projektu (PATCH gizmo_id: "")
    const OUT = { id: "", name: t("pj.out"), out: true };
    const res = await modal(t("pj.title", { n: keys.length }), close => {
      const outRow = el("div", { class: "palrow", onclick: () => { chosen = OUT; close(true); } }, el("span", { class: "pi" }, "↩"), el("span", { class: "pl" }, OUT.name), el("span", { class: "muted", style: "margin-left:auto;font-size:11px" }, t("pj.outTip")));
      return el("div", {}, el("p", { class: "muted", style: "margin:0 0 8px" }, list.length ? t("pj.hint") : t("pj.none")),
        el("div", { style: "max-height:46vh;overflow:auto" }, outRow, ...list.map(p => el("div", { class: "palrow", onclick: () => { chosen = p; close(true); } }, el("span", { class: "pi" }, "📂"), el("span", { class: "pl" }, p.name)))));
    }, [{ label: t("ui.cancel"), result: null }]);
    if (!res || !chosen) return;
    if (!confirm(chosen.out ? t("pj.confirmOut", { n: keys.length }) : t("pj.confirm", { n: keys.length, name: chosen.name }))) return;
    let ok = 0, fail = 0;
    await safe(async () => {
      for (const k of keys) {
        if (await CK.projects.move(k, chosen.id)) ok++; else fail++;
        progress(ok + fail, keys.length, t("prog.project"));
        await sleep(400);
      }
    });
    setMsg(chosen.out ? t("pj.doneOut", { ok, fail: fail ? t("msg.failPart", { n: fail }) : "" }) : t("pj.done", { name: chosen.name, ok, fail: fail ? t("msg.failPart", { n: fail }) : "" }));
    if (ok) $("#msg").append(" ", button("↻ " + t("ui.reloadNow"), () => { saveRestore(); location.reload(); }, { class: "primary", style: "padding:2px 8px;font-size:11px" }));
  }

  // ---------- tagi zaznaczonych czatów ----------
  async function tagFlow(keys) {
    if (!keys.length) return setMsg(t("msg.selectFirst"));
    const has = new Map(); // tag -> ile zaznaczonych go ma
    for (const k of keys) for (const g of CK.tags.of(k)) has.set(g, (has.get(g) || 0) + 1);
    const add = new Set(), rm = new Set();
    const input = el("input", { type: "text", placeholder: t("tg.addPh"), style: "width:100%" });
    const cur = el("div", { class: "tgbox" }), sug = el("div", { class: "tgbox" });
    const draw = () => {
      cur.replaceChildren();
      const shown = [...new Set([...has.keys(), ...add])].filter(g => !rm.has(g));
      if (!shown.length) cur.append(el("span", { class: "muted" }, t("tg.noneSel")));
      for (const g of shown) {
        const partial = !add.has(g) && has.get(g) < keys.length;
        cur.append(el("span", { class: "htag big" + (partial ? " part" : ""), title: partial ? t("tg.partial", { n: has.get(g), all: keys.length }) : "" }, "#" + g,
          el("b", { title: t("tg.removeTip"), onclick: () => { add.delete(g); if (has.has(g)) rm.add(g); draw(); } }, " ×")));
      }
      sug.replaceChildren();
      const rest = CK.tags.all().map(([g]) => g).filter(g => !shown.includes(g)).slice(0, 30);
      if (rest.length) sug.append(el("span", { class: "muted" }, t("tg.existing") + " "));
      for (const g of rest) sug.append(el("span", { class: "htag big", onclick: () => { rm.delete(g); add.add(g); draw(); } }, "+#" + g));
    };
    const take = () => { for (const g of CK.tags.norm(input.value)) { rm.delete(g); add.add(g); } input.value = ""; draw(); };
    input.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); take(); } });
    const res = await modal(t("tg.title2", { n: keys.length }), () => { draw(); return el("div", {}, input, el("p", { class: "muted", style: "margin:6px 0" }, t("tg.help")), cur, sug); },
      [{ label: t("ui.cancel"), result: null }, { label: t("tg.save"), cls: "primary", value: () => { take(); return true; } }]);
    if (!res) return;
    if (add.size) await CK.tags.add(keys, [...add]);
    if (rm.size) await CK.tags.remove(keys, [...rm]);
    setMsg(t("tg.saved", { n: keys.length }));
  }

  // ---------- masowa zmiana nazw ----------
  // mode: prefix | suffix | remove | replace; zwraca nowy tytuł (bez podwójnych spacji na brzegach).
  CK.renameTitle = (title, mode, text, repl = "") => {
    const s = String(title || ""), x = String(text || "");
    if (!x && mode !== "replace") return s;
    let out = s;
    if (mode === "prefix") out = s.startsWith(x) ? s : x + (/\s$/.test(x) ? "" : " ") + s;
    else if (mode === "suffix") out = s.endsWith(x) ? s : s + (/^\s/.test(x) ? "" : " ") + x;
    else if (mode === "remove") out = x ? s.split(x).join("") : s;
    else if (mode === "replace") out = x ? s.split(x).join(repl) : s;
    return out.replace(/\s{2,}/g, " ").trim() || s;
  };

  async function renameFlow(keys) {
    if (!keys.length) return setMsg(t("msg.selectFirst"));
    const src = sources[current];
    const items = keys.map(k => src.items.find(i => i.key === k)).filter(Boolean);
    const st = { mode: ls.get("rnmode", "prefix"), text: "", repl: "" };
    const prev = el("div", { class: "rnprev" });
    const draw = () => {
      prev.replaceChildren();
      const ch = items.map(i => [i.title || t("untitled"), CK.renameTitle(i.title || t("untitled"), st.mode, st.text, st.repl)]);
      const n = ch.filter(([a, b]) => a !== b).length;
      prev.append(el("p", { class: "muted" }, t("rn.preview", { n, all: items.length })));
      for (const [a, b] of ch.slice(0, 6)) prev.append(el("div", { class: "rnrow" + (a === b ? " same" : "") }, el("s", {}, a), " → ", el("b", {}, b)));
      if (ch.length > 6) prev.append(el("p", { class: "muted" }, t("rn.more", { n: ch.length - 6 })));
    };
    const textIn = el("input", { type: "text", placeholder: t("rn.textPh") }), replIn = el("input", { type: "text", placeholder: t("rn.replPh") });
    const replRow = el("label", {}, t("rn.repl"), replIn);
    const modeSel = select([["prefix", t("rn.prefix")], ["suffix", t("rn.suffix")], ["remove", t("rn.remove")], ["replace", t("rn.replace")]], st.mode,
      v => { st.mode = v; ls.set("rnmode", v); replRow.style.display = v === "replace" ? "" : "none"; draw(); });
    replRow.style.display = st.mode === "replace" ? "" : "none";
    textIn.addEventListener("input", () => { st.text = textIn.value; draw(); });
    replIn.addEventListener("input", () => { st.repl = replIn.value; draw(); });
    draw();
    const go = await modal("✏ " + t("rn.title", { n: items.length }), () => el("div", { class: "form" },
      el("label", {}, t("rn.mode"), modeSel), el("label", {}, t("rn.text"), textIn), replRow, prev),
      [{ label: t("ui.cancel"), result: null }, { label: t("rn.apply"), cls: "primary", value: () => st.text ? true : (setMsg(t("rn.empty")), false) }]);
    if (!go) return;
    const todo = items.map(i => ({ i, title: CK.renameTitle(i.title || "", st.mode, st.text, st.repl) })).filter(x => x.title && x.title !== x.i.title);
    if (!todo.length) return setMsg(t("rn.nothing"));
    let ok = 0, fail = 0;
    await safe(async () => {
      for (const { i, title } of todo) {
        if (await CK.patchConversation(i.key, { title })) { ok++; i.title = title; CK.sidebarRename && CK.sidebarRename(i.key, title); } else fail++;
        progress(ok + fail, todo.length, t("prog.rename"));
        await sleep(300);
      }
    });
    CK.nudgeChatGPT && CK.nudgeChatGPT();
    renderList();
    setMsg(t("rn.done", { ok, fail: fail ? t("msg.failPart", { n: fail }) : "" }));
  }

  async function libDelete(keysArg) {
    const keys = Array.isArray(keysArg) ? keysArg : selectedLoaded(); if (!keys.length) return;
    if (!confirm(t("confirm.libDelete", { n: keys.length }) + hiddenNote(keys))) return;
    let res = { ok: 0, fail: 0 };
    await safe(async () => {
      res = await sources.lib.remove(keys, (d, a) => progress(d, a, t("prog.delete")));
      const still = new Set(sources.lib.items.map(i => i.key));
      keys.forEach(k => { if (!still.has(k)) sel.lib.delete(k); });
      saveSel("lib");
    });
    setMsg(t("msg.doneFiles", { ok: res.ok, fail: res.fail ? t("msg.failPart", { n: res.fail }) : "" }));
  }

  // Wybór wiadomości do eksportu (format „pick”, jeden czat): pytania i odpowiedzi z polami wyboru.
  function pickMessages(conv) {
    const box = el("div", { style: "max-height:52vh;overflow:auto;margin:6px 0" });
    const fmt = select([["obs", t("exp.obs")], ["md", "Markdown"]], ls.get("pickfmt", "obs"), v => ls.set("pickfmt", v));
    const cbs = conv.msgs.map((m, i) => {
      const cb = el("input", { type: "checkbox", checked: true });
      box.append(el("label", { class: "chk", style: "display:flex;gap:8px;align-items:flex-start;margin:5px 0;cursor:pointer" }, cb,
        el("span", {}, el("b", {}, (m.role === "user" ? "👤 " : "🤖 ") + (m.role === "user" ? t("exp.you") : "ChatGPT") + " "), el("span", { class: "muted" }, String(m.text).replace(/\s+/g, " ").slice(0, 140)))));
      return cb;
    });
    const all = v => cbs.forEach(c => { c.checked = v; });
    const onlyUser = () => cbs.forEach((c, i) => { c.checked = conv.msgs[i].role === "user"; });
    return modal(t("exp.pickTitle", { title: conv.title }), () => el("div", {},
      el("div", { class: "rowb", style: "gap:6px;flex-wrap:wrap" }, button(t("exp.pickAll"), () => all(true)), button(t("exp.pickNone"), () => all(false)), button(t("exp.pickUser"), onlyUser), el("span", { class: "sp" }), fmt),
      box), [{ label: t("ui.cancel"), result: null }, { label: "⬇ " + t("ui.export"), cls: "primary", value: () => { const msgs = conv.msgs.filter((_, i) => cbs[i].checked); if (!msgs.length) { setMsg(t("exp.pickEmpty")); return false; } return { msgs, fmt: fmt.value }; } }]);
  }

  async function exportFlow(ids, format, name) {
    if (!ids.length) return setMsg(t("msg.noExport"));
    if (format === "pick" && ids.length !== 1) return setMsg(t("exp.pickOne"));
    if (ids.length > 30 && !confirm(t("confirm.exportMany", { n: ids.length }))) return;
    let res = null, opts = {};
    if (format === "pick") opts.pick = async conv => { const r = await pickMessages(conv); return r && { msgs: r.msgs, format: r.fmt }; };
    await safe(async () => { res = await CK.exportChats(ids, format, (d, a) => progress(d, a, t("prog.fetchChats")), name, opts); });
    if (res && res.cancelled) return setMsg("");
    if (res) setMsg(t("msg.exported", { n: res.ok, fail: res.fail ? t("msg.failPart", { n: res.fail }) : "" }) + (format === "pdf" ? " " + t("msg.pdfHint") : ""));
  }

  // Ciche odświeżanie (otwarcie panelu, zmiana czatu): najwyżej raz na 30 s, tylko w widocznej karcie,
  // jako zapytanie w tle (przy przerwie po 429 nic nie wysyła). Przycisk ↻ odświeża zawsze.
  let refreshing = false, lastQuiet = 0;
  async function quietRefresh(manual = false) {
    if (!LIST_TABS.includes(current) || busy || refreshing) return;
    if (!manual && (document.visibilityState === "hidden" || Date.now() - lastQuiet < 30000)) return;
    const src = sources[current];
    if (!src.items.length) { if (manual) loadOne(); return; }
    refreshing = true; lastQuiet = Date.now();
    try {
      const added = await src.refreshTop(!manual);
      renderList();
      if (manual || added) setMsg(added ? t("msg.refreshed", { n: added }) : t("msg.upToDate"));
    } catch (e) { if (manual) setMsg(t("msg.error", { e: e.message })); }
    finally { refreshing = false; }
  }

  const fileName = (title, suffix = "") => {
    const n = String(title || "file").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").replace(/^[.\s]+|[.\s]+$/g, "");
    const m = n.match(/^(.*?)(\.[a-z0-9]{1,5})?$/i);
    return (m[1] || "file").slice(0, 120) + suffix + (m[2] || "");
  };

  let lastDlError = "";
  async function resolveFileUrl(it) {
    const fid = it.payload.file_id;
    if (fid) {
      try {
        const r = await CK.withRetry(() => CK.api(`/files/download/${encodeURIComponent(fid)}?inline=false`));
        if (r.ok) { const j = await r.json().catch(() => null); if (j && typeof j.download_url === "string") return { url: j.download_url, full: true }; }
        else lastDlError = "files/download " + r.status;
      } catch (e) { lastDlError = e.message; }
    }
    return it.thumb ? { url: it.thumb, full: false } : null;
  }

  async function libDownload(keys) {
    if (!keys.length) return;
    if (keys.length > 20 && !confirm(t("confirm.download", { n: keys.length }))) return;
    const byKey = new Map(sources.lib.items.map(i => [i.key, i]));
    const folder = "ChatGPT-Library-" + new Date().toISOString().slice(0, 10);
    let ok = 0, fail = 0, thumbs = 0;
    lastDlError = "";
    await safe(async () => {
      for (const k of keys) {
        const it = byKey.get(k);
        const res = it && await resolveFileUrl(it);
        if (res) {
          if (!res.full) thumbs++;
          const url = new URL(res.url, location.origin).href;
          const r = await chrome.runtime.sendMessage({ type: "ck-download", url, filename: folder + "/" + fileName(it.title, res.full ? "" : "_thumb") }).catch(e => ({ ok: false, error: e.message }));
          if (r && r.ok) ok++; else { fail++; lastDlError = (r && r.error) || "download"; }
        } else fail++;
        progress(ok + fail, keys.length, t("prog.download"));
        await sleep(250);
      }
    });
    if (lastDlError) console.warn("[ChatKit Pro] download:", lastDlError);
    setMsg(t("msg.downloaded", { ok }) + (fail ? " " + t("msg.failPart", { n: fail }) + " (" + lastDlError + ")" : "") + (thumbs ? " " + t("msg.thumbsOnly", { n: thumbs }) : ""));
  }

  async function diag() {
    const raw = sources.lib.lastRaw;
    let txt = "(no data)";
    if (raw) {
      const rest = { ...raw }; const items = Array.isArray(rest.items) ? rest.items : []; delete rest.items;
      txt = JSON.stringify({ version: CK.VERSION, loaded: sources.lib.items.length, items: items.length, other: rest, first: items[0] }, null, 1).slice(0, 4000);
    }
    copy(txt, t("msg.diagCopied"));
  }

  // ---------- aktualizacje ----------
  const cmpV = (a, b) => {
    const pa = String(a).split(".").map(n => parseInt(n, 10) || 0), pb = String(b).split(".").map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d > 0 ? 1 : -1; }
    return 0;
  };
  let upd = null;
  const updAvailable = () => !!(upd && upd.latest && cmpV(upd.latest, CK.VERSION) > 0);
  function renderUpdate() {
    const box = $("#upd"); box.replaceChildren();
    const show = updAvailable() && ls.get("updDismissed", "") !== upd.latest;
    box.style.display = show ? "flex" : "none";
    if (!show) return;
    box.append(el("span", {}, "🎉 " + t("upd.available", { v: upd.latest })), el("span", { class: "sp" }),
      el("a", { href: upd.url, target: "_blank", rel: "noopener" }, "⬇ " + t("upd.download")),
      el("span", { class: "ic", title: t("upd.dismiss"), onclick: () => { ls.set("updDismissed", upd.latest); renderUpdate(); } }, "×"));
  }
  // ---------- kopia zapasowa: dane + przypomnienie ----------
  const backupJson = () => { const d = CK.store.data; return JSON.stringify({ app: "ChatKit Pro", version: CK.VERSION, exported: new Date().toISOString(), folders: d.folders, chatFolder: d.chatFolder, chatTags: d.chatTags, stars: d.stars, prompts: d.prompts, bookmarks: d.bookmarks, notes: d.notes, chatNotes: d.chatNotes, rules: d.rules, settings: d.settings }, null, 2); };
  let bak = { lastBackup: 0, backupSnooze: 0, firstSeen: 0 };
  async function exportBackup() {
    CK.download(`chatkit-pro-backup-${new Date().toISOString().slice(0, 10)}.json`, backupJson(), "application/json");
    bak.lastBackup = Date.now();
    try { await chrome.storage.local.set({ lastBackup: bak.lastBackup }); } catch {}
    renderBackup();
    setMsg(t("bak.done"));
  }
  // Czy jest co chronić (własne foldery, gwiazdki, notatki, zakładki, reguły, używane prompty)?
  function hasUserData() {
    const d = CK.store.data, n = o => Object.keys(o || {}).length;
    return d.folders.length + n(d.stars) + n(d.chatFolder) + n(d.chatTags) + n(d.bookmarks) + d.notes.length + n(d.chatNotes) + d.rules.length > 0 ||
      (Array.isArray(d.prompts) && d.prompts.some(x => x.uses > 0));
  }
  CK.backupDue = (now = Date.now()) => {
    const every = +CK.store.data.settings.backupEvery || 0;
    if (!every || !hasUserData()) return false;
    const base = Math.max(bak.lastBackup || 0, bak.backupSnooze || 0, bak.firstSeen || now);
    return now - base >= every * 86400000;
  };
  function renderBackup() {
    const box = $("#bak"); box.replaceChildren();
    const show = CK.backupDue();
    box.style.display = show ? "flex" : "none";
    if (!show) return;
    const ago = bak.lastBackup ? t("bak.ago", { n: Math.floor((Date.now() - bak.lastBackup) / 86400000) }) : t("bak.never");
    box.append(el("span", {}, "💾 " + t("bak.remind", { ago })), el("span", { class: "sp" }),
      button("⬇ " + t("bak.now"), exportBackup, { class: "go" }),
      button(t("bak.later"), async () => { bak.backupSnooze = Date.now(); try { await chrome.storage.local.set({ backupSnooze: bak.backupSnooze }); } catch {} renderBackup(); }));
  }
  CK._backup = { state: () => bak, set: o => { Object.assign(bak, o); renderBackup(); } }; // do testów
  async function loadBackup() {
    try {
      const r = await chrome.storage.local.get(["lastBackup", "backupSnooze", "firstSeen"]);
      bak = { lastBackup: r.lastBackup || 0, backupSnooze: r.backupSnooze || 0, firstSeen: r.firstSeen || 0 };
      if (!bak.firstSeen) { bak.firstSeen = Date.now(); await chrome.storage.local.set({ firstSeen: bak.firstSeen }); }
    } catch {}
    renderBackup();
  }

  async function loadUpdate() { try { upd = (await chrome.storage.local.get("update")).update || null; } catch {} renderUpdate(); }
  const askUpdate = force => chrome.runtime.sendMessage({ type: "ck-check-update", force }).catch(e => ({ error: e.message }));
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === "local" && ch.update) { upd = ch.update.newValue || null; renderUpdate(); if (current === "settings") renderList(); }
  });

  // ---------- ustawienia ----------
  function renderSettings() {
    const d = CK.store.data, S = d.settings;
    const save = async () => { await CK.store.save("settings"); };
    const chk = (key, label, def = false) => el("label", { class: "chk", style: "margin:4px 0" },
      el("input", { type: "checkbox", checked: S[key] ?? def, onchange: async e => { CK.store.data.settings[key] = e.target.checked; await save(); } }), label);
    // Suwak po liście wartości (0 = ustawienie ChatGPT). Zapis z opóźnieniem, podgląd na żywo.
    const slider = (key, label, steps, fmt) => {
      const cur = Math.max(0, steps.indexOf(+S[key] || 0));
      const out = el("b", { style: "min-width:84px;text-align:right;font-size:12px" }, fmt(steps[cur]));
      let timer;
      const inp = el("input", { type: "range", min: 0, max: steps.length - 1, step: 1, value: cur, style: "flex:1;accent-color:var(--ck-acc, #ef4444)" });
      inp.addEventListener("input", () => {
        const v = steps[+inp.value]; out.textContent = fmt(v); CK.store.data.settings[key] = v;
        clearTimeout(timer); timer = setTimeout(save, 150);
      });
      inp.addEventListener("change", () => { clearTimeout(timer); save(); });
      return el("div", { class: "rowb", style: "gap:10px" }, el("span", { style: "min-width:120px;font-size:12px;color:var(--ck-tx2, #ccc)" }, label), inp, out,
        button("↺", () => { CK.store.data.settings[key] = 0; inp.value = 0; out.textContent = fmt(0); save(); }, { title: t("set.reset") }));
    };
    const fileIn = el("input", { type: "file", accept: ".json,application/json", style: "display:none", onchange: async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const j = JSON.parse(await file.text());
        if (!confirm(t("confirm.import"))) return;
        for (const k of ["folders", "chatFolder", "chatTags", "stars", "prompts", "bookmarks", "notes", "chatNotes", "rules", "settings"]) if (j[k] !== undefined) d[k] = j[k];
        await CK.store.save();
        setMsg(t("msg.imported"));
      } catch (err) { setMsg(t("msg.badFile", { e: err.message })); }
    } });
    return el("div", { class: "pane" },
      el("h3", {}, t("set.language")),
      el("div", { class: "rowb" }, select([["auto", t("set.langAuto")], ...CK.LANG_NAMES], S.lang || "auto",
        async v => { CK.store.data.settings.lang = v; await save(); CK.applyLang(); renderAll(); })),
      el("h3", {}, t("set.look")),
      el("div", { class: "rowb", style: "gap:10px;margin:2px 0 6px" }, el("span", { style: "font-size:12px;color:var(--ck-tx2, #ccc)" }, t("set.uiTheme")),
        select(CK.THEMES.map(k => [k, t("th." + k)]), S.uiTheme || "dark", async v => { CK.store.data.settings.uiTheme = v; await save(); })),
      chk("timestamps", t("set.timestamps"), true),
      el("div", { class: "rowb" }, button(t("set.tsDiag"), () => copy(JSON.stringify(CK.tsDebug ? CK.tsDebug() : {}, null, 1), t("msg.diagCopied")))),
      chk("minimap", t("set.minimap"), true),
      chk("classicDark", t("set.classicDark"), false),
      chk("sidebarMarks", t("set.sidebarMarks"), true),
      chk("showFab", t("set.showFab"), true),
      el("h3", {}, t("set.chatLook")),
      slider("chatWidth", t("set.chatWidth"), [0, 800, 900, 1000, 1100, 1200, 1400, 1600, 2000], v => v === 0 ? t("set.default") : v >= 2000 ? t("set.fullWidth") : v + " px"),
      slider("fontSize", t("set.fontSize"), [0, 13, 14, 15, 16, 17, 18, 20, 22], v => v === 0 ? t("set.default") : v + " px"),
      el("p", { class: "muted", style: "margin:2px 0 6px" }, t("set.lookHint")),
      chk("codeSave", t("set.codeSave"), true),
      chk("composerCount", t("set.composerCount"), true),
      chk("follow", t("set.follow"), true),
      chk("whatsNew", t("set.whatsNew"), true),
      el("h3", {}, t("set.updates")),
      ...(upd && upd.store ? [el("p", {}, t("upd.current", { v: CK.VERSION })), el("p", { style: "color:#86efac" }, "✓ " + t("upd.store"))] : [
      el("p", {}, t("upd.current", { v: CK.VERSION }) + (upd && upd.latest ? " · " + t("upd.latest", { v: upd.latest }) : "")),
      el("p", {}, t("upd.lastCheck", { d: upd && upd.checkedAt ? CK.fmtDate(upd.checkedAt, true) : t("upd.never") }) + (upd && upd.error ? " · " + t("upd.error", { e: upd.error }) : "")),
      el("p", { style: "color:" + (updAvailable() ? "#86efac" : "#999") }, updAvailable() ? "🎉 " + t("upd.available", { v: upd.latest }) : (upd && upd.latest ? "✓ " + t("upd.upToDate") : "")),
      el("div", { class: "rowb" },
        button(t("upd.checkNow"), async () => {
          setMsg(t("upd.checking"));
          const r = await askUpdate(true);
          if (r && !r.error) upd = r;
          renderUpdate(); renderList();
          setMsg(r && r.error ? t("upd.error", { e: r.error }) : updAvailable() ? t("upd.available", { v: upd.latest }) : t("upd.upToDate"));
        }),
        updAvailable() ? el("a", { href: upd.url, target: "_blank", rel: "noopener", style: "color:#86efac;font-size:12px" }, "⬇ " + t("upd.download") + " v" + upd.latest) : null),
      CK.STORE_URL ? el("p", { style: "margin-top:6px" }, "🛒 " + t("upd.storeTip") + " ", el("a", { href: CK.STORE_URL, target: "_blank", rel: "noopener", style: "color:#fca5a5" }, t("upd.storeLink"))) : null,
      el("p", {}, t("upd.howTo"))]),
      el("h3", {}, t("set.backup")),
      el("p", {}, t("set.backupInfo")),
      el("div", { class: "rowb" }, el("span", { style: "font-size:12px;color:var(--ck-tx2, #ccc)" }, t("bak.every")),
        select([["7", t("bak.d7")], ["14", t("bak.d14")], ["30", t("bak.d30")], ["0", t("bak.off")]], String(S.backupEvery ?? 7),
          async v => { CK.store.data.settings.backupEvery = +v; await save(); renderBackup(); })),
      el("p", {}, t("bak.last", { d: bak.lastBackup ? CK.fmtDate(bak.lastBackup, true) : t("bak.never") })),
      el("div", { class: "rowb" },
        button("⬇ " + t("set.exportData"), exportBackup),
        button("⬆ " + t("set.importData"), () => fileIn.click()), fileIn),
      el("h3", {}, t("set.selections")),
      el("div", { class: "rowb" }, button(t("set.clearSel"), () => { LIST_TABS.forEach(k => { sel[k].clear(); saveSel(k); }); setMsg(t("msg.cleared")); })),
      el("h3", {}, t("set.shortcuts")),
      el("p", {}, t("set.shortcutsText")),
      el("h3", {}, t("set.about")),
      el("p", {}, t("set.aboutText", { v: CK.VERSION })),
      el("p", {}, "🌐 " + t("set.website") + ": ", el("a", { href: "https://chatkit.justplguy.com/?lang=" + encodeURIComponent(CK.lang || "en") + "&utm_source=extension&utm_medium=settings", target: "_blank", rel: "noopener", style: "color:#fca5a5" }, "chatkit.justplguy.com")),
      el("p", {}, "🐞 " + t("set.bug") + " ", el("a", { href: "mailto:contact@justplguy.com?subject=" + encodeURIComponent("ChatKit Pro v" + CK.VERSION + " (" + (CK.IS_FIREFOX || /Firefox\//.test(navigator.userAgent) ? "Firefox" : "Chrome") + ")"), style: "color:#fca5a5" }, "contact@justplguy.com"))
    );
  }

  // ---------- przełączanie ----------
  function renderAll() { renderTabs(); renderFilters(); renderFolders(); renderFooter(); renderList(); }

  function switchTab(id) {
    current = id; lastClicked = null;
    renderAll();
    const tab = extraTabs.find(x => x.id === id);
    if (tab && tab.onShow) tab.onShow(ui);
    if (LIST_TABS.includes(id)) openList(id);
  }

  // od 1.5.1: czaty i archiwum — od razu lista z pamięci, potem ciche sprawdzenie całości w tle
  async function openList(id) {
    const s = sources[id];
    if (!s.restore) { if (!s.items.length && !s.done) loadOne(); else quietRefresh(); return; }
    if (!s.items.length && !s.done) {
      if (await s.restore()) { if (current === id) renderList(); quietRefresh(); }
      else { await loadOne(); if (s.done && s.items.length) { s.syncedOnce = true; s.syncedAt = Date.now(); } } // cała lista przyszła w 1. stronie — świeża
    } else quietRefresh();
    s.sync(() => { if (current === id && !busy) renderList(); });
  }

  async function welcome() {
    try {
      const { welcomeSeen } = await chrome.storage.local.get("welcomeSeen");
      if (welcomeSeen) return;
      await chrome.storage.local.set({ welcomeSeen: Date.now() });
    } catch { return; }
    const tip = (icon, txt) => el("div", { style: "display:flex;gap:10px;margin:9px 0;align-items:flex-start" }, el("span", { style: "font-size:18px" }, icon), el("span", {}, txt));
    await modal("👋 " + t("wel.title"), () => el("div", {},
      tip("🧩", t("wel.t1")), tip("☑️", t("wel.t2")), tip("🖼️", t("wel.t3")), tip("☰", t("wel.t4")), tip("📚", t("wel.t5")),
      el("p", { class: "muted", style: "margin-top:12px" }, t("wel.privacy"))),
      [{ label: t("wel.ok"), cls: "primary", result: true }]);
  }

  function togglePanel(force) {
    const open = CK.on() && (force ?? !panel.classList.contains("open"));
    panel.classList.toggle("open", open);
    if (open) { welcome(); fitTabs(); }
    if (open) askUpdate(false); // raz na dobę (cache w tle)
    if (open && LIST_TABS.includes(current)) openList(current);
  }

  // ---------- otwieranie czatu bez gubienia listy ----------
  const RESTORE_KEY = "ckp.restore";
  const pickSrc = s => ({ items: s.items, offset: s.offset, total: s.total, done: s.done });
  function saveRestore() {
    try {
      sessionStorage.setItem(RESTORE_KEY, JSON.stringify({
        at: Date.now(), tab: current, scroll: list.scrollTop, open: panel.classList.contains("open"),
        filters, sources: { chats: pickSrc(sources.chats), archive: pickSrc(sources.archive) }
      }));
    } catch (e) { console.warn("[ChatKit Pro] restore save", e); }
  }
  // Zwraca "tab" | "spa" | "reload"
  CK.openChat = (id, e) => {
    const url = "/c/" + id;
    if (e && (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)) { window.open(url, "_blank", "noopener"); return "tab"; }
    if (CK.dom.convId() === id) return "spa";
    saveRestore(); // na wypadek pełnego przeładowania
    const link = document.querySelector(`nav a[href$="${url}"], a[href="${url}"]:not(#chatkit-pro-host *)`);
    if (link) {
      // link z paska bocznego ChatGPT = nawigacja bez przeładowania; jeśli strona jednak się przeładuje, stan wróci
      link.click();
      setTimeout(() => { try { sessionStorage.removeItem(RESTORE_KEY); } catch {} }, 4000);
      return "spa";
    }
    location.href = url;
    return "reload";
  };
  function takeRestore() {
    try {
      const r = JSON.parse(sessionStorage.getItem(RESTORE_KEY) || "null");
      sessionStorage.removeItem(RESTORE_KEY);
      if (!r || Date.now() - r.at > 15 * 60 * 1000) return null;
      for (const k of ["chats", "archive"]) if (r.sources && r.sources[k]) Object.assign(sources[k], r.sources[k]);
      for (const k of Object.keys(filters)) if (r.filters && r.filters[k]) Object.assign(filters[k], r.filters[k]);
      return r;
    } catch { return null; }
  }

  // API dla modułów z dodatkowymi zakładkami
  const ui = {
    el, button, select, modal, setMsg, copy, safe, progress, t,
    get busy() { return busy; },
    rerender: () => { renderFooter(); renderList(); },
    // dla szybkiego skoku (palette.js)
    chatItems: () => sources.chats.items,
    async ensureChats() { const s = sources.chats; if (!s.items.length && !s.done && !busy) { if (!(await s.restore())) await s.loadPage(); if (current === "chats") renderList(); } },
    showFolder(id) { togglePanel(true); switchTab("chats"); filters.chats.folder = id; filters.chats.tag = ""; renderFolders(); renderList(); },
    showTag(g) { togglePanel(true); switchTab("chats"); filters.chats.tag = g; renderFolders(); renderList(); },
    switchTab, open: () => togglePanel(true), sel, saveSel, filters, chatBulk, libDelete,
    registerTab(def) { extraTabs.push(def); if (CK.store.data) renderTabs(); }
  };
  CK.ui = ui;

  // ---------- zdarzenia ----------
  $("#fab").addEventListener("click", () => togglePanel());
  $("#close").addEventListener("click", () => togglePanel(false));
  $("#jumpbtn").addEventListener("click", () => { if (CK.palette) CK.palette.open(); });
  $("#setbtn").addEventListener("click", () => { if (!busy) switchTab(current === "settings" ? "chats" : "settings"); });
  $("#bigbtn").addEventListener("click", () => { view.big = !view.big; renderList(); });
  $("#size").addEventListener("input", e => { view.size = +e.target.value; applyView(); });
  zoom.addEventListener("click", () => { zoom.style.display = "none"; });
  document.addEventListener("keydown", e => {
    if (!CK.on()) return;
    if (e.altKey && e.shiftKey && e.code === "KeyK") { e.preventDefault(); togglePanel(); }
    else if (e.key === "Escape") {
      if (root.querySelector(".modal")) return;
      if (zoom.style.display === "flex") zoom.style.display = "none";
      else if (panel.classList.contains("open")) togglePanel(false);
    }
  }, true);

  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    if (panel.classList.contains("open") && current === "chats") setTimeout(() => quietRefresh(), 2500);
  }, 1500);

  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (msg && msg.type === "ck-toggle") togglePanel(msg.open);
    if (msg && msg.type === "ck-ping") { reply({ ok: true }); return false; }
  });

  // Wyłączona wtyczka: znika cały panel i przycisk; po włączeniu wraca bez przeładowania strony.
  const applyFab = () => {
    host.style.display = CK.on() ? "" : "none";
    if (!CK.on() && panel.classList.contains("open")) panel.classList.remove("open");
    $("#fab").style.display = CK.store.data.settings.showFab === false ? "none" : "";
  };

  CK.ready.then(async () => {
    CK.applyTheme(host, root); CK.store.onChange(() => CK.applyTheme(host, root));
    applyFab();
    loadUpdate(); loadBackup();
    CK.store.onChange(renderBackup);
    CK.store.onChange(applyFab);
    // Przerwa po HTTP 429: komunikat w panelu z odliczaniem (operacje same ruszą po przerwie).
    let rateTimer = null;
    CK.limit.onChange((_ms, kind) => {
      clearInterval(rateTimer);
      const waiting = kind === "wait" || busy;
      const show = () => {
        const left = Math.ceil(CK.limit.pausedFor() / 1000);
        if (left <= 0) { clearInterval(rateTimer); if ($("#msg").textContent.startsWith("⏸")) setMsg(""); return; }
        setMsg("⏸ " + t(waiting || busy ? "rate.wait" : "rate.bg", { s: left }));
        if (busy) $("#status").textContent = "⏳ " + t("rate.status", { s: left });
      };
      show(); rateTimer = setInterval(show, 1000);
    });
    CK.store.onChange(() => {
      if (current === "chats") renderFolders();
      if (current !== "lib" && !root.querySelector(".modal") && !root.activeElement?.matches?.("textarea, input[type=text], input[type=search], input[type=range]")) { renderFooter(); renderList(); }
    });
    const restored = takeRestore();
    switchTab(restored && restored.tab ? restored.tab : "chats");
    if (restored && restored.open) {
      togglePanel(true);
      const back = () => { list.scrollTop = restored.scroll || 0; };
      back(); setTimeout(back, 50); setTimeout(back, 400);
    }
  });
})();
