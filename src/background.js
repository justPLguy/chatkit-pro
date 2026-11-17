// ChatKit Pro — service worker.
// 1) Kliknięcie ikony na pasku Chrome otwiera/zamyka panel na stronie ChatGPT.
//    Karta otwarta przed instalacją nie ma jeszcze skryptów — wtedy ją przeładowujemy i panel otwiera się sam.
// 2) Zapis plików z Biblioteki przez chrome.downloads (omija ograniczenia CORS).
// 3) Sprawdzanie aktualizacji: raz na dobę publiczne API GitHub Releases (bez wysyłania jakichkolwiek danych).

const isChatGPT = url => /^https:\/\/(chatgpt\.com|chat\.openai\.com)(\/|$)/.test(url || "");

chrome.action.onClicked.addListener(async tab => {
  // Nie na ChatGPT → otwórz ChatGPT i od razu pokaż panel.
  if (!isChatGPT(tab.url)) {
    await chrome.storage.local.set({ openPanelAt: Date.now() });
    await chrome.tabs.create({ url: "https://chatgpt.com/" });
    return;
  }
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "ck-toggle" });
  } catch {
    // Karta była otwarta przed instalacją/aktualizacją — przeładuj ją, panel otworzy się po załadowaniu.
    await chrome.storage.local.set({ openPanelAt: Date.now() });
    chrome.tabs.reload(tab.id);
  }
});

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
    try { await chrome.action.setBadgeText({ text: "" }); } catch {}
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
  try {
    await chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
    await chrome.action.setBadgeText({ text: res.available ? "1" : "" });
    await chrome.action.setTitle({ title: res.available ? `ChatKit Pro by JustPLGuy — v${res.latest} ⬆` : "ChatKit Pro by JustPLGuy" });
  } catch {}
  return res;
}

chrome.runtime.onInstalled.addListener(async ({ reason } = {}) => {
  // Pierwsza instalacja: otwórz ChatGPT z panelem i kartą powitalną.
  if (reason === "install") {
    await chrome.storage.local.set({ openPanelAt: Date.now() });
    chrome.tabs.create({ url: "https://chatgpt.com/" });
  }
  if (chrome.alarms && !(await isStoreInstall())) chrome.alarms.create("ck-update", { periodInMinutes: 24 * 60 });
  checkUpdate(true);
});
chrome.runtime.onStartup.addListener(() => checkUpdate());
// Wersja do Chrome Web Store nie ma uprawnienia "alarms" (aktualizuje ją Chrome) — wtedy tego nie rejestrujemy.
if (chrome.alarms) chrome.alarms.onAlarm.addListener(a => { if (a.name === "ck-update") checkUpdate(true); });
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg && msg.type === "ck-check-update") { checkUpdate(!!msg.force).then(reply, e => reply({ error: e.message })); return true; }
});
