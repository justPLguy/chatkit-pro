# Changelog

## Firefox v1.5.1 — 2026-11-23
### English
- 📋 **Your chat list opens instantly** — ChatKit Pro now remembers the list of your chats (titles and dates, stored locally per ChatGPT account). The panel shows all of them right away, and in the background it quietly fetches the full list from ChatGPT and updates it — no more clicking “Load all” after every browser start. Chats deleted elsewhere (e.g. on your phone) disappear from the list after this check
### Polski
- 📋 **Lista czatów od razu w całości** — ChatKit Pro zapamiętuje listę Twoich czatów (tytuły i daty, lokalnie, osobno dla każdego konta ChatGPT). Panel pokazuje je wszystkie od razu, a w tle spokojnie pobiera pełną listę z ChatGPT i ją uaktualnia — koniec z klikaniem „Wczytaj wszystkie” po każdym uruchomieniu przeglądarki. Czaty usunięte gdzie indziej (np. w telefonie) znikają z listy po tym sprawdzeniu

## Firefox v1.5.0 — 2026-11-22
### English
- ⬇ **Follow the answer** — ChatGPT no longer scrolls down while it writes a long answer. ChatKit Pro keeps the newest line in view, right above the message box. Scroll up to read calmly and it pauses; scroll back to the end and it follows again; a new message starts following from scratch. Toggle: ⚙ Settings → “Follow the answer while ChatGPT is writing” (on by default)
- 🌐 **New website address** — after an update, “What's new” opens on **https://chatkit.justplguy.com/** (the old justplguy.github.io/chatkit-pro address forwards there). Contact: contact@justplguy.com
- ✉ **Website and contact in Settings** — ⚙ Settings → About: a link to the website and an email address for bugs and ideas (contact@justplguy.com)
### Polski
- ⬇ **Przewijanie za odpowiedzią** — ChatGPT przestał sam przewijać w dół, gdy pisze długą odpowiedź. ChatKit Pro trzyma najnowszą linijkę w widoku, tuż nad polem wiadomości. Przewiń w górę, żeby spokojnie czytać — śledzenie się zatrzyma; zjedź na koniec — śledzi dalej; nowa wiadomość — śledzi od nowa. Przełącznik: ⚙ Ustawienia → „Przewijaj za odpowiedzią, gdy ChatGPT pisze” (domyślnie włączone)
- 🌐 **Nowy adres strony** — po aktualizacji „Co nowego” otwiera się na **https://chatkit.justplguy.com/** (stary adres justplguy.github.io/chatkit-pro przekierowuje tutaj). Kontakt: contact@justplguy.com
- ✉ **Strona i kontakt w Ustawieniach** — ⚙ Ustawienia → O wtyczce: link do strony i adres do zgłaszania błędów i pomysłów (contact@justplguy.com)

