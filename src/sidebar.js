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
  // Poproś ChatGPT o odświeżenie listy (jak po powrocie do karty).
  CK.nudgeChatGPT = () => {
    try { document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("focus")); } catch {}
  };

  function paint() {
    applyRenames();
    const on = CK.store.data.settings.sidebarMarks !== false && CK.on();
    if (!style.isConnected) CK.keepAttached(style);
    style.textContent = on ? buildCss() : "";
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
    new MutationObserver(() => { if (renamed.size) applyRenames(); clearTimeout(timer); timer = setTimeout(paint, 400); })
      .observe(document.body, { childList: true, subtree: true });
  });
})();
