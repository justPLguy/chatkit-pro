// 1.5.1: pamięć listy czatów — po ponownym otwarciu ChatGPT panel od razu pokazuje wszystkie czaty,
// a w tle sam dociąga i sprawdza całą listę (bez klikania „Wczytaj wszystkie”).
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path");
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf8"));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); fails++; process.exitCode = 1; } else console.log("ok  -", m); };
const now = Date.now() / 1000;
let CHATS = Array.from({ length: 250 }, (_, i) => ({ id: "c" + i, title: "Czat " + i, update_time: now - i * 60, create_time: now - i * 60 - 30 }));
const storage = {};

function boot(user) {
  const dom = new JSDOM(`<!DOCTYPE html><html lang="pl-PL"><body><nav></nav><textarea id="prompt-textarea"></textarea></body></html>`,
    { url: "https://chatgpt.com/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window; w.__calls = [];
  const res = (o, s = 200) => Promise.resolve({ ok: s < 300, status: s, json: async () => o });
  w.fetch = (url, opts = {}) => {
    url = String(url); w.__calls.push({ url, method: opts.method || "GET" });
    if (url.includes("/api/auth/session")) return res({ accessToken: "T", user: { id: user } });
    if (url.includes("/backend-api/conversations")) {
      const u = new URL(url, "https://chatgpt.com"); const off = +u.searchParams.get("offset"), lim = +u.searchParams.get("limit");
      if (u.searchParams.get("is_archived") === "true") return res({ items: [], total: 0 });
      return res({ items: CHATS.slice(off, off + lim), total: CHATS.length });
    }
    if (url.match(/\/backend-api\/conversation\/[^/?]+$/) && opts.method === "PATCH") return res({ success: true });
    return res({}, 404);
  };
  w.chrome = {
    runtime: { getManifest: () => ({ version: "1.5.1" }), sendMessage: async () => ({ ok: true }), onMessage: { addListener: fn => { w.__onMsg = fn; } } },
    storage: { local: {
      get: async keys => Object.fromEntries([].concat(keys).filter(k => k in storage).map(k => [k, JSON.parse(JSON.stringify(storage[k]))])),
      set: async obj => Object.assign(storage, JSON.parse(JSON.stringify(obj))), remove: async k => { delete storage[k]; }
    }, onChanged: { addListener() {} } }
  };
  w.confirm = () => true; w.TextEncoder = TextEncoder;
  storage.welcomeSeen = 1;
  for (const f of manifest.content_scripts[0].js) w.eval(fs.readFileSync(path.join(__dirname, "..", f), "utf8"));
  return w;
}
const rows = w => w.document.getElementById("chatkit-pro-host").shadowRoot.querySelectorAll("#list .item").length;
const convCalls = w => w.__calls.filter(c => c.url.includes("/backend-api/conversations?") && !c.url.includes("is_archived")).length;

(async () => {
  // 1) pierwsze otwarcie: 100 od razu, reszta dociąga się sama w tle
  let w = boot("u1"); await sleep(400);
  w.__onMsg({ type: "ck-toggle" }); await sleep(600);
  assert(rows(w) === 100, "pierwsze otwarcie: najpierw 100 czatów (" + rows(w) + ")");
  await sleep(3500);
  assert(rows(w) === 250, "po chwili sama dociąga wszystkie 250 bez klikania (" + rows(w) + ")");
  await sleep(1200);
  const key = Object.keys(storage).find(k => k.startsWith("ckp.list.chats."));
  assert(key && storage[key].i.length === 250 && storage[key].c === true, "lista zapamiętana lokalnie (" + (key || "brak") + ")");
  assert(key && key.endsWith(".u1:"), "pamięć listy przypisana do konta");
  w.close();

  // 2) ponowne uruchomienie przeglądarki: lista z pamięci od razu, bez czekania na sieć
  CHATS = [{ id: "nowy", title: "Nowy czat po restarcie", update_time: now + 10, create_time: now + 5 }, ...CHATS.filter(c => c.id !== "c5")];
  w = boot("u1"); await sleep(400);
  w.__onMsg({ type: "ck-toggle" }); await sleep(150);
  assert(rows(w) >= 250, "po restarcie od razu cała lista z pamięci (" + rows(w) + ")");
  await sleep(1500);
  const titles = [...w.document.getElementById("chatkit-pro-host").shadowRoot.querySelectorAll("#list .item")].map(e => e.textContent);
  assert(titles.some(t => t.includes("Nowy czat po restarcie")), "nowy czat dopisany z góry listy");
  await sleep(3500);
  const t2 = [...w.document.getElementById("chatkit-pro-host").shadowRoot.querySelectorAll("#list .item")].map(e => e.textContent);
  assert(t2.length === 250 && !t2.some(t => /Czat 5\b/.test(t)), "czat usunięty gdzie indziej (np. w telefonie) znika po cichym sprawdzeniu (" + t2.length + ")");
  w.close();

  // 3) inne konto nie widzi listy pierwszego
  w = boot("u2"); await sleep(400);
  w.__onMsg({ type: "ck-toggle" }); await sleep(150);
  assert(rows(w) === 0 || rows(w) === 100, "inne konto: bez cudzej listy z pamięci (" + rows(w) + ")");
  w.close();
  console.log(fails ? "LIST-CACHE: BŁĘDY " + fails : "LIST-CACHE: OK");
  process.exit(fails ? 1 : 0);
})();
