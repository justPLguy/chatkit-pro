// ChatKit Pro — szybki skok (od 1.3.0): Alt+Shift+J albo ⌕ w panelu.
// Szuka po tytułach czatów, folderach, tagach i promptach — tylko w danych, które wtyczka już ma
// (lista z panelu + pasek boczny ChatGPT). Jedyne zapytanie: pierwsza strona listy czatów, gdy panel jej jeszcze nie wczytał.
(() => {
  const CK = window.CK;
  const t = (...a) => CK.t(...a);
  // bez polskich znaków i wielkości liter: „zolw” znajdzie „Żółw”
  const fold = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");

  function chats() {
    const map = new Map();
    for (const i of (CK.ui && CK.ui.chatItems()) || []) map.set(i.key, { id: i.key, title: i.title, date: i.date });
    document.querySelectorAll('nav a[href*="/c/"]').forEach(a => {
      const m = a.getAttribute("href").match(/\/c\/([0-9a-f-]{36})/i);
      if (m && !map.has(m[1])) map.set(m[1], { id: m[1], title: a.textContent.trim() || t("untitled") });
    });
    for (const b of Object.values(CK.store.data.bookmarks || {})) if (b.conv && !map.has(b.conv) && b.convTitle) map.set(b.conv, { id: b.conv, title: b.convTitle });
    return [...map.values()];
  }

  // Ocena dopasowania: wszystkie słowa zapytania muszą wystąpić; wyżej początek tytułu i początek słowa.
  function score(text, words) {
    const f = fold(text); let s = 0;
    for (const w of words) {
      const i = f.indexOf(w);
      if (i < 0) return -1;
      s += i === 0 ? 30 : /[\s\-_/.,:([]/.test(f[i - 1]) ? 15 : 5;
    }
    return s;
  }

  function results(q) {
    const words = fold(q).split(/\s+/).filter(Boolean);
    const d = CK.store.data, out = [];
    const tagQ = words.filter(w => w.startsWith("#")).map(w => w.slice(1)).filter(Boolean);
    const plain = words.filter(w => !w.startsWith("#"));
    for (const c of chats()) {
      const tags = CK.tags.of(c.id);
      if (tagQ.length && !tagQ.every(x => tags.some(g => g.startsWith(x)))) continue;
      const fo = d.chatFolder[c.id] && CK.folders.get(d.chatFolder[c.id]);
      const sc = plain.length ? score(c.title + " " + (fo ? fo.name : "") + " " + tags.join(" "), plain) : 1;
      if (sc < 0) continue;
      out.push({ kind: "chat", id: c.id, label: c.title, sub: [fo ? "📁 " + fo.name : "", tags.map(g => "#" + g).join(" ")].filter(Boolean).join("  "),
        star: !!d.stars[c.id], score: sc + (d.stars[c.id] ? 8 : 0) + (CK.dom.convId() === c.id ? -20 : 0), date: CK.toDate(c.date)?.getTime() || 0 });
    }
    if (!tagQ.length) {
      for (const f of CK.folders.flat()) { const sc = plain.length ? score(f.name, plain) : -1; if (sc >= 0) out.push({ kind: "folder", id: f.id, label: f.name, sub: t("pal.folder", { n: CK.folders.chatsIn(f.id).length }), score: sc + 4 }); }
      for (const p of (CK.prompts ? CK.prompts.list() : [])) { const sc = plain.length ? score(p.title + " " + (p.cat || "") + " " + (p.tags || []).join(" "), plain) : -1; if (sc >= 0) out.push({ kind: "prompt", id: p.id, p, label: p.title, sub: t("pal.prompt"), score: sc + (p.fav ? 6 : 0) }); }
    }
    for (const [g, n] of CK.tags.all()) {
      const sc = tagQ.length ? (tagQ.some(x => g.startsWith(x)) ? 40 : -1) : plain.length ? score(g, plain) : -1;
      if (sc >= 0) out.push({ kind: "tag", id: g, label: "#" + g, sub: t("pal.tag", { n }), score: sc + 3 });
    }
    // bez zapytania: najnowsze czaty
    return out.sort((a, b) => (b.score - a.score) || ((b.date || 0) - (a.date || 0))).slice(0, 60);
  }

  const ICON = { chat: "💬", folder: "📁", prompt: "📚", tag: "#" };

  async function go(r, e) {
    if (r.kind === "chat") CK.openChat(r.id, e);
    else if (r.kind === "folder") CK.ui.showFolder(r.id);
    else if (r.kind === "tag") CK.ui.showTag(r.id);
    else if (r.kind === "prompt") await CK.prompts.use(r.p);
  }

  let openNow = false;
  CK.palette = {
    results,
    async open() {
      if (openNow || !CK.ui || !CK.on()) return;
      openNow = true;
      const ui = CK.ui, el = ui.el;
      let vis = [], idx = 0, chosen = null, closeFn, ev = null;
      const q = el("input", { type: "search", placeholder: t("pal.ph"), style: "width:100%" });
      const listBox = el("div", { class: "pal" });
      const hint = el("p", { class: "muted", style: "margin:8px 0 0" }, t("pal.hint"));
      const draw = () => {
        vis = results(q.value); idx = Math.min(idx, Math.max(0, vis.length - 1));
        listBox.replaceChildren(...vis.map((r, i) => {
          const row = el("div", { class: "palrow" + (i === idx ? " on" : ""), onclick: e => { chosen = r; ev = e; closeFn(true); } },
            el("span", { class: "pi" }, ICON[r.kind]), el("span", { class: "pl" }, (r.star ? "★ " : "") + r.label), el("span", { class: "ps" }, r.sub || ""));
          row.addEventListener("mousemove", () => { if (idx !== i) { idx = i; mark(); } });
          return row;
        }));
        if (!vis.length) listBox.append(el("p", { class: "muted" }, t("pal.none")));
      };
      const mark = () => { [...listBox.children].forEach((c, i) => c.classList.toggle("on", i === idx)); listBox.children[idx]?.scrollIntoView({ block: "nearest" }); };
      q.addEventListener("input", () => { idx = 0; draw(); });
      q.addEventListener("keydown", e => {
        if (e.key === "ArrowDown") { e.preventDefault(); idx = Math.min(vis.length - 1, idx + 1); mark(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); idx = Math.max(0, idx - 1); mark(); }
        else if (e.key === "Enter" && vis[idx]) { e.preventDefault(); chosen = vis[idx]; ev = e; closeFn(true); }
        else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeFn(null); }
      });
      const done = ui.modal("⌕ " + t("pal.title"), close => { closeFn = close; draw(); return el("div", {}, q, listBox, hint); }, []);
      // pierwsza strona listy czatów, jeśli panel jeszcze jej nie miał (jedno zapytanie)
      ui.ensureChats().then(() => { if (openNow) draw(); }).catch(() => {});
      await done;
      openNow = false;
      if (chosen) await go(chosen, ev && (ev.ctrlKey || ev.metaKey) ? { ctrlKey: true } : null);
    }
  };

  CK.ready.then(() => {
    document.addEventListener("keydown", e => {
      if (CK.on() && e.altKey && e.shiftKey && e.code === "KeyJ") { e.preventDefault(); CK.palette.open(); }
    }, true);
  });
})();
