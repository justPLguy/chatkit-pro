// ChatKit Pro — minimapa czatu (spis treści), wyszukiwanie w rozmowie, zakładki, notatki.
// Dane wiadomości pochodzą z API (pełna rozmowa), bo ChatGPT renderuje tylko część wiadomości.
(() => {
  const CK = window.CK;
  const t = (...a) => CK.t(...a);

  const host = document.createElement("div");
  host.id = "chatkit-pro-minimap";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
  <style>
    :host { all: initial; }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
    #tab { position: fixed; right: 0; top: 40%; z-index: 2147483640; background: #2a2a2a; color: #ddd; border: 1px solid #444; border-right: none;
      border-radius: 8px 0 0 8px; padding: 10px 5px; cursor: pointer; font-size: 13px; writing-mode: vertical-rl; display: none; opacity: .75; }
    #tab:hover { opacity: 1; background: #333; }
    #mm { position: fixed; right: 0; top: 70px; bottom: 90px; width: 300px; z-index: 2147483641; background: #1f1f1f; color: #eee;
      border: 1px solid #3a3a3a; border-right: none; border-radius: 10px 0 0 10px; display: none; flex-direction: column; font-size: 12.5px;
      box-shadow: -6px 0 24px rgba(0,0,0,.35); }
    #mm.open { display: flex; }
    .hd { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-bottom: 1px solid #333; }
    .hd b { flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 12.5px; }
    .tabs { display: flex; border-bottom: 1px solid #333; }
    .tabs button { flex: 1; background: none; border: none; color: #aaa; padding: 7px 4px; cursor: pointer; font-size: 12px; border-bottom: 2px solid transparent; }
    .tabs button.on { color: #fff; border-bottom-color: #ef4444; }
    .tools { padding: 7px 10px; display: flex; gap: 6px; align-items: center; border-bottom: 1px solid #2a2a2a; }
    input[type=search], textarea { width: 100%; background: #2a2a2a; border: 1px solid #444; color: #eee; border-radius: 6px; padding: 5px 7px; font-size: 12px; font-family: inherit; }
    textarea { resize: vertical; min-height: 70px; line-height: 1.45; }
    .x, .ib { background: none; border: none; color: #bbb; cursor: pointer; font-size: 15px; padding: 0 3px; }
    .x:hover, .ib:hover { color: #fff; }
    #body { flex: 1; overflow-y: auto; }
    .e { display: flex; gap: 6px; padding: 6px 10px; border-bottom: 1px solid #262626; cursor: pointer; align-items: flex-start; }
    .e:hover { background: #2a2a2a; }
    .e .n { color: #777; min-width: 22px; font-size: 11px; padding-top: 1px; }
    .e .s { flex: 1; color: #ddd; line-height: 1.35; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; word-break: break-word; }
    .e.a .s { color: #999; }
    .e .act { display: flex; gap: 2px; opacity: .35; }
    .e:hover .act, .e .act .on { opacity: 1; }
    .act span { cursor: pointer; padding: 0 2px; }
    .act .on { color: #fbbf24; }
    mark { background: #854d0e; color: #fff; border-radius: 2px; }
    .muted { color: #888; padding: 10px; font-size: 12px; line-height: 1.5; }
    .note { margin: 8px 10px; border: 1px solid #333; border-radius: 8px; padding: 7px 9px; background: #242424; }
    .note .q { border-left: 3px solid #ef4444; padding-left: 7px; color: #ccc; font-style: italic; white-space: pre-wrap; margin-bottom: 4px; cursor: pointer; }
    .note .tx { white-space: pre-wrap; color: #eee; }
    .note .meta { display: flex; gap: 6px; color: #777; font-size: 11px; margin-top: 4px; }
    .note .meta span:last-child { margin-left: auto; cursor: pointer; }
    label.c { display: flex; gap: 4px; align-items: center; color: #aaa; font-size: 11.5px; white-space: nowrap; }
    #selbtn { position: fixed; z-index: 2147483642; display: none; gap: 4px; background: #1f1f1f; border: 1px solid #444; border-radius: 8px; padding: 3px; box-shadow: 0 4px 14px rgba(0,0,0,.4); }
    #selbtn button { background: #2f2f2f; color: #eee; border: 1px solid #444; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 12px; }
    #selbtn button:hover { background: #3a3a3a; }
    #toast { position: fixed; z-index: 2147483643; display: none; background: #16a34a; color: #fff; border-radius: 8px; padding: 6px 12px; font-size: 12.5px; font-weight: 600; box-shadow: 0 4px 14px rgba(0,0,0,.4); }
  </style>
  <div id="tab"></div>
  <div id="mm">
    <div class="hd"><b id="title"></b><button class="x" id="close">×</button></div>
    <div class="tabs"><button data-v="toc"></button><button data-v="marks"></button><button data-v="notes"></button></div>
    <div class="tools" id="tools"></div>
    <div id="body"></div>
  </div>
  <div id="selbtn"><button id="selnote"></button><button id="selcopy"></button></div>
  <div id="toast"></div>`;

  const $ = s => root.querySelector(s);
  const mm = $("#mm"), body = $("#body"), tools = $("#tools");
  let convId = null, conv = null, msgs = [], order = new Map(), viewMode = "toc", q = "", showAnswers = false, loading = false;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const snippet = (s, n = 140) => String(s).replace(/\s+/g, " ").trim().slice(0, n);
  const bkKey = id => convId + ":" + id;
  const isBk = id => !!CK.store.data.bookmarks[bkKey(id)];

  function el(tag, props = {}, ...kids) {
    const e = document.createElement(tag);
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    for (const [k, v] of Object.entries(props)) {
      if (v == null) continue;
      if (k === "class") e.className = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (k in e) e[k] = v; else e.setAttribute(k, v);
    }
    return e;
  }

  const highlight = (text, query) => CK.highlight(text, query, "mark");

  async function load(force = false) {
    const id = CK.dom.convId();
    if (!id) { convId = null; conv = null; msgs = []; return; }
    if (!force && id === convId && conv) return;
    if (CK.lastConv && CK.lastConv.id === id && !force) setConv(id, CK.lastConv.conv);
    else {
      if (loading) return;
      loading = true;
      try { setConv(id, await CK.getConversation(id)); } catch (e) { msgs = []; } finally { loading = false; }
    }
  }

  function setConv(id, c) {
    convId = id; conv = c;
    msgs = CK.linearize(c);
    order = new Map(msgs.map((m, i) => [m.id, i]));
    if (mm.classList.contains("open")) render();
  }

  async function toggleBookmark(m) {
    const k = bkKey(m.id), b = CK.store.data.bookmarks;
    if (b[k]) delete b[k];
    else b[k] = { conv: convId, msg: m.id, convTitle: conv?.title || "", snippet: snippet(m.text, 200), role: m.role, time: m.time, added: Date.now() };
    await CK.store.save("bookmarks");
  }

  function entry(m, i) {
    const bk = isBk(m.id);
    return el("div", { class: "e" + (m.role === "assistant" ? " a" : ""), onclick: () => CK.dom.scrollToMessage(m.id, order) },
      el("span", { class: "n" }, m.role === "user" ? (i + 1) + "." : "↳"),
      el("span", { class: "s" }, highlight(snippet(m.text, 220), q)),
      el("span", { class: "act" },
        el("span", { class: bk ? "on" : "", title: t("mm.bookmark"), onclick: e => { e.stopPropagation(); toggleBookmark(m); } }, bk ? "🔖" : "🏷"),
        m.role === "user" ? el("span", { title: t("mm.savePrompt"), onclick: e => { e.stopPropagation(); CK.prompts.addFromText(m.text); } }, "💾") : null));
  }

  function render() {
    $("#title").textContent = conv?.title || t("mm.title");
    root.querySelectorAll(".tabs button").forEach(b => { b.classList.toggle("on", b.dataset.v === viewMode); b.textContent = t("mm.view." + b.dataset.v); });
    tools.replaceChildren();
    body.replaceChildren();
    if (!convId) { body.append(el("div", { class: "muted" }, t("mm.noChat"))); return; }
    if (viewMode === "toc") {
      const s = el("input", { type: "search", placeholder: t("mm.search"), value: q });
      s.addEventListener("input", e => { q = e.target.value; drawToc(); });
      tools.append(s, el("label", { class: "c" }, el("input", { type: "checkbox", checked: showAnswers, onchange: e => { showAnswers = e.target.checked; drawToc(); } }), t("mm.answers")),
        el("button", { class: "ib", title: t("ui.refreshTip"), onclick: () => load(true) }, "↻"));
      drawToc();
    } else if (viewMode === "marks") {
      const list = Object.values(CK.store.data.bookmarks).filter(b => b.conv === convId);
      if (!list.length) body.append(el("div", { class: "muted" }, t("mm.noMarks")));
      for (const b of list.sort((a, c) => (order.get(a.msg) ?? 0) - (order.get(c.msg) ?? 0))) {
        body.append(el("div", { class: "e", onclick: () => CK.dom.scrollToMessage(b.msg, order) },
          el("span", { class: "n" }, "🔖"), el("span", { class: "s" }, b.snippet),
          el("span", { class: "act" }, el("span", { title: t("ui.delete"), onclick: async e => { e.stopPropagation(); delete CK.store.data.bookmarks[bkKey(b.msg)]; await CK.store.save("bookmarks"); } }, "✕"))));
      }
    } else {
      const ta = el("textarea", { placeholder: t("mm.chatNotePh"), value: CK.store.data.chatNotes[convId] || "" });
      let timer;
      ta.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          if (ta.value.trim()) CK.store.data.chatNotes[convId] = ta.value; else delete CK.store.data.chatNotes[convId];
          await CK.store.save("chatNotes");
        }, 500);
      });
      body.append(el("div", { style: "padding:8px 10px" }, el("div", { class: "muted", style: "padding:0 0 4px" }, t("mm.chatNote")), ta));
      const notes = CK.store.data.notes.filter(n => n.conv === convId);
      body.append(el("div", { class: "muted", style: "padding:6px 10px 0" }, notes.length ? t("mm.selNotes") : t("mm.selHint")));
      for (const n of notes) body.append(noteCard(n));
    }
  }

  function noteCard(n) {
    return el("div", { class: "note" },
      n.quote ? el("div", { class: "q", onclick: () => n.msg && CK.dom.scrollToMessage(n.msg, order) }, "„" + n.quote + "”") : null,
      el("div", { class: "tx" }, n.text),
      el("div", { class: "meta" }, el("span", {}, CK.fmtDate(n.added, true)),
        el("span", { title: t("ui.delete"), onclick: async () => { CK.store.data.notes = CK.store.data.notes.filter(x => x.id !== n.id); await CK.store.save("notes"); } }, "✕")));
  }

  function drawToc() {
    body.replaceChildren();
    const ql = q.trim().toLowerCase();
    let i = 0, shown = 0;
    for (const m of msgs) {
      const idx = m.role === "user" ? i++ : i - 1;
      if (m.role === "assistant" && !showAnswers && !ql) continue;
      if (ql && !ql.split(/\s+/).every(w => m.text.toLowerCase().includes(w))) continue;
      body.append(entry(m, idx)); shown++;
    }
    if (!shown) body.append(el("div", { class: "muted" }, ql ? t("ui.noResults") : msgs.length ? t("mm.onlyAnswers") : t("ui.loading")));
    else if (ql) body.prepend(el("div", { class: "muted", style: "padding:6px 10px" }, t("mm.found", { n: shown })));
  }

  // ---------- notatka / zakładka z zaznaczenia ----------
  let selInfo = null, selRect = null;
  // Napisy ustawiamy od razu (wcześniej dopiero po otwarciu minimapy — przyciski były puste).
  function labelSel() {
    $("#selnote").textContent = "📝 " + t("mm.addNote");
    $("#selcopy").textContent = "🔖 " + t("mm.bookmarkSel");
  }
  function toast(msg) {
    const el = $("#toast");
    el.textContent = "✓ " + msg;
    const r = selRect || { left: window.innerWidth / 2, bottom: 80, width: 0 };
    el.style.left = Math.max(8, Math.min(window.innerWidth - 220, r.left + r.width / 2 - 60)) + "px";
    el.style.top = Math.min(window.innerHeight - 50, r.bottom + 10) + "px";
    el.style.display = "block";
    clearTimeout(toast._t); toast._t = setTimeout(() => { el.style.display = "none"; }, 1800);
  }
  function onSelection() {
    const btn = $("#selbtn");
    const s = document.getSelection();
    if (!s || s.isCollapsed || !CK.dom.convId()) { btn.style.display = "none"; return; }
    const text = s.toString().trim();
    if (text.length < 3) { btn.style.display = "none"; return; }
    const node = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement);
    const msg = node && CK.dom.messages().find(m => m.el.contains(node));
    if (!msg) { btn.style.display = "none"; return; }
    const r = selRect = s.getRangeAt(0).getBoundingClientRect();
    selInfo = { text: text.slice(0, 1200), msg: msg.ids.find(id => order.has(id)) || msg.id, role: msg.role };
    if (!convId || convId !== CK.dom.convId()) load(); // dociągnij rozmowę, jeśli minimapa jeszcze jej nie ma
    btn.style.display = "flex";
    // POD zaznaczeniem — nad nim ChatGPT pokazuje własne okienko „Zapytaj ChatGPT”.
    const below = r.bottom + 10, fitsBelow = below + 44 < window.innerHeight;
    btn.style.left = Math.max(8, Math.min(window.innerWidth - 240, r.left + r.width / 2 - 100)) + "px";
    btn.style.top = (fitsBelow ? below : Math.max(8, r.top - 90)) + "px";
  }
  document.addEventListener("mouseup", () => setTimeout(onSelection, 10));
  document.addEventListener("scroll", () => { $("#selbtn").style.display = "none"; }, true);

  $("#selnote").addEventListener("mousedown", e => e.preventDefault());
  $("#selcopy").addEventListener("mousedown", e => e.preventDefault());
  $("#selnote").addEventListener("click", async () => {
    $("#selbtn").style.display = "none";
    if (!selInfo) return;
    const info = selInfo;
    const ui = CK.ui;
    const ta = ui.el("textarea", { rows: 4 });
    const text = await ui.modal(t("mm.addNote"), () => ui.el("div", { class: "form" }, ui.el("div", { class: "quote" }, "„" + info.text.slice(0, 400) + "”"), ta),
      [{ label: t("ui.cancel"), result: null }, { label: t("ui.save"), cls: "primary", value: () => ta.value.trim() || false }]);
    if (!text) return;
    await load();
    CK.store.data.notes.unshift({ id: CK.uid("n"), conv: convId || CK.dom.convId(), convTitle: conv?.title || "", msg: info.msg, quote: info.text, text, added: Date.now() });
    await CK.store.save("notes");
    toast(t("mm.noteSaved"));
  });
  $("#selcopy").addEventListener("click", async () => {
    $("#selbtn").style.display = "none";
    if (!selInfo) return;
    const info = selInfo;
    await load();
    const m = msgs.find(x => x.id === info.msg) || { id: info.msg, text: info.text, role: info.role };
    if (!isBk(m.id)) await toggleBookmark(m);
    toast(t("mm.bookmarkSaved"));
  });

  // ---------- sterowanie ----------
  function visible() { return CK.store.data.settings.minimap !== false && !!CK.dom.convId(); }
  function applyVisibility() {
    const v = visible();
    $("#tab").style.display = v && !mm.classList.contains("open") ? "block" : "none";
    if (!v) mm.classList.remove("open");
    $("#tab").textContent = "☰ " + t("mm.tab");
    $("#tab").title = t("mm.tabTip");
  }
  async function openMm(open) {
    mm.classList.toggle("open", open);
    applyVisibility();
    if (open) { await load(); render(); }
  }
  $("#tab").addEventListener("click", () => openMm(true));
  $("#close").addEventListener("click", () => openMm(false));
  root.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => { viewMode = b.dataset.v; render(); }));

  CK.minimap = { open: () => openMm(true), toggle: () => openMm(!mm.classList.contains("open")) };

  let lastPath = location.pathname;
  CK.ready.then(() => {
    labelSel();
    CK.store.onChange(labelSel);
    applyVisibility();
    CK.convBus.add(c => { const id = CK.dom.convId(); if (id && (id === convId || !conv)) setConv(id, c); });
    CK.store.onChange(() => { applyVisibility(); if (mm.classList.contains("open") && !root.activeElement?.matches?.("textarea, input")) render(); });
    setInterval(() => {
      if (location.pathname === lastPath) return;
      lastPath = location.pathname;
      conv = null; convId = null; msgs = []; q = "";
      applyVisibility();
      if (mm.classList.contains("open")) load().then(render);
    }, 1000);
    document.addEventListener("keydown", e => { if (e.altKey && e.shiftKey && e.code === "KeyM") { e.preventDefault(); CK.minimap.toggle(); } }, true);
  });
})();
