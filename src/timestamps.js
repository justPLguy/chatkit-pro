// ChatKit Pro — znacznik czasu nad każdą wiadomością w otwartym czacie.
// Atrybut + CSS ::before na kontenerze wiadomości (bez dokładania elementów do Reacta).
// Jedna etykieta na jedno ID wiadomości (wiadomość z załącznikiem nie dostaje dwóch).
// Bez „order: -1” — ChatGPT (XI 2026) ma kontenery z display: contents, więc order przesuwał podpis odpowiedzi nad pytanie.
(() => {
  const CK = window.CK;
  const ATTR = "data-ck-ts";

  const style = document.createElement("style");
  style.id = "chatkit-pro-ts-style";
  style.textContent = `
    [${ATTR}]::before {
      content: attr(${ATTR});
      display: block; width: 100%; flex: 0 0 100%;
      font-size: 12.5px; line-height: 1.4; letter-spacing: .01em;
      margin: 0 0 6px; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-weight: 600;
      pointer-events: none; text-align: left; font-variant-numeric: tabular-nums;
    }
    /* Twoja wiadomość: po prawej, niebieski akcent. Odpowiedź: po lewej, zielony akcent. */
    [data-ck-role="user"][${ATTR}]::before { text-align: right; color: #7aa7ff; margin-top: 10px; }
    [data-ck-role="assistant"][${ATTR}]::before { color: #4ade80; margin-top: 14px; }`;
  const ensureStyle = () => { if (!style.isConnected) CK.keepAttached(style); };

  // Oszczędnie z zapytaniami (od 1.2.0): rozmowę pobieramy raz, dopiero gdy użytkownik zatrzyma się na czacie
  // (1,5 s) i karta jest widoczna. Ponownie tylko wtedy, gdy pojawi się nowa wiadomość bez czasu (np. świeża odpowiedź),
  // nie częściej niż co 20 s (bezpiecznik: maks. 30 razy na czat). Wiadomości bez dopasowanego czasu po prostu zostają bez podpisu
  // (wcześniej to wywoływało pobieranie całej rozmowy co ~9 s → HTTP 429 u użytkowników).
  const SETTLE = 1500, REFETCH_GAP = 20000, MAX_REFETCH = 30;
  let convId = null, times = new Map(), fetching = false, lastFetch = 0, timer = null, mode = "-";
  let fetchedFor = null, knownMissing = new Set(), lastMissing = new Set(), refetches = 0, settleTimer = null;
  let local = new Map(), stampOn = false; // czasy nadane lokalnie nowym wiadomościom (do czasu, aż poda je ChatGPT)
  const visible = () => document.visibilityState !== "hidden";

  async function refresh(fresh = false) {
    const id = CK.dom.convId();
    if (!id || fetching || !visible()) return;
    fetching = true; lastFetch = Date.now();
    try {
      const conv = await CK.getConversation(id, { bg: true, fresh });
      if (CK.dom.convId() !== id) return;
      times = new Map();
      for (const n of Object.values(conv.mapping || {})) {
        const m = n.message;
        if (m && m.id && m.create_time) times.set(m.id, m.create_time);
      }
      convId = id; fetchedFor = id;
      CK.emitConv && CK.emitConv(conv, id); // minimapa korzysta z tej samej odpowiedzi
      paint();
      knownMissing = new Set(lastMissing); // tych wiadomości nie ma w odpowiedzi — nie pytamy o nie ponownie
      stampOn = true; // od teraz nowe wiadomości dostają czas lokalnie (stare bez czasu zostają w knownMissing)
    } catch (e) {
      console.debug("[ChatKit Pro] znaczniki czasu:", e.message);
      // 429: spróbujemy raz po przerwie; inne błędy (404, 5xx): odpuszczamy ten czat
      if (CK.dom.convId() === id) { convId = id; fetchedFor = e.status === 429 ? null : id; }
    }
    finally { fetching = false; }
  }

  // Podpisy z pamięci: formatowanie daty (Intl) dla 1000 wiadomości co 3 s kosztowało najwięcej po naprawie messages().
  // Pamięć czyścimy przy zmianie dnia („Dziś”/„Wczoraj”) i języka.
  let labels = new Map(), labelsKey = "";
  function labelFor(role, t) {
    const key = new Date().toDateString() + "|" + CK.lang;
    if (key !== labelsKey) { labels = new Map(); labelsKey = key; }
    const k = role + "|" + t;
    let l = labels.get(k);
    if (!l) { l = (role === "user" ? "👤 " + CK.t("ts.you") : "🤖 ChatGPT") + " · " + CK.fmtStamp(t); labels.set(k, l); }
    return l;
  }

  function paint() {
    ensureStyle();
    const msgs = CK.dom.messages();
    const keep = new Set();
    let ok = 0, missing = 0;
    lastMissing = new Set();
    // Nowa wiadomość w już pobranym czacie (Twoja wysłana albo właśnie generowana odpowiedź): bierzemy aktualną godzinę
    // od razu, bez kolejnego zapytania do ChatGPT. Tylko dwie ostatnie wiadomości i tylko te, których nie było przy pobraniu.
    if (stampOn && fetchedFor === convId) {
      const now = Date.now() / 1000;
      msgs.slice(-2).forEach(m => {
        if (!m.ids.some(id => times.has(id) || local.has(id)) && !knownMissing.has(m.ids.join(","))) local.set(m.ids[0], now);
      });
    }
    for (const m of msgs) {
      if (m.el.getAttribute("data-ck-role") !== m.role) m.el.setAttribute("data-ck-role", m.role);
      const t = m.ids.map(id => times.get(id) || local.get(id)).find(Boolean);
      if (!t) { missing++; lastMissing.add(m.ids.join(",")); continue; }
      const label = labelFor(m.role, t);
      if (m.el.getAttribute(ATTR) !== label) m.el.setAttribute(ATTR, label);
      keep.add(m.el); ok++;
    }
    // usuń etykiety, które nie należą do aktualnych kontenerów (np. ze starszej wersji / zagnieżdżone)
    document.querySelectorAll(`[${ATTR}]`).forEach(el => { if (!keep.has(el)) el.removeAttribute(ATTR); });
    mode = `wiadomości: ${msgs.length}, z czasem: ${ok}, bez czasu: ${missing}, pobrań ponownych: ${refetches}`;
    // ponowne pobranie tylko, gdy pojawiła się NOWA wiadomość bez czasu (nowa odpowiedź), z odstępem i limitem
    const fresh = [...lastMissing].some(k => !knownMissing.has(k));
    if (fresh && fetchedFor === convId && refetches < MAX_REFETCH &&
        Date.now() - lastFetch > REFETCH_GAP && visible() && !fetching) { refetches++; refresh(true); }
  }

  function clearAll() {
    document.querySelectorAll(`[${ATTR}]`).forEach(el => el.removeAttribute(ATTR));
  }

  function tick() {
    if (!CK.store.data.settings.timestamps || !CK.on()) return;
    const id = CK.dom.convId();
    if (id !== convId) {
      if (settleTimer && settleTimer.id === id) return; // już czekamy na ten czat
      convId = null; times = new Map(); clearAll(); fetchedFor = null; knownMissing = new Set(); local = new Map(); stampOn = false; refetches = 0;
      if (settleTimer) clearTimeout(settleTimer.t);
      settleTimer = null;
      if (!id) return;
      // szybkie przeklikiwanie czatów nie pobiera niczego — dopiero zatrzymanie się na czacie
      settleTimer = { id, t: setTimeout(() => { settleTimer = null; if (CK.dom.convId() === id) { convId = id; refresh(); } }, SETTLE) };
      return;
    }
    if (fetchedFor !== id && !fetching && visible() && !CK.limit.pausedFor()) { refresh(); return; } // karta była w tle / po przerwie 429
    paint();
  }

  function applySetting() {
    if (CK.store.data.settings.timestamps && CK.on()) tick(); else clearAll();
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
