# Hotfix v1.1.1 - Dashboard layouts + Discord option order

## TL;DR
> Naprawa dwóch błędów z deployu v1.1.0:
> 1. Dashboard nie działa - brak middleware `express-ejs-layouts`
> 2. Komenda `/inactive-search` nie rejestruje się - wymagane opcje po opcjonalnych

## Work Objectives

### Core Objective
Naprawić dwa krytyczne błędy wprowadzone w v1.1.0, które powodują awarię dashboardu i niepoprawną rejestrację komendy Discord.

### Must Have
- [ ] Dashboard ładuje się poprawnie (EJS layouts działają)
- [ ] Komenda `/inactive-search` rejestruje się w Discord API

### Must NOT Have
- Żadne nowe funkcje - tylko fixy

## TODOs

- [ ] 1. Zainstalować `express-ejs-layouts` i skonfigurować w `src/admin/server.ts`

  **What to do**:
  - `npm install express-ejs-layouts`
  - Dodać import: `import ejsLayouts from 'express-ejs-layouts'`
  - Dodać middleware: `app.use(ejsLayouts())` (przed `app.set('view engine', 'ejs')` lub po - sprawdzić kolejność)
  - Opcjonalnie: zarejestrować helper `layout` w EJS jeśli potrzeba

  **Must NOT do**:
  - Nie zmieniać struktury plików EJS - tylko dodać middleware

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1

  **QA Scenarios**:
  ```
  Scenario: Dashboard renders without "layout is not defined" error
    Tool: Bash (curl)
    Steps:
      1. Start app locally with `npm start` (or build + node dist/index.js)
      2. curl http://localhost:3001/
    Expected Result: HTTP 200, HTML response contains "TravianBot Admin"
    Evidence: .sisyphus/evidence/task-1-dashboard-ok.html
  ```

- [ ] 2. Przestawić kolejność opcji w `inactiveSearch.ts`

  **What to do**:
  - W `src/discord/commands/definitions/inactiveSearch.ts`:
    - Opcja `x` (required: true) musi być PIERWSZA
    - Opcja `y` (required: true) musi być DRUGA
    - Opcja `radius` (required: false) TRZECIA
    - Opcja `limit` (required: false) CZWARTA
  - Obecna kolejność: limit(false), x(true), y(true), radius(false) - BŁĄD
  - Docelowa kolejność: x(true), y(true), radius(false), limit(false)

  **Must NOT do**:
  - Nie zmieniać `required` na poszczególnych opcjach
  - Nie zmieniać nazw ani typów

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1

  **QA Scenarios**:
  ```
  Scenario: inactive-search command registers successfully
    Tool: Bash (node REPL / build)
    Steps:
      1. npm run build
      2. node -e "import('./dist/discord/commands/definitions/inactiveSearch.js').then(m => console.log(m.inactiveSearchCommand.toJSON().options.map(o => ({name: o.name, required: o.required}))))"
    Expected Result: Kolejność: x (true), y (true), radius (false), limit (false)
    Evidence: .sisyphus/evidence/task-2-option-order.txt
  ```

## Final Verification Wave

- [ ] F1. **Build check** — `npm run build` PASS
- [ ] F2. **Type check** — `npm run typecheck` PASS
- [ ] F3. **Tests** — `npm run test -- tests/discord/` PASS
- [ ] F4. **Manual QA** — curl localhost:3001 zwraca 200

## Commit Strategy

- Commit: `fix(admin): add express-ejs-layouts middleware` (task 1)
- Commit: `fix(commands): reorder inactive-search options (required first)` (task 2)
- Tag: `v1.1.1`

## Success Criteria
- Dashboard ładuje się na porcie 3001 bez błędu `layout is not defined`
- `/inactive-search` rejestruje się poprawnie w Discord API
- Wszystkie testy przechodzą
