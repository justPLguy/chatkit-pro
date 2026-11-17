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

  function paint() {
    const on = CK.store.data.settings.sidebarMarks !== false;
    if (!style.isConnected) document.documentElement.appendChild(style);
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
    new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(paint, 400); })
      .observe(document.body, { childList: true, subtree: true });
  });
})();
