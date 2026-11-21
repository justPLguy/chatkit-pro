// ChatKit Pro — wygląd: klasyczny (szary) tryb ciemny zamiast czarnego OLED, szerokość czatu i rozmiar czcionki.
// Nadpisuje zmienne CSS ChatGPT tylko w trybie ciemnym; wyłączenie przywraca oryginał.
(() => {
  const CK = window.CK;
  const style = document.createElement("style");
  style.id = "chatkit-pro-classic-dark";
  const CSS = `
    html.dark, html.dark body, .dark {
      --main-surface-primary: #212121 !important;
      --main-surface-secondary: #2f2f2f !important;
      --main-surface-tertiary: #383838 !important;
      --sidebar-surface-primary: #171717 !important;
      --sidebar-surface-secondary: #212121 !important;
      --sidebar-surface-tertiary: #2f2f2f !important;
      --message-surface: #2f2f2f !important;
      --composer-surface-primary: #2f2f2f !important;
      --bg-primary: #212121 !important;
      --bg-secondary: #2f2f2f !important;
      --bg-tertiary: #383838 !important;
      --bg-elevated-primary: #2f2f2f !important;
      --bg-elevated-secondary: #262626 !important;
      --bg-scrim: rgba(0,0,0,.5) !important;
    }
    html.dark body, html.dark main { background-color: #212121 !important; }
    html.dark nav, html.dark [data-testid="sidebar"], html.dark aside { background-color: #171717 !important; }`;

  function apply() {
    const on = !!CK.store.data.settings.classicDark && CK.on();
    style.textContent = on ? CSS : "";
    if (!style.isConnected) CK.keepAttached(style);
  }

  // ---------- szerokość czatu i rozmiar czcionki ----------
  // ChatGPT ustawia szerokość wątku zmienną --thread-content-max-width na elementach z klasą, która ją zawiera.
  const look = document.createElement("style");
  look.id = "chatkit-pro-look";
  CK.lookCss = (width, font) => {
    let css = "";
    if (width > 0) {
      const w = width >= 2000 ? "100%" : width + "px";
      css += `
    [class*="--thread-content-max-width"], :root { --thread-content-max-width: ${w} !important; }
    main [class*="max-w-3xl"], main [class*="max-w-[48rem]"], main [class*="max-w-[40rem]"] { max-width: ${w} !important; }`;
    }
    if (font > 0) {
      // Treść wiadomości (obie strony): kontener wiadomości ChatGPT, nasz znacznik roli i stara klasa .markdown.
      const M = ['main [data-chatgpt-search-message-ids]', 'main [data-ck-role]', 'main .markdown', 'main [data-message-author-role]'];
      const txt = "p, li, td, th, blockquote, dd, dt, .whitespace-pre-wrap";
      const code = Math.max(11, font - 2);
      css += `
    ${M.join(", ")} { font-size: ${font}px !important; line-height: 1.6 !important; }
    ${M.map(m => `${m} :is(${txt})`).join(",\n    ")} { font-size: ${font}px !important; line-height: 1.6 !important; }
    ${M.map(m => `${m} :is(pre, pre *, code)`).join(", ")} { font-size: ${code}px !important; line-height: 1.5 !important; }`;
    }
    return css;
  };
  function applyLook() {
    const S = CK.store.data.settings;
    look.textContent = CK.on() ? CK.lookCss(+S.chatWidth || 0, +S.fontSize || 0) : "";
    if (!look.isConnected) CK.keepAttached(look);
  }

  CK.ready.then(() => {
    apply(); applyLook();
    CK.store.onChange(applyLook);
    setInterval(() => { if (!look.isConnected) applyLook(); }, 4000);
    CK.store.onChange(apply);
    // <head>/<html> bywa przebudowywany — pilnuj obecności stylu
    setInterval(() => { if (!style.isConnected) apply(); }, 4000);
  });
})();
