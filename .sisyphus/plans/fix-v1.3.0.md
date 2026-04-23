# Release v1.3.0 - Kompleksowe fixy + nowe funkcje

## TL;DR
> Naprawa wszystkich zidentyfikowanych błędów (krytycznych, wysokich, średnich) + nowe funkcje bota i dashboardu.
>
> **Deliverables**:
> - 14+ naprawionych błędów w kodzie
> - 4-8 nowych funkcji
> - Stabilniejszy bot, bezpieczniejszy deploy, ładniejszy dashboard
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 5 fal

## Context

### Zidentyfikowane błędy z pełnej analizy

**Krytyczne (4):**
1. Brak odpowiedzi użytkownikowi w `catch` w `src/index.ts`
2. `prisma db push --accept-data-loss` w produkcji (ryzyko utraty danych)
3. Brak `try/catch` w `logCommand`/`logError` - wyjątek SQLite zabija bota
4. `findInactiveCandidates` ładuje WSZYSTKIE wioski do RAM (OOM)

**Wysokie (5):**
5. Brak case-insensitive w `listAllianceVillages`/`listPlayerVillages`
6. `requireAdmin` ma hardcoded angielski tekst
7. Brak `ADMIN_ROLE_ID` = wszyscy adminami
8. XSS w `dashboard.ejs`
9. Brak auth w panelu admina

**Średnie (5):**
10. `enemy-near` i `diplomacy-list` robią `deferReply` przed `guildId` check
11. Martwy kod: `handleCommandError` nigdzie nie używane
12. `reduce` bez initial value w `handleDistance`
13. Brak graceful shutdown w schedulerze
14. `CREATE TABLE` w runtime zamiast migracji

### Propozycje nowych funkcji

**Dla bota:**
- `/nearest-enemy` - najbliższy wróg od koordynatów
- `/farm-list` - lista wiosek do farmienia
- `/offensive-landing` - symulacja lądowania ofensywnego
- `/troop-calculator` - kalkulator siły wojsk
- **DM Support** - bot odpowiada na prywatne wiadomości

**Dla dashboardu:**
- **Auth** - logowanie do panelu admina
- **Live mapa** - interaktywna mapa sojuszu/wrogów
- **Powiadomienia** - webhooki przy atakach

## Execution Strategy

### Wave 1 (Stabilność - krytyczne fixy):
- Task 1: Fix catch w `index.ts` (odpowiedź przy błędzie)
- Task 2: Fix `docker-entrypoint.sh` (migrate deploy zamiast db push)
- Task 3: Fix `metrics.ts` (try/catch w logCommand/logError)
- Task 4: Fix `findInactiveCandidates.ts` (paginacja zamiast ładowania wszystkiego)

### Wave 2 (Jakość - wysokie fixy):
- Task 5: Case-insensitive wyszukiwanie
- Task 6: Tłumaczenia w `requireAdmin`
- Task 7: Auth w dashboardzie
- Task 8: Fix XSS w dashboardzie
- Task 9: Fix `enemy-near`/`diplomacy-list` deferReply order

### Wave 3 (Drobne fixy - średnie):
- Task 10: Usunąć/użyć `handleCommandError`
- Task 11: Fix `reduce` w `handleDistance`
- Task 12: Graceful shutdown w schedulerze
- Task 13: Przenieść CREATE TABLE do migracji

### Wave 4 (Nowe funkcje - wybrane przez użytkownika):
- Task 14: DM Support - bot odpowiada na prywatne wiadomości z komendami read-only
- Task 15: `/nearest-enemy` - znajduje TOP 10 najbliższych wrogów od podanych koordynatów

**Odrzucone**:
- `/farm-list` - użytkownik uznał że jest zbędna (podobna do inactive-search)

### Wave 5 (Final verification + release):
- Task F1-F5: Build, testy, typecheck, Docker, manual QA
- Release: v1.3.0

## TODOs

