// ChatKit Pro — dodatkowe zakładki panelu: Zakładki i notatki, Szukaj w treści, Sprzątanie (reguły), Statystyki.
(() => {
  const CK = window.CK;
  const t = (...a) => CK.t(...a);

  // Otwórz czat i przewiń do wiadomości (po przeładowaniu obsłuży to minimapa).
  CK.goto = (conv, msg) => {
    try { localStorage.setItem("ckp.goto", JSON.stringify({ conv, msg, at: Date.now() })); } catch {}
    if (CK.dom.convId() === conv && msg) { CK.dom.scrollToMessage(msg); return; }
    location.href = "/c/" + conv;
  };

  // =================== Zakładki i notatki ===================
  const nState = { view: "bookmarks", q: "" };
  function renderNotes(box, ui) {
    const { el, button, select } = ui;
    const d = CK.store.data;
    const q = el("input", { type: "search", placeholder: t("ui.searchName"), value: nState.q });
    const listBox = el("div");
    const match = s => !nState.q || String(s).toLowerCase().includes(nState.q.toLowerCase());
    const draw = () => {
      listBox.replaceChildren();
      if (nState.view === "bookmarks") {
        const arr = Object.entries(d.bookmarks).map(([k, b]) => ({ k, ...b })).filter(b => match(b.snippet + " " + b.convTitle)).sort((a, b) => b.added - a.added);
        for (const b of arr) listBox.append(el("div", { class: "card" },
          el("div", { class: "h" }, el("b", {}, b.convTitle || t("untitled")), el("span", { class: "muted" }, CK.fmtDate(b.time || b.added, true)),
            button("↗ " + t("ui.open"), () => CK.goto(b.conv, b.msg)),
            el("span", { class: "ic", title: t("ui.delete"), onclick: async () => { delete d.bookmarks[b.k]; await CK.store.save("bookmarks"); } }, "✕")),
          el("div", { class: "body" }, (b.role === "user" ? "👤 " : "🤖 ") + b.snippet)));
        if (!arr.length) listBox.append(el("div", { class: "empty" }, t("nt.noBookmarks")));
      } else if (nState.view === "notes") {
        const arr = d.notes.filter(n => match(n.text + " " + n.quote + " " + n.convTitle));
        for (const n of arr) listBox.append(el("div", { class: "card" },
          el("div", { class: "h" }, el("b", {}, n.convTitle || t("untitled")), el("span", { class: "muted" }, CK.fmtDate(n.added, true)),
            button("↗ " + t("ui.open"), () => CK.goto(n.conv, n.msg)),
            el("span", { class: "ic", title: t("ui.delete"), onclick: async () => { d.notes = d.notes.filter(x => x.id !== n.id); await CK.store.save("notes"); } }, "✕")),
          n.quote ? el("div", { class: "quote" }, "„" + n.quote + "”") : null,
          el("div", { class: "body", style: "color:#eee" }, n.text)));
        if (!arr.length) listBox.append(el("div", { class: "empty" }, t("nt.noNotes")));
      } else {
        const titles = new Map((CK.sources.chats.items || []).map(c => [c.key, c.title]));
        const arr = Object.entries(d.chatNotes).filter(([id, txt]) => match(txt + " " + (titles.get(id) || "")));
        for (const [id, txt] of arr) listBox.append(el("div", { class: "card" },
          el("div", { class: "h" }, el("b", {}, titles.get(id) || id.slice(0, 8) + "…"), button("↗ " + t("ui.open"), () => CK.goto(id))),
          el("div", { class: "body", style: "color:#eee" }, txt)));
        if (!arr.length) listBox.append(el("div", { class: "empty" }, t("nt.noChatNotes")));
      }
    };
    q.addEventListener("input", e => { nState.q = e.target.value; draw(); });
    const exportMd = () => {
      const lines = ["# ChatKit Pro — " + t("tab.notes"), ""];
      lines.push("## " + t("nt.bookmarks"), "");
      for (const b of Object.values(d.bookmarks)) lines.push(`- **${b.convTitle}** — ${b.snippet}  \n  https://chatgpt.com/c/${b.conv}`);
      lines.push("", "## " + t("nt.notes"), "");
      for (const n of d.notes) lines.push(`### ${n.convTitle} (${CK.fmtDate(n.added, true)})`, n.quote ? "> " + n.quote.replace(/\n/g, "\n> ") : "", "", n.text, "", `https://chatgpt.com/c/${n.conv}`, "");
      lines.push("## " + t("nt.chatNotes"), "");
      for (const [id, txt] of Object.entries(d.chatNotes)) lines.push(`### https://chatgpt.com/c/${id}`, "", txt, "");
      CK.download(`chatkit-notes-${new Date().toISOString().slice(0, 10)}.md`, lines.join("\n"), "text/markdown");
    };
    box.append(el("div", { class: "pane" },
      el("div", { class: "rowb", style: "margin:0 0 10px" },
        select([["bookmarks", `🔖 ${t("nt.bookmarks")} (${Object.keys(d.bookmarks).length})`], ["notes", `📝 ${t("nt.notes")} (${d.notes.length})`], ["chat", `🗒 ${t("nt.chatNotes")} (${Object.keys(d.chatNotes).length})`]], nState.view, v => { nState.view = v; draw(); }),
        q, button("⬇ Markdown", exportMd)),
      el("p", { class: "muted", style: "margin:0 0 10px" }, t("nt.howTo")),
      listBox));
    draw();
  }

  // =================== Szukaj w treści ===================
  const sState = { q: "", results: null, building: false, stop: false };
  function renderSearch(box, ui) {
    const { el, button } = ui;
    const statsLine = el("p", { class: "muted" }, "…");
    CK.search.stats().then(s => { statsLine.textContent = t("se.stats", { n: s.count, date: s.last ? CK.fmtDate(s.last, true) : "—" }); });
    const q = el("input", { type: "search", placeholder: t("se.placeholder"), value: sState.q });
    const res = el("div");
    const drawResults = () => {
      res.replaceChildren();
      if (!sState.results) return;
      if (!sState.results.length) { res.append(el("div", { class: "empty" }, t("ui.noResults"))); return; }
      res.append(el("p", { class: "muted" }, t("se.found", { n: sState.results.length })));
      const terms = sState.q.toLowerCase().split(/\s+/).filter(w => w.length > 1).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const re = terms.length ? new RegExp("(" + terms.join("|") + ")", "gi") : null;
      for (const r of sState.results) {
        const sn = el("div", { class: "body" });
        sn.innerHTML = CK.esc(r.snippet).replace(re || /$^/, '<span class="hl">$1</span>');
        res.append(el("div", { class: "card" },
          el("div", { class: "h" }, el("b", {}, r.title), el("span", { class: "muted" }, CK.fmtDate(r.updated)), button("↗ " + t("ui.open"), () => CK.goto(r.id))), sn));
      }
    };
    const run = async () => { sState.q = q.value; sState.results = await CK.search.query(sState.q); drawResults(); };
    q.addEventListener("keydown", e => { if (e.key === "Enter") run(); });
    const build = async () => {
      if (sState.building) { sState.stop = true; return; }
      sState.building = true; sState.stop = false; ui.rerender();
      try {
        const src = CK.sources.chats;
        await src.loadEverything(n => ui.setMsg(t("ui.loadingN", { n })));
        const r = await CK.search.build(src.items, (d, a) => ui.setMsg(t("se.indexing", { d, a })), () => sState.stop);
        ui.setMsg(t("se.built", { n: r.indexed, skipped: r.skipped }));
      } catch (e) { ui.setMsg(t("msg.error", { e: e.message })); }
      finally { sState.building = false; ui.rerender(); }
    };
    box.append(el("div", { class: "pane" },
      el("div", { class: "rowb", style: "margin:0 0 6px" }, q, button("🔍 " + t("se.search"), run, { class: "primary" })),
      statsLine,
      el("div", { class: "rowb", style: "margin:4px 0 12px" },
        button(sState.building ? "⏹ " + t("se.stop") : "⟳ " + t("se.build"), build),
        button(t("se.clear"), async () => { if (confirm(t("se.confirmClear"))) { await CK.search.clear(); ui.rerender(); } })),
      el("p", { class: "muted", style: "margin:0 0 10px" }, t("se.howTo")),
      res));
    drawResults();
  }

  // =================== Sprzątanie (reguły) ===================
  const PRESETS = () => [
    { name: t("cl.preset1"), target: "chats", olderDays: 90, keepStarred: true, keepFoldered: true, action: "archive" },
    { name: t("cl.preset2"), target: "files", olderDays: 30, onlyAI: true, action: "delete" }
  ];

  function matchesRule(r) {
    const lim = Date.now() - (+r.olderDays || 0) * 864e5;
    const old = i => { const d = CK.toDate(i.date); return d && d.getTime() < lim; };
    if (r.target === "files") return CK.sources.lib.items.filter(i => old(i) && (!r.onlyAI || i.generated) && (!r.onlyOutsideProjects || !i.project));
    const { stars, chatFolder } = CK.store.data;
    return CK.sources.chats.items.filter(i => old(i) && !(r.keepStarred && stars[i.key]) && !(r.keepFoldered && chatFolder[i.key]));
  }

  async function previewRule(r, ui, run = false) {
    const tab = r.target === "files" ? "lib" : "chats";
    const src = CK.sources[tab];
    await ui.safe(async () => { await src.loadEverything(n => ui.setMsg(t("ui.loadingN", { n }))); });
    const hits = matchesRule(r);
    if (!hits.length) { ui.setMsg(t("cl.nothing", { name: r.name })); return; }
    ui.sel[tab].clear(); hits.forEach(i => ui.sel[tab].add(i.key)); ui.saveSel(tab);
    if (run) {
      if (tab === "lib") await ui.libDelete(hits.map(i => i.key));
      else await ui.chatBulk(r.action === "archive" ? "archive" : "delete", hits.map(i => i.key), "chats");
    } else {
      ui.switchTab(tab);
      ui.setMsg(t("cl.selected", { n: hits.length, name: r.name }));
    }
  }

  async function editRule(r = {}, ui) {
    const { el, select } = ui;
    const f = {
      name: el("input", { type: "text", value: r.name || "" }),
      target: select([["chats", t("cl.tChats")], ["files", t("cl.tFiles")]], r.target || "chats", v => sync(v)),
      olderDays: el("input", { type: "number", min: 0, value: r.olderDays ?? 90 }),
      keepStarred: el("input", { type: "checkbox", checked: r.keepStarred ?? true }),
      keepFoldered: el("input", { type: "checkbox", checked: r.keepFoldered ?? true }),
      onlyAI: el("input", { type: "checkbox", checked: r.onlyAI ?? false }),
      onlyOutsideProjects: el("input", { type: "checkbox", checked: r.onlyOutsideProjects ?? false }),
      action: select([["archive", t("cl.aArchive")], ["delete", t("cl.aDelete")]], r.action || "archive", () => {})
    };
    const chatOpts = el("div", { class: "form" },
      el("label", { class: "chk" }, f.keepStarred, t("cl.keepStarred")), el("label", { class: "chk" }, f.keepFoldered, t("cl.keepFoldered")),
      el("label", {}, t("cl.action"), f.action));
    const fileOpts = el("div", { class: "form" },
      el("label", { class: "chk" }, f.onlyAI, t("cl.onlyAI")), el("label", { class: "chk" }, f.onlyOutsideProjects, t("cl.onlyOutside")),
      el("p", { class: "muted" }, t("cl.filesDelete")));
    function sync(v) { chatOpts.style.display = v === "chats" ? "" : "none"; fileOpts.style.display = v === "files" ? "" : "none"; }
    sync(r.target || "chats");
    const res = await ui.modal(r.id ? t("cl.edit") : t("cl.new"), () => el("div", { class: "form" },
      el("label", {}, t("cl.name"), f.name), el("label", {}, t("cl.target"), f.target),
      el("label", {}, t("cl.older"), f.olderDays), chatOpts, fileOpts),
      [{ label: t("ui.cancel"), result: null }, { label: t("ui.save"), cls: "primary", value: () => ({
        name: f.name.value.trim() || t("cl.unnamed"), target: f.target.value, olderDays: +f.olderDays.value || 0,
        keepStarred: f.keepStarred.checked, keepFoldered: f.keepFoldered.checked, onlyAI: f.onlyAI.checked,
        onlyOutsideProjects: f.onlyOutsideProjects.checked, action: f.target.value === "files" ? "delete" : f.action.value }) }]);
    if (!res) return;
    const rules = CK.store.data.rules;
    if (r.id) Object.assign(rules.find(x => x.id === r.id), res); else rules.push({ id: CK.uid("r"), ...res });
    await CK.store.save("rules");
  }

  const describe = r => r.target === "files"
    ? t("cl.descFiles", { d: r.olderDays }) + (r.onlyAI ? ", " + t("cl.onlyAI").toLowerCase() : "") + (r.onlyOutsideProjects ? ", " + t("cl.onlyOutside").toLowerCase() : "") + " → " + t("cl.aDelete").toLowerCase()
    : t("cl.descChats", { d: r.olderDays }) + (r.keepStarred ? ", " + t("cl.keepStarred").toLowerCase() : "") + (r.keepFoldered ? ", " + t("cl.keepFoldered").toLowerCase() : "") + " → " + (r.action === "archive" ? t("cl.aArchive") : t("cl.aDelete")).toLowerCase();

  function renderClean(box, ui) {
    const { el, button } = ui;
    const rules = CK.store.data.rules;
    const listBox = el("div");
    for (const r of rules) listBox.append(el("div", { class: "card" },
      el("div", { class: "h" }, el("b", {}, r.name),
        button("👁 " + t("cl.preview"), () => previewRule(r, ui)),
        button("▶ " + t("cl.run"), () => previewRule(r, ui, true), { class: "danger" }),
        el("span", { class: "ic", title: t("pr.edit"), onclick: () => editRule(r, ui) }, "✎"),
        el("span", { class: "ic", title: t("ui.delete"), onclick: async () => { CK.store.data.rules = rules.filter(x => x.id !== r.id); await CK.store.save("rules"); } }, "✕")),
      el("div", { class: "body" }, describe(r))));
    if (!rules.length) listBox.append(el("div", { class: "empty" }, t("cl.empty")));
    box.append(el("div", { class: "pane" },
      el("p", { class: "muted", style: "margin:0 0 10px" }, t("cl.howTo")),
      el("div", { class: "rowb", style: "margin:0 0 12px" },
        button("＋ " + t("cl.new"), () => editRule({}, ui), { class: "primary" }),
        button(t("cl.addPresets"), async () => { CK.store.data.rules.push(...PRESETS().map(p => ({ id: CK.uid("r"), ...p }))); await CK.store.save("rules"); })),
      listBox));
  }

  // =================== Statystyki ===================
  function renderStats(box, ui) {
    const { el, button } = ui;
    const d = CK.store.data, chats = CK.sources.chats, arch = CK.sources.archive, lib = CK.sources.lib;
    const kpi = (v, label) => el("div", { class: "kpi" }, el("b", {}, v), el("span", {}, label));
    const libSize = lib.items.reduce((s, i) => s + (i.size || 0), 0);
    const aiSize = lib.items.filter(i => i.generated).reduce((s, i) => s + (i.size || 0), 0);
    const pane = el("div", { class: "pane" },
      el("div", { class: "rowb", style: "margin:0 0 12px" },
        button("⟳ " + t("st.countAll"), async () => {
          await ui.safe(async () => {
            await chats.loadEverything(n => ui.setMsg(t("ui.loadingN", { n })));
            await arch.loadEverything();
            await lib.loadEverything(n => ui.setMsg(t("ui.loadingN", { n })));
          });
          ui.setMsg(t("st.counted"));
        }, { class: "primary" }),
        el("span", { class: "muted" }, chats.done && lib.done ? t("st.complete") : t("st.partial"))),
      el("div", { class: "kpis" },
        kpi(chats.total ?? chats.items.length, t("st.chats")),
        kpi(arch.done ? arch.items.length : (arch.total ?? "…"), t("st.archived")),
        kpi(Object.keys(d.stars).length, t("st.starred")),
        kpi(d.folders.length, t("st.folders")),
        kpi(lib.items.length + (lib.done ? "" : "+"), t("st.files")),
        kpi(CK.fmtSize(libSize) || "0 B", t("st.libSize")),
        kpi(CK.fmtSize(aiSize) || "0 B", t("st.aiSize")),
        kpi((d.prompts || []).length, t("st.prompts")),
        kpi(Object.keys(d.bookmarks).length + " / " + d.notes.length, t("st.marksNotes"))));

    // czaty wg miesięcy (ostatnie 12)
    const months = new Map();
    const now = new Date();
    for (let i = 11; i >= 0; i--) { const m = new Date(now.getFullYear(), now.getMonth() - i, 1); months.set(m.getFullYear() + "-" + String(m.getMonth() + 1).padStart(2, "0"), 0); }
    for (const c of chats.items) { const dt = CK.toDate(c.created || c.date); if (!dt) continue; const k = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0"); if (months.has(k)) months.set(k, months.get(k) + 1); }
    const max = Math.max(1, ...months.values());
    pane.append(el("h3", {}, t("st.perMonth")));
    for (const [k, v] of months) pane.append(el("div", { class: "barrow" }, el("span", { class: "muted" }, k), el("div", {}, el("div", { class: "bar", style: `width:${(v / max) * 100}%` })), el("span", {}, v)));

    if (lib.items.length) {
      pane.append(el("h3", {}, t("st.biggest")));
      const top = [...lib.items].sort((a, b) => b.size - a.size).slice(0, 10);
      const tmax = Math.max(1, top[0]?.size || 1);
      for (const f of top) pane.append(el("div", { class: "barrow", style: "grid-template-columns: 1fr 120px 64px" },
        el("span", { style: "overflow:hidden;white-space:nowrap;text-overflow:ellipsis" }, f.title), el("div", {}, el("div", { class: "bar", style: `width:${(f.size / tmax) * 100}%` })), el("span", {}, CK.fmtSize(f.size))));
    }
    if (d.folders.length) {
      pane.append(el("h3", {}, t("st.byFolder")));
      const rows = CK.folders.flat().map(f => [f, CK.folders.chatsIn(f.id).length]).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const fmax = Math.max(1, ...rows.map(r => r[1]));
      for (const [f, n] of rows) pane.append(el("div", { class: "barrow", style: "grid-template-columns: 1fr 120px 40px" },
        el("span", {}, "  ".repeat(f.depth) + f.name), el("div", {}, el("div", { class: "bar", style: `width:${(n / fmax) * 100}%;background:${f.color}` })), el("span", {}, n)));
    }
    box.append(pane);
  }

  CK.ready.then(() => {
    CK.ui.registerTab({ id: "notes", label: () => t("tab.notes"), render: renderNotes });
    CK.ui.registerTab({ id: "search", label: () => t("tab.search"), render: renderSearch });
    CK.ui.registerTab({ id: "clean", label: () => t("tab.clean"), render: renderClean });
    CK.ui.registerTab({ id: "stats", label: () => t("tab.stats"), render: renderStats });

    // Po przejściu z zakładki/notatki: przewiń do wiadomości.
    const tryGoto = async () => {
      let g = null; try { g = JSON.parse(localStorage.getItem("ckp.goto") || "null"); } catch {}
      if (!g || Date.now() - g.at > 60000 || g.conv !== CK.dom.convId() || !g.msg) return;
      localStorage.removeItem("ckp.goto");
      for (let i = 0; i < 20 && !CK.dom.messages().length; i++) await CK.sleep(500);
      let order = null;
      try { const conv = CK.lastConv?.id === g.conv ? CK.lastConv.conv : await CK.getConversation(g.conv); order = new Map(CK.linearize(conv).map((m, i) => [m.id, i])); } catch {}
      CK.dom.scrollToMessage(g.msg, order);
    };
    setTimeout(tryGoto, 1500);
  });
})();
