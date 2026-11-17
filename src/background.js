// ChatKit Pro — service worker.
// 1) Kliknięcie ikony na pasku Chrome otwiera/zamyka panel na stronie ChatGPT.
// 2) Zapis plików z Biblioteki przez chrome.downloads (omija ograniczenia CORS).

const CONTENT_FILES = ["src/core.js", "src/i18n.js", "src/dom.js", "src/export.js", "src/timestamps.js", "src/theme.js", "src/sidebar.js", "src/search.js", "src/panel.js", "src/prompts.js", "src/minimap.js", "src/tabs-extra.js"];
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
    // Karta była otwarta przed instalacją/aktualizacją wtyczki — wstrzyknij skrypty teraz.
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: CONTENT_FILES });
      await chrome.tabs.sendMessage(tab.id, { type: "ck-toggle", open: true });
    } catch (e) {
      console.warn("[ChatKit Pro] nie udało się otworzyć panelu:", e);
      chrome.tabs.reload(tab.id);
    }
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
