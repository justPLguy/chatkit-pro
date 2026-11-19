<p align="center"><img src="assets/icon128.png" width="104" alt="ChatKit Pro"></p>

<h1 align="center">ChatKit Pro by JustPLGuy</h1>

<p align="center">
<b>Free, open-source power tools for ChatGPT.</b><br>
Bulk delete · Library cleanup · Folders · Export · Prompts · Minimap · Full-text search<br><br>
<a href="https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh"><b>🛒 Add to Chrome (Chrome Web Store)</b></a><br><br>
<a href="../../releases"><b>⬇ GitHub Releases</b></a> ·
<a href="https://justplguy.github.io/chatkit-pro/"><b>🌐 Website</b></a> ·
<a href="../../tree/chrome"><b>🧩 Chrome</b></a> ·
<a href="../../tree/firefox"><b>🦊 Firefox</b></a> ·
<a href="../../issues"><b>🐞 Report an issue</b></a> ·
<a href="mailto:justplguy@gmail.com"><b>✉ Contact</b></a>
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
| **[`chrome`](../../tree/chrome)** | extension for Chrome, Edge, Brave, Opera | ✅ **v1.2.0** |
| **[`firefox`](../../tree/firefox)** | extension for Firefox 140+ | ✅ **v1.1.0** |

**Downloads are published only in [Releases](../../releases)** — one release per browser and version (e.g. `chrome-v1.2.0`, `firefox-v1.1.0`).
**Store listings:** [Chrome Web Store](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh) ✅ · Firefox Add-ons ⏳ in review.
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
**Recommended:** [**Add to Chrome — Chrome Web Store**](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh) (one click, automatic updates; also works in Edge, Brave and Opera).

**Manual install from GitHub:**
1. Download **`ChatKit-Pro-Chrome-v1.2.0.zip`** from [Releases](../../releases) and unzip it.
2. Open `chrome://extensions`, switch on **Developer mode**.
3. **Load unpacked** → choose the unzipped folder.
4. Pin the extension, open [chatgpt.com](https://chatgpt.com) and click the round 🧰 button (or `Alt+Shift+K`). The CK icon is the on/off switch.

Full guide: [`chrome` branch README](../../tree/chrome#readme).

**Moving from the GitHub version to the store version?** Your folders, stars, prompts and notes belong to each installation, so move them: in the GitHub version open the panel → ⚙ Settings → **Export data (JSON)**, remove the GitHub version, add ChatKit Pro from the [Chrome Web Store](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh), then ⚙ Settings → **Import data**.

### Install (Firefox)
Firefox Add-ons listing is in review. Until then you can test it: download **`ChatKit-Pro-Firefox-v1.1.0.zip`** from [Releases](../../releases), unzip, open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → pick `manifest.json` (temporary — removed when Firefox restarts). Details: [`firefox` branch README](../../tree/firefox#readme).

### Privacy
No servers of our own, no analytics, no account. Your chats are handled only on chatgpt.com with your existing session; all your data (folders, prompts, notes…) stays in your browser. Once a day the extension anonymously checks GitHub Releases for a new version and shows a notice in the panel.

### Roadmap
- [x] Chrome v1.2.0
- [x] Firefox v1.1.0
- [x] Chrome Web Store
- [ ] Firefox Add-ons (in review)
- [ ] Move chats to Projects in bulk, empty the Library trash
- [ ] More languages

### Contact
Bug reports, ideas, questions: **[GitHub Issues](../../issues)** or **[justplguy@gmail.com](mailto:justplguy@gmail.com)**.

---

## 🇵🇱 Polski

ChatGPT pozwala usuwać czaty tylko pojedynczo, trzyma każdy obrazek w Bibliotece nawet po usunięciu czatu i nie ma folderów, eksportu ani operacji hurtowych. **ChatKit Pro dodaje to wszystko — za darmo, bez konta i bez serwerów.**

### Układ repozytorium

Repozytorium ma **osobną gałąź dla każdej przeglądarki**:

| Gałąź | Zawartość | Status |
|---|---|---|
| **`main`** *(tutaj jesteś)* | opis projektu, strona (`index.html`), licencja | — |
| **[`chrome`](../../tree/chrome)** | wtyczka dla Chrome, Edge, Brave, Opery | ✅ **v1.2.0** |
| **[`firefox`](../../tree/firefox)** | wtyczka dla Firefoksa 140+ | ✅ **v1.1.0** |

**Pliki do pobrania są wyłącznie w [Releases](../../releases)** — osobne wydanie dla każdej przeglądarki i wersji (np. `chrome-v1.2.0`, `firefox-v1.1.0`).
**Sklepy:** [Chrome Web Store](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh) ✅ · Firefox Add-ons ⏳ w recenzji.
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
**Polecane:** [**Dodaj do Chrome — Chrome Web Store**](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh) (jedno kliknięcie, aktualizacje automatyczne; działa też w Edge, Brave i Operze).

**Instalacja ręczna z GitHuba:**
1. Pobierz **`ChatKit-Pro-Chrome-v1.2.0.zip`** z [Releases](../../releases) i rozpakuj.
2. Otwórz `chrome://extensions`, włącz **Tryb dewelopera**.
3. **Załaduj rozpakowane** → wskaż rozpakowany folder.
4. Przypnij wtyczkę, wejdź na [chatgpt.com](https://chatgpt.com) i kliknij okrągły przycisk 🧰 (albo `Alt+Shift+K`). Ikona CK to włącznik.

Pełna instrukcja: [README gałęzi `chrome`](../../tree/chrome#readme).

**Przechodzisz z wersji z GitHuba na wersję ze sklepu?** Foldery, gwiazdki, prompty i notatki należą do konkretnej instalacji, więc przenieś je: w wersji z GitHuba otwórz panel → ⚙ Ustawienia → **Eksportuj dane (JSON)**, usuń wersję z GitHuba, dodaj ChatKit Pro z [Chrome Web Store](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh), potem ⚙ Ustawienia → **Importuj dane**.

### Instalacja (Firefox)
Wtyczka czeka na recenzję w Firefox Add-ons. Do tego czasu możesz ją przetestować: pobierz **`ChatKit-Pro-Firefox-v1.1.0.zip`** z [Releases](../../releases), rozpakuj, otwórz `about:debugging#/runtime/this-firefox` → **Załaduj tymczasowy dodatek…** → wskaż `manifest.json` (tymczasowo — znika po restarcie Firefoksa). Szczegóły: [README gałęzi `firefox`](../../tree/firefox#readme).

### Prywatność
Bez własnych serwerów, analityki i konta. Twoje czaty obsługiwane są tylko na chatgpt.com z Twojej sesji; wszystkie dane (foldery, prompty, notatki…) zostają w przeglądarce. Raz dziennie wtyczka anonimowo sprawdza GitHub Releases i pokazuje w panelu informację o nowej wersji.

### Kontakt
Błędy, pomysły, pytania: **[GitHub Issues](../../issues)** albo **[justplguy@gmail.com](mailto:justplguy@gmail.com)**.

---

**License / Licencja:** [MIT](LICENSE)

*ChatKit Pro by JustPLGuy is an independent project and is not affiliated with, endorsed by, or sponsored by OpenAI. ChatGPT is a trademark of OpenAI.*
