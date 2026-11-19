const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const SRC = path.join(__dirname, "..", "src") + "/";
const CID = "11111111-2222-3333-4444-555555555555";

const dom = new JSDOM(`<!DOCTYPE html><html lang="pl-PL"><head></head><body>
  <nav><a href="/c/22222222-2222-3333-4444-555555555555">Nowy czat</a></nav>
  <textarea id="prompt-textarea"></textarea>
  <div data-message-id="m1" data-message-author-role="user">Hej</div>
  <div data-message-id="m2" data-message-author-role="assistant">Cześć</div></body></html>`,
  { url: "https://chatgpt.com/c/" + CID, runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
const calls = [];
const now = Date.now() / 1000;
const chats = [
  { id: "c1", title: "Stary czat", update_time: now - 86400 * 100, create_time: now - 86400 * 120 },
  { id: "c2", title: "Nowy czat", update_time: now - 3600, create_time: now - 7200 },
  { id: "c3", title: "Średni czat", update_time: now - 86400 * 10, create_time: now - 86400 * 11 }
];
const lib1 = { items: [
  { id: "libfile_a", file_id: "file_a", file_name: "a.png", directory_id: "dir1", file_size_bytes: 2000000, image_gen_attribution: { x: 1 }, is_project: true, gizmo_id: "g-p-1", thumbnail_url: null, record_creation_time: "2026-11-17T06:00:00Z" },
  { id: "libfile_b", file_id: "file_b", file_name: "b.jpg", directory_id: "dir1", file_size_bytes: 1000, image_gen_attribution: null, is_project: false, thumbnail_url: null, record_creation_time: "2026-10-01T06:00:00Z" }
], cursor: "CUR2" };
const lib2 = { items: [
  { id: "libfile_c", file_id: "file_c", file_name: "c.png", directory_id: "dir2", file_size_bytes: 500, image_gen_attribution: null, is_project: false, record_creation_time: "2026-09-01T06:00:00Z" }
], cursor: null };
const conv = {
  title: "Testowy", create_time: now - 100, update_time: now, current_node: "m2",
  mapping: {
    root: { parent: null, message: null },
    m1: { parent: "root", message: { id: "m1", author: { role: "user" }, create_time: now - 100, content: { content_type: "text", parts: ["Hej **świecie**"] }, recipient: "all" } },
    m2: { parent: "m1", message: { id: "m2", author: { role: "assistant" }, create_time: now - 50, content: { content_type: "text", parts: ["Kod:\n```js\nconsole.log(1)\n```"] }, recipient: "all" } }
  }
};
const res = (obj, status = 200) => Promise.resolve({ ok: status < 300, status, json: async () => obj });
w.fetch = (url, opts = {}) => {
  url = String(url); calls.push({ url, method: opts.method || "GET", body: opts.body, headers: opts.headers });
  if (url.includes("/api/auth/session")) return res({ accessToken: "TOKEN" });
  if (url.includes("/backend-api/conversations")) {
    if (url.includes("is_archived=true")) return res({ items: url.includes("offset=0") ? [{ id: "a1", title: "Zarchiwizowany", update_time: now }] : [], total: 1 });
    return res({ items: url.includes("offset=0") ? chats : [], total: chats.length });
  }
  if (url.match(/\/backend-api\/conversation\/[^/?]+$/)) return opts.method === "PATCH" ? res({ success: true }) : res(conv);
  if (url.endsWith("/files/library")) { const b = JSON.parse(opts.body); return res(b.cursor ? lib2 : lib1); }
  if (url.includes("delete-batch")) return res({});
  if (url.includes("/backend-api/files/download/")) return res({ status: "success", download_url: "https://files.oaiusercontent.com/f?sig=1" });
  return res({}, 404);
};
const storage = {};
w.chrome = {
  runtime: { getManifest: () => ({ version: "1.0.0" }), sendMessage: async m => { w.__sent.push(m); return { ok: true }; }, onMessage: { addListener: fn => { w.__onMsg = fn; } } },
  storage: { local: {
    get: async keys => Object.fromEntries([].concat(keys).filter(k => k in storage).map(k => [k, JSON.parse(JSON.stringify(storage[k]))])),
    set: async obj => Object.assign(storage, JSON.parse(JSON.stringify(obj))),
    remove: async k => { delete storage[k]; }
  }, onChanged: { addListener() {} } }
};
w.__sent = [];
w.TextEncoder = TextEncoder;
storage.update = { checkedAt: Date.now(), current: "1.0.0", latest: "1.1.0", url: "https://github.com/justPLguy/chatkit-pro/releases/tag/chrome-v1.1.0", available: true };
w.confirm = () => true;
w.prompt = () => "Folder Test";
const downloads = [];
w.URL.createObjectURL = b => { downloads.push(b); return "blob:x"; };
w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () { downloads.push({ name: this.download }); };
w.navigator.clipboard = { writeText: async t => { w.__clip = t; } };

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf8"));
for (const f of manifest.content_scripts[0].js) w.eval(fs.readFileSync(path.join(__dirname, "..", f), "utf8"));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exitCode = 1; } else console.log("ok  -", m); };

