# PODSUMOWANIE I PLAN

## 1. Cel projektu

Bot Discord dla sojuszu w **Travian: Reign of Fire x3** na serwerze:

- `https://rof.x3.international.travian.com`

Założenia przyjęte w projekcie:

- tylko **publiczne dane** z `map.sql`
- brak logowania do gry i brak automatyzacji konta
- nacisk na analitykę mapy dla sojuszu
- osobna konfiguracja **local/dev** i **production**
- docelowe wdrożenie przez **Docker Compose** z obrazem z rejestru

## 2. Najważniejsze ustalenia o serwerze i `map.sql`

### Serwer ROF x3

- tryb: **Travian: Reign of Fire - Spring Round 2026**
- prędkość: **x3**
- start rundy: **2026-04-14**
- długość rundy: **80 dni**
- mapa: **regionalna, europejska**
- aktywne funkcje świata:
  - statki i porty
  - pathfinding
  - crafting
  - keep tribe and conquer
  - wybór 1/2/3 osiedlanej nacji
  - merging i forwarding wojsk
  - miasta
  - alliance attack notifications
  - merchant recall
- wyłączone: **confederacje**

### `map.sql`

- dostępny publicznie pod:
  - `https://rof.x3.international.travian.com/map.sql`
- aktualizacja: **raz dziennie o północy czasu serwera**
- format: pełny snapshot świata, **1 wiersz = 1 wioska**

Kolejność pól w wierszu:

1. internal row id
2. x
3. y
4. tribe id
5. village id
6. village name
7. player id
8. player name
9. alliance id
10. alliance tag
11. population
12. region
13. capital
14. city
15. harbor
16. victory points

Udokumentowane tribe ids:

- `1` Romans
- `2` Teutons
- `3` Gauls
- `5` Natars
- `6` Egyptians
- `7` Huns
- `8` Spartans
- `9` Vikings

Pobrany snapshot referencyjny został zapisany w artefaktach sesji:

- `C:\Users\piotr\.copilot\session-state\5101d289-4627-4764-8427-e37d7bdced4a\files\rof-map.sql`

## 3. Co jest już zrobione

### Fundament projektu

