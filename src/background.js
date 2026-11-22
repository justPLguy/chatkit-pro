// ChatKit Pro — service worker.
// 1) Ikona na pasku przeglądarki = włącznik wtyczki. Czerwona = włączona, szara = wyłączona (znika z ChatGPT).
//    Na karcie spoza ChatGPT kliknięcie otwiera ChatGPT (i włącza wtyczkę, jeśli była wyłączona).
// 2) Zapis plików z Biblioteki przez chrome.downloads (omija ograniczenia CORS).
// 3) Sprawdzanie aktualizacji: raz na dobę publiczne API GitHub Releases (bez wysyłania jakichkolwiek danych).

const isChatGPT = url => /^https:\/\/(chatgpt\.com|chat\.openai\.com)(\/|$)/.test(url || "");
const ICONS = on => {
  const suf = on ? "" : "-off";
  return { 16: `/icons/icon16${suf}.png`, 48: `/icons/icon48${suf}.png`, 128: `/icons/icon128${suf}.png` };
};
const msg = (k, fallback) => { try { return chrome.i18n.getMessage(k) || fallback; } catch { return fallback; } };

async function isOn() {
  const { enabled } = await chrome.storage.local.get("enabled");
  return enabled !== false;
}

// Ikona + podpis: stan włącznika i ewentualna nowa wersja.
async function refreshAction() {
  const on = await isOn();
  const { update } = await chrome.storage.local.get("update");
  const avail = !!(update && update.available && update.latest);
  try { await chrome.action.setIcon({ path: ICONS(on) }); } catch (e) { console.warn("[ChatKit Pro] ikona", e.message); }
  try {
    await chrome.action.setTitle({ title: "ChatKit Pro by JustPLGuy — " + (on ? msg("actionOn", "ON (click to turn off)") : msg("actionOff", "OFF (click to turn on)")) + (avail ? ` · v${update.latest} ⬆` : "") });
    await chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
    await chrome.action.setBadgeText({ text: avail ? "1" : "" });
  } catch {}
}

chrome.action.onClicked.addListener(async tab => {
  const on = await isOn();
  // Poza ChatGPT: otwórz ChatGPT (włączając wtyczkę, jeśli była wyłączona).
  if (!isChatGPT(tab.url)) {
    if (!on) await chrome.storage.local.set({ enabled: true });
    await chrome.tabs.create({ url: "https://chatgpt.com/" });
    return refreshAction();
  }
  await chrome.storage.local.set({ enabled: !on });
  await refreshAction();
  // Włączanie na karcie otwartej przed instalacją (bez skryptów wtyczki) — przeładuj ją.
  if (!on) {
    try { await chrome.tabs.sendMessage(tab.id, { type: "ck-ping" }); }
    catch { chrome.tabs.reload(tab.id); }
  }
});

chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && (ch.enabled || ch.update)) refreshAction(); });

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg && msg.type === "ck-download" && typeof msg.url === "string") {
    chrome.downloads.download(
      { url: msg.url, filename: msg.filename, saveAs: false, conflictAction: "uniquify" },
      id => reply(chrome.runtime.lastError ? { ok: false, error: chrome.runtime.lastError.message } : { ok: true, id })
    );
    return true; // odpowiedź asynchroniczna
  }
});

// ===================== Aktualizacje =====================
const REPO = "justPLguy/chatkit-pro";
const TAG_PREFIX = "chrome-v";          // wydania Chrome; Firefox będzie miał własny prefiks
const DAY = 24 * 60 * 60 * 1000;

const cmpVersion = (a, b) => {
  const pa = String(a).split(".").map(n => parseInt(n, 10) || 0), pb = String(b).split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length, 3); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d > 0 ? 1 : -1; }
  return 0;
};

// Wersja ze Chrome Web Store aktualizuje się sama — sprawdzamy GitHub tylko przy instalacji z ZIP-a (tryb dewelopera).
async function isStoreInstall() {
  try { return (await chrome.management.getSelf()).installType === "normal"; } catch { return false; }
}

