# Changelog

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
