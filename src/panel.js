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
      reset() { this.items = []; this.offset = 0; this.done = false; this.total = null; },
      async fetchPage(offset) {
        const r = await CK.withRetry(() => CK.api(`/conversations?offset=${offset}&limit=100&order=updated${archived ? "&is_archived=true" : ""}`));
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
        return list.length;
      },
      async refreshTop() {
        const { list, total } = await this.fetchPage(0);
        const byKey = new Map(this.items.map(i => [i.key, i]));
        let added = 0;
        for (const c of list) { const old = byKey.get(c.key); if (old) Object.assign(old, c); else { this.items.push(c); added++; } }
        this.offset += added;
        if (total !== null) { this.total = total; this.done = this.offset >= total; }
        return added;
      },
      async loadEverything(onProgress) {
        while (!this.done) { const n = await this.loadPage(); onProgress && onProgress(this.items.length); if (!n) break; await sleep(200); }
      }
    };
  }

  function nextCursor(j) {
    for (const k of ["cursor", "next_cursor", "next", "nextCursor"]) if (typeof j?.[k] === "string" && j[k]) return j[k];
    for (const [k, v] of Object.entries(j || {})) if (/cursor/i.test(k) && typeof v === "string" && v) return v;
    return null;
  }

  function librarySource() {
    return {
      items: [], cursor: null, done: false, cat: "image", lastRaw: null,
      reset() { this.items = []; this.cursor = null; this.done = false; },
      async refreshTop() {
        const saved = { cursor: this.cursor, done: this.done }, before = this.items.length;
        this.cursor = null;
        try { await this.loadPage(); } finally { this.cursor = saved.cursor; this.done = saved.done; }
        return this.items.length - before;
      },
      async loadPage() {
        const body = {
          cursor: this.cursor, limit: 50, categories: this.cat === "all" ? null : [this.cat], source: null,
          include_hidden_files: false, include_saved_entities: true, include_sites: false, trashed_only: false, external_account_keys: {}
        };
        const r = await CK.withRetry(() => CK.api("/files/library", { method: "POST", body: JSON.stringify(body) }));
        if (!r.ok) throw new Error(t("err.library", { s: r.status }));
        const j = await r.json();
        this.lastRaw = j;
        const arr = Array.isArray(j.items) ? j.items : [];
        const list = [];
        for (const o of arr) {
          const id = o.library_file_id || (typeof o.id === "string" && o.id.startsWith("libfile_") ? o.id : null);
          if (!id) continue;
          let dir = o.parent_directory_id || o.directory_id || null;
          if (dir && !String(dir).startsWith("libdir_")) dir = "libdir_" + dir;
          list.push({
            key: id, title: o.file_name || id, date: o.record_creation_time || o.file_upload_time || o.updated_at,
            size: o.file_size_bytes || 0, generated: !!o.image_gen_attribution, project: o.is_project ? (o.gizmo_id || "?") : null,
            thumb: o.thumbnail_url || o.thumbnail_preview_url || null, mime: o.mime_type || null,
            payload: { library_file_id: id, file_id: o.file_id, parent_directory_id: dir, file_name: o.file_name }
          });
        }
        const known = new Set(this.items.map(i => i.key));
        list.forEach(c => { if (!known.has(c.key)) this.items.push(c); });
        const nc = nextCursor(j);
        if (!arr.length || !nc || nc === this.cursor) this.done = true;
        this.cursor = nc;
        return list.length;
      },
      async loadEverything(onProgress) {
        while (!this.done) { const n = await this.loadPage(); onProgress && onProgress(this.items.length); if (!n && !this.done) break; await sleep(200); }
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
  CK.sources = sources;
  const LIST_TABS = ["chats", "archive", "lib"];
  const sel = Object.fromEntries(LIST_TABS.map(k => [k, new Set(ls.get("sel." + k, []))]));
  const saveSel = k => ls.set("sel." + k, [...sel[k]]);
  const filters = {
    chats: { q: "", sort: "new", star: false, folder: "all", older: "" },
    archive: { q: "", sort: "new", star: false, older: "" },
    lib: { q: "", sort: "new", type: "all", proj: "all", older: "" }
  };
  let current = "chats", busy = false, lastClicked = null, visibleNow = [], notLoggedIn = false;
  const view = { big: false, size: 180, ...ls.get("view", {}) };
  const extraTabs = []; // {id, icon, label(), render(container, ui), footer?(actions, ui)}

  // =====================================================================
  //  UI — szkielet
  // =====================================================================
  const host = document.createElement("div");
  host.id = "chatkit-pro-host";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  root.innerHTML = `
  <style>
    :host { all: initial; }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
    #fab { position: fixed; right: 18px; bottom: 90px; z-index: 2147483646; width: 48px; height: 48px; border-radius: 50%;
      border: none; background: #ef4444; color: #fff; font-size: 20px; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.35); }
    #fab:hover { background: #dc2626; }
    #panel { position: fixed; right: 18px; bottom: 150px; z-index: 2147483647; width: 660px; max-width: calc(100vw - 36px);
      height: 80vh; display: none; flex-direction: column; background: #1f1f1f; color: #eee; border: 1px solid #3a3a3a;
      border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,.5); font-size: 13px; overflow: hidden; }
    #panel.open { display: flex; }
    #panel.big { width: min(1400px, 94vw); height: 88vh; right: 3vw; bottom: 6vh; }
    header { padding: 6px 10px 0; display: flex; align-items: center; gap: 4px; }
    header b { font-size: 13px; margin-right: 6px; color: #f87171; }
    header b small { font-weight: 400; font-size: 11px; color: #888; margin-left: 2px; }
    #tabs { display: flex; flex-wrap: wrap; gap: 0 2px; padding: 0 8px; border-bottom: 1px solid #333; }
    .tab { background: none !important; border: none !important; border-bottom: 2px solid transparent !important; border-radius: 0 !important; padding: 6px 7px !important; font-size: 12.5px !important; color: #bbb !important; }
    .tab.active { border-bottom-color: #ef4444 !important; font-weight: 600; color: #fff !important; }
    .sp { flex: 1; }
    #upd { margin: 6px 10px 0; padding: 7px 10px; border-radius: 8px; background: rgba(34,197,94,.12); border: 1px solid rgba(34,197,94,.45); color: #bbf7d0; display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
    #upd a { background: #16a34a; color: #fff; border-radius: 6px; padding: 4px 10px; text-decoration: none; font-weight: 600; font-size: 12px; }
    #upd a:hover { background: #15803d; }
    #viewctl { display: none; align-items: center; gap: 6px; color: #aaa; font-size: 12px; }
    #panel.big.lib #viewctl { display: flex; }
    #viewctl input { width: 110px; }
    .filters { padding: 6px 10px; display: flex; gap: 6px; align-items: center; border-bottom: 1px solid #333; flex-wrap: wrap; }
    input[type=text], input[type=number], input[type=search], select, textarea { background: #2a2a2a; border: 1px solid #444; color: #eee; border-radius: 6px; padding: 5px 7px; font-size: 12px; }
    textarea { width: 100%; resize: vertical; font-family: inherit; line-height: 1.45; }
    input[type=text], input[type=search] { flex: 1; min-width: 140px; }
    input[type=number] { width: 64px; }
    label.chk { display: flex; align-items: center; gap: 4px; color: #ccc; font-size: 12px; cursor: pointer; }
    button { background: #2f2f2f; color: #eee; border: 1px solid #444; border-radius: 6px; padding: 5px 9px; cursor: pointer; font-size: 12px; white-space: nowrap; }
    button:hover:not(:disabled) { background: #3a3a3a; }
    button:disabled { opacity: .4; cursor: default; }
    button.danger { background: #b91c1c; border-color: #b91c1c; }
    button.danger:hover:not(:disabled) { background: #dc2626; }
    button.primary { background: #2563eb; border-color: #2563eb; }
    button.x { background: none; border: none; font-size: 18px; padding: 0 4px; }
    #body { flex: 1; display: flex; min-height: 0; }
    #folders { width: 170px; flex-shrink: 0; border-right: 1px solid #333; overflow-y: auto; padding: 6px 0; font-size: 12px; }
    #panel.big #folders { width: 230px; }
    .fhead { display: flex; align-items: center; padding: 2px 8px 6px; color: #999; text-transform: uppercase; font-size: 10px; letter-spacing: .05em; }
    .fhead button { padding: 1px 7px; font-size: 13px; }
    .frow { display: flex; align-items: center; gap: 6px; padding: 5px 8px; cursor: pointer; border-left: 3px solid transparent; }
    .frow:hover { background: #2a2a2a; }
    .frow.active { background: #2f2626; border-left-color: #ef4444; }
    .frow.drop { background: #3b1d1d; outline: 1px dashed #ef4444; }
    .frow .n { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .frow .c { color: #777; font-size: 11px; }
    .frow .a { display: none; gap: 2px; }
    .frow:hover .a { display: flex; }
    .frow .a span { padding: 0 2px; opacity: .7; }
    .frow .a span:hover { opacity: 1; }
    .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; background: var(--c, #666); }
    #list { flex: 1; overflow-y: auto; min-width: 0; }
    .item { display: flex; gap: 8px; padding: 6px 10px; align-items: center; cursor: pointer; border-bottom: 1px solid #2a2a2a; user-select: none; }
    .item:hover { background: #2a2a2a; }
    .item.sel { background: #3b1d1d; }
    .item input { pointer-events: none; margin: 0; }
    .item .t { flex: 1; word-break: break-word; min-width: 0; }
    .item .d { color: #888; font-size: 11px; white-space: nowrap; }
    .item .sz { color: #aaa; font-size: 11px; white-space: nowrap; min-width: 56px; text-align: right; }
    .ic { opacity: .5; font-size: 12px; padding: 0 2px; cursor: pointer; }
    .ic:hover { opacity: 1; }
    .star { color: #777; font-size: 15px; line-height: 1; }
    .star.on { color: #fbbf24; }
    .tag { display: inline-block; margin-left: 6px; font-size: 10px; padding: 1px 6px; border-radius: 8px; background: color-mix(in srgb, var(--c) 30%, transparent); color: #eee; border: 1px solid var(--c); vertical-align: middle; }
    .badge { font-size: 10px; padding: 1px 5px; border-radius: 6px; background: #333; color: #bbb; margin-left: 4px; }
    img.th { width: 44px; height: 44px; object-fit: cover; border-radius: 4px; flex-shrink: 0; background: #333; }
    .ph { width: 44px; height: 44px; border-radius: 4px; flex-shrink: 0; background: #2a2a2a; color: #666; font-size: 10px; display: flex; align-items: center; justify-content: center; }
    #list.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--sz, 180px), 1fr)); gap: 10px; padding: 10px; align-content: start; }
    #list.grid .item { flex-direction: column; align-items: stretch; gap: 4px; padding: 6px; border: 2px solid #2a2a2a; border-radius: 8px; position: relative; }
    #list.grid .item.sel { border-color: #ef4444; }
    #list.grid .item input { position: absolute; top: 10px; left: 10px; width: 18px; height: 18px; z-index: 1; }
    #list.grid img.th, #list.grid .ph { width: 100%; height: var(--sz, 180px); object-fit: contain; background: #111; border-radius: 6px; }
    #list.grid .t { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #list.grid .meta { display: flex; justify-content: space-between; gap: 8px; white-space: nowrap; }
    #list.grid .bdg { position: absolute; top: 10px; right: 10px; display: flex; gap: 3px; }
    #list.grid .bdg .badge { background: rgba(0,0,0,.65); color: #eee; margin: 0; }
    .empty { padding: 30px; text-align: center; color: #777; line-height: 1.6; }
    footer { padding: 6px 10px 8px; border-top: 1px solid #333; }
    #actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    progress { width: 100%; height: 6px; display: none; margin-top: 6px; }
    #status { color: #aaa; font-size: 12px; margin-top: 6px; }
    #msg { color: #fbbf24; font-size: 12px; margin-top: 2px; }
    #zoom { position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,.85); display: none; align-items: center; justify-content: center; cursor: zoom-out; }
    #zoom img { max-width: 92vw; max-height: 92vh; border-radius: 8px; }
    .pane { padding: 14px 16px; line-height: 1.55; }
    .pane h3 { font-size: 13px; margin: 18px 0 6px; color: #f87171; }
    .pane h3:first-child { margin-top: 0; }
    .pane p, .muted { color: #999; margin: 4px 0; font-size: 12px; }
    .rowb { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; align-items: center; }
    .card { border: 1px solid #333; border-radius: 8px; padding: 9px 11px; margin: 0 0 8px; background: #242424; }
    .card:hover { border-color: #444; }
    .card .h { display: flex; gap: 8px; align-items: center; }
    .card .h b { flex: 1; font-size: 13px; }
    .card .body { color: #bbb; font-size: 12px; white-space: pre-wrap; margin-top: 4px; max-height: 6.5em; overflow: hidden; }
    .quote { border-left: 3px solid #ef4444; padding-left: 8px; color: #ccc; font-style: italic; margin: 4px 0; white-space: pre-wrap; }
    .hl { background: #854d0e; color: #fff; border-radius: 2px; }
    .bar { height: 8px; background: #ef4444; border-radius: 4px; }
    .barrow { display: grid; grid-template-columns: 90px 1fr 60px; gap: 8px; align-items: center; font-size: 12px; margin: 3px 0; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
    .kpi { background: #242424; border: 1px solid #333; border-radius: 8px; padding: 10px; }
    .kpi b { display: block; font-size: 20px; color: #fff; }
    .kpi span { color: #999; font-size: 11px; }
    .form { display: grid; gap: 8px; }
    .form label { font-size: 12px; color: #bbb; display: grid; gap: 3px; }
    .modal { position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; }
    .modal .box { background: #1f1f1f; border: 1px solid #3a3a3a; border-radius: 12px; padding: 16px; width: min(520px, 92vw); max-height: 86vh; overflow: auto; color: #eee; font-size: 13px; }
    .modal h4 { margin: 0 0 10px; font-size: 14px; }
  </style>
  <button id="fab">🧰</button>
  <div id="panel">
    <header>
      <b>ChatKit Pro <small>by JustPLGuy</small></b>
      <span class="sp"></span>
      <span id="viewctl"><span id="sizelbl"></span> <input type="range" id="size" min="100" max="420" step="20"></span>
      <button id="bigbtn"></button>
      <button id="setbtn" class="x" style="font-size:16px">⚙</button>
      <button class="x" id="close">×</button>
    </header>
    <div id="upd" style="display:none"></div>
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
    const sb = $("#setbtn"); sb.title = t("tab.settings"); sb.style.color = current === "settings" ? "#f87171" : "";
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
      box.append(
        select([["all", t("lib.allOrigins")], ["gen", t("lib.generated")], ["up", t("lib.uploaded")]], f.type, v => { f.type = v; rerender(); }),
        select([["all", t("lib.projAll")], ["in", t("lib.projIn")], ["out", t("lib.projOut")]], f.proj, v => { f.proj = v; rerender(); }),
      );
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
        act("⬇", t("fold.export"), () => exportFlow(CK.folders.chatsIn(fo.id), "md", fo.name)),
        act("✕", t("fold.delete"), async () => {
          if (confirm(t("confirm.folderDelete", { name: fo.name }))) {
            if (CK.folders.subtree(fo.id).has(f.folder)) f.folder = "all";
            await CK.folders.remove(fo.id);
          }
        })
      );
      a.append(row(fo.id, fo.name, { depth: fo.depth, prefix: [color, dot], count: CK.folders.chatsIn(fo.id).length, actions }));
    }
    if (!data.folders.length) a.append(el("p", { style: "color:#777;padding:6px 10px;font-size:11px;line-height:1.4" }, t("fold.hint")));
  }

  // ---------- lista ----------
  const rowEls = new Map();

  function visibleItems() {
    const src = sources[current], f = filters[current], data = CK.store.data;
    let arr = src.items;
    const q = f.q.trim().toLowerCase();
    if (q) arr = arr.filter(i => i.title.toLowerCase().includes(q));
    if (f.older !== "" && +f.older >= 0) {
      const lim = Date.now() - (+f.older) * 864e5;
      arr = arr.filter(i => { const d = CK.toDate(i.date); return d && d.getTime() < lim; });
    }
    if (current === "lib") {
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
      el("span", { class: "t" }, it.title, fo ? el("span", { class: "tag", style: `--c:${fo.color}` }, fo.name) : null),
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
    } else thumb = el("div", { class: "ph" }, ext || t("lib.file"));
    const badges = [it.generated ? el("span", { class: "badge" }, "AI") : null, it.project ? el("span", { class: "badge" }, t("lib.project")) : null];
    const cb = el("input", { type: "checkbox", checked: s.has(it.key), tabIndex: -1 });
    const r = grid
      ? el("div", { class: "item" + (s.has(it.key) ? " sel" : "") }, cb, thumb, el("div", { class: "bdg" }, ...badges), el("span", { class: "t", title: it.title }, it.title),
          el("div", { class: "meta" }, el("span", { class: "d" }, CK.fmtDate(it.date)), el("span", { class: "d" }, CK.fmtSize(it.size), " ", dlIcon(it))))
      : el("div", { class: "item" + (s.has(it.key) ? " sel" : "") }, cb, thumb, el("span", { class: "t" }, it.title, ...badges),
          el("span", { class: "sz" }, CK.fmtSize(it.size)), el("span", { class: "d" }, CK.fmtDate(it.date, true)), dlIcon(it));
    r.addEventListener("click", e => onRowClick(it.key, e));
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
      else if (tab) { try { tab.render(box, ui); } catch (e) { console.error(e); box.append(el("div", { class: "empty" }, "Error: " + e.message)); } }
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
        el("a", { href: "https://chatgpt.com/auth/login", style: "color:#f87171" }, t("ui.loginBtn"))));
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
      const efmt = select([["md", "Markdown"], ["html", "HTML"], ["pdf", t("exp.pdf")]], ls.get("expfmt", "md"), v => ls.set("expfmt", v));
      a.append(efmt, button("⬇ " + t("ui.export"), () => exportFlow(selectedLoaded(), efmt.value), need));
      if (current === "chats") a.append(button(t("ui.archive"), () => chatBulk("archive"), need));
      else a.append(button("↩ " + t("ui.restore"), () => chatBulk("unarchive"), need));
      a.append(button(t("ui.delete"), () => chatBulk("delete"), { ...need, class: "danger" }));
    } else {
      a.append(button(t("ui.diagnostics"), diag, { title: t("ui.diagTip") }));
      a.append(button("⬇ " + t("lib.downloadSel"), () => libDownload(selectedLoaded()), need));
      a.append(button(t("ui.deleteSelected"), libDelete, { ...need, class: "danger" }));
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
    finally { busy = false; prog.style.display = "none"; renderList(); }
  }

  const progress = (done, all, label) => {
    prog.style.display = "block"; prog.max = all; prog.value = done;
    $("#status").textContent = `${label} ${done}/${all}…`;
  };

  function loadOne() {
    if (!LIST_TABS.includes(current)) return;
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

  async function chatBulk(mode, keysArg, tabArg) {
    const tab = tabArg || current, src = sources[tab];
    const keys = keysArg || selectedLoaded(); if (!keys.length) return;
    if (!confirm(t("confirm.chat." + mode, { n: keys.length }))) return;
    const body = { delete: { is_visible: false }, archive: { is_archived: true }, unarchive: { is_archived: false } }[mode];
    let ok = 0, fail = 0;
    await safe(async () => {
      for (const k of keys) {
        if (await CK.patchConversation(k, body)) {
          ok++;
          src.items = src.items.filter(i => i.key !== k);
          src.offset = Math.max(0, src.offset - 1);
          if (src.total != null) src.total--;
          sel[tab].delete(k);
        } else fail++;
        progress(ok + fail, keys.length, t("prog." + mode));
        await sleep(300);
      }
      saveSel(tab);
      if (mode === "delete") { keys.forEach(k => { delete CK.store.data.stars[k]; delete CK.store.data.chatFolder[k]; }); await CK.store.save("stars", "chatFolder"); }
      if (mode === "archive") sources.archive.reset();
      if (mode === "unarchive") sources.chats.reset();
    });
    setMsg(t("msg.doneChats", { ok, fail: fail ? t("msg.failPart", { n: fail }) : "" }));
  }

  async function libDelete(keysArg) {
    const keys = Array.isArray(keysArg) ? keysArg : selectedLoaded(); if (!keys.length) return;
    if (!confirm(t("confirm.libDelete", { n: keys.length }))) return;
    let res = { ok: 0, fail: 0 };
    await safe(async () => {
      res = await sources.lib.remove(keys, (d, a) => progress(d, a, t("prog.delete")));
      const still = new Set(sources.lib.items.map(i => i.key));
      keys.forEach(k => { if (!still.has(k)) sel.lib.delete(k); });
      saveSel("lib");
    });
    setMsg(t("msg.doneFiles", { ok: res.ok, fail: res.fail ? t("msg.failPart", { n: res.fail }) : "" }));
  }

  async function exportFlow(ids, format, name) {
    if (!ids.length) return setMsg(t("msg.noExport"));
    if (ids.length > 30 && !confirm(t("confirm.exportMany", { n: ids.length }))) return;
    let res = null;
    await safe(async () => { res = await CK.exportChats(ids, format, (d, a) => progress(d, a, t("prog.fetchChats")), name); });
    if (res) setMsg(t("msg.exported", { n: res.ok, fail: res.fail ? t("msg.failPart", { n: res.fail }) : "" }) + (format === "pdf" ? " " + t("msg.pdfHint") : ""));
  }

  let refreshing = false;
  async function quietRefresh(manual = false) {
    if (!LIST_TABS.includes(current) || busy || refreshing) return;
    const src = sources[current];
    if (!src.items.length) { if (manual) loadOne(); return; }
    refreshing = true;
    try {
      const added = await src.refreshTop();
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
      el("input", { type: "checkbox", checked: S[key] ?? def, onchange: async e => { S[key] = e.target.checked; await save(); } }), label);
    const fileIn = el("input", { type: "file", accept: ".json,application/json", style: "display:none", onchange: async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const j = JSON.parse(await file.text());
        if (!confirm(t("confirm.import"))) return;
        for (const k of ["folders", "chatFolder", "stars", "prompts", "bookmarks", "notes", "chatNotes", "rules", "settings"]) if (j[k] !== undefined) d[k] = j[k];
        await CK.store.save();
        setMsg(t("msg.imported"));
      } catch (err) { setMsg(t("msg.badFile", { e: err.message })); }
    } });
    return el("div", { class: "pane" },
      el("h3", {}, t("set.language")),
      el("div", { class: "rowb" }, select([["auto", t("set.langAuto")], ["pl", "Polski"], ["en", "English"], ["fr", "Français"], ["de", "Deutsch"]], S.lang || "auto",
        async v => { S.lang = v; await save(); CK.applyLang(); renderAll(); })),
      el("h3", {}, t("set.look")),
      chk("timestamps", t("set.timestamps"), true),
      el("div", { class: "rowb" }, button(t("set.tsDiag"), () => copy(JSON.stringify(CK.tsDebug ? CK.tsDebug() : {}, null, 1), t("msg.diagCopied")))),
      chk("minimap", t("set.minimap"), true),
      chk("classicDark", t("set.classicDark"), false),
      chk("sidebarMarks", t("set.sidebarMarks"), true),
      chk("showFab", t("set.showFab"), true),
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
      el("p", {}, t("upd.howTo"))]),
      el("h3", {}, t("set.backup")),
      el("p", {}, t("set.backupInfo")),
      el("div", { class: "rowb" },
        button("⬇ " + t("set.exportData"), () => CK.download(`chatkit-pro-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: "ChatKit Pro", version: CK.VERSION, folders: d.folders, chatFolder: d.chatFolder, stars: d.stars, prompts: d.prompts, bookmarks: d.bookmarks, notes: d.notes, chatNotes: d.chatNotes, rules: d.rules, settings: d.settings }, null, 2), "application/json")),
        button("⬆ " + t("set.importData"), () => fileIn.click()), fileIn),
      el("h3", {}, t("set.selections")),
      el("div", { class: "rowb" }, button(t("set.clearSel"), () => { LIST_TABS.forEach(k => { sel[k].clear(); saveSel(k); }); setMsg(t("msg.cleared")); })),
      el("h3", {}, t("set.shortcuts")),
      el("p", {}, t("set.shortcutsText")),
      el("h3", {}, t("set.about")),
      el("p", {}, t("set.aboutText", { v: CK.VERSION }))
    );
  }

  // ---------- przełączanie ----------
  function renderAll() { renderTabs(); renderFilters(); renderFolders(); renderFooter(); renderList(); }

  function switchTab(id) {
    current = id; lastClicked = null;
    renderAll();
    const tab = extraTabs.find(x => x.id === id);
    if (tab && tab.onShow) tab.onShow(ui);
    if (LIST_TABS.includes(id)) { if (!sources[id].items.length && !sources[id].done) loadOne(); else quietRefresh(); }
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
    const open = force ?? !panel.classList.contains("open");
    panel.classList.toggle("open", open);
    if (open) welcome();
    if (open) askUpdate(false); // raz na dobę (cache w tle)
    if (open && LIST_TABS.includes(current)) { if (!sources[current].items.length && !sources[current].done) loadOne(); else quietRefresh(); }
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
    switchTab, open: () => togglePanel(true), sel, saveSel, filters, chatBulk, libDelete,
    registerTab(def) { extraTabs.push(def); if (CK.store.data) renderTabs(); }
  };
  CK.ui = ui;

  // ---------- zdarzenia ----------
  $("#fab").addEventListener("click", () => togglePanel());
  $("#close").addEventListener("click", () => togglePanel(false));
  $("#setbtn").addEventListener("click", () => { if (!busy) switchTab(current === "settings" ? "chats" : "settings"); });
  $("#bigbtn").addEventListener("click", () => { view.big = !view.big; renderList(); });
  $("#size").addEventListener("input", e => { view.size = +e.target.value; applyView(); });
  zoom.addEventListener("click", () => { zoom.style.display = "none"; });
  document.addEventListener("keydown", e => {
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

  chrome.runtime.onMessage.addListener(msg => { if (msg && msg.type === "ck-toggle") togglePanel(msg.open); });

  const applyFab = () => { $("#fab").style.display = CK.store.data.settings.showFab === false ? "none" : ""; };

  CK.ready.then(async () => {
    applyFab();
    loadUpdate();
    CK.store.onChange(applyFab);
    try {
      const { openPanelAt } = await chrome.storage.local.get("openPanelAt");
      if (openPanelAt && Date.now() - openPanelAt < 30000) { await chrome.storage.local.remove("openPanelAt"); setTimeout(() => togglePanel(true), 300); }
    } catch {}
    CK.store.onChange(() => {
      if (current === "chats") renderFolders();
      if (current !== "lib" && !root.querySelector(".modal") && !root.activeElement?.matches?.("textarea, input[type=text], input[type=search]")) { renderFooter(); renderList(); }
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
