// ChatKit Pro — „Przewijaj za odpowiedzią” (od 1.5.0).
// ChatGPT przestał sam przewijać w dół, gdy pisze długą odpowiedź. Ten moduł trzyma koniec odpowiedzi w widoku,
// jak „śledzenie” w terminalu: przewiniesz w górę → pauza; wrócisz na dół → śledzi dalej; nowa wiadomość → od nowa.
// Nie przewija do samego dołu strony (ChatGPT dokłada pustą przestrzeń pod odpowiedzią), tylko tak,
// żeby ostatnia linijka tekstu była tuż nad polem wiadomości.
(() => {
  const CK = window.CK;
  const enabled = () => CK.on() && CK.store.data.settings.follow !== false;

  const STOP_SEL = '[data-testid="stop-button"], button[data-testid*="stop" i]';
  const STREAM_SEL = '.result-streaming, [data-is-streaming="true"], .streaming-animation';
  const GAP = 16;          // odstęp końca tekstu od pola wiadomości (px)
  const RESUME_PX = 90;    // tak blisko końca odpowiedzi = „jesteś na dole”, śledzimy dalej

  let paused = false, intentUntil = 0, lastLen = -1, grewAt = 0, growth = 0, userCount = -1, raf = 0, active = false;

  // Ostatnia wiadomość asystenta: element, którego dół ma być widoczny.
  function lastAnswer() {
    const holders = document.querySelectorAll(CK.dom.HOLDER_SEL);
    for (let i = holders.length - 1; i >= 0; i--) {
      const h = holders[i];
      if (h.closest("nav, #chatkit-pro-host, #chatkit-pro-minimap")) continue;
      const r = h.matches(CK.dom.ROLE_SEL) ? h : h.querySelector(CK.dom.ROLE_SEL);
      const role = CK.dom.roleOf(r) || CK.dom.roleOf(h);
      if (role && role !== "assistant") return null; // ostatnia jest wiadomość użytkownika — odpowiedź jeszcze nie ruszyła
      return h;
    }
    const md = document.querySelectorAll("main .markdown");
    return md.length ? md[md.length - 1] : null;
  }
  function userMessages() {
    let n = 0;
    for (const r of document.querySelectorAll(CK.dom.ROLE_SEL)) if (CK.dom.roleOf(r) === "user" && !r.closest("nav")) n++;
    return n;
  }
  // Dolna krawędź obszaru, w którym tekst jest naprawdę widoczny (nad polem wiadomości, które zasłania dół).
  function visibleBottom(sc) {
    const scBottom = sc === document.scrollingElement ? window.innerHeight : sc.getBoundingClientRect().bottom;
    const c = CK.dom.composer();
    const form = c && (c.closest("form") || c);
    const top = form ? form.getBoundingClientRect().top : Infinity;
    return Math.min(scBottom, top > 0 ? top : scBottom) - GAP;
  }
  // Ile pikseli końca odpowiedzi jest pod widocznym obszarem (ujemne = koniec jest już widoczny).
  function behind(sc, el) { return el.getBoundingClientRect().bottom - visibleBottom(sc); }

  function streaming(el) {
    if (document.querySelector(STOP_SEL) || document.querySelector(STREAM_SEL)) return true;
    // zapas na zmianę układu: tekst ostatniej odpowiedzi rośnie kilka razy z rzędu
    return growth >= 2 && Date.now() - grewAt < 1500 && !!el;
  }

  function tick() {
    raf = 0;
    if (!enabled()) { active = false; return; }
    const el = lastAnswer();
    // nowa wiadomość użytkownika → zaczynamy śledzić od nowa
    const u = userMessages();
    if (userCount >= 0 && u > userCount) paused = false;
    userCount = u;
    if (!el) { lastLen = -1; growth = 0; return; }
    const len = el.textContent.length;
    if (len > lastLen && lastLen >= 0) { growth = Date.now() - grewAt < 1500 ? growth + 1 : 1; grewAt = Date.now(); }
    lastLen = len;
    active = streaming(el);
    if (!active || paused) return;
    const sc = CK.dom.scroller();
    const d = behind(sc, el);
    if (d > 1) sc.scrollTop += Math.ceil(d);
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(tick); };

  // Ręczne przewijanie: tylko gest użytkownika (kółko, dotyk, klawisz, łapanie paska) może włączyć pauzę —
  // własne przewijania ChatGPT i nasze nie pauzują.
  // Kierunek bierzemy ze zmiany scrollTop: my przewijamy tylko w dół, więc ruch w górę w czasie gestu = użytkownik.
  const intent = () => { intentUntil = Date.now() + 700; };
  let prevTop = null, prevSc = null;
  function onScroll() {
    const sc = CK.dom.scroller();
    const top = sc.scrollTop, up = prevSc === sc && prevTop != null && top < prevTop - 1;
    prevTop = top; prevSc = sc;
    if (!active || !enabled() || Date.now() > intentUntil) return;
    if (up) { paused = true; return; }
    const el = lastAnswer();
    if (el && behind(sc, el) < RESUME_PX) paused = false; // zjechałeś z powrotem na koniec odpowiedzi
  }

  CK.follow = {
    get paused() { return paused; },
    get active() { return active; },
    resume() { paused = false; schedule(); }
  };
  // diagnostyka w konsoli (kontekst „ChatKit Pro”): CK.followDebug()
  CK.followDebug = () => {
    const el = lastAnswer(), sc = CK.dom.scroller();
    return { wlaczone: enabled(), pisze: active, pauza: paused, przycisk_stop: !!document.querySelector(STOP_SEL),
      odpowiedz: el ? el.tagName + " " + (el.getAttribute("data-chatgpt-search-message-ids") || el.getAttribute("data-message-id") || el.className).slice(0, 60) : null,
      przewijacz: sc ? sc.tagName + "." + String(sc.className).slice(0, 60) : null, pod_spodem_px: el && sc ? Math.round(behind(sc, el)) : null };
  };

  CK.ready.then(() => {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("wheel", e => { if (e.deltaY < 0) intent(); }, { passive: true, capture: true });
    window.addEventListener("touchmove", intent, { passive: true, capture: true });
    window.addEventListener("keydown", e => {
      if (["ArrowUp", "PageUp", "Home"].includes(e.key) && !e.target.closest?.("input, textarea, [contenteditable='true']")) intent();
    }, true);
    window.addEventListener("mousedown", e => { if (e.target === CK.dom.scroller() || e.target === document.documentElement) intent(); }, true);
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    CK.store.onChange(schedule);
  });
})();
