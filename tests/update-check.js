// Test sprawdzania aktualizacji w service workerze (src/background.js).
const fs = require("fs"), path = require("path"), vm = require("vm");
const store = {}, badge = {}, listeners = {};
const ev = name => ({ addListener: fn => { listeners[name] = fn; } });
let releases = [
  { tag_name: "chrome-v1.0.0", html_url: "https://github.com/x/y/releases/tag/chrome-v1.0.0", draft: false, prerelease: false },
  { tag_name: "chrome-v1.1.0", html_url: "https://github.com/x/y/releases/tag/chrome-v1.1.0", draft: false, prerelease: false },
  { tag_name: "firefox-v2.0.0", html_url: "f", draft: false, prerelease: false },
  { tag_name: "chrome-v9.0.0", html_url: "d", draft: true, prerelease: false },
  { tag_name: "chrome-v1.2.0-beta", html_url: "p", draft: false, prerelease: true }
];
let fetchCalls = 0;
const ctx = {
  console, URL, setTimeout,
  fetch: async url => { fetchCalls++; return { ok: true, status: 200, json: async () => releases }; },
  chrome: {
    runtime: { getManifest: () => ({ version: "1.0.0" }), onInstalled: ev("installed"), onStartup: ev("startup"), onMessage: { addListener: fn => { (listeners.msg = listeners.msg || []).push(fn); } }, lastError: null },
    action: { onClicked: ev("clicked"), setBadgeText: async o => { badge.text = o.text; }, setBadgeBackgroundColor: async () => {}, setTitle: async o => { badge.title = o.title; } },
    alarms: { create: (n, o) => { store.__alarm = o.periodInMinutes; }, onAlarm: ev("alarm") },
    storage: { local: { get: async k => ({ [k]: store[k] }), set: async o => Object.assign(store, JSON.parse(JSON.stringify(o))) } },
    tabs: {}, scripting: {}, downloads: {}
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
  assert(store.update && store.update.latest === "1.1.0", "najnowsza wersja Chrome = 1.1.0 (pomija Firefox, szkice, beta): " + store.update?.latest);
  assert(store.update.available === true && badge.text === "1", "plakietka na ikonie przy nowej wersji");
  const before = fetchCalls;
  await ask(false);
  assert(fetchCalls === before, "bez wymuszenia: korzysta z wyniku z ostatnich 24 h");
  releases = releases.filter(r => r.tag_name !== "chrome-v1.1.0");
  const r = await ask(true);
  assert(fetchCalls === before + 1 && r.latest === "1.0.0" && r.available === false && badge.text === "", "wymuszone sprawdzenie: aktualna wersja → brak plakietki");
  ctx.fetch = async () => ({ ok: false, status: 403, json: async () => ({}) });
  const e = await ask(true);
  assert(e.error === "HTTP 403" && e.latest === "1.0.0", "błąd API nie kasuje ostatniej znanej wersji");
})();