- postawiony projekt **Node.js + TypeScript**
- dodane: **Prisma**, **Vitest**, **discord.js**
- gotowe skrypty:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run dev:local`
  - `npm run start:production`

### Konfiguracja local vs production

Gotowe pliki i rozdział środowisk:

- `.env.example`
- `.env.local.example`
- `.env.production.example`

Aktualne podejście:

- lokalnie: `ENV_FILE=.env.local`
- produkcyjnie: `ENV_FILE=.env.production`

To spełnia wymaganie oddzielenia testów lokalnych od wdrożenia.

### Import i model danych Traviana

Gotowe:

- downloader `map.sql`
- parser SQL snapshotu
- import do PostgreSQL
- model snapshotów w Prisma
- przechowywanie:
  - serwera
  - snapshotów
  - sojuszy
  - graczy
  - wiosek
  - stanu wioski per snapshot

### Zapytania analityczne

Gotowe serwisy backendowe dla:

- listy wiosek sojuszu
- listy wiosek gracza
- wyszukiwania wiosek sojuszu w promieniu od `x|y`
- wyszukiwania wrogich wiosek w promieniu
- wyszukiwania kandydatów na nieaktywnych

Ważne decyzje techniczne:

- zapytania działają na **najnowszym snapshotcie**
- dystans uwzględnia **wrap-around mapy 401x401**
- wyniki są sortowane deterministycznie
- wyniki mają metadane paginacji pod Discorda

### Heurystyka nieaktywnych

Przyjęta definicja V1:

- **delta-only**
- kandydat na nieaktywnego = brak lub minimalna zmiana populacji między snapshotami

Gotowe:

- logika scoringu
- konfigurowalne progi
- opis wyniku, żeby było wiadomo **dlaczego** ktoś został oznaczony

### Dyplomacja i i18n

Gotowe:

- zapisywanie statusów dyplomatycznych per guild Discorda
- statusy: `enemy`, `ally`, `nap`, `neutral`
- domyślny język guildy
- override języka dla użytkownika
- fallback:
  - user override -> guild default -> app default
- słowniki `pl` / `en`
- użycie zapisanej dyplomacji w wyszukiwaniu wrogów

Domknięte też ostatnie regresje:

- wyszukiwanie tagów sojuszu działa **case-insensitive**
- repozytoria settings/diplomacji poprawnie odtwarzają tabele po ich usunięciu

## 4. Aktualny stan zadań

### Zamknięte

- Task 1: bootstrap projektu
- Task 2: import i persystencja snapshotów
- Task 3: serwisy zapytań
- Task 4: heurystyki nieaktywnych
- Task 6: dyplomacja i i18n

### Gotowe do realizacji

1. **Task 5: Discord slash commands**
2. **Task 7: scheduler importów**
3. **Task 8: Docker / Compose / GHCR**

Aktualnie gotowe do startu wg todo:

- `wire-discord-commands`
- `schedule-imports`

## 5. Plan dalszych prac

### Etap następny: Task 5 - Discord slash commands

Do wykonania:

1. dodać klienta bota i rejestrację slash commands
2. podpiąć handlery dla:
   - `/alliance-near`
   - `/enemy-near`
   - `/inactive-search`
   - `/alliance-villages`
   - `/player-villages`
   - `/map-refresh`
   - `/server-info`
3. podpiąć komendy administracyjne:
   - `/diplomacy-set`
   - `/diplomacy-list`
   - `/diplomacy-remove`
   - `/settings-language`
4. dodać guard dla komend admin-only
5. sformatować odpowiedzi pod Discord embeds / chunked replies

### Potem: Task 7 - scheduler

Do wykonania:

1. scheduler dziennego importu po północy czasu serwera
2. retry/backoff przy błędach pobrania
3. blokada duplikowania importu dla tego samego dnia
4. czytelne logowanie sukcesu i błędów

### Potem: Task 8 - deployment

Do wykonania:

1. przygotować `Dockerfile`
2. przygotować `docker-compose.yml`
3. przygotować lokalny compose dla developmentu
4. dodać workflow CI
5. dodać workflow publikacji obrazu do GHCR
6. opisać wdrożenie typu:
   - `docker compose pull`
   - `docker compose up -d`

## 6. Docelowe komendy V1

- `/alliance-near`
- `/enemy-near`
- `/inactive-search`
- `/alliance-villages`
- `/player-villages`
- `/diplomacy-set`
- `/diplomacy-list`
- `/diplomacy-remove`
- `/settings-language`
- `/map-refresh`
- `/server-info`

## 7. Najważniejsze pliki w repo

- `src/config/env.ts` - ładowanie i walidacja konfiguracji
- `prisma/schema.prisma` - model danych
- `src/travian/mapSqlDownloader.ts` - pobieranie snapshotu
- `src/travian/mapSqlParser.ts` - parser `map.sql`
- `src/travian/importMapSnapshot.ts` - import do bazy
- `src/travian/queries/*` - główne zapytania analityczne
- `src/travian/inactiveHeuristics.ts` - scoring nieaktywnych
- `src/travian/diplomacy/*` - dyplomacja i enemy queries
- `src/settings/*` - ustawienia języka
- `src/i18n/*` - tłumaczenia

## 8. Stan jakości

Na obecnym checkpointcie projekt ma zielony stan dla:

- testów
- typechecka
- buildu

## 9. Krótka rekomendacja operacyjna

Najbliższy sensowny krok to **Task 5**, bo cały backend i logika danych są już gotowe. Teraz warto wystawić to przez Discord slash commands, a dopiero potem domknąć scheduler i deployment registry-first pod serwer produkcyjny.
