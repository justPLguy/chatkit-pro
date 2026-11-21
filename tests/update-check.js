// Test sprawdzania aktualizacji w service workerze (src/background.js).
const fs = require("fs"), path = require("path"), vm = require("vm");
const store = {}, badge = {}, listeners = {};
const ev = name => ({ addListener: fn => { listeners[name] = fn; } });
let releases = [
  { tag_name: "firefox-v1.0.0", html_url: "https://github.com/x/y/releases/tag/firefox-v1.0.0", draft: false, prerelease: false },
  { tag_name: "firefox-v1.1.0", html_url: "https://github.com/x/y/releases/tag/firefox-v1.1.0", draft: false, prerelease: false },
  { tag_name: "chrome-v2.0.0", html_url: "f", draft: false, prerelease: false },
  { tag_name: "firefox-v9.0.0", html_url: "d", draft: true, prerelease: false },
  { tag_name: "firefox-v1.2.0-beta", html_url: "p", draft: false, prerelease: true }
];
let fetchCalls = 0;
const ctx = {
  console, URL, setTimeout,
  fetch: async url => { fetchCalls++; return { ok: true, status: 200, json: async () => releases }; },
  chrome: {
    runtime: { getManifest: () => ({ version: "1.0.0" }), onInstalled: ev("installed"), onStartup: ev("startup"), onMessage: { addListener: fn => { (listeners.msg = listeners.msg || []).push(fn); } }, lastError: null },
    i18n: { getMessage: k => ({ actionOn: "ON", actionOff: "OFF" })[k] || "" },
    action: { onClicked: ev("clicked"), setIcon: async o => { badge.icon = o.path[16]; }, setBadgeText: async o => { badge.text = o.text; }, setBadgeBackgroundColor: async () => {}, setTitle: async o => { badge.title = o.title; } },
    alarms: { create: (n, o) => { store.__alarm = o.periodInMinutes; }, onAlarm: ev("alarm") },
    storage: { local: { get: async k => ({ [k]: store[k] }), set: async o => Object.assign(store, JSON.parse(JSON.stringify(o))) }, onChanged: ev("changed") },
    tabs: { create: o => { ctx.__tabOpened = true; (ctx.__tabs = ctx.__tabs || []).push(o.url); }, sendMessage: async () => ({ ok: true }), reload: () => { ctx.__reloaded = true; } }, downloads: {},
    management: { getSelf: async () => ({ installType: ctx.__installType || "development" }) }
  }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", "background.js"), "utf8"), ctx);
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exitCode = 1; } else console.log("ok  -", m); };
const ask = force => new Promise(res => { const r = listeners.msg.map(fn => fn({ type: "ck-check-update", force }, {}, res)); });
(async () => {
  listeners.installed();
  await new Promise(r => setTimeout(r, 50));
  assert(store.__alarm === 1440, "alarm co 24 h");
  listeners.installed({ reason: "install" }); await new Promise(r => setTimeout(r, 50));
  assert(!ctx.__tabOpened && !store.openPanelAt, "pierwsza instalacja: NIE otwiera żadnej karty");
  // „Co nowego” po aktualizacji: tylko przy nowej wersji X.Y, w języku wtyczki, z możliwością wyłączenia
  const tabsNow = () => (ctx.__tabs || []).length;
  store.settings = { lang: "pt-BR" };
  listeners.installed({ reason: "update", previousVersion: "0.9.3" }); await new Promise(r => setTimeout(r, 50));
  const url1 = (ctx.__tabs || [])[0] || "";
  listeners.installed({ reason: "update", previousVersion: "1.0.0" }); await new Promise(r => setTimeout(r, 50));
  store.settings = { lang: "auto", whatsNew: false };
  listeners.installed({ reason: "update", previousVersion: "0.8.0" }); await new Promise(r => setTimeout(r, 50));
  assert(url1 === "https://justplguy.github.io/chatkit-pro/releases/?lang=pt-BR&updated=1.0.0#v1-0-0" && tabsNow() === 1,
    "po aktualizacji X.Y: otwiera „Co nowego” raz (ta sama wersja / wyłączone w ustawieniach = nic): " + url1);
  delete store.settings; ctx.__tabOpened = false;
  assert(store.update && store.update.latest === "1.1.0", "najnowsza wersja Chrome = 1.1.0 (pomija Firefox, szkice, beta): " + store.update?.latest);
  assert(store.update.available === true && badge.text === "1", "plakietka na ikonie przy nowej wersji");
  const before = fetchCalls;
  await ask(false);
  assert(fetchCalls === before, "bez wymuszenia: korzysta z wyniku z ostatnich 24 h");
  releases = releases.filter(r => r.tag_name !== "firefox-v1.1.0");
  const r = await ask(true);
  assert(fetchCalls === before + 1 && r.latest === "1.0.0" && r.available === false && badge.text === "", "wymuszone sprawdzenie: aktualna wersja → brak plakietki");
  ctx.fetch = async () => ({ ok: false, status: 403, json: async () => ({}) });
  const e = await ask(true);
  assert(e.error === "HTTP 403" && e.latest === "1.0.0", "błąd API nie kasuje ostatniej znanej wersji");
  ctx.__installType = "normal"; let fetched = false;
  ctx.fetch = async () => { fetched = true; return { ok: true, json: async () => [] }; };
  const st = await ask(true);
  assert(st.store === true && !st.available && !fetched && badge.text === "", "wersja ze sklepu: nie pyta GitHuba i nie pokazuje paska");
  // włącznik na ikonie
  {
    const gpt = { id: 1, url: "https://chatgpt.com/c/x" };
    await listeners.clicked(gpt); await new Promise(r => setTimeout(r, 20));
    const off = store.enabled === false && badge.icon.endsWith("icon16-off.png") && badge.title.includes("OFF");
    await listeners.clicked(gpt); await new Promise(r => setTimeout(r, 20));
    const on = store.enabled === true && badge.icon === "/icons/icon16.png" && badge.title.includes("ON");
    assert(off && on, "ikona: klik na ChatGPT wyłącza (szara) i włącza (czerwona)");
    store.enabled = false; ctx.__tabOpened = false;
    await listeners.clicked({ id: 2, url: "https://example.com/" }); await new Promise(r => setTimeout(r, 20));
    assert(store.enabled === true && ctx.__tabOpened, "ikona poza ChatGPT: włącza i otwiera ChatGPT");
  }
})();