## Firefox v1.4.0 — 2026-11-21
### English
- 📎 **Files in the Library** — a new switch: **Images / Files / Images + files**. See everything stored in ChatGPT — PDFs, documents, spreadsheets, presentations, video, audio, archives, code — each with a type icon, extension, size and date. Size sorting, download and bulk delete work like for images
- 🗂 **File-type filter** — PDF, documents, spreadsheets, presentations, text, code, archives, video, audio, other
- 🔎 **Files from deleted chats** (Library) — deleting a chat in ChatGPT doesn't delete its files. ChatKit Pro finds these leftovers, shows how many and how many MB, and lets you remove them in one go. Chats that aren't on your list (e.g. in projects) are checked one by one, so nothing is marked by mistake
- 🗑 **Trash preview** — see the files in the Library trash with their total size (read-only; restore or empty it in ChatGPT)
- ↩ **Take chats out of a project** — 📂 Project → “No project (regular chats)”
- 📋 **Copy links** — the selected chats go to the clipboard as “title — link”, one per line
- ↗ **File → chat** — open the chat a file came from (“↗ chat”, the ↗ icon or a double-click); files from deleted chats are marked “🗑 chat deleted”
- ⚠ **Hidden selection warning** — if some selected items are hidden by filters, the confirmation for deleting files and deleting or archiving chats says so
- ℹ After deleting files, the message says clearly that they go to “Recently deleted” in the Library
### Polski
- 📎 **Pliki w Bibliotece** — nowy przełącznik: **Obrazy / Pliki / Obrazy + pliki**. Widać wszystko, co trzymasz w ChatGPT — PDF-y, dokumenty, arkusze, prezentacje, wideo, audio, archiwa, kod — z ikonką typu, rozszerzeniem, rozmiarem i datą. Sortowanie po rozmiarze, pobieranie i hurtowe usuwanie działają jak przy obrazkach
- 🗂 **Filtr typu pliku** — PDF, dokumenty, arkusze, prezentacje, tekst, kod, archiwa, wideo, audio, inne
- 🔎 **Pliki z usuniętych czatów** (Biblioteka) — usunięcie czatu w ChatGPT nie usuwa jego plików. ChatKit Pro znajduje takie pozostałości, pokazuje ile ich jest i ile zajmują, i pozwala usunąć je jednym ruchem. Czaty spoza listy (np. z projektów) są sprawdzane pojedynczo, żeby nic nie zostało oznaczone przez pomyłkę
- 🗑 **Podgląd kosza** — pliki z kosza Biblioteki z łącznym rozmiarem (tylko podgląd; przywracanie i opróżnianie w ChatGPT)
- ↩ **Wyjmowanie czatów z projektu** — 📂 Projekt → „Bez projektu (zwykłe czaty)”
- 📋 **Kopiowanie linków** — zaznaczone czaty trafiają do schowka jako „tytuł — link”, każdy w osobnej linii
- ↗ **Plik → czat** — przejście do czatu, z którego pochodzi plik („↗ czat”, ikonka ↗ albo podwójne kliknięcie); pliki z usuniętych czatów mają plakietkę „🗑 czat usunięty”
- ⚠ **Ostrzeżenie o ukrytych zaznaczonych** — jeśli część zaznaczonych jest schowana przez filtry, potwierdzenie usuwania plików oraz usuwania i archiwizacji czatów mówi o tym wprost
- ℹ Po usunięciu plików komunikat mówi wprost, że trafiają do „Ostatnio usunięte” w Bibliotece

## Firefox v1.3.1 — 2026-11-20
### English
- 🐞 **Full-text search index with many chats** — building the index no longer gets stuck in a loop on ChatGPT's request limit (“too many requests” every minute). After the first limit it slows down so ChatGPT itself keeps working, the pauses grow longer instead of always lasting 1 minute, and chats refused by the limit are retried instead of skipped. Progress is saved after every chat, so you can stop and continue later.
### Polski
- 🐞 **Indeks „Szukaj w treści” przy wielu czatach** — budowa indeksu nie wpada już w pętlę na limicie zapytań ChatGPT („za dużo zapytań” co minutę). Po pierwszym limicie zwalnia, żeby samo ChatGPT dalej działało, przerwy rosną zamiast zawsze trwać minutę, a czaty odrzucone przez limit są ponawiane zamiast pomijane. Postęp zapisuje się po każdym czacie — możesz przerwać i dokończyć później.

