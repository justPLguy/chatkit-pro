// ChatKit Pro — biblioteka promptów: zmienne {{nazwa}} / {{nazwa|domyślna}}, kategorie,
// wstawianie do pola czatu, szybki wybór (Alt+Shift+P albo wpisz // w pustym polu), pakiet startowy.
(() => {
  const CK = window.CK;
  const t = (...a) => CK.t(...a);

  const STARTER = {
    pl: [
      ["Streść tekst", "Pisanie", "Streść poniższy tekst w {{liczba|5}} punktach. Zachowaj najważniejsze liczby i nazwy.\n\n{{tekst}}"],
      ["Popraw tekst", "Pisanie", "Popraw błędy językowe i stylistyczne w tekście poniżej. Zachowaj mój ton ({{ton|swobodny}}). Pokaż poprawioną wersję, a pod nią listę najważniejszych zmian.\n\n{{tekst}}"],
      ["Mail do…", "Pisanie", "Napisz krótkiego maila do {{odbiorca}} w sprawie: {{sprawa}}. Ton: {{ton|uprzejmy, konkretny}}. Maksymalnie 120 słów."],
      ["Wyjaśnij jak 5-latkowi", "Nauka", "Wyjaśnij {{temat}} tak, jakbym miał 5 lat. Użyj jednej analogii z życia codziennego, a na końcu podaj 3 pytania sprawdzające."],
      ["Przegląd kodu", "Programowanie", "Zrób przegląd poniższego kodu ({{język|Python}}). Wskaż błędy, problemy z bezpieczeństwem i wydajnością. Zaproponuj poprawki z krótkim uzasadnieniem.\n\n```\n{{kod}}\n```"],
      ["Debugowanie błędu", "Programowanie", "Mam błąd w {{technologia}}:\n\n{{komunikat błędu}}\n\nKod:\n```\n{{kod}}\n```\n\nWyjaśnij przyczynę i podaj poprawkę krok po kroku."],
      ["Plusy i minusy", "Decyzje", "Rozważam: {{decyzja}}. Wypisz plusy, minusy, ukryte koszty i ryzyka. Na końcu zadaj mi 3 pytania, które pomogą podjąć decyzję."],
      ["Plan krok po kroku", "Produktywność", "Rozpisz plan osiągnięcia celu: {{cel}} w czasie {{czas|4 tygodnie}}. Podziel na tygodnie, z konkretnymi zadaniami i miernikami postępu."],
      ["Tłumaczenie", "Języki", "Przetłumacz na {{język|angielski}}, zachowując ton i formatowanie. Przy idiomach podaj krótką notkę.\n\n{{tekst}}"],
      ["Burza mózgów", "Kreatywność", "Wymyśl {{liczba|10}} pomysłów na {{temat}}. Każdy w jednym zdaniu. Zaznacz 3 najbardziej oryginalne."]
    ],
    en: [
      ["Summarize", "Writing", "Summarize the text below in {{count|5}} bullet points. Keep key numbers and names.\n\n{{text}}"],
      ["Proofread", "Writing", "Fix grammar and style in the text below. Keep my tone ({{tone|casual}}). Show the corrected version, then a list of the main changes.\n\n{{text}}"],
      ["Email to…", "Writing", "Write a short email to {{recipient}} about: {{topic}}. Tone: {{tone|polite, to the point}}. Max 120 words."],
      ["Explain like I'm 5", "Learning", "Explain {{topic}} like I'm 5. Use one everyday analogy and finish with 3 check questions."],
      ["Code review", "Coding", "Review this {{language|Python}} code. Point out bugs, security and performance issues. Suggest fixes with a short rationale.\n\n```\n{{code}}\n```"],
      ["Debug an error", "Coding", "I have an error in {{technology}}:\n\n{{error message}}\n\nCode:\n```\n{{code}}\n```\n\nExplain the cause and give a step-by-step fix."],
      ["Pros and cons", "Decisions", "I'm considering: {{decision}}. List pros, cons, hidden costs and risks. Then ask me 3 questions that would help me decide."],
      ["Step-by-step plan", "Productivity", "Create a plan to reach this goal: {{goal}} within {{time|4 weeks}}. Break it into weeks with concrete tasks and progress metrics."],
      ["Translate", "Languages", "Translate into {{language|Polish}}, keeping tone and formatting. Add a short note for idioms.\n\n{{text}}"],
      ["Brainstorm", "Creativity", "Come up with {{count|10}} ideas for {{topic}}. One sentence each. Mark the 3 most original."]
    ],
    fr: [
      ["Résumer", "Écriture", "Résume le texte ci-dessous en {{nombre|5}} points. Garde les chiffres et noms importants.\n\n{{texte}}"],
      ["Corriger", "Écriture", "Corrige la grammaire et le style du texte ci-dessous. Garde mon ton ({{ton|décontracté}}). Montre la version corrigée puis la liste des principales modifications.\n\n{{texte}}"],
      ["E-mail à…", "Écriture", "Rédige un court e-mail à {{destinataire}} au sujet de : {{sujet}}. Ton : {{ton|poli, concis}}. 120 mots maximum."],
      ["Explique comme à un enfant", "Apprentissage", "Explique {{sujet}} comme à un enfant de 5 ans. Utilise une analogie du quotidien et termine par 3 questions de vérification."],
      ["Revue de code", "Programmation", "Fais une revue de ce code {{langage|Python}}. Signale les bugs, problèmes de sécurité et de performance. Propose des corrections justifiées.\n\n```\n{{code}}\n```"],
      ["Déboguer une erreur", "Programmation", "J'ai une erreur en {{technologie}} :\n\n{{message d'erreur}}\n\nCode :\n```\n{{code}}\n```\n\nExplique la cause et donne une correction étape par étape."],
      ["Pour et contre", "Décisions", "J'envisage : {{décision}}. Liste les avantages, inconvénients, coûts cachés et risques. Puis pose-moi 3 questions pour m'aider à décider."],
      ["Plan étape par étape", "Productivité", "Établis un plan pour atteindre : {{objectif}} en {{durée|4 semaines}}. Découpe par semaine avec des tâches concrètes et des indicateurs."],
      ["Traduire", "Langues", "Traduis en {{langue|anglais}} en gardant le ton et la mise en forme. Ajoute une note pour les expressions idiomatiques.\n\n{{texte}}"],
      ["Remue-méninges", "Créativité", "Propose {{nombre|10}} idées pour {{sujet}}. Une phrase chacune. Marque les 3 plus originales."]
    ],
    de: [
      ["Zusammenfassen", "Schreiben", "Fasse den folgenden Text in {{anzahl|5}} Stichpunkten zusammen. Behalte wichtige Zahlen und Namen.\n\n{{text}}"],
      ["Korrekturlesen", "Schreiben", "Korrigiere Grammatik und Stil im folgenden Text. Behalte meinen Ton ({{ton|locker}}). Zeige die korrigierte Fassung und danach die wichtigsten Änderungen.\n\n{{text}}"],
      ["E-Mail an…", "Schreiben", "Schreibe eine kurze E-Mail an {{empfänger}} zum Thema: {{thema}}. Ton: {{ton|höflich, sachlich}}. Maximal 120 Wörter."],
      ["Erklär es wie einem Kind", "Lernen", "Erkläre {{thema}}, als wäre ich 5 Jahre alt. Nutze eine Alltagsanalogie und schließe mit 3 Kontrollfragen."],
      ["Code-Review", "Programmierung", "Prüfe diesen {{sprache|Python}}-Code. Nenne Fehler, Sicherheits- und Performanceprobleme. Schlage begründete Korrekturen vor.\n\n```\n{{code}}\n```"],
      ["Fehler debuggen", "Programmierung", "Ich habe einen Fehler in {{technologie}}:\n\n{{fehlermeldung}}\n\nCode:\n```\n{{code}}\n```\n\nErkläre die Ursache und gib eine schrittweise Lösung."],
      ["Pro und Contra", "Entscheidungen", "Ich überlege: {{entscheidung}}. Liste Vorteile, Nachteile, versteckte Kosten und Risiken auf. Stelle mir dann 3 Fragen, die bei der Entscheidung helfen."],
      ["Schritt-für-Schritt-Plan", "Produktivität", "Erstelle einen Plan für das Ziel: {{ziel}} in {{zeitraum|4 Wochen}}. Gliedere nach Wochen mit konkreten Aufgaben und Messgrößen."],
      ["Übersetzen", "Sprachen", "Übersetze ins {{sprache|Englische}} und behalte Ton und Formatierung bei. Ergänze bei Redewendungen eine kurze Notiz.\n\n{{text}}"],
      ["Brainstorming", "Kreativität", "Finde {{anzahl|10}} Ideen für {{thema}}. Je ein Satz. Markiere die 3 originellsten."]
    ]
  };

  const VAR_RE = /\{\{\s*([^{}|]+?)\s*(?:\|\s*([^{}]*?)\s*)?\}\}/g;

  const P = CK.prompts = {
    list: () => CK.store.data.prompts || [],
    starter(lang) {
      return (STARTER[lang] || STARTER.en).map(([title, cat, text]) => ({ id: CK.uid("p"), title, cat, text, uses: 0, added: Date.now() }));
    },
    vars(text) {
      const out = new Map();
      for (const m of String(text).matchAll(VAR_RE)) if (!out.has(m[1])) out.set(m[1], m[2] || "");
      return [...out].map(([name, def]) => ({ name, def }));
    },
    fill(text, values) { return String(text).replace(VAR_RE, (_, n, d) => values[n] ?? d ?? ""); },
    async save(p) {
      const arr = CK.store.data.prompts || (CK.store.data.prompts = []);
      const i = arr.findIndex(x => x.id === p.id);
      if (i >= 0) arr[i] = { ...arr[i], ...p }; else arr.unshift({ id: CK.uid("p"), uses: 0, added: Date.now(), ...p });
      await CK.store.save("prompts");
    },
    async remove(id) { CK.store.data.prompts = P.list().filter(x => x.id !== id); await CK.store.save("prompts"); },
    async addFromText(text) {
      const title = String(text).trim().split("\n")[0].slice(0, 60) || t("pr.untitled");
      await P.save({ title, cat: t("pr.catSaved"), text });
      CK.ui && CK.ui.setMsg(t("pr.savedMsg"));
    },
    // Uzupełnia zmienne (okno) i wstawia do pola czatu.
    async use(p) {
      const ui = CK.ui;
      let text = p.text;
      const vars = P.vars(text);
      if (vars.length) {
        const inputs = {};
        const values = await ui.modal(t("pr.fillTitle", { title: p.title }), () => ui.el("div", { class: "form" },
          vars.map(v => ui.el("label", {}, v.name,
            inputs[v.name] = v.name.length > 14 || /tekst|text|texte|code|kod/i.test(v.name)
              ? ui.el("textarea", { rows: 4, value: v.def })
              : ui.el("input", { type: "text", value: v.def })))),
          [{ label: t("ui.cancel"), result: null }, { label: t("pr.insert"), cls: "primary", value: () => Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, i.value])) }]);
        if (!values) return false;
        text = P.fill(text, values);
      }
      const ok = CK.dom.insertIntoComposer(text);
      if (!ok) { await ui.copy(text, t("pr.copiedNoComposer")); return false; }
      p.uses = (p.uses || 0) + 1;
      await CK.store.save("prompts");
      return true;
    },
    async edit(p = {}) {
      const ui = CK.ui;
      const cats = [...new Set(P.list().map(x => x.cat).filter(Boolean))];
      const f = {
        title: ui.el("input", { type: "text", value: p.title || "" }),
        cat: ui.el("input", { type: "text", value: p.cat || "", list: "ck-cats" }),
        text: ui.el("textarea", { rows: 10, value: p.text || "" })
      };
      const res = await ui.modal(p.id ? t("pr.edit") : t("pr.new"), () => ui.el("div", { class: "form" },
        ui.el("label", {}, t("pr.fTitle"), f.title),
        ui.el("label", {}, t("pr.fCat"), f.cat, ui.el("datalist", { id: "ck-cats" }, cats.map(c => ui.el("option", { value: c })))),
        ui.el("label", {}, t("pr.fText"), f.text),
        ui.el("p", { class: "muted" }, t("pr.varsHint"))),
        [{ label: t("ui.cancel"), result: null }, { label: t("ui.save"), cls: "primary", value: () => (f.text.value.trim() ? { title: f.title.value.trim() || f.text.value.trim().slice(0, 50), cat: f.cat.value.trim(), text: f.text.value } : false) }]);
      if (res) await P.save({ ...p, ...res });
    },
    // Szybki wybór promptu (bez otwierania panelu).
    async picker() {
      const ui = CK.ui;
      const items = [...P.list()].sort((a, b) => (b.uses || 0) - (a.uses || 0));
      let chosen = null;
      const listBox = ui.el("div", { style: "max-height:50vh;overflow:auto;margin-top:8px" });
      const q = ui.el("input", { type: "search", placeholder: t("pr.search"), style: "width:100%" });
      const draw = () => {
        const s = q.value.trim().toLowerCase();
        const vis = items.filter(p => !s || (p.title + " " + p.cat + " " + p.text).toLowerCase().includes(s));
        listBox.replaceChildren(...vis.slice(0, 50).map(p => ui.el("div", { class: "card", style: "cursor:pointer", onclick: () => { chosen = p; closeFn(true); } },
          ui.el("div", { class: "h" }, ui.el("b", {}, p.title), p.cat ? ui.el("span", { class: "badge" }, p.cat) : null),
          ui.el("div", { class: "body" }, p.text.slice(0, 160)))));
        if (!vis.length) listBox.append(ui.el("p", { class: "muted" }, t("pr.none")));
        return vis;
      };
      let closeFn;
      q.addEventListener("input", draw);
      q.addEventListener("keydown", e => { if (e.key === "Enter") { const v = draw(); if (v[0]) { chosen = v[0]; closeFn(true); } } });
      await ui.modal(t("pr.pickTitle"), close => { closeFn = close; draw(); return ui.el("div", {}, q, listBox); }, [{ label: t("ui.cancel"), result: null }]);
      if (chosen) await P.use(chosen);
    },
    exportJson() {
      CK.download(`chatkit-prompts-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: "ChatKit Pro", type: "prompts", prompts: P.list() }, null, 2), "application/json");
    },
    async importJson(file) {
      const j = JSON.parse(await file.text());
      const arr = Array.isArray(j) ? j : j.prompts;
      if (!Array.isArray(arr)) throw new Error("prompts[]");
      const have = new Set(P.list().map(p => p.title + "\u0000" + p.text));
      let n = 0;
      for (const p of arr) {
        if (!p || !p.text || have.has(p.title + "\u0000" + p.text)) continue;
        CK.store.data.prompts = CK.store.data.prompts || [];
        CK.store.data.prompts.push({ id: CK.uid("p"), title: p.title || p.text.slice(0, 50), cat: p.cat || "", text: p.text, uses: 0, added: Date.now() });
        n++;
      }
      await CK.store.save("prompts");
      return n;
    }
  };

  // ---------- zakładka w panelu ----------
  const state = { q: "", cat: "" };
  function render(box, ui) {
    const { el, button, select } = ui;
    const all = P.list();
    const cats = [...new Set(all.map(p => p.cat).filter(Boolean))].sort();
    const fileIn = el("input", { type: "file", accept: ".json", style: "display:none", onchange: async e => {
      try { const n = await P.importJson(e.target.files[0]); ui.setMsg(t("pr.imported", { n })); } catch (err) { ui.setMsg(t("msg.badFile", { e: err.message })); }
    } });
    const q = el("input", { type: "search", placeholder: t("pr.search"), value: state.q });
    const listBox = el("div");
    const draw = () => {
      const s = state.q.trim().toLowerCase();
      const vis = all.filter(p => (!state.cat || p.cat === state.cat) && (!s || (p.title + " " + p.text).toLowerCase().includes(s)));
      listBox.replaceChildren(...vis.map(p => el("div", { class: "card" },
        el("div", { class: "h" }, el("b", {}, p.title), p.cat ? el("span", { class: "badge" }, p.cat) : null,
          P.vars(p.text).length ? el("span", { class: "badge", title: P.vars(p.text).map(v => v.name).join(", ") }, "{{" + P.vars(p.text).length + "}}") : null,
          el("span", { class: "muted" }, "×" + (p.uses || 0)),
          button("▶ " + t("pr.insert"), () => P.use(p), { class: "primary" }),
          el("span", { class: "ic", title: t("ui.copy"), onclick: () => ui.copy(p.text) }, "⧉"),
          el("span", { class: "ic", title: t("pr.edit"), onclick: () => P.edit(p) }, "✎"),
          el("span", { class: "ic", title: t("ui.delete"), onclick: async () => { if (confirm(t("pr.confirmDelete", { title: p.title }))) await P.remove(p.id); } }, "✕")),
        el("div", { class: "body" }, p.text))));
      if (!vis.length) listBox.append(el("div", { class: "empty" }, all.length ? t("ui.noResults") : t("pr.empty")));
    };
    q.addEventListener("input", e => { state.q = e.target.value; draw(); });
    box.append(el("div", { class: "pane" },
      el("div", { class: "rowb", style: "margin:0 0 10px" }, q,
        select([["", t("pr.allCats")], ...cats.map(c => [c, c])], state.cat, v => { state.cat = v; draw(); }),
        button("＋ " + t("pr.new"), () => P.edit(), { class: "primary" })),
      el("p", { class: "muted", style: "margin:0 0 10px" }, t("pr.howTo")),
      listBox,
      el("div", { class: "rowb", style: "margin-top:12px" },
        button("⬇ " + t("pr.export"), () => P.exportJson()), button("⬆ " + t("pr.import"), () => fileIn.click()), fileIn,
        button(t("pr.addStarter"), async () => {
          const have = new Set(P.list().map(p => p.title));
          const add = P.starter(CK.lang).filter(p => !have.has(p.title));
          CK.store.data.prompts = [...P.list(), ...add]; await CK.store.save("prompts"); ui.setMsg(t("pr.imported", { n: add.length }));
        }))));
    draw();
  }

  CK.ready.then(() => {
    if (!Array.isArray(CK.store.data.prompts)) { CK.store.data.prompts = P.starter(CK.lang); CK.store.save("prompts"); }
    CK.ui.registerTab({ id: "prompts", label: () => t("tab.prompts"), render });

    // Alt+Shift+P — szybki wybór promptu
    document.addEventListener("keydown", e => {
      if (e.altKey && e.shiftKey && e.code === "KeyP") { e.preventDefault(); P.picker(); }
    }, true);
    // "//" w pustym polu wiadomości — szybki wybór
    document.addEventListener("input", e => {
      const c = CK.dom.composer();
      if (!c || !(e.target === c || c.contains(e.target))) return;
      if (CK.dom.composerText().trim() === "//") { CK.dom.insertIntoComposer("", true); P.picker(); }
    }, true);
  });
})();
