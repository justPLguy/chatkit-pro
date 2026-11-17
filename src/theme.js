// ChatKit Pro — klasyczny (szary) tryb ciemny zamiast czarnego OLED.
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
    const on = !!CK.store.data.settings.classicDark;
    style.textContent = on ? CSS : "";
    if (!style.isConnected) document.documentElement.appendChild(style);
  }

  CK.ready.then(() => {
    apply();
    CK.store.onChange(apply);
    // <head>/<html> bywa przebudowywany — pilnuj obecności stylu
    setInterval(() => { if (!style.isConnected) apply(); }, 4000);
  });
})();
