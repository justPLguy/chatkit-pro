// ChatKit Pro — znacznik czasu nad każdą wiadomością w otwartym czacie.
// Atrybut + CSS ::before na kontenerze wiadomości (bez dokładania elementów do Reacta).
// Jedna etykieta na jedno ID wiadomości (wiadomość z załącznikiem nie dostaje dwóch).
(() => {
  const CK = window.CK;
  const ATTR = "data-ck-ts";

  const style = document.createElement("style");
  style.id = "chatkit-pro-ts-style";
  style.textContent = `
    [${ATTR}]::before {
      content: attr(${ATTR});
      display: block; width: 100%; flex: 0 0 100%; order: -1;
      font-size: 11px; line-height: 1.4; opacity: .5;
      margin: 0 0 4px; font-family: system-ui, sans-serif; font-weight: 400;
      color: inherit; pointer-events: none; text-align: left;
    }
    [data-ck-role="user"][${ATTR}]::before { text-align: right; }`;
  const ensureStyle = () => { if (!style.isConnected) document.documentElement.appendChild(style); };

  let convId = null, times = new Map(), fetching = false, lastFetch = 0, timer = null, mode = "-";

  async function refresh() {
    const id = CK.dom.convId();
    if (!id || fetching) return;
    fetching = true; lastFetch = Date.now();
    try {
      const conv = await CK.getConversation(id);
      if (CK.dom.convId() !== id) return;
      times = new Map();
      for (const n of Object.values(conv.mapping || {})) {
        const m = n.message;
        if (m && m.id && m.create_time) times.set(m.id, m.create_time);
      }
      convId = id;
      CK.emitConv && CK.emitConv(conv, id); // minimapa korzysta z tej samej odpowiedzi
      paint();
    } catch (e) { console.debug("[ChatKit Pro] znaczniki czasu:", e.message); }
    finally { fetching = false; }
  }

  function paint() {
    ensureStyle();
    const msgs = CK.dom.messages();
    const keep = new Set();
    let ok = 0, missing = 0;
    for (const m of msgs) {
      if (m.el.getAttribute("data-ck-role") !== m.role) m.el.setAttribute("data-ck-role", m.role);
      const t = m.ids.map(id => times.get(id)).find(Boolean);
      if (!t) { missing++; continue; }
      const label = CK.fmtDate(t, true);
      if (m.el.getAttribute(ATTR) !== label) m.el.setAttribute(ATTR, label);
      keep.add(m.el); ok++;
    }
    // usuń etykiety, które nie należą do aktualnych kontenerów (np. ze starszej wersji / zagnieżdżone)
    document.querySelectorAll(`[${ATTR}]`).forEach(el => { if (!keep.has(el)) el.removeAttribute(ATTR); });
    mode = `wiadomości: ${msgs.length}, z czasem: ${ok}, bez czasu: ${missing}`;
    if (missing && Date.now() - lastFetch > 8000) refresh();
  }

  function clearAll() {
    document.querySelectorAll(`[${ATTR}]`).forEach(el => el.removeAttribute(ATTR));
  }

  function tick() {
    if (!CK.store.data.settings.timestamps) return;
    const id = CK.dom.convId();
    if (id !== convId) { convId = null; times = new Map(); clearAll(); if (id) refresh(); return; }
    paint();
  }

  function applySetting() {
    if (CK.store.data.settings.timestamps) tick(); else clearAll();
  }

  CK.tsDebug = () => {
    const first = CK.dom.messages()[0];
    return {
      wersja: CK.VERSION, wlaczone: CK.store.data.settings.timestamps, czat: CK.dom.convId(), tryb: mode,
      znane_czasy: times.size,
      el_message_id: document.querySelectorAll("[data-message-id]").length,
      el_role: document.querySelectorAll("[data-conversation-role]").length,
      el_search_ids: document.querySelectorAll("[data-chatgpt-search-message-ids]").length,
      oznaczone: document.querySelectorAll(`[${ATTR}]`).length, styl: style.isConnected,
      przyklad_html: first ? first.el.outerHTML.replace(/>[^<]{40,}</g, ">…<").slice(0, 700) : null
    };
  };

  CK.ready.then(() => {
    ensureStyle();
    applySetting();
    CK.store.onChange(applySetting);
    new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(tick, 600); })
      .observe(document.body, { childList: true, subtree: true });
    setInterval(tick, 3000);
  });
})();