(async () => {
  await sleep(2600); // znaczniki: 1,5 s na „zatrzymanie się” na czacie + zapytanie
  const root = w.document.getElementById("chatkit-pro-host").shadowRoot;
  const $ = s => root.querySelector(s);
  const $$ = s => [...root.querySelectorAll(s)];
  const btn = t => $$("button").find(b => b.textContent.trim().startsWith(t));

  // timestamps — także gdy ChatGPT nadpisze klasy <html> i usunie styl z <head>
  w.document.documentElement.className = "dark";
  assert(w.document.querySelector('[data-message-id="m1"]').getAttribute("data-ck-ts"), "znacznik czasu na wiadomości");
  assert(w.document.getElementById("chatkit-pro-ts-style"), "styl znaczników obecny");
  // nowy układ DOM ChatGPT (XI 2026): data-conversation-role + data-chatgpt-search-message-ids
  w.document.querySelectorAll("[data-message-id]").forEach(e => e.remove());
  const nu = w.document.createElement("div");
  nu.innerHTML = '<main><section class="turn"><h4 class="sr-only" data-conversation-role="user">Twoja wiadomość:</h4><div data-chatgpt-search-message-ids="m1">[obraz]</div><div><div data-chatgpt-search-message-ids="m1">Hej</div></div></section>' +
    '<section class="turn"><h4 class="sr-only" data-conversation-role="assistant">ChatGPT:</h4><div data-chatgpt-search-message-ids="m2"><p>Cześć</p></div></section></main>';
  w.document.body.appendChild(nu);
  await sleep(1000);
  const turnsEls = [...w.document.querySelectorAll("section.turn")];
  assert(turnsEls.every(e => e.getAttribute("data-ck-ts")) && !w.document.querySelector("h4[data-ck-ts]"), "znaczniki na widocznym kontenerze, nie na ukrytym h4: " + w.CK.tsDebug().tryb);
  assert(turnsEls[0].getAttribute("data-ck-role") === "user", "rola na kontenerze (wyrównanie do prawej)");
  assert(w.document.querySelectorAll("[data-ck-ts]").length === 2, "jedna data na wiadomość (wiadomość z obrazkiem nie dostaje dwóch)");

  // ikona na pasku Chrome → wiadomość ck-toggle otwiera panel
  w.__onMsg({ type: "ck-toggle" }); await sleep(300);
  assert($("#panel").classList.contains("open"), "kliknięcie ikony wtyczki otwiera panel");
  assert($(".modal") && $(".modal").textContent.includes("Witaj w ChatKit Pro"), "karta powitalna przy pierwszym otwarciu");
  btn("Zaczynamy").click(); await sleep(100);
  assert(!$(".modal") && storage.welcomeSeen, "powitanie zamknięte i zapamiętane");
  assert($("#upd").style.display === "flex" && $("#upd").textContent.includes("1.1.0") && $("#upd a").href.endsWith("chrome-v1.1.0"), "pasek: dostępna nowa wersja 1.1.0 z linkiem");
  $("#upd .ic").click();
  assert($("#upd").style.display === "none", "pasek można ukryć do następnej wersji");
  let rows = $$("#list .item");
  assert(rows.length === 3, "3 czaty na liście: " + rows.length);
  assert(rows[0].textContent.includes("Nowy czat"), "sortowanie: najnowszy pierwszy");

  // odświeżanie: nowy czat pojawia się po ↻
  chats.push({ id: "c9", title: "Świeży czat", update_time: now, create_time: now });
  btn("↻").click(); await sleep(400);
  assert($$("#list .item").length === 4 && $$("#list .item")[0].textContent.includes("Świeży"), "↻ dociąga nowy czat");

  // filtr starsze niż 30 dni
  const older = $$("#filters input[type=number]")[0];
  older.value = "30"; older.dispatchEvent(new w.Event("input"));
  assert($$("#list .item").length === 1, "filtr starsze niż 30 dni");
  older.value = ""; older.dispatchEvent(new w.Event("input"));

  // shift-zakres
  rows = $$("#list .item");
  rows[0].dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  $$("#list .item")[2].dispatchEvent(new w.MouseEvent("click", { bubbles: true, shiftKey: true }));
  assert($("#status").textContent.includes("zaznaczono 3"), "shift+klik zaznacza zakres: " + $("#status").textContent);

  // gwiazdka
  btn("★").click(); await sleep(100);
  assert(Object.keys(storage.stars || {}).length === 3, "gwiazdki zapisane");

  // folder: nowy przez select
  const fsel = $$("#actions select")[0];
  fsel.value = "__new"; fsel.dispatchEvent(new w.Event("change")); await sleep(200);
  assert(storage.folders?.length === 1 && Object.keys(storage.chatFolder).length === 3, "folder utworzony i czaty przypisane");
  assert($$("#folders .frow").length === 3, "folder w pasku folderów");
  assert($$("#list .tag").length === 3, "tag folderu przy czatach");

  // eksport md
  btn("⬇ Eksport").click(); await sleep(1500);
  assert(downloads.some(d => d.name && d.name.endsWith(".md")), "eksport md pobrany");
  const md = w.CK._export.toMarkdown({ id: "x", title: "T", create_time: now, update_time: now, msgs: w.CK.linearize(conv) });
  assert(md.includes("Hej **świecie**") && md.includes("```js"), "markdown zawiera treść");
  assert(w.CK._export.mdLite("a `b` **c**\n```\n<x>\n```").includes("<pre><code>&lt;x&gt;</code></pre>"), "mdLite escapuje kod");

  // usuń zaznaczone (odznacz 2, zostaw 1)
  $$("#list .item")[1].dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  $$("#list .item")[2].dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const before = calls.length;
  btn("Usuń").click(); await sleep(800);
  const patches = calls.slice(before).filter(c => c.method === "PATCH");
  assert(patches.length === 1 && JSON.parse(patches[0].body).is_visible === false, "usunięto 1 czat przez PATCH is_visible:false");
  assert($$("#list .item").length === 3, "lista po usunięciu: 3");

  // archiwum
  $$("#tabs button")[1].click(); await sleep(400);
  assert($$("#list .item").length === 1, "archiwum wczytane");
  $$("#list .item")[0].dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  btn("↩ Przywróć").click(); await sleep(600);
  const unarch = calls.filter(c => c.method === "PATCH" && c.body && JSON.parse(c.body).is_archived === false);
  assert(unarch.length === 1, "przywrócenie z archiwum");

  // biblioteka
  $$("#tabs button")[2].click(); await sleep(400);
  assert($$("#list .item").length === 2, "biblioteka strona 1");
  btn("Wczytaj wszystkie").click(); await sleep(800);
  assert($$("#list .item").length === 3, "biblioteka wszystkie strony");
  assert($$("#list .item")[0].textContent.includes("a.png"), "sortowanie po dacie");
  const typeSel = $$("#filters select")[1];
  typeSel.value = "gen"; typeSel.dispatchEvent(new w.Event("change"));
  assert($$("#list .item").length === 1, "filtr wygenerowane");
  typeSel.value = "all"; typeSel.dispatchEvent(new w.Event("change"));
  const sortSel = $$("#filters select")[0];
  sortSel.value = "big"; sortSel.dispatchEvent(new w.Event("change"));
  assert($$("#list .item")[0].textContent.includes("1,9 MB"), "sortowanie po rozmiarze + format rozmiaru");
  btn("Zaznacz widoczne").click();
  assert($("#status").textContent.includes("zaznaczono 3"), "zaznacz widoczne: " + $("#status").textContent);
  btn("⬇ Pobierz zaznaczone").click(); await sleep(1500);
  w.__sent = w.__sent.filter(m => m.type === "ck-download");
  assert(w.__sent.length === 3 && w.__sent[0].url.startsWith("https://files.oaiusercontent.com") && /^ChatGPT-Library-\d{4}-\d\d-\d\d\/a\.png$/.test(w.__sent.find(m => m.filename.endsWith("a.png")).filename), "pobieranie zaznaczonych: " + JSON.stringify(w.__sent[0]));
  const b2 = calls.length;
  btn("Usuń zaznaczone").click(); await sleep(800);
  const del = calls.slice(b2).filter(c => c.url.includes("delete-batch"));
  const files = JSON.parse(del[0].body).files;
  assert(del.length === 1 && files.length === 3 && files[0].parent_directory_id.startsWith("libdir_") && files[0].library_file_id.startsWith("libfile_"), "delete-batch z poprawnym payloadem");
  assert($$("#list .item").length === 0, "biblioteka pusta po usunięciu");

  // duży widok
  btn("⛶").click(); await sleep(50);
  assert($("#panel").classList.contains("big"), "duży widok");

  const tab = name => $$("#tabs button").find(b => b.textContent.trim() === name);

  // ===== ETAP 2 =====
  // prompty: pakiet startowy + wstawienie ze zmiennymi
  assert(w.CK.store.data.prompts.length === 10 && w.CK.store.data.prompts[0].title === "Streść tekst", "pakiet startowy PL (10 promptów)");
  tab("Prompty").click(); await sleep(100);
  assert($$(".card").length === 10, "zakładka Prompty pokazuje karty");
  const p0 = w.CK.store.data.prompts[0];
  const usePromise = w.CK.prompts.use(p0); await sleep(100);
  const fields = $$(".modal input, .modal textarea");
  assert(fields.length === 2 && fields[0].value === "5", "formularz zmiennych z wartością domyślną");
  fields[1].value = "Ala ma kota";
  btn("Wstaw").click(); await usePromise;
  assert(w.document.getElementById("prompt-textarea").value.includes("w 5 punktach") && w.document.getElementById("prompt-textarea").value.includes("Ala ma kota"), "prompt wstawiony do pola wiadomości");
  assert(w.CK.prompts.vars("a {{x}} b {{y|dom}} {{x}}").length === 2, "parsowanie zmiennych bez duplikatów");

  // przyciski zaznaczenia mają napisy od razu (bez otwierania minimapy)
  const mmRoot = w.document.getElementById("chatkit-pro-minimap").shadowRoot;
  assert(mmRoot.querySelector("#selnote").textContent.includes("Notatka") && mmRoot.querySelector("#selcopy").textContent.includes("Zakładka"), "przyciski notatki/zakładki z napisami bez otwierania minimapy");
  // Ctrl+klik „otwórz” = nowa karta, panel zostaje
  let opened = null; w.open = u => { opened = u; };
  assert(w.CK.openChat("abc", { ctrlKey: true }) === "tab" && opened === "/c/abc", "Ctrl+klik otwiera czat w nowej karcie");

  // minimapa + zakładka na wiadomości
  await w.CK.minimap.open(); await sleep(300);
  const mm = w.document.getElementById("chatkit-pro-minimap").shadowRoot;
  assert(mm.querySelectorAll(".e").length === 1, "minimapa: 1 pytanie w spisie");
  mm.querySelector(".e .act span").click(); await sleep(100);
  assert(Object.keys(w.CK.store.data.bookmarks).length === 1, "zakładka zapisana z minimapy");
  tab("Zakładki i notatki").click(); await sleep(100);
  assert($$(".card").length === 1, "zakładka widoczna w panelu");

  // reguły sprzątania
  tab("Sprzątanie").click(); await sleep(100);
  btn("Dodaj przykładowe reguły").click(); await sleep(200);
  assert(w.CK.store.data.rules.length === 2 && $$(".card").length === 2, "przykładowe reguły dodane");

  // statystyki
  tab("Statystyki").click(); await sleep(100);
  assert($$(".kpi").length >= 8 && $$(".barrow").length >= 12, "statystyki: kafelki + 12 miesięcy");

  // pasek boczny ChatGPT: gwiazdka i folder
  w.CK.store.data.stars["22222222-2222-3333-4444-555555555555"] = true; await w.CK.store.save("stars"); await sleep(600);
  assert(w.document.querySelector('nav a[href^="/c/2222"]').hasAttribute("data-ck-star"), "gwiazdka w pasku bocznym ChatGPT");

  // klasyczny tryb ciemny
  w.CK.store.data.settings.classicDark = true; await w.CK.store.save("settings");
  assert(w.document.getElementById("chatkit-pro-classic-dark").textContent.includes("--main-surface-primary"), "klasyczny tryb ciemny włączony");

  // ustawienia + zmiana języka
  $("#setbtn").click(); await sleep(100);
  assert($(".pane select"), "ustawienia renderują się");
  const langSel = $(".pane select"); langSel.value = "de"; langSel.dispatchEvent(new w.Event("change")); await sleep(200);
  assert(tab("Archiv") && tab("Bibliothek"), "przełączenie języka na niemiecki");
  langSel.value = "fr"; langSel.dispatchEvent(new w.Event("change")); await sleep(200);
  assert($$("#tabs button").some(b => b.textContent === "Discussions"), "przełączenie języka na francuski");

  // ===== v1.2.0 =====
  // ZIP: poprawna struktura (sygnatury, liczba plików)
  {
    const blob = w.CK.zip([{ name: "a.md", data: "x" }, { name: "a.md", data: "y" }]);
    const buf = Buffer.from(await new Promise(r => { const fr = new w.FileReader(); fr.onload = () => r(fr.result); fr.readAsArrayBuffer(blob); }));
    const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    assert(buf.readUInt32LE(0) === 0x04034b50 && eocd > 0 && buf.readUInt16LE(eocd + 10) === 2 && buf.includes(Buffer.from("a (2).md")), "ZIP: nagłówki, 2 pliki, unikalne nazwy");
  }
  // eksport do ZIP (plik na czat)
  {
    const dl = []; const orig = w.CK.download; w.CK.download = (n, d) => dl.push({ n, d });
    const r = await w.CK.exportChats(["c1", "c2"], "zip-json", () => {});
    w.CK.download = orig;
    assert(r.ok === 2 && dl.length === 1 && dl[0].n.endsWith(".zip") && dl[0].d instanceof w.Blob && dl[0].d.size > 200, "eksport ZIP: jeden plik .zip z 2 czatami");
    const j = JSON.parse(w.CK._export.toJson({ id: "c9", title: "T", create_time: now, update_time: now, msgs: [{ role: "user", text: "hej", time: now }] }));
    assert(j.url.endsWith("/c/c9") && j.messages[0].role === "user" && j.created, "eksport JSON: struktura czatu");
  }
  // kod: wyciąganie bloków, nazwy plików, liczniki
  assert(JSON.stringify(w.CK.extractCode("a\n```python\nprint(1)\n```\nb")) === JSON.stringify([{ lang: "python", code: "print(1)\n" }]), "kod: blok ``` z językiem");
  assert(w.CK.codeFileName("Mój czat", "TypeScript", 2) === "Mój czat-2.ts" && w.CK.codeExt("C#") === "cs" && w.CK.codeExt("nieznany") === "txt", "kod: rozszerzenia plików");
  const st = w.CK.chatStats([{ role: "user", text: "Ala ma kota" }, { role: "assistant", text: "Zażółć gęślą" }]);
  assert(st.messages === 2 && st.words === 5 && st.chars === 23 && st.tokens === 6, "liczniki: wiadomości, słowa, znaki, tokeny");
  // przycisk „Zapisz” przy bloku kodu
  {
    const main = w.document.createElement("main");
    main.innerHTML = '<div class="markdown"><pre><div><div>python</div><button>Copy</button></div><div><code class="whitespace-pre">print("hi")</code></div></pre></div>';
    w.document.body.append(main);
    const pre = main.querySelector("pre");
    assert(w.CK._code.codeBlockFrom(main.querySelector("code")) === pre && w.CK._code.langOf(pre) === "python", "kod: wykrycie bloku i języka z nagłówka");
    pre.getBoundingClientRect = () => ({ top: 100, bottom: 300, left: 50, right: 650, width: 600, height: 200 });
    pre.dispatchEvent(new w.MouseEvent("mouseover", { bubbles: true }));
    const cbtn = w.document.getElementById("chatkit-pro-code").shadowRoot.querySelector("button");
    assert(cbtn.style.display === "flex" && cbtn.textContent.includes("💾"), "kod: przycisk pojawia się nad blokiem");
    const dl = []; const orig = w.CK.download; w.CK.download = (n, d) => dl.push({ n, d });
    cbtn.click(); w.CK.download = orig;
    assert(dl.length === 1 && dl[0].n.endsWith(".py") && dl[0].d.startsWith('print("hi")'), "kod: zapis bloku do pliku .py");
    main.remove();
  }
  // szerokość czatu i czcionka
  w.CK.store.data.settings.chatWidth = 1200; w.CK.store.data.settings.fontSize = 17; await w.CK.store.save("settings"); await sleep(50);
  const lookCss = w.document.getElementById("chatkit-pro-look").textContent;
  assert(lookCss.includes("--thread-content-max-width: 1200px") && lookCss.includes("font-size: 17px"), "wygląd: szerokość 1200 px i czcionka 17 px");
  w.CK.store.data.settings.chatWidth = 0; w.CK.store.data.settings.fontSize = 0; await w.CK.store.save("settings"); await sleep(50);
  assert(w.document.getElementById("chatkit-pro-look").textContent.trim() === "", "wygląd: domyślnie nic nie zmienia");
  assert(w.CK.lookCss(2000, 0).includes("100%"), "wygląd: pełna szerokość");
  if (!$$(".pane input[type=range]").length) { $("#setbtn").click(); await sleep(100); }
  assert($$(".pane input[type=range]").length === 2, "ustawienia: 2 suwaki (szerokość, czcionka)");

  // suwak działa wielokrotnie, także gdy obiekt ustawień zostanie podmieniony (storage.onChanged)
  {
    const rng = $$(".pane input[type=range]")[0];
    const move = async i => { rng.value = i; rng.dispatchEvent(new w.Event("input")); rng.dispatchEvent(new w.Event("change")); await sleep(30); };
    await move(2); const a1 = w.CK.store.data.settings.chatWidth;
    w.CK.store.data.settings = { ...w.CK.store.data.settings }; // jak po chrome.storage.onChanged
    await move(5); const a2 = w.CK.store.data.settings.chatWidth;
    w.CK.store.data.settings = { ...w.CK.store.data.settings };
    rng.parentElement.querySelector("button").click(); await sleep(30);
    assert(a1 === 900 && a2 === 1200 && w.CK.store.data.settings.chatWidth === 0, "suwak: kolejne zmiany i ↺ działają za każdym razem");
  }
  // czytelne znaczniki czasu
  {
    const n = new Date(2026, 10, 17, 23, 0);
    w.CK.locale = "pl-PL";
    const f = x => w.CK.fmtStamp(x.getTime(), n);
    const r = [f(new Date(2026, 10, 17, 1, 30)), f(new Date(2026, 10, 16, 23, 10)), f(new Date(2026, 10, 13, 1, 30)), f(new Date(2025, 2, 5, 9, 0))];
    console.log("    znaczniki:", r.join(" | "));
    assert(r[0].endsWith("01:30") && /^(Dziś|Today|Aujourd|Heute)/.test(r[0]) && /^(Wczoraj|Yesterday|Hier|Gestern)/.test(r[1]) && r[2].includes("13") && r[3].includes("2025"), "znaczniki czasu: dziś / wczoraj / dzień tygodnia / rok");
  }

  assert(w.CK.lookCss(0, 18).includes("main [data-chatgpt-search-message-ids] :is(p, li") && w.CK.lookCss(0, 18).includes("main [data-ck-role]"), "czcionka: obejmuje treść odpowiedzi i pytań");
  {
    const labels = [...w.document.querySelectorAll("[data-ck-ts]")].map(e => e.getAttribute("data-ck-role") + "=" + e.getAttribute("data-ck-ts"));
    console.log("    etykiety:", labels.join(" | "));
    assert(!/order\s*:/.test(w.document.getElementById("chatkit-pro-ts-style").textContent), "znaczniki czasu: bez order (kontenery display: contents)");
    assert(labels.length && labels.every(l => l.startsWith("user=👤") || l.startsWith("assistant=🤖 ChatGPT")), "znaczniki czasu: podpis roli (👤 Ty / 🤖 ChatGPT)");
  }

  // przypomnienie o kopii zapasowej
  {
    if (!w.CK.store.data.folders.length) { w.CK.store.data.folders.push({ id: "fx", name: "X" }); await w.CK.store.save("folders"); }
    const day = 86400000, bakBox = () => $("#bak");
    w.CK.store.data.settings.backupEvery = 7;
    w.CK._backup.set({ firstSeen: Date.now() - 3 * day, lastBackup: 0, backupSnooze: 0 });
    const early = bakBox().style.display;
    w.CK._backup.set({ firstSeen: Date.now() - 10 * day });
    const shown = bakBox().style.display === "flex" && bakBox().querySelectorAll("button").length === 2;
    const dl = []; const orig = w.CK.download; w.CK.download = (n, d) => dl.push({ n, d });
    bakBox().querySelector("button.go").click(); await sleep(30); w.CK.download = orig;
    const after = bakBox().style.display;
    assert(early === "none" && shown && dl.length === 1 && dl[0].n.startsWith("chatkit-pro-backup-") && JSON.parse(dl[0].d).folders.length && after === "none" && storage.lastBackup > 0,
      "kopia: przypomnienie po 7 dniach, „Zrób kopię” pobiera JSON i chowa pasek");
    w.CK._backup.set({ lastBackup: Date.now() - 8 * day });
    const again = bakBox().style.display;
    $$("#bak button")[1].click(); await sleep(30);
    const snoozed = bakBox().style.display;
    w.CK._backup.set({ backupSnooze: 0 }); w.CK.store.data.settings.backupEvery = 0; await w.CK.store.save("settings"); await sleep(30);
    assert(again === "flex" && snoozed === "none" && bakBox().style.display === "none", "kopia: „Później” odkłada, „nigdy” wyłącza");
    w.CK.store.data.settings.backupEvery = 7; await w.CK.store.save("settings");
  }

  // masowa zmiana nazw: logika tytułów
  {
    const r = w.CK.renameTitle;
    assert(r("Plan", "prefix", "[Praca]") === "[Praca] Plan" && r("[Praca] Plan", "prefix", "[Praca]") === "[Praca] Plan" &&
      r("Plan", "suffix", "(old)") === "Plan (old)" && r("[Praca] Plan", "remove", "[Praca]") === "Plan" &&
      r("Test test", "replace", "test", "próba") === "Test próba" && r("x", "remove", "x") === "x", "zmiana nazw: prefiks, sufiks, usuń, zamień (bez pustych tytułów)");
  }
  // prompty v2: ulubione na górze, kolejność, tagi
  {
    const P = w.CK.prompts;
    w.CK.store.data.prompts = [
      { id: "pa", title: "A", text: "a", uses: 5, tags: ["mail"] },
      { id: "pb", title: "B", text: "b", uses: 1 },
      { id: "pc", title: "C", text: "c", uses: 9, fav: true, tags: ["kod", "mail"] }];
    await w.CK.store.save("prompts");
    assert(P.sorted(P.list(), "manual").map(x => x.id).join() === "pc,pa,pb" && P.sorted(P.list(), "uses").map(x => x.id).join() === "pc,pa,pb", "prompty: ulubiony zawsze pierwszy");
    await P.move("pb", "pa");
    assert(P.list().map(x => x.id).join() === "pb,pa,pc", "prompty: przeciągnięcie zmienia kolejność");
    await P.toggleFav("pc");
    assert(P.sorted(P.list(), "manual").map(x => x.id).join() === "pb,pa,pc" && !P.list()[2].fav, "prompty: przełączanie ulubionego");
    assert(JSON.stringify(P.normTags(" Mail, #kod ,mail")) === JSON.stringify(["mail", "kod"]) && P.tags()[0][0] === "mail", "prompty: tagi (normalizacja, liczniki)");
  }

  // włącznik wtyczki + przywracanie usuniętych elementów
  {
    const host = w.document.getElementById("chatkit-pro-host"), mmHost = w.document.getElementById("chatkit-pro-minimap");
    w.CK.store.data.enabled = false; await w.CK.store.save("enabled"); await sleep(50);
    const offOk = host.style.display === "none" && mmHost.style.display === "none" && !w.document.querySelector("[data-ck-ts]") && !$("#panel").classList.contains("open");
    w.CK.store.data.enabled = true; await w.CK.store.save("enabled"); await sleep(3200);
    const onOk = host.style.display === "" && mmHost.style.display === "" && !!w.document.querySelector("[data-ck-ts]");
    assert(offOk && onOk, "włącznik: wyłączenie chowa wszystko, włączenie przywraca bez przeładowania");
    host.remove(); mmHost.remove(); await sleep(50);
    assert(host.isConnected && mmHost.isConnected, "strażnik: ChatGPT usunął elementy wtyczki → wracają");
  }

  // niezalogowany: czytelny komunikat zamiast błędu
  const realFetch = w.fetch;
  w.fetch = (url, o) => String(url).includes("/api/auth/session") ? Promise.resolve({ ok: true, status: 200, json: async () => ({}) }) : realFetch(url, o);
  w.CK.getToken = (orig => async () => { const r = await w.fetch("/api/auth/session"); const j = await r.json(); if (!j.accessToken) throw Object.assign(new Error("x"), { code: "NOAUTH" }); return j.accessToken; })(w.CK.getToken);
  w.CK.sources.archive.reset();
  tab("Archives").click(); await sleep(400);
  assert($("#list .empty") && $("#list .empty a") && $("#list .empty a").href.includes("/auth/login"), "niezalogowany: komunikat z linkiem do logowania");
  console.log("\nheaders sample:", JSON.stringify(calls.find(c => c.url.includes("delete-batch")).headers));
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => setTimeout(() => process.exit(), 50));
