<p align="center"><img src="icons/icon128.png" width="96" alt="ChatKit Pro"></p>

<h1 align="center">ChatKit Pro by JustPLGuy — Chrome</h1>

<p align="center">
<b>v1.2.0</b> · Chrome / Edge / Brave / Opera · MIT<br>
<a href="https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh"><b>🛒 Add to Chrome (Chrome Web Store)</b></a><br>
Free, open-source power tools for ChatGPT.<br>
<a href="#-english">🇬🇧 English</a> · <a href="#-polski">🇵🇱 Polski</a>
</p>

> This is the **`chrome`** branch — the extension source code.
> Project overview and website: **[`main` branch](../../tree/main)**.

---

## 🇬🇧 English

### Install
**Recommended:** [**Add to Chrome — Chrome Web Store**](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh) — one click, automatic updates. Works in Chrome, Edge, Brave and Opera.

**Manual install from GitHub (2 minutes):**
1. Download **`ChatKit-Pro-Chrome-v1.2.0.zip`** from **[Releases](../../releases)** (not “Code → Download ZIP”) and unzip it.
2. Open `chrome://extensions` and switch on **Developer mode** (top-right).
3. Click **Load unpacked** and pick the unzipped folder (the one that contains `manifest.json`).
4. Pin the extension: 🧩 → 📌 next to **ChatKit Pro by JustPLGuy**.
5. Open [chatgpt.com](https://chatgpt.com) and click the round **🧰** button (or press `Alt+Shift+K`). The **CK icon** in the toolbar is the on/off switch: red = on, grey = off.

**Update (GitHub version):** download the new ZIP from [Releases](../../releases), replace the files, click ↻ on the extension card in `chrome://extensions`, reload ChatGPT.

**Moving from the GitHub version to the store version?** Your folders, stars, prompts and notes belong to each installation, so move them: in the GitHub version open the panel → ⚙ Settings → **Export data (JSON)**, remove the GitHub version, add ChatKit Pro from the [Chrome Web Store](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh), then ⚙ Settings → **Import data**.

### What's inside
| Area | Features |
|---|---|
| **Chats** | bulk delete / archive / star / move to folder / rename (prefix, suffix, replace), Shift+click ranges, filters (title, older than X days, starred), exact date & time |
| **Archive** | browse, restore or delete archived chats |
| **Library** | bulk delete & download images/files, thumbnail grid, size sort, AI / uploaded / project filters, size counter |
| **Folders & stars** | nested colored folders, drag & drop, marks in the ChatGPT sidebar, export a whole folder |
| **Export** | Markdown, HTML, PDF — with per-message timestamps; ZIP with one file per chat (Markdown / HTML / JSON) |
| **In the chat** | timestamps above messages, minimap (outline + search), bookmarks, notes on excerpts, chat stats (messages, words, characters, ~tokens), “Save” button on code blocks, download all code from a chat |
| **Prompts** | library with `{{variables}}`, categories, #tags, ⭐ favorites on top, drag-and-drop order, import/export, starter pack, quick insert |
| **Search** | full-text search across all chats (local index) |
| **Cleanup** | rules like “chats older than 90 days without a star → archive”, with preview |
| **Statistics** | chats, files, Library size, chats per month, largest files |
| **Backup** | export / import all extension data as JSON, reminder every week (configurable) |
| **Look** | chat width and font size sliders, classic gray dark mode, 4 languages (EN, PL, FR, DE) |

### Shortcuts
| Keys | Action |
|---|---|
| 🧰 / `Alt+Shift+K` | open / close the panel |
| CK icon in the toolbar | turn ChatKit Pro on / off (red / grey) |
| `Alt+Shift+P` or `//` in an empty message box | quick prompt |
| `Alt+Shift+M` | chat minimap |
| `Shift` + click | select a range |
| `Esc` | close |

### Privacy
- Your chats and files are handled **only on chatgpt.com**, using your existing session — exactly like the website itself.
- Once a day it asks the public GitHub API whether a newer release exists (no data about you is sent).
- No external servers, no analytics, no tracking, no account.
- Folders, stars, prompts, notes and settings are stored locally (`chrome.storage.local`); the search index lives in IndexedDB in your browser.
- Details: [PRIVACY.md](PRIVACY.md)

### Permissions
| Permission | Why |
|---|---|
| `storage` | save folders, stars, prompts, notes, settings |
| `downloads` | save Library files to your Downloads folder |
| `alarms` | check for a new version once a day |
| `chatgpt.com` | the extension works only there |

### Updates
The extension checks GitHub Releases once a day. When a new version is out you'll see a green bar in the panel and a “1” badge on the icon. Download the ZIP, replace the files, click ↻ in `chrome://extensions` — your data stays.

### Known limitations
- Uses ChatGPT's unofficial internal API — changes on OpenAI's side may require an update.
- The ChatGPT sidebar refreshes only after a page reload (F5).
- Deleted Library files may land in “Recently deleted”.

### Development
```
src/
  core.js        API, storage, folders, helpers
  i18n.js        translations (EN / PL / FR / DE)
  dom.js         knowledge about ChatGPT's page structure
  panel.js       main panel (chats, archive, library, settings)
  prompts.js     prompt library
  minimap.js     minimap, bookmarks, notes
  tabs-extra.js  bookmarks & notes, search, cleanup, statistics tabs
  timestamps.js  per-message timestamps
  export.js      Markdown / HTML / PDF export
  search.js      full-text index (IndexedDB)
  sidebar.js     marks in the ChatGPT sidebar
  theme.js       classic dark mode
  background.js  on/off switch (toolbar icon), downloads, update check
```
Tests (jsdom simulation): `npm install && npm test`

Adding a language: add an object to `DICT` in `src/i18n.js` and an option in the settings — `tests/i18n-check.js` reports missing keys.

### Contact
Bug reports, ideas, questions: **[GitHub Issues](../../issues)** or **[justplguy@gmail.com](mailto:justplguy@gmail.com)**.

---

## 🇵🇱 Polski

### Instalacja
**Polecane:** [**Dodaj do Chrome — Chrome Web Store**](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh) — jedno kliknięcie, aktualizacje automatyczne. Działa w Chrome, Edge, Brave i Operze.

**Instalacja ręczna z GitHuba (2 minuty):**
1. Pobierz **`ChatKit-Pro-Chrome-v1.2.0.zip`** z **[Releases](../../releases)** (nie „Code → Download ZIP”) i rozpakuj.
2. Otwórz `chrome://extensions` i włącz **Tryb dewelopera** (prawy górny róg).
3. Kliknij **Załaduj rozpakowane** i wskaż rozpakowany folder (ten z plikiem `manifest.json`).
4. Przypnij wtyczkę: 🧩 → 📌 przy **ChatKit Pro by JustPLGuy**.
5. Wejdź na [chatgpt.com](https://chatgpt.com) i kliknij okrągły przycisk **🧰** (albo `Alt+Shift+K`). **Ikona CK** na pasku to włącznik: czerwona = włączona, szara = wyłączona.

**Aktualizacja (wersja z GitHuba):** pobierz nowy ZIP z [Releases](../../releases), podmień pliki, kliknij ↻ na karcie wtyczki w `chrome://extensions`, odśwież ChatGPT.

**Przechodzisz z wersji z GitHuba na wersję ze sklepu?** Foldery, gwiazdki, prompty i notatki należą do konkretnej instalacji, więc przenieś je: w wersji z GitHuba otwórz panel → ⚙ Ustawienia → **Eksportuj dane (JSON)**, usuń wersję z GitHuba, dodaj ChatKit Pro z [Chrome Web Store](https://chromewebstore.google.com/detail/chatkit-pro-by-justplguy/pehdgnogfmaeeldpjdmadfpankacofhh), potem ⚙ Ustawienia → **Importuj dane**.

### Co jest w środku
| Obszar | Funkcje |
|---|---|
| **Czaty** | masowe usuwanie / archiwizacja / gwiazdki / foldery / zmiana nazw (prefiks, sufiks, zamiana), Shift+klik, filtry (tytuł, starsze niż X dni, z gwiazdką), dokładna data i godzina |
| **Archiwum** | przeglądanie, przywracanie i usuwanie zarchiwizowanych czatów |
| **Biblioteka** | masowe usuwanie i pobieranie zdjęć/plików, siatka miniatur, sortowanie po rozmiarze, filtry AI / wgrane / projekty, licznik miejsca |
| **Foldery i gwiazdki** | zagnieżdżone, kolorowe, przeciąganie, oznaczenia w pasku bocznym ChatGPT, eksport folderu |
| **Eksport** | Markdown, HTML, PDF — z godziną każdej wiadomości; ZIP z osobnym plikiem dla każdego czatu (Markdown / HTML / JSON) |
| **W czacie** | znaczniki czasu, minimapa (spis treści + wyszukiwanie), zakładki, notatki do fragmentów, liczniki czatu (wiadomości, słowa, znaki, ~tokeny), przycisk „Zapisz” przy blokach kodu, pobieranie całego kodu z czatu |
| **Prompty** | biblioteka ze zmiennymi `{{...}}`, kategorie, #tagi, ⭐ ulubione na górze, kolejność przeciąganiem, import/eksport, pakiet startowy, szybkie wstawianie |
| **Wyszukiwanie** | w treści wszystkich czatów (lokalny indeks) |
| **Sprzątanie** | reguły typu „czaty starsze niż 90 dni bez gwiazdki → archiwum”, z podglądem |
| **Statystyki** | czaty, pliki, rozmiar Biblioteki, czaty wg miesięcy, największe pliki |
| **Kopia zapasowa** | eksport / import wszystkich danych wtyczki (JSON), przypomnienie co tydzień (do ustawienia) |
| **Wygląd** | suwaki szerokości czatu i rozmiaru czcionki, klasyczny szary tryb ciemny, 4 języki (PL, EN, FR, DE) |

### Skróty
| Klawisze | Akcja |
|---|---|
| 🧰 / `Alt+Shift+K` | otwórz / zamknij panel |
| ikona CK na pasku | włącz / wyłącz ChatKit Pro (czerwona / szara) |
| `Alt+Shift+P` albo `//` w pustym polu wiadomości | szybki prompt |
| `Alt+Shift+M` | minimapa czatu |
| `Shift` + klik | zaznacz zakres |
| `Esc` | zamknij |

### Prywatność
Twoje czaty i pliki obsługiwane są **wyłącznie na chatgpt.com** z Twojej zalogowanej sesji. Raz dziennie wtyczka pyta publiczne API GitHuba, czy jest nowsza wersja (nic o Tobie nie wysyła). Żadnych własnych serwerów, analityki ani kont. Szczegóły: [PRIVACY.md](PRIVACY.md).

### Aktualizacje
Wtyczka sama sprawdza GitHub Releases raz dziennie. Gdy wyjdzie nowa wersja, zobaczysz zielony pasek w panelu i plakietkę „1” na ikonie. Pobierz ZIP, podmień pliki, kliknij ↻ na `chrome://extensions` — dane zostają.

### Ograniczenia
- Korzysta z nieoficjalnego, wewnętrznego API ChatGPT — zmiany po stronie OpenAI mogą wymagać aktualizacji.
- Pasek boczny ChatGPT odświeża się dopiero po przeładowaniu strony (F5).
- Usunięte pliki Biblioteki mogą trafić do „Ostatnio usunięte”.

### Kontakt
Błędy, pomysły, pytania: **[GitHub Issues](../../issues)** albo **[justplguy@gmail.com](mailto:justplguy@gmail.com)**.

---

**License / Licencja:** [MIT](LICENSE)

*ChatKit Pro by JustPLGuy is an independent project and is not affiliated with, endorsed by, or sponsored by OpenAI. ChatGPT is a trademark of OpenAI.*
