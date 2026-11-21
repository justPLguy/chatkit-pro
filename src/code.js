// ChatKit Pro — przycisk „Zapisz” przy blokach kodu w odpowiedziach.
// Przycisk żyje we własnym Shadow DOM (poza drzewem Reacta ChatGPT) i jest ustawiany nad blokiem, nad którym jest kursor.
(() => {
  const CK = window.CK;
  const t = (...a) => CK.t(...a);

  const host = document.createElement("div");
  host.id = "chatkit-pro-code";
  CK.keepAttached(host);
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    button { position: fixed; z-index: 2147483639; display: none; align-items: center; gap: 5px; background: #2a2a2a; color: #eee; border: 1px solid #4a4a4a;
      border-radius: 7px; padding: 4px 9px; font: 600 12px system-ui, -apple-system, Segoe UI, sans-serif; cursor: pointer; opacity: .9;
      box-shadow: 0 3px 12px rgba(0,0,0,.35); }
    button:hover { opacity: 1; background: #333; border-color: #ef4444; }
    button.ok { background: #16a34a; border-color: #16a34a; color: #fff; }`;
  const btn = document.createElement("button");
  btn.type = "button";
  root.append(style, btn);

  let pre = null, hideTimer = null;
  const enabled = () => CK.on() && CK.store.data.settings.codeSave !== false;

  // Blok kodu w treści czatu (nie w naszych panelach i nie w polu wiadomości).
  function codeBlockFrom(node) {
    const p = node && node.closest ? node.closest("pre") : null;
    if (!p || !p.closest("main") || p.closest("#prompt-textarea, form")) return null;
    return p.querySelector("code") ? p : null;
  }

  function langOf(p) {
    const code = p.querySelector("code");
    const m = code && String(code.className).match(/language-([\w+#.-]+)/i);
    if (m) return m[1].toLowerCase();
    // Nagłówek bloku (np. „python”) — krótki tekst poza samym kodem.
    for (const n of p.querySelectorAll("div, span")) {
      if (n.contains(code) || n.children.length) continue;
      const tx = n.textContent.trim().toLowerCase();
      if (tx && tx.length < 20 && /^[\w+#.-]+$/.test(tx) && CK.codeExt(tx) !== "txt") return tx;
    }
    return "";
  }

  function chatTitle() {
    return document.title.replace(/\s*[-|–]\s*ChatGPT\s*$/i, "").trim() || "code";
  }

  function place() {
    if (!pre || !pre.isConnected) return hide();
    const r = pre.getBoundingClientRect();
    if (r.bottom < 40 || r.top > window.innerHeight - 20) return hide();
    btn.style.display = "flex";
    const w = btn.offsetWidth || 90, h = btn.offsetHeight || 26;
    const top = Math.max(r.top + 8, Math.min(r.bottom, window.innerHeight - 12) - h - 8);
    btn.style.left = Math.max(8, r.right - w - 10) + "px";
    btn.style.top = top + "px";
  }
  function hide() { btn.style.display = "none"; pre = null; }

  function label() { btn.classList.remove("ok"); btn.textContent = "💾 " + t("code.save"); }

  document.addEventListener("mouseover", e => {
    if (!enabled()) return;
    if (e.composedPath().includes(host)) { clearTimeout(hideTimer); return; }
    const p = codeBlockFrom(e.target);
    if (p) {
      clearTimeout(hideTimer);
      if (p !== pre) { pre = p; label(); }
      place();
    } else if (pre) {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, 350);
    }
  }, { passive: true });
  window.addEventListener("scroll", () => { if (pre) place(); }, { passive: true, capture: true });
  window.addEventListener("resize", () => { if (pre) place(); }, { passive: true });

  btn.addEventListener("click", e => {
    e.preventDefault(); e.stopPropagation();
    if (!pre) return;
    const code = pre.querySelector("code");
    const text = (code ? code.innerText || code.textContent : pre.innerText || "").replace(/\n?$/, "\n");
    const all = [...document.querySelectorAll("main pre")].filter(p => p.querySelector("code"));
    const n = all.indexOf(pre) + 1;
    const name = CK.codeFileName(chatTitle(), langOf(pre), n > 0 ? n : 0);
    CK.download(name, text, "text/plain");
    btn.classList.add("ok"); btn.textContent = "✓ " + t("code.saved");
    setTimeout(() => { if (pre) label(); }, 1500);
  });

  CK.ready.then(() => { label(); CK.store.onChange(() => { if (!enabled()) hide(); else if (pre) label(); }); });
  CK._code = { langOf, codeBlockFrom }; // do testów
})();