async function checkUpdate(force = false) {
  const current = chrome.runtime.getManifest().version;
  if (await isStoreInstall()) {
    const res = { checkedAt: Date.now(), current, latest: null, url: null, store: true, available: false };
    await chrome.storage.local.set({ update: res });
    await refreshAction();
    return res;
  }
  const { update: prev } = await chrome.storage.local.get("update");
  if (!force && prev && prev.current === current && Date.now() - prev.checkedAt < DAY) return prev;
  let res = { checkedAt: Date.now(), current, latest: null, url: null, date: null, error: null };
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, {
      headers: { Accept: "application/vnd.github+json" }, cache: "no-store", credentials: "omit"
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const best = (await r.json())
      .filter(x => !x.draft && !x.prerelease && typeof x.tag_name === "string" && x.tag_name.startsWith(TAG_PREFIX))
      .map(x => ({ v: x.tag_name.slice(TAG_PREFIX.length).replace(/^v/i, ""), url: x.html_url, date: x.published_at }))
      .sort((a, b) => cmpVersion(b.v, a.v))[0];
    if (best) Object.assign(res, { latest: best.v, url: best.url, date: best.date });
  } catch (e) {
    res = { ...(prev && prev.current === current ? prev : res), checkedAt: Date.now(), error: e.message };
  }
  res.available = !!(res.latest && cmpVersion(res.latest, current) > 0);
  await chrome.storage.local.set({ update: res });
  await refreshAction();
  return res;
}

// ===================== „Co nowego” po aktualizacji (od 1.3.0) =====================
// Po aktualizacji do nowej wersji (zmiana X.Y, nie poprawka X.Y.Z) otwieramy raz stronę „Co nowego” w języku wtyczki.
// Instalacja nie otwiera niczego. Wyłączysz to w ⚙ Ustawieniach („Pokaż »Co nowego« po aktualizacji”).
// Od 1.5.0 strona jest na własnej domenie (stary adres justplguy.github.io/chatkit-pro przekierowuje tutaj).
const WHATS_NEW = "https://chatkit.justplguy.com/releases/";
const SITE_LANGS = ["en", "pl", "fr", "de", "es", "pt-BR", "it", "nl", "cs", "uk", "tr", "ja", "zh-CN", "ko"];
const minorOf = v => String(v || "").split(".").slice(0, 2).map(n => parseInt(n, 10) || 0).join(".");
function siteLang(pref) {
  for (const l of [pref, chrome.i18n && chrome.i18n.getUILanguage && chrome.i18n.getUILanguage()]) {
    if (!l || l === "auto") continue;
    if (SITE_LANGS.includes(l)) return l;
    const c = String(l).slice(0, 2).toLowerCase();
    if (c === "pt") return "pt-BR";
    if (c === "zh") return "zh-CN";
    if (SITE_LANGS.includes(c)) return c;
  }
  return "en";
}
async function showWhatsNew(previousVersion) {
  const current = chrome.runtime.getManifest().version;
  if (!previousVersion || minorOf(previousVersion) === minorOf(current) || cmpVersion(current, previousVersion) <= 0) return false;
  const { settings } = await chrome.storage.local.get("settings");
  if (settings && settings.whatsNew === false) return false;
  const anchor = "#v" + current.split(".").slice(0, 3).join("-");
  // updated=… → strona pokazuje pasek „ChatKit Pro zaktualizował się do vX”
  await chrome.tabs.create({ url: `${WHATS_NEW}?lang=${encodeURIComponent(siteLang(settings && settings.lang))}&updated=${encodeURIComponent(current)}${anchor}` });
  return true;
}

chrome.runtime.onInstalled.addListener(async ({ reason, previousVersion } = {}) => {
  // Instalacja nie otwiera żadnej karty (od 1.2.0) — karta powitalna pokaże się przy pierwszym otwarciu panelu na ChatGPT.
  if (reason === "update") { try { await showWhatsNew(previousVersion); } catch (e) { console.warn("[ChatKit Pro] co nowego", e.message); } }
  if (chrome.alarms && !(await isStoreInstall())) chrome.alarms.create("ck-update", { periodInMinutes: 24 * 60 });
  checkUpdate(true);
});
chrome.runtime.onStartup.addListener(() => { refreshAction(); checkUpdate(); });
refreshAction();
// Wersja do Chrome Web Store nie ma uprawnienia "alarms" (aktualizuje ją Chrome) — wtedy tego nie rejestrujemy.
if (chrome.alarms) chrome.alarms.onAlarm.addListener(a => { if (a.name === "ck-update") checkUpdate(true); });
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg && msg.type === "ck-check-update") { checkUpdate(!!msg.force).then(reply, e => reply({ error: e.message })); return true; }
});
