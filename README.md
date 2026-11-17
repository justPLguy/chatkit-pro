<p align="center"><img src="assets/icon128.png" width="104" alt="ChatKit Pro"></p>

<h1 align="center">ChatKit Pro by JustPLGuy</h1>

<p align="center">
<b>Free, open-source power tools for ChatGPT.</b><br>
Bulk delete · Library cleanup · Folders · Export · Prompts · Minimap · Full-text search<br><br>
<a href="../../releases"><b>⬇ Download (Releases)</b></a> ·
<a href="https://justplguy.github.io/chatkit-pro/"><b>🌐 Website</b></a> ·
<a href="../../tree/chrome"><b>🧩 Chrome source</b></a> ·
<a href="../../issues"><b>🐞 Report an issue</b></a>
</p>

<p align="center"><a href="#-english">🇬🇧 English</a> · <a href="#-polski">🇵🇱 Polski</a></p>

---

## 🇬🇧 English

ChatGPT lets you delete chats only one at a time, keeps every image in the Library even after you delete the chat, and has no folders, export or bulk actions. **ChatKit Pro adds all of that — free, with no account and no servers.**

### Repository layout

This repository uses **one branch per browser**:

| Branch | Contents | Status |
|---|---|---|
| **`main`** *(you are here)* | project overview, website (`index.html`), license | — |
| **[`chrome`](../../tree/chrome)** | extension for Chrome, Edge, Brave, Opera | ✅ **v1.0.0** |
| `firefox` | extension for Firefox | 🔜 planned |

**Downloads are published only in [Releases](../../releases)** — one release per browser and version (e.g. `chrome-v1.0.0`).
Please don't use “Code → Download ZIP” on `main`: it doesn't contain the extension.

### Features
- 📦 **Bulk delete, archive & restore** chats — checkboxes, Shift+click ranges, filters
- 🖼️ **Library cleanup** — bulk delete/download images and files, size sorting, AI/uploaded/project filters
- 🗂️ **Folders & stars** — nested, colored, drag & drop; also shown in the ChatGPT sidebar
- 📤 **Export** to Markdown, HTML or PDF with per-message timestamps
- ⏰ **Timestamps** above every message
- 📚 **Prompt library** with `{{variables}}`, quick insert (`Alt+Shift+P` or `//`)
- 🗺️ **Minimap**, 🔖 **bookmarks** and 📝 **notes** inside chats
- 🔍 **Full-text search** across all chats (local index)
- 🧹 **Cleanup rules** with preview · 📊 **Statistics** · 🌙 **Classic dark mode**
- 🌐 **English, Polish, French, German**

### Install (Chrome)
1. Download **`ChatKit-Pro-Chrome-v1.0.0.zip`** from [Releases](../../releases) and unzip it.
2. Open `chrome://extensions`, switch on **Developer mode**.
3. **Load unpacked** → choose the unzipped folder.
4. Pin the extension and click its icon on [chatgpt.com](https://chatgpt.com).

Full guide: [`chrome` branch README](../../tree/chrome#readme).

### Privacy
No servers, no analytics, no account. The extension talks only to chatgpt.com with your existing session; all your data (folders, prompts, notes…) stays in your browser.

### Roadmap
- [x] Chrome v1.0.0
- [ ] Firefox branch
- [ ] Chrome Web Store listing
- [ ] Move chats to Projects in bulk, empty the Library trash
- [ ] More languages

---

## 🇵🇱 Polski

ChatGPT pozwala usuwać czaty tylko pojedynczo, trzyma każdy obrazek w Bibliotece nawet po usunięciu czatu i nie ma folderów, eksportu ani operacji hurtowych. **ChatKit Pro dodaje to wszystko — za darmo, bez konta i bez serwerów.**

### Układ repozytorium

Repozytorium ma **osobną gałąź dla każdej przeglądarki**:

| Gałąź | Zawartość | Status |
|---|---|---|
| **`main`** *(tutaj jesteś)* | opis projektu, strona (`index.html`), licencja | — |
| **[`chrome`](../../tree/chrome)** | wtyczka dla Chrome, Edge, Brave, Opery | ✅ **v1.0.0** |
| `firefox` | wtyczka dla Firefoksa | 🔜 w planach |

**Pliki do pobrania są wyłącznie w [Releases](../../releases)** — osobne wydanie dla każdej przeglądarki i wersji (np. `chrome-v1.0.0`).
Nie używaj „Code → Download ZIP” na gałęzi `main` — nie ma tu wtyczki.

### Funkcje
- 📦 **Masowe usuwanie, archiwizacja i przywracanie** czatów — checkboxy, Shift+klik, filtry
- 🖼️ **Czyszczenie Biblioteki** — hurtowe usuwanie i pobieranie zdjęć/plików, sortowanie po rozmiarze, filtry AI/wgrane/projekty
- 🗂️ **Foldery i gwiazdki** — zagnieżdżone, kolorowe, przeciąganie; widoczne też w pasku bocznym ChatGPT
- 📤 **Eksport** do Markdown, HTML lub PDF z godziną każdej wiadomości
- ⏰ **Znaczniki czasu** nad każdą wiadomością
- 📚 **Biblioteka promptów** ze zmiennymi `{{...}}`, szybkie wstawianie (`Alt+Shift+P` albo `//`)
- 🗺️ **Minimapa**, 🔖 **zakładki** i 📝 **notatki** w czacie
- 🔍 **Wyszukiwanie w treści** wszystkich czatów (lokalny indeks)
- 🧹 **Reguły sprzątania** z podglądem · 📊 **Statystyki** · 🌙 **Klasyczny tryb ciemny**
- 🌐 **Polski, angielski, francuski, niemiecki**

### Instalacja (Chrome)
1. Pobierz **`ChatKit-Pro-Chrome-v1.0.0.zip`** z [Releases](../../releases) i rozpakuj.
2. Otwórz `chrome://extensions`, włącz **Tryb dewelopera**.
3. **Załaduj rozpakowane** → wskaż rozpakowany folder.
4. Przypnij wtyczkę i kliknij jej ikonę na [chatgpt.com](https://chatgpt.com).

Pełna instrukcja: [README gałęzi `chrome`](../../tree/chrome#readme).

### Prywatność
Bez serwerów, analityki i konta. Wtyczka łączy się tylko z chatgpt.com z Twojej sesji; wszystkie dane (foldery, prompty, notatki…) zostają w przeglądarce.

---

**License / Licencja:** [MIT](LICENSE)

*ChatKit Pro by JustPLGuy is an independent project and is not affiliated with, endorsed by, or sponsored by OpenAI. ChatGPT is a trademark of OpenAI.*
