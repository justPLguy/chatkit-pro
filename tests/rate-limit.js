// ChatKit Pro — test oszczędzania zapytań i obsługi HTTP 429 (liczy zapytania do ChatGPT).
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const ID = n => `${n}1111111-2222-3333-4444-555555555555`;

// czat z wiadomością, której ID nie ma w odpowiedzi API (np. ukryta / systemowa) — to wywoływało pętlę w 1.1.0
const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><main>
  <section><h4 class="sr-only" data-conversation-role="user"></h4><div data-chatgpt-search-message-ids="m1">Hej</div></section>
  <section><h4 class="sr-only" data-conversation-role="assistant"></h4><div data-chatgpt-search-message-ids="m2">Cześć</div></section>
  <section><h4 class="sr-only" data-conversation-role="assistant"></h4><div data-chatgpt-search-message-ids="ghost">?</div></section>
  </main></body></html>`, { url: "https://chatgpt.com/c/" + ID(1), runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
const now = Date.now() / 1000;
const conv = { title: "T", current_node: "m2", mapping: {
  root: { parent: null, message: null },
  m1: { parent: "root", message: { id: "m1", author: { role: "user" }, create_time: now - 100, content: { content_type: "text", parts: ["Hej"] } } },
  m2: { parent: "m1", message: { id: "m2", author: { role: "assistant" }, create_time: now - 50, content: { content_type: "text", parts: ["Cześć"] } } } } };
let mode = "ok"; const calls = [];
const resp = (obj, status = 200, headers = {}) => Promise.resolve({ ok: status < 300, status, json: async () => obj, headers: { get: k => headers[k.toLowerCase()] ?? null } });
w.fetch = (url, opts = {}) => {
  url = String(url); calls.push({ url, t: Date.now(), method: opts.method || "GET", stack: process.env.DBG ? new Error().stack.split("\n").slice(2, 9).map(l => l.trim().replace(/\(eval.*?<anonymous>:/, "(")).join(" < ") : "" });
  if (url.includes("/api/auth/session")) return resp({ accessToken: "TOKEN" });
  if (mode === "429") return resp({ detail: "Too many requests" }, 429, { "retry-after": "5" });
  if (url.includes("/backend-api/conversations")) return resp({ items: [], total: 0 });
  if (url.includes("/backend-api/conversation/")) return resp(conv);
  return resp({}, 404);
};
const storage = { welcomeSeen: 1 };
w.chrome = {
  runtime: { getManifest: () => ({ version: "1.2.0" }), sendMessage: async () => ({ ok: true }), onMessage: { addListener() {} } },
  storage: { local: {
    get: async keys => Object.fromEntries([].concat(keys).filter(k => k in storage).map(k => [k, storage[k]])),
    set: async o => Object.assign(storage, o), remove: async k => { delete storage[k]; } }, onChanged: { addListener() {} } }
};
w.TextEncoder = TextEncoder;
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
for (const f of manifest.content_scripts[0].js) w.eval(fs.readFileSync(path.join(ROOT, f), "utf8"));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exitCode = 1; } else console.log("ok  -", m); };
const convGets = (from = 0) => calls.slice(from).filter(c => c.method === "GET" && /\/backend-api\/conversation\//.test(c.url)).length;
const backend = (from = 0) => calls.slice(from).filter(c => c.url.includes("/backend-api/")).length;
const go = id => w.history.pushState({}, "", "/c/" + id);

(async () => {
  const CK = w.CK; await CK.ready; CK.limit._reset();

  // 1) Otwarty czat z wiadomością bez czasu przez 25 s: dokładnie 1 pobranie (1.1.0: co ~9 s, w nieskończoność)
  await sleep(25000);
  assert(convGets() === 1, `otwarty czat 25 s z „niedopasowaną” wiadomością: 1 pobranie rozmowy (jest ${convGets()})`);
  assert(w.document.querySelector('[data-chatgpt-search-message-ids="m1"]').closest("section").hasAttribute("data-ck-ts") ||
         w.document.querySelector("[data-ck-ts]"), "znaczniki czasu nadal działają");

  // 2) Szybkie przeklikiwanie 10 czatów (co 300 ms): nic nie jest pobierane, dopiero po zatrzymaniu — 1 zapytanie
  let mark = calls.length;
  for (let i = 2; i < 12; i++) { go(ID(i)); await sleep(300); }
  assert(convGets(mark) === 0, `przeklikiwanie 10 czatów: 0 pobrań w trakcie (jest ${convGets(mark)})`);
  await sleep(5000);
  assert(convGets(mark) === 1, `po zatrzymaniu się na czacie: 1 pobranie (jest ${convGets(mark)})`);

  // 3) Powrót do odwiedzonego czatu: z pamięci, bez zapytania
  mark = calls.length; go(ID(1)); await sleep(6000);
  assert(convGets(mark) === 0, "powrót do czatu sprzed chwili: z pamięci, 0 zapytań");

  // dalej testujemy samo API — wychodzimy z czatu, żeby znaczniki nic nie pobierały
  w.history.pushState({}, "", "/"); await sleep(3500);
  // 4) Dwa jednoczesne zapytania o ten sam czat → jedno
  mark = calls.length; CK.convCache.clear();
  await Promise.all([CK.getConversation(ID(20)), CK.getConversation(ID(20)), CK.getConversation(ID(20), { bg: true })]);
  assert(convGets(mark) === 1, "3 jednoczesne zapytania o ten sam czat → 1 zapytanie");

  // 5) Odstęp między zapytaniami ≥ 400 ms
  mark = calls.length; CK.convCache.clear();
  await Promise.all([1, 2, 3, 4].map(i => CK.getConversation(ID(30 + i))));
  const ts = calls.slice(mark).filter(c => c.url.includes("/backend-api/")).map(c => c.t);
  const gaps = ts.slice(1).map((t, i) => t - ts[i]);
  assert(gaps.length === 3 && Math.min(...gaps) >= 390, "odstęp między zapytaniami ≥ 400 ms: " + gaps.join(", "));

  // 6) HTTP 429: jedno zapytanie (bez 5 ponowień), przerwa ≥ 60 s mimo Retry-After 5 s, zapis dla wszystkich kart
  mode = "429"; mark = calls.length; CK.convCache.clear();
  const r = await CK.withRetry(() => CK.api("/conversation/" + ID(40), { bg: true }), { bg: true });
  if (process.env.DBG) console.log("    zapytania:", calls.slice(mark).map(c => c.url.replace("https://chatgpt.com", "") + " @" + (c.t - calls[mark].t) + " " + (c.stack || "")).join("\n | "));
  assert(r.status === 429 && backend(mark) === 1, `429 w tle: 1 zapytanie, bez ponawiania (jest ${backend(mark)})`);
  const p1 = CK.limit.pausedFor();
  assert(p1 > 55000 && p1 <= 60000, "przerwa po 429: 60 s (min.), także gdy Retry-After = 5 s");
  assert(+w.localStorage.getItem("ckp.pauseUntil") > Date.now() + 50000, "przerwa zapisana dla wszystkich kart ChatGPT (localStorage)");

  // 7) W czasie przerwy zapytania w tle nie wychodzą do sieci
  mark = calls.length;
  for (let i = 0; i < 5; i++) await CK.getConversation(ID(50 + i), { bg: true }).catch(() => {});
  await CK.api("/conversations?offset=0&limit=100&order=updated", { bg: true });
  assert(backend(mark) === 0, `przerwa: 6 zapytań w tle → 0 do serwera (jest ${backend(mark)})`);

  // 8) Kolejne 429 z rzędu → przerwa dwa razy dłuższa
  CK.limit._reset(); w.localStorage.setItem("ckp.pauseStreak", "1");
  await CK.api("/conversation/" + ID(60), { bg: true });
  assert(CK.limit.pausedFor() > 115000, "drugie 429 z rzędu: przerwa 120 s");
  // sukces zeruje serię
  CK.limit._reset(); w.localStorage.setItem("ckp.pauseStreak", "3"); mode = "ok";
  await CK.api("/conversation/" + ID(61), { bg: true });
  assert(w.localStorage.getItem("ckp.pauseStreak") === "0", "udane zapytanie zeruje serię przerw");

  // 9) Operacja użytkownika w czasie przerwy czeka i rusza sama
  CK.limit._reset(); mode = "ok";
  const until = Date.now() + 1500; w.localStorage.setItem("ckp.pauseUntil", String(until));
  mark = calls.length; const t0 = Date.now(); let notified = null;
  const off = CK.limit.onChange((ms, kind) => { notified = kind; });
  const ok = await CK.patchConversation(ID(70), { title: "x" }); off();
  assert(notified === "wait", "operacja czekająca na przerwę informuje panel (komunikat z odliczaniem)");
  assert(ok && Date.now() - t0 >= 1400 && backend(mark) === 1, "operacja użytkownika: czeka do końca przerwy, potem 1 zapytanie");

  // 10) 5xx: maks. 2 ponowienia
  CK.limit._reset();
  const realFetch = w.fetch; let n5 = 0;
  w.fetch = (url, o) => String(url).includes("/backend-api/") ? (n5++, resp({}, 502)) : realFetch(url, o);
  await CK.withRetry(() => CK.api("/conversation/" + ID(80)));
  w.fetch = realFetch;
  assert(n5 === 3, `błąd 502: 1 + 2 ponowienia (jest ${n5})`);

  // 11) Karta w tle nic nie pobiera
  Object.defineProperty(w.document, "visibilityState", { configurable: true, get: () => "hidden" });
  CK.limit._reset(); mark = calls.length; CK.convCache.clear(); go(ID(90)); await sleep(6000);
  assert(convGets(mark) === 0, "karta w tle: 0 pobrań");
  Object.defineProperty(w.document, "visibilityState", { configurable: true, get: () => "visible" });
  await sleep(4000);
  if (process.env.DBG) console.log(calls.slice(mark).map(c => c.url + " " + c.stack).join("\n"));
  assert(convGets(mark) === 1, "po powrocie do karty: 1 pobranie");
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => setTimeout(() => process.exit(), 50));
