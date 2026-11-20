// ChatKit Pro — licznik przy polu wiadomości (od 1.3.0): znaki · słowa · ~tokeny tego, co właśnie piszesz.
// Bez timerów i obserwatorów DOM: przelicza tylko na zdarzenia (pisanie, wklejenie, fokus, wysłanie, zmiana rozmiaru okna).
(() => {
  const CK = window.CK;
  const host = document.createElement("div");
  host.id = "chatkit-pro-counter";
  // Pozycjonujemy element WEWNĄTRZ Shadow DOM, a sam host zostaje „pusty” (all: initial) — tak jak przycisk kodu i minimapa.
  // (Chrome + style ChatGPT: host z position: fixed na <html> nie dostawał ramki i licznik był niewidoczny.)
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    :host { all: initial; }
    .c { position: fixed; z-index: 2147483646; pointer-events: none; display: none;
         font: 500 11px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; color: #9a9a9a; background: rgba(32,32,32,.88);
         border: 1px solid rgba(255,255,255,.08); border-radius: 8px; padding: 2px 8px; white-space: nowrap; }
    .c.long { color: #fbbf24; }
  </style><div class="c"></div>`;
  const box = root.querySelector(".c");

  // ~tokeny: znaki CJK liczone osobno (ok. 1 token/znak), reszta ok. 4 znaki/token — to samo przybliżenie co w statystykach czatu.
  const CJK = /[぀-ヿ㐀-鿿가-힯豈-﫿]/g;
  function count(text) {
    const s = String(text || "").replace(/ /g, " ").replace(/\n$/, "");
    const chars = [...s].length;
    const cjk = (s.match(CJK) || []).length;
    const words = (s.replace(CJK, " x ").match(/\S+/g) || []).length;
    const tokens = Math.round(cjk + (chars - cjk) / 4);
    return { chars, words, tokens };
  }
  CK.countText = count;

  const enabled = () => CK.on() && CK.store.data.settings.composerCount !== false;
  // Pole wiadomości bierzemy z samego zdarzenia (to, w czym naprawdę piszesz), a nie z pierwszego pasującego selektora —
  // ChatGPT trzyma też ukryte pole tekstowe, które ma tę samą rolę.
  let field = null;
  const SEL = '#prompt-textarea, #mobile-composer-prompt, .ProseMirror[contenteditable="true"], [contenteditable="true"][role="textbox"], textarea';
  const COMPOSER_BOX = 'form, [data-testid*="composer" i], [id*="composer" i], [class*="composer" i]';
  function fieldFrom(target) {
    const el = target && target.closest ? target.closest(SEL) : null;
    if (!el || el.closest("#chatkit-pro-host, #chatkit-pro-minimap")) return null;
    return /prompt|composer/i.test(el.id + " " + (el.getAttribute("name") || "")) || el.closest(COMPOSER_BOX) ? el : null;
  }
  const textOf = el => (el.tagName === "TEXTAREA" ? el.value : el.innerText || "");
  // ramka pola (zaokrąglone pudełko): najwyższy przodek, który wciąż jest „niski” (do 320 px)
  function boxOf(el) {
    let b = el, p = el.parentElement, form = el.closest("form");
    while (p && p !== document.body) {
      const r = p.getBoundingClientRect();
      if (r.height > 320 || r.width > window.innerWidth * 0.95) break;
      b = p; if (p === form) break; p = p.parentElement;
    }
    return b.getBoundingClientRect();
  }
  function update() {
    if (!field || !field.isConnected) field = fieldFrom(CK.dom.composer());
    const c = enabled() && field;
    const text = c ? textOf(c) : "";
    if (!c || !text.trim()) { box.style.display = "none"; return; }
    const n = count(text);
    box.textContent = CK.t("cc.line", { c: CK.fmtNum(n.chars), w: CK.fmtNum(n.words), t: CK.fmtNum(n.tokens) });
    box.classList.toggle("long", n.tokens > 8000);
    const r = boxOf(c);
    if (!r.width || !r.height) { box.style.display = "none"; return; }
    if (!host.isConnected) CK.keepAttached(host);
    box.style.display = "block";
    box.style.right = Math.max(4, window.innerWidth - r.right + 14) + "px";
    box.style.top = Math.max(4, r.top - 24) + "px";
  }
  let timer = null;
  const later = (ms = 120) => { clearTimeout(timer); timer = setTimeout(update, ms); };
  CK.composerCount = { update, count };
  // diagnostyka w konsoli (kontekst „ChatKit Pro”): CK.ccDebug()
  CK.ccDebug = () => {
    const c = field || CK.dom.composer();
    return { wlaczony: enabled(), pole: c ? c.tagName + "#" + c.id + " name=" + c.getAttribute("name") : null, aktywny: document.activeElement && (document.activeElement.tagName + "#" + document.activeElement.id),
      tekst: c ? textOf(c).slice(0, 40) : null, ramka: c ? JSON.stringify(boxOf(c)) : null, licznik: host.isConnected ? box.style.cssText + " rect=" + JSON.stringify(box.getBoundingClientRect()) : "brak" };
  };

  CK.ready.then(() => {
    const inComposer = e => { const f = fieldFrom(e.target); if (f) field = f; return !!f; };
    document.addEventListener("input", e => { if (inComposer(e)) later(); }, true);
    document.addEventListener("keyup", e => { if (inComposer(e)) later(); }, true);
    document.addEventListener("focusin", e => { if (inComposer(e)) later(0); }, true);
    // po wysłaniu (Enter albo przycisk) pole się czyści, a ChatGPT nie zawsze wysyła „input”
    document.addEventListener("keydown", e => { if (e.key === "Enter" && inComposer(e)) later(400); }, true);
    document.addEventListener("click", () => { if (box.style.display !== "none") later(400); }, true);
    window.addEventListener("resize", () => later(), { passive: true });
    CK.store.onChange(() => later(0));
  });
})();
