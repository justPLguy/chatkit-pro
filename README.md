<p align="center"><img src="assets/icon128.png" width="104" alt="ChatKit Pro"></p>

<h1 align="center">ChatKit Pro by JustPLGuy</h1>

<p align="center">
<b>Free, open-source power tools for ChatGPT.</b><br>
Bulk delete · Library cleanup · Folders & tags · Quick jump · Export · Prompts · Shared links · 14 languages<br><br>
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
| **[`chrome`](../../tree/chrome)** | extension for Chrome, Edge, Brave, Opera | ✅ **v1.3.1** |
| **[`firefox`](../../tree/firefox)** | extension for Firefox 140+ | ✅ **v1.1.0** |

**Downloads are published only in [Releases](../../releases)** — one release per browser and version (e.g. `chrome-v1.3.1`, `firefox-v1.1.0`).
**Store listings:** [Chrome Web Store](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh) ✅ v1.3.1 · Firefox Add-ons ⏳ v1.3.1 in review.
Please don't use “Code → Download ZIP” on `main`: it doesn't contain the extension.

### Features
*Current version: **v1.3.1** — Chrome Web Store and the `chrome` branch. Firefox 1.3.1 is in review; the Firefox build on GitHub is still v1.1.0 (fewer features). Full history: [What's new](https://justplguy.github.io/chatkit-pro/releases/).*

- 📦 **Bulk actions** — delete, archive, restore and rename many chats at once (Shift+click ranges, filters); the ChatGPT sidebar updates right away
- 🖼️ **Library cleanup** — bulk delete/download images and files, size sorting, AI/uploaded/project filters
- 🗂️ **Folders, tags & stars** — nested, colored folders with drag & drop, `#tags` on chats, stars; also shown in the ChatGPT sidebar
- ⚡ **Quick jump** (`Alt+Shift+J`) — type a few letters and open any chat, folder, tag or prompt *(new in 1.3)*
- 📂 **ChatGPT projects** — move many chats to a project at once *(new in 1.3)*
- 🔗 **Shared links manager** — see and delete public links to your chats and Canvas docs *(new in 1.3)*
- 📤 **Export** — Markdown, HTML, PDF, ZIP (one file per chat), Markdown + YAML for Obsidian / Notion, or only selected messages
- ⏰ **Timestamps** above every message (“You · Today, 14:32”)
- 📚 **Prompt library** — `{{variables}}`, `#tags`, ⭐ favorites, quick insert (`Alt+Shift+P` or `//`), starter pack in 14 languages
- 🗺️ **Minimap & code** — outline, in-chat search, chat stats, “Save” on every code block, counter above the message box
- 🔖 **Bookmarks** and 📝 **notes** inside chats
- 🔍 **Full-text search** across all chats (local index)
- 🧹 **Cleanup rules** with preview · 📊 **Statistics**
- 🎨 **6 panel themes**, chat width & font size sliders, 🌙 classic dark mode *(themes new in 1.3)*
- 🌐 **14 languages** — English, Polish, French, German, Spanish, Portuguese (Brazil), Italian, Dutch, Czech, Ukrainian, Turkish, Japanese, Chinese (Simplified), Korean
- 🔴 **On/off switch** on the toolbar icon · light on ChatGPT (few requests, automatic pause on “too many requests”)

### Install (Chrome)
**Recommended:** [**Add to Chrome — Chrome Web Store**](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh) (one click, automatic updates; also works in Edge, Brave and Opera).

**Manual install from GitHub:**
1. Download **`ChatKit-Pro-Chrome-v1.3.1.zip`** from [Releases](../../releases) and unzip it.
   Updating? Unzip into **the same folder** as before — your data is tied to that folder.
2. Open `chrome://extensions`, switch on **Developer mode**.
3. **Load unpacked** → choose the unzipped folder.
4. Pin the extension, open [chatgpt.com](https://chatgpt.com) and click the round 🧰 button (or `Alt+Shift+K`). The CK icon is the on/off switch.

Full guide: [`chrome` branch README](../../tree/chrome#readme).

**Moving from the GitHub version to the store version?** Your folders, stars, prompts and notes belong to each installation, so move them: in the GitHub version open the panel → ⚙ Settings → **Export data (JSON)**, remove the GitHub version, add ChatKit Pro from the [Chrome Web Store](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh), then ⚙ Settings → **Import data**.

### Install (Firefox)
Firefox Add-ons: v1.3.1 is in review. Until then you can test it: download **`ChatKit-Pro-Firefox-v1.1.0.zip`** from [Releases](../../releases), unzip, open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → pick `manifest.json` (temporary — removed when Firefox restarts). Details: [`firefox` branch README](../../tree/firefox#readme).

### Privacy
No servers of our own, no analytics, no account. Your chats are handled only on chatgpt.com with your existing session; all your data (folders, prompts, notes…) stays in your browser. The Chrome Web Store version is updated by Chrome and makes no update requests; the GitHub (ZIP) version checks GitHub Releases once a day (anonymously) and shows a notice in the panel. Details: [PRIVACY.md](../../blob/chrome/PRIVACY.md).

### Roadmap
- [x] Chrome Web Store (v1.3.1)
- [x] Move chats to ChatGPT projects in bulk, shared links manager, tags, quick jump
- [x] 14 languages, 6 themes
- [ ] Firefox Add-ons (v1.3.1 in review)
- [ ] Files cleanup (ChatGPT storage) — planned for 1.4.0

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
| **[`chrome`](../../tree/chrome)** | wtyczka dla Chrome, Edge, Brave, Opery | ✅ **v1.3.1** |
| **[`firefox`](../../tree/firefox)** | wtyczka dla Firefoksa 140+ | ✅ **v1.1.0** |

**Pliki do pobrania są wyłącznie w [Releases](../../releases)** — osobne wydanie dla każdej przeglądarki i wersji (np. `chrome-v1.3.1`, `firefox-v1.1.0`).
**Sklepy:** [Chrome Web Store](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh) ✅ v1.3.1 · Firefox Add-ons ⏳ v1.3.1 w recenzji.
Nie używaj „Code → Download ZIP” na gałęzi `main` — nie ma tu wtyczki.

### Funkcje
*Aktualna wersja: **v1.3.1** — Chrome Web Store i gałąź `chrome`. Firefox 1.3.1 czeka na recenzję; wersja dla Firefoksa na GitHubie to wciąż v1.1.0 (mniej funkcji). Pełna historia: [Co nowego](https://justplguy.github.io/chatkit-pro/releases/?lang=pl).*

- 📦 **Operacje hurtowe** — usuwanie, archiwizacja, przywracanie i zmiana nazw wielu czatów naraz (Shift+klik, filtry); pasek boczny ChatGPT odświeża się od razu
- 🖼️ **Czyszczenie Biblioteki** — hurtowe usuwanie i pobieranie zdjęć/plików, sortowanie po rozmiarze, filtry AI/wgrane/projekty
- 🗂️ **Foldery, tagi i gwiazdki** — zagnieżdżone, kolorowe foldery z przeciąganiem, `#tagi` na czatach, gwiazdki; widoczne też w pasku bocznym ChatGPT
- ⚡ **Szybki skok** (`Alt+Shift+J`) — wpisz kilka liter i otwórz dowolny czat, folder, tag albo prompt *(nowość w 1.3)*
- 📂 **Projekty ChatGPT** — przenoszenie wielu czatów naraz do projektu *(nowość w 1.3)*
- 🔗 **Menedżer udostępnionych linków** — podgląd i usuwanie publicznych linków do czatów i wpisów z Canvas *(nowość w 1.3)*
- 📤 **Eksport** — Markdown, HTML, PDF, ZIP (plik na czat), Markdown + YAML dla Obsidiana / Notion albo tylko wybrane wiadomości
- ⏰ **Znaczniki czasu** nad każdą wiadomością („Ty · Dziś, 14:32”)
- 📚 **Biblioteka promptów** — zmienne `{{...}}`, `#tagi`, ⭐ ulubione, szybkie wstawianie (`Alt+Shift+P` albo `//`), pakiet startowy w 14 językach
- 🗺️ **Minimapa i kod** — spis treści, wyszukiwanie w czacie, liczniki, „Zapisz” przy każdym bloku kodu, licznik nad polem wiadomości
- 🔖 **Zakładki** i 📝 **notatki** w czacie
- 🔍 **Wyszukiwanie w treści** wszystkich czatów (lokalny indeks)
- 🧹 **Reguły sprzątania** z podglądem · 📊 **Statystyki**
- 🎨 **6 motywów panelu**, suwaki szerokości czatu i rozmiaru czcionki, 🌙 klasyczny tryb ciemny *(motywy — nowość w 1.3)*
- 🌐 **14 języków** — polski, angielski, francuski, niemiecki, hiszpański, portugalski (Brazylia), włoski, niderlandzki, czeski, ukraiński, turecki, japoński, chiński (uproszczony), koreański
- 🔴 **Włącznik** na ikonie · oszczędna dla ChatGPT (mało zapytań, automatyczna przerwa przy „za dużo zapytań”)

### Instalacja (Chrome)
**Polecane:** [**Dodaj do Chrome — Chrome Web Store**](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh) (jedno kliknięcie, aktualizacje automatyczne; działa też w Edge, Brave i Operze).

**Instalacja ręczna z GitHuba:**
1. Pobierz **`ChatKit-Pro-Chrome-v1.3.1.zip`** z [Releases](../../releases) i rozpakuj.
   Aktualizujesz? Rozpakuj do **tego samego folderu** co wcześniej — dane są powiązane z tym folderem.
2. Otwórz `chrome://extensions`, włącz **Tryb dewelopera**.
3. **Załaduj rozpakowane** → wskaż rozpakowany folder.
4. Przypnij wtyczkę, wejdź na [chatgpt.com](https://chatgpt.com) i kliknij okrągły przycisk 🧰 (albo `Alt+Shift+K`). Ikona CK to włącznik.

Pełna instrukcja: [README gałęzi `chrome`](../../tree/chrome#readme).

**Przechodzisz z wersji z GitHuba na wersję ze sklepu?** Foldery, gwiazdki, prompty i notatki należą do konkretnej instalacji, więc przenieś je: w wersji z GitHuba otwórz panel → ⚙ Ustawienia → **Eksportuj dane (JSON)**, usuń wersję z GitHuba, dodaj ChatKit Pro z [Chrome Web Store](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh), potem ⚙ Ustawienia → **Importuj dane**.

### Instalacja (Firefox)
Firefox Add-ons: v1.3.1 czeka na recenzję. Do tego czasu możesz ją przetestować: pobierz **`ChatKit-Pro-Firefox-v1.1.0.zip`** z [Releases](../../releases), rozpakuj, otwórz `about:debugging#/runtime/this-firefox` → **Załaduj tymczasowy dodatek…** → wskaż `manifest.json` (tymczasowo — znika po restarcie Firefoksa). Szczegóły: [README gałęzi `firefox`](../../tree/firefox#readme).

### Prywatność
Bez własnych serwerów, analityki i konta. Twoje czaty obsługiwane są tylko na chatgpt.com z Twojej sesji; wszystkie dane (foldery, prompty, notatki…) zostają w przeglądarce. Wersję z Chrome Web Store aktualizuje Chrome i nie wysyła ona zapytań o aktualizacje; wersja z GitHuba (ZIP) raz dziennie anonimowo sprawdza GitHub Releases i pokazuje w panelu informację o nowej wersji. Szczegóły: [PRIVACY.md](../../blob/chrome/PRIVACY.md).

### Kontakt
Błędy, pomysły, pytania: **[GitHub Issues](../../issues)** albo **[justplguy@gmail.com](mailto:justplguy@gmail.com)**.

---

**License / Licencja:** [MIT](LICENSE)

*ChatKit Pro by JustPLGuy is an independent project and is not affiliated with, endorsed by, or sponsored by OpenAI. ChatGPT is a trademark of OpenAI.*
