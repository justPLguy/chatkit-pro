// ChatKit Pro — wiedza o budowie strony ChatGPT w jednym miejscu.
// Układ z XI 2026: każda wiadomość ma element [data-chatgpt-search-message-ids="<id>"],
// a rola (user/assistant) siedzi na niewidocznym nagłówku h4.sr-only[data-conversation-role].
// Starszy układ: [data-message-id] + [data-message-author-role].
// ChatGPT renderuje tylko część wiadomości (resztę dokłada przy przewijaniu).
(() => {
  const CK = window.CK;
  const ROLE_SEL = "[data-conversation-role], [data-message-author-role]";
  const HOLDER_SEL = "[data-chatgpt-search-message-ids], [data-message-id]";
  const roleOf = el => (el && (el.getAttribute("data-conversation-role") || el.getAttribute("data-message-author-role"))) || "";
  const idsIn = v => String(v || "").split(/[\s,;"'[\]{}]+/).filter(Boolean);
  const holderIds = h => idsIn(h.getAttribute("data-chatgpt-search-message-ids") || h.getAttribute("data-message-id"));

  // Wspina się od elementu z ID do największego kontenera, który zawiera tylko tę jedną wiadomość.
  function containerOf(holder) {
    const myIds = holderIds(holder).join(",");
    let el = holder;
    for (let i = 0; i < 14; i++) {
      const p = el.parentElement;
      if (!p || p === document.body || p.matches("main, [role='main']")) break;
      const hs = p.querySelectorAll(HOLDER_SEL);
      if ([...hs].some(h => holderIds(h).join(",") !== myIds)) break; // zawiera inną wiadomość
      if (new Set([...p.querySelectorAll(ROLE_SEL)].map(roleOf)).size > 1) break; // zawiera wiadomości dwóch ról
      el = p;
    }
    return el;
  }

  CK.dom = {
    ROLE_SEL, HOLDER_SEL, roleOf, idsIn,

    convId() {
      const m = location.pathname.match(/\/c\/([0-9a-f-]{36})/i);
      return m ? m[1] : null;
    },

    // Wiadomości aktualnie obecne na stronie: [{ el, id, ids, role }], bez duplikatów, w kolejności DOM.
    messages() {
      const out = [], seenIds = new Set(), seenEls = new Set();
      for (const h of document.querySelectorAll(HOLDER_SEL)) {
        if (h.closest("#chatkit-pro-host, nav")) continue;
        const ids = holderIds(h);
        if (!ids.length || ids.some(id => seenIds.has(id))) continue;
        const el = containerOf(h);
        if (seenEls.has(el)) continue;
        ids.forEach(id => seenIds.add(id)); seenEls.add(el);
        const r = el.matches(ROLE_SEL) ? el : el.querySelector(ROLE_SEL);
        out.push({ el, id: ids[0], ids, role: roleOf(r) || roleOf(h) || "assistant" });
      }
      return out;
    },

    findMessageEl(id) {
      return this.messages().find(m => m.ids.includes(id))?.el || null;
    },

    scroller() {
      const any = document.querySelector(HOLDER_SEL) || document.querySelector("main");
      let el = any;
      while (el && el !== document.body) {
        const s = getComputedStyle(el);
        if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 10) return el;
        el = el.parentElement;
      }
      return document.scrollingElement;
    },

    // Przewija do wiadomości; gdy nie jest wyrenderowana, szuka krokami (order = kolejność w gałęzi rozmowy).
    async scrollToMessage(id, order = null) {
      const flash = el => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.animate([{ outline: "2px solid #ef4444", outlineOffset: "4px" }, { outline: "2px solid transparent", outlineOffset: "4px" }], { duration: 1600 });
        return true;
      };
      let el = this.findMessageEl(id);
      if (el) return flash(el);
      const sc = this.scroller(); if (!sc) return false;
      // kierunek: porównaj z kolejnością widocznych wiadomości
      for (let step = 0; step < 60; step++) {
        const vis = this.messages();
        let dir = -1;
        if (order && order.size && vis.length) {
          const idx = order.get(id);
          const visIdx = vis.map(m => order.get(m.id)).filter(n => n != null);
          if (idx != null && visIdx.length) dir = idx > Math.max(...visIdx) ? 1 : -1;
        }
        const before = sc.scrollTop;
        sc.scrollTop += dir * sc.clientHeight * 0.85;
        await CK.sleep(180);
        el = this.findMessageEl(id);
        if (el) return flash(el);
        if (sc.scrollTop === before) break; // koniec przewijania
      }
      return false;
    },

    composer() {
      return document.querySelector("#prompt-textarea, [contenteditable='true'].ProseMirror, form textarea");
    },

    // Wstawia tekst do pola wiadomości ChatGPT (ProseMirror albo textarea).
    insertIntoComposer(text, replace = false) {
      const c = this.composer();
      if (!c) return false;
      c.focus();
      if (c.tagName === "TEXTAREA") {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
        setter.call(c, replace ? text : c.value + text);
        c.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
      if (replace) document.execCommand("selectAll", false);
      const ok = document.execCommand("insertText", false, text);
      if (!ok) { c.textContent = (replace ? "" : c.textContent) + text; c.dispatchEvent(new InputEvent("input", { bubbles: true })); }
      return true;
    },

    composerText() {
      const c = this.composer();
      return c ? (c.tagName === "TEXTAREA" ? c.value : c.innerText) : "";
    }
  };
})();