- [x] 1. Fix: Odpowiedź użytkownikowi w `catch` w `src/index.ts`

  **What to do**:
  - W bloku `catch` w `interactionCreate` dodać `await interaction.editReply()` lub `followUp()` z komunikatem błędu
  - Użyć `translate(lang, 'common.error')` zamiast hardcoded tekstu
  - Upewnić się że `deferred` jest true zanim zawołamy `editReply`

  **Must NOT do**:
  - Nie zmieniać logiki komend, tylko obsługę błędów

- [x] 2. Fix: `docker-entrypoint.sh` - `migrate deploy` zamiast `db push --accept-data-loss`

  **What to do**:
  - Zmienić `npx prisma db push --accept-data-loss` na `npx prisma migrate deploy`
  - Upewnić się że migracje są skomitowane w repo

  **Must NOT do**:
  - Nie usuwać flagi `--url`

- [x] 3. Fix: `try/catch` w `logCommand`/`logError` w `metrics.ts`

  **What to do**:
  - Owinąć INSERTy w try/catch
  - Przy błędzie: `logger.error()` zamiast throw

- [x] 4. Fix: Paginacja w `findInactiveCandidates.ts`

  **What to do**:
  - Zamiast ładować wszystkie wioski do RAM, użyć SQL z `LIMIT`/`OFFSET`
  - Lub przenieść logikę inaktywności do bazy (window functions)

- [ ] 5. Fix: Case-insensitive wyszukiwanie alliance/player

  **What to do**:
  - Dodać `mode: 'insensitive'` w Prisma where clauses

- [ ] 6. Fix: Tłumaczenia w `requireAdmin`

  **What to do**:
  - Zastąpić hardcoded angielski tekst `translate(lang, 'admin.no_permission')`
  - Dodać klucze tłumaczeń do `en.ts` i `pl.ts`

- [ ] 7. Fix: Auth w dashboardzie

  **What to do**:
  - Dodać middleware sprawdzający `ADMIN_ROLE_ID` lub token
  - Lub proste auth basic z env var

- [ ] 8. Fix: XSS w `dashboard.ejs`

  **What to do**:
  - Zastąpić `<%- JSON.stringify(chartData) %>` bezpieczną serializacją
  - Użyć `JSON.stringify(chartData).replace(/</g, '\\u003c')`

- [ ] 9. Fix: `deferReply` przed `guildId` check

  **What to do**:
  - W `enemy-near` i `diplomacy-list` przenieść `guildId` check PRZED `deferReply`

- [ ] 10. Fix: Usunąć/użyć `handleCommandError`

  **What to do**:
  - Albo użyć `handleCommandError` w `catch` w `index.ts`
  - Albo usunąć martwy kod

- [ ] 11. Fix: `reduce` bez initial value w `handleDistance`

  **What to do**:
  - Dodać initial value do `reduce((a, b) => ...)`

- [ ] 12. Fix: Graceful shutdown w schedulerze

  **What to do**:
  - Dodać `process.on('SIGTERM', ...)` który zatrzymuje cron

- [ ] 13. Fix: Przenieść CREATE TABLE do migracji

  **What to do**:
  - Utworzyć migrację Prisma dla `guild_settings` i `user_settings`
  - Usunąć `ensureGuildSettingsTable` i `ensureUserSettingsTable`

## Final Verification Wave

- [ ] F1. **Build check** — `npm run build` PASS
- [ ] F2. **Type check** — `npm run typecheck` PASS
- [ ] F3. **Tests** — `npm run test -- tests/discord/` PASS
- [ ] F4. **Docker build** — `docker build .` PASS
- [ ] F5. **Manual QA** — curl dashboard, test komendy

## Commit Strategy

- Fixy krytyczne: osobny commit per fix
- Nowe funkcje: osobny commit per funkcja
- Tag: `v1.3.0`

## Success Criteria
- Wszystkie testy przechodzą
- Dashboard działa bezpiecznie (XSS naprawiony, auth działa)
- Bot nie crashuje przy błędach SQLite
- Deploy nie nadpisuje danych
- Wszystkie nowe funkcje działają