## Firefox v1.3.0 — 2026-11-19
### English
- 📂 **Move chats to a ChatGPT project in bulk** — select chats, click 📂 Project and pick the project
- 🔗 **Shared links manager** (Cleanup tab) — see every public link to your chats and Canvas docs, copy or open it, and delete the ones you no longer want public (the chats stay)
- ⌕ **Quick jump** — press `Alt+Shift+J` (or ⌕ in the panel), type a few letters and jump to any chat, folder, tag or prompt. Works without Polish/French accents (“zolw” finds “Żółw”); `#tag` filters
- 🏷 **Tags on chats** — give a chat several tags (#work, #code…), filter by tag in the panel, type `#tag` in the search box, drag chats onto a tag; rename or delete tags in one place
- 🔢 **Counter above the message box** — characters, words and ~tokens of what you're typing (turn off in ⚙ Settings)
- 📝 **Export for Obsidian / Notion** — Markdown with a YAML header (title, dates, link, folder, tags, star); one file or a ZIP with a file per chat
- ✂️ **Export only the messages you pick** — choose questions and answers from one chat (e.g. only your own prompts)
- ⚡ **Archive and delete without F5** — archived and deleted chats disappear from the ChatGPT sidebar right away
- 🔄 Export always uses the latest version of a chat (no 2-minute cache)
- 🎨 **6 panel themes** in ⚙ Settings — dark (default), black (AMOLED), light, black & red, navy, purple
- 🆕 **“What's new” after an update** — after updating to a new version, the “What's new” page opens once in your language (can be turned off in ⚙ Settings)
- ⚡ **Lighter in very long chats** — timestamps used to slow the page down in chats with hundreds of messages (measured: with 1,000 messages from ~120–140 ms of work per second down to ~3 ms); the result is identical
- 🌍 **10 new languages** — Spanish, Portuguese (Brazil), Italian, Dutch, Czech, Ukrainian, Turkish, Japanese, Chinese (Simplified) and Korean — 14 in total. The language follows ChatGPT automatically (or pick it in ⚙ Settings); dates and numbers use the local format
- 🏷 The extension's name and description in the store are translated into all 14 languages
- 🐞 Fixed: in longer languages (e.g. French, German) the last panel tab dropped to a second row — tabs now always fit in one row
### Polski
- 📂 **Masowe przenoszenie czatów do projektu ChatGPT** — zaznacz czaty, kliknij 📂 Projekt i wybierz projekt
- 🔗 **Menedżer udostępnionych linków** (zakładka Sprzątanie) — wszystkie publiczne linki do Twoich czatów i wpisów z Canvas w jednym miejscu: kopiowanie, otwieranie i usuwanie tych, które nie powinny być publiczne (same czaty zostają)
- ⌕ **Szybki skok** — `Alt+Shift+J` (albo ⌕ w panelu), wpisz kilka liter i przejdź do dowolnego czatu, folderu, tagu albo promptu. Działa bez polskich znaków („zolw” znajdzie „Żółw”); `#tag` filtruje
- 🏷 **Tagi na czatach** — czat może mieć kilka tagów (#praca, #kod…), filtr po tagu w panelu, `#tag` w wyszukiwarce, przeciąganie czatów na tag; zmiana nazwy i usuwanie tagów w jednym miejscu
- 🔢 **Licznik nad polem wiadomości** — znaki, słowa i ~tokeny tego, co piszesz (wyłączysz w ⚙ Ustawieniach)
- 📝 **Eksport do Obsidiana / Notion** — Markdown z nagłówkiem YAML (tytuł, daty, link, folder, tagi, gwiazdka); jeden plik albo ZIP z plikiem na czat
- ✂️ **Eksport tylko wybranych wiadomości** — wybierasz pytania i odpowiedzi z jednego czatu (np. tylko swoje prompty)
- ⚡ **Archiwizacja i usuwanie bez F5** — zarchiwizowane i usunięte czaty od razu znikają z paska bocznego ChatGPT
- 🔄 Eksport zawsze bierze najnowszą wersję czatu (bez 2-minutowej pamięci podręcznej)
- 🎨 **6 motywów panelu** w ⚙ Ustawieniach — ciemny (domyślny), czarny (AMOLED), jasny, czarno-czerwony, granatowy, fioletowy
- 🆕 **„Co nowego” po aktualizacji** — po aktualizacji do nowej wersji raz otwiera się strona „Co nowego” w Twoim języku (można wyłączyć w ⚙ Ustawieniach)
- ⚡ **Lżej w bardzo długich czatach** — znaczniki czasu spowalniały stronę w czatach z setkami wiadomości (pomiar: przy 1000 wiadomości z ok. 120–140 ms pracy na sekundę do ok. 3 ms); wynik bez zmian
- 🌍 **10 nowych języków** — hiszpański, portugalski (Brazylia), włoski, niderlandzki, czeski, ukraiński, turecki, japoński, chiński (uproszczony) i koreański — razem 14. Język dopasowuje się sam do ChatGPT (albo wybierz go w ⚙ Ustawieniach); daty i liczby w lokalnym formacie
- 🏷 Nazwa i opis wtyczki w sklepie przetłumaczone na wszystkie 14 języków
- 🐞 Naprawione: w dłuższych językach (np. francuski, niemiecki) ostatnia zakładka panelu spadała do drugiego wiersza — teraz zakładki zawsze mieszczą się w jednym

## Firefox v1.2.0 — 2026-11-18
### English
- 🔴 **On/off switch** — the CK icon in the toolbar now turns ChatKit Pro on and off: red = on, grey = off (everything disappears from ChatGPT; click again and it comes back on the same page, no reload). The panel opens with the 🧰 button or Alt+Shift+K
- 🐞 Fixed: after reloading ChatGPT the extension sometimes vanished from the page — it now restores itself automatically
- 📦 **Export to ZIP** — one file per chat (Markdown, HTML or JSON) in a single ZIP; folder export uses the format you pick
- ↔️ **Chat width and font size** — two sliders in Settings, applied live (great on wide monitors)
- 💾 **Code blocks** — a “Save” button on every code block saves it as a file with the right extension (.py, .js, .json…); the minimap can download all code from a chat at once
- 🔢 **Chat stats** in the minimap — messages, words, characters and estimated tokens
- ✏️ **Bulk rename** — select chats and add a prefix/suffix (e.g. “[Work]”), remove a piece of text or replace it, with a live preview
- 📚 **Prompts 2.0** — ⭐ favorites always on top, #tags with a filter bar, drag-and-drop ordering (⋮⋮), sorting by my order / most used / A–Z / newest
- 💾 **Backup reminder** — once a week (or every 2 weeks / month / never) the panel reminds you to save a copy of your folders, stars, prompts and notes; one click downloads it
- 🕒 **Clearer timestamps** — each one says whose message it is (👤 You in blue on the right, 🤖 ChatGPT in green on the left) and reads naturally: “Today, 01:30”, “Yesterday, 23:10”, weekday and short date for older messages
- 🐞 Fixed: settings sliders and checkboxes sometimes ignored a second change until the panel was reopened
- ⚡ **Far fewer requests to ChatGPT** — fixes “Too many requests” / “Unable to load conversation” (HTTP 429) that heavy users could hit. Timestamps no longer re-download an open chat every few seconds (one request per chat, and only after you stop on it); chats you just viewed are reused; background tabs make no requests; bulk actions run at a calmer pace
- 🛑 **Respects ChatGPT's limits** — if ChatGPT answers “too many requests”, ChatKit Pro pauses all its requests in every tab (at least 60 s, as long as ChatGPT asks) instead of retrying; bulk actions resume by themselves after the pause and the panel shows a countdown
- 🚫 Installing the extension no longer opens a ChatGPT tab
### Polski
- 🔴 **Włącznik** — ikona CK na pasku przeglądarki włącza i wyłącza ChatKit Pro: czerwona = włączona, szara = wyłączona (wszystko znika z ChatGPT; kliknij ponownie, a wróci na tej samej stronie, bez przeładowania). Panel otwierasz przyciskiem 🧰 albo Alt+Shift+K
- 🐞 Naprawione: po odświeżeniu ChatGPT wtyczka czasem znikała ze strony — teraz sama się przywraca
- 📦 **Eksport do ZIP** — osobny plik dla każdego czatu (Markdown, HTML albo JSON) w jednym ZIP-ie; eksport folderu używa wybranego formatu
- ↔️ **Szerokość czatu i rozmiar czcionki** — dwa suwaki w ustawieniach, zmiany widać od razu (świetne na szerokich monitorach)
- 💾 **Bloki kodu** — przycisk „Zapisz” przy każdym bloku zapisuje go do pliku z dobrym rozszerzeniem (.py, .js, .json…); w minimapie pobierzesz cały kod z czatu naraz
- 🔢 **Liczniki czatu** w minimapie — wiadomości, słowa, znaki i przybliżona liczba tokenów
- ✏️ **Masowa zmiana nazw** — zaznacz czaty i dodaj prefiks/sufiks (np. „[Praca]”), usuń fragment albo zamień go na inny, z podglądem na żywo
- 📚 **Prompty 2.0** — ⭐ ulubione zawsze na górze, #tagi z paskiem filtrów, kolejność ustawiana przeciąganiem (⋮⋮), sortowanie: moja kolejność / najczęściej używane / A–Z / najnowsze
- 💾 **Przypomnienie o kopii zapasowej** — co tydzień (albo co 2 tygodnie / co miesiąc / nigdy) panel przypomina o zapisaniu kopii folderów, gwiazdek, promptów i notatek; jeden klik i gotowe
- 🕒 **Czytelniejsze znaczniki czasu** — każdy mówi, czyja to wiadomość (👤 Ty na niebiesko po prawej, 🤖 ChatGPT na zielono po lewej) i jest zrozumiały od razu: „Dziś, 01:30”, „Wczoraj, 23:10”, dzień tygodnia i krótka data przy starszych wiadomościach
- 🐞 Naprawione: suwaki i przełączniki w ustawieniach czasem ignorowały kolejną zmianę do ponownego otwarcia panelu
- ⚡ **Dużo mniej zapytań do ChatGPT** — naprawia „Too many requests” / „Nie można wczytać konwersacji” (HTTP 429), które mogły się pojawiać przy intensywnym używaniu. Znaczniki czasu nie pobierają już otwartego czatu co kilka sekund (jedno zapytanie na czat i dopiero, gdy się na nim zatrzymasz); przed chwilą oglądane czaty nie są pobierane ponownie; karty w tle nic nie wysyłają; operacje hurtowe idą spokojniejszym tempem
- 🛑 **Szanuje limity ChatGPT** — gdy ChatGPT odpowie „za dużo zapytań”, ChatKit Pro wstrzymuje wszystkie swoje zapytania we wszystkich kartach (min. 60 s, tyle ile prosi ChatGPT) zamiast ponawiać; operacje hurtowe same ruszają po przerwie, a panel pokazuje odliczanie
- 🚫 Instalacja wtyczki nie otwiera już karty z ChatGPT

## Firefox v1.1.0 — 2026-11-17
### English
- First Firefox version — the same features as Chrome v1.1.0
- Firefox-specific: ChatGPT requests run in the page context, the toolbar icon is pinned by default, search highlighting no longer uses innerHTML
### Polski
- Pierwsza wersja na Firefoksa — te same funkcje co Chrome v1.1.0
- Specyficzne dla Firefoksa: zapytania do ChatGPT idą z kontekstu strony, ikona jest od razu przypięta na pasku, podświetlanie wyników wyszukiwania bez innerHTML

## v1.1.0 — 2026-11-17
### English
- Welcome card after installing — 5 quick tips to get started
- Clear “Log in to ChatGPT” message instead of an error when you're logged out
- Fewer permissions: `scripting` removed — a ChatGPT tab opened before installing is simply reloaded and the panel opens
- Removed the experimental “All files” Library filter
- Minimum Chrome version declared (111)
- Fixed: note/bookmark buttons for selected text were empty until the minimap was opened, and overlapped ChatGPT's own “Ask ChatGPT” popup — now labeled and shown below the selection, with a confirmation
- Opening a chat from the list no longer resets the panel: it navigates without a reload when possible, otherwise the loaded list, filters and scroll position are restored; Ctrl+click / middle-click opens a new tab

### Polski
- Karta powitalna po instalacji — 5 wskazówek na start
- Czytelny komunikat „Zaloguj się do ChatGPT” zamiast błędu, gdy nie jesteś zalogowany
- Mniej uprawnień: usunięte `scripting` — karta ChatGPT otwarta przed instalacją jest przeładowywana i panel otwiera się sam
- Usunięty eksperymentalny filtr „Wszystkie pliki” w Bibliotece
- Zadeklarowana minimalna wersja Chrome (111)
- Naprawione: przyciski notatki/zakładki przy zaznaczonym tekście były puste, dopóki nie otworzyło się minimapy, i nachodziły na okienko „Zapytaj ChatGPT” — teraz mają napisy, są pod zaznaczeniem i pokazują potwierdzenie
- Otwarcie czatu z listy nie resetuje już panelu: jeśli się da, przejście bez przeładowania; w przeciwnym razie wczytana lista, filtry i miejsce przewinięcia wracają; Ctrl+klik / środkowy przycisk = nowa karta

## v1.0.1 — 2026-11-17
### English
- Ready for the Chrome Web Store: the store version updates through Chrome and skips the GitHub check
- Store listing translations (name and short description in EN / PL / FR / DE)
- Settings (⚙) moved to the panel header — tabs fit on one line in every language
- Library grid: AI / project badges on the thumbnail corner, cleaner captions

### Polski
- Gotowe pod Chrome Web Store: wersja ze sklepu aktualizuje się przez Chrome i nie sprawdza GitHuba
- Tłumaczenia nazwy i krótkiego opisu (PL / EN / FR / DE)
- Ustawienia (⚙) przeniesione do nagłówka panelu — zakładki mieszczą się w jednej linii w każdym języku
- Siatka Biblioteki: plakietki AI / projekt na rogu miniatury, czytelniejsze podpisy

## v1.0.0 — 2026-11-17 — first public release / pierwsze wydanie

### English
- **Bulk actions on chats** — select any number of chats (Shift+click for ranges) and delete, archive, star or move them to folders
- **Archive tab** — browse archived chats, restore or delete them in bulk
- **Library cleanup** — bulk delete and download images/files (deleting a chat does not delete its files); thumbnail grid, size sorting, AI-generated / uploaded and project filters, running size total
- **Folders & stars** — nested, colored folders with drag & drop; marks also shown in the ChatGPT sidebar
- **Export** — selected chats or whole folders to Markdown, HTML or PDF, with per-message timestamps
- **Timestamps** — date and time above every message
- **Prompt library** — `{{variables}}`, categories, import/export, starter pack; quick insert with Alt+Shift+P or `//`
- **Minimap** — outline of long chats, in-chat search, jump to any message
- **Bookmarks & notes** — on messages, whole chats and selected excerpts
- **Full-text search** across all chats (local index)
- **Cleanup rules** with preview · **Statistics** · **Classic dark mode**
- **Languages:** English, Polish, French, German
- Toolbar icon opens the panel; backup/import of all local data
- Daily update check on GitHub Releases — green bar in the panel and a badge on the icon when a new version is out

### Polski
- **Masowe operacje na czatach** — usuwanie, archiwizacja, gwiazdki, foldery (Shift+klik = zakres)
- **Archiwum** — przeglądanie, przywracanie i usuwanie zarchiwizowanych czatów
- **Czyszczenie Biblioteki** — masowe usuwanie i pobieranie zdjęć/plików; siatka miniatur, sortowanie po rozmiarze, filtry AI/wgrane i projekty, licznik miejsca
- **Foldery i gwiazdki** — zagnieżdżone, kolorowe, przeciąganie; oznaczenia także w pasku bocznym ChatGPT
- **Eksport** do Markdown / HTML / PDF z godziną każdej wiadomości
- **Znaczniki czasu** nad każdą wiadomością
- **Biblioteka promptów** — zmienne `{{...}}`, kategorie, import/eksport, pakiet startowy; Alt+Shift+P albo `//`
- **Minimapa** — spis treści, wyszukiwanie w rozmowie, przeskok do wiadomości
- **Zakładki i notatki** — na wiadomościach, czatach i zaznaczonych fragmentach
- **Wyszukiwanie w treści** wszystkich czatów (lokalny indeks)
- **Reguły sprzątania** z podglądem · **Statystyki** · **Klasyczny tryb ciemny**
- **Języki:** angielski, polski, francuski, niemiecki
- Ikona na pasku otwiera panel; kopia zapasowa i import wszystkich danych
- Codzienne sprawdzanie aktualizacji w GitHub Releases — zielony pasek w panelu i plakietka na ikonie przy nowej wersji
