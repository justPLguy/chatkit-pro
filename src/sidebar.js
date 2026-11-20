// ChatKit Pro — gwiazdki i kolory folderów w pasku bocznym ChatGPT.
// Tylko atrybuty + generowany CSS (::before / ::after), bez dokładania elementów do Reacta.
(() => {
  const CK = window.CK;
  const style = document.createElement("style");
  style.id = "chatkit-pro-sidebar";

  function buildCss() {
    const rules = [
      `a[data-ck-star]::after { content: "★"; color: #fbbf24; margin-left: 6px; font-size: 12px; flex-shrink: 0; }`,
      `a[data-ck-folder]::before { content: ""; display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 7px; flex-shrink: 0; background: var(--ck-fc, #888); }`
    ];
    for (const f of CK.store.data.folders) {
      const safeId = String(f.id).replace(/[^a-z0-9_-]/gi, "");
      const color = /^#[0-9a-f]{3,8}$/i.test(f.color) ? f.color : "#888";
      rules.push(`a[data-ck-folder="${safeId}"]::before { background: ${color}; }`);
      rules.push(`a[data-ck-folder="${safeId}"] { --ck-fc: ${color}; }`);
    }
    return rules.join("\n");
  }

  // Nowe nazwy po masowej zmianie: podmieniamy sam tekst w pasku bocznym (bez przeładowania strony),
  // a przez 3 minuty pilnujemy go, gdyby ChatGPT przerysował listę ze starej pamięci podręcznej.
  const renamed = new Map(); // id -> { title, until }
  function textNodeOf(a) {
    const want = a.textContent.trim();
    const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
    let best = null, n;
    while ((n = walker.nextNode())) if (n.nodeValue.trim() && (!best || n.nodeValue.trim().length > best.nodeValue.trim().length)) best = n;
    return best && want ? best : null;
  }
  function applyRenames() {
    if (!renamed.size) return;
    const now = Date.now();
    for (const [id, r] of renamed) if (r.until < now) renamed.delete(id);
    document.querySelectorAll('nav a[href*="/c/"]').forEach(a => {
      const m = a.getAttribute("href").match(/\/c\/([0-9a-f-]{36})/i);
      const r = m && renamed.get(m[1]);
      if (!r) return;
      const tn = textNodeOf(a);
      if (tn && tn.nodeValue.trim() !== r.title) tn.nodeValue = r.title;
      if (a.title && a.title !== r.title) a.title = r.title;
    });
    const cur = CK.dom && CK.dom.convId(), rc = cur && renamed.get(cur);
    if (rc && !document.title.startsWith(rc.title)) document.title = rc.title;
  }
  // Osobny obserwator paska bocznego (także zmiany samego tekstu), działa tylko gdy są świeże zmiany nazw.
  let navObs = null;
  CK.sidebarRename = (id, title) => {
    renamed.set(id, { title, until: Date.now() + 180000 });
    if (!navObs) navObs = new MutationObserver(() => { if (renamed.size) applyRenames(); else { navObs.disconnect(); navObs = null; } });
    else navObs.disconnect();
    const nav = document.querySelector("nav") || document.body;
    navObs.observe(nav, { childList: true, subtree: true, characterData: true });
    applyRenames();
  };
  // Usunięte / zarchiwizowane z panelu: od razu chowamy je w pasku bocznym (bez F5). Pilnujemy 10 min,
  // gdyby ChatGPT przerysował listę ze swojej pamięci podręcznej; po tym czasie i tak ma już nową listę.
  const goneCss = "[data-ck-gone]{display:none !important}\n";
  const gone = new Map(); // id -> until
  function applyGone() {
    if (!gone.size) return;
    const now = Date.now();
    for (const [id, until] of gone) if (until < now) gone.delete(id);
    document.querySelectorAll('nav a[href*="/c/"]').forEach(a => {
      const m = a.getAttribute("href").match(/\/c\/([0-9a-f-]{36})/i);
      const hide = !!(m && gone.has(m[1]));
      // element listy: <li> albo najwyższy rodzic, który zawiera tylko ten jeden link
      let box = a.closest("li");
      if (!box) { box = a; while (box.parentElement && box.parentElement.tagName !== "NAV" && box.parentElement.querySelectorAll('a[href*="/c/"]').length === 1) box = box.parentElement; }
      if (hide) { if (!box.hasAttribute("data-ck-gone")) box.setAttribute("data-ck-gone", ""); }
      else if (box.hasAttribute("data-ck-gone")) box.removeAttribute("data-ck-gone");
    });
  }
  CK.sidebarGone = ids => {
    if (!ids.length) return;
    const until = Date.now() + 600000;
    for (const id of ids) gone.set(id, until);
    if (!style.isConnected) CK.keepAttached(style);
    style.textContent = goneCss + (CK.store.data.settings.sidebarMarks !== false && CK.on() ? buildCss() : "");
    applyGone();
  };

  // Poproś ChatGPT o odświeżenie listy (jak po powrocie do karty).
  CK.nudgeChatGPT = () => {
    try { document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("focus")); } catch {}
  };

  function paint() {
    applyRenames(); applyGone();
    const on = CK.store.data.settings.sidebarMarks !== false && CK.on();
    if (!style.isConnected) CK.keepAttached(style);
    const css = goneCss + (on ? buildCss() : "");
    if (style.textContent !== css) style.textContent = css;
    const { stars, chatFolder } = CK.store.data;
    document.querySelectorAll('nav a[href*="/c/"]').forEach(a => {
      const m = a.getAttribute("href").match(/\/c\/([0-9a-f-]{36})/i);
      if (!m) return;
      const id = m[1];
      const star = on && stars[id], folder = on && chatFolder[id];
      if (star) { if (!a.hasAttribute("data-ck-star")) a.setAttribute("data-ck-star", ""); } else a.removeAttribute("data-ck-star");
      if (folder) { if (a.getAttribute("data-ck-folder") !== folder) a.setAttribute("data-ck-folder", folder); } else a.removeAttribute("data-ck-folder");
    });
  }

  let timer = null;
  CK.ready.then(() => {
    paint();
    CK.store.onChange(paint);
    new MutationObserver(() => { if (renamed.size) applyRenames(); if (gone.size) applyGone(); clearTimeout(timer); timer = setTimeout(paint, 400); })
      .observe(document.body, { childList: true, subtree: true });
  });
})();
