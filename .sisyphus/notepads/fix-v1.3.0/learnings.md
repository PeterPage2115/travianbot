## Key Findings from Codebase Analysis

### Task 1: index.ts catch block (CRITICAL)
- Location: `src/index.ts` lines 70-92
- Issue: catch block calls `logCommand` and `logError` but NEVER replies to user
- User sees "Bot is thinking..." forever when error occurs
- `lang` is not available in catch block (defined inside `handleInteraction`)
- Need to: get lang again via `resolveStoredLanguagePreference`, check if deferred, call editReply/followUp
- `handleCommandError` in `handler.ts` already handles deferred/replied check correctly

### Task 2: docker-entrypoint.sh (CRITICAL)
- Location: `docker-entrypoint.sh` line 11
- Issue: `npx prisma db push --accept-data-loss` can destroy production data
- Fix: Change to `npx prisma migrate deploy`

### Task 3: metrics.ts try/catch (CRITICAL)
- Location: `src/admin/metrics.ts` lines 91-123
- Issue: `logCommand` and `logError` don't have try/catch
- If SQLite fails (locked, full disk, etc.), error propagates and kills bot
- Fix: Wrap each function body in try/catch, use `logger.error()` on failure

### Task 4: findInactiveCandidates.ts pagination (CRITICAL)
- Location: `src/travian/queries/findInactiveCandidates.ts` lines 60-73
- Issue: `prisma.villageSnapshot.findMany` with `include: { village: { include: { player: true, alliance: true } } }` loads ALL villages
- On servers with 50k+ villages, this loads massive amounts of data into RAM
- Radius filter (lines 115-120) is applied in JS AFTER loading all data
- Fix options:
  a) Filter by radius in SQL if center/radius provided
  b) Add LIMIT to the initial query
  c) Use cursor-based pagination

### Translation Keys Available
- `common.error`: 'Error: {message}' / 'Błąd: {message}'
- `common.unexpected_error`: 'An unexpected error occurred.' / 'Wystąpił nieoczekiwany błąd.'
- `common.guild_only`: 'This command can only be used in a server.' / 'Ta komenda może być użyta tylko na serwerze.'
- `common.no_permission`: 'You do not have permission...' / 'Nie masz uprawnień...'

### requireAdmin (Task 6)
- Location: `src/discord/commands/handler.ts` lines 23-32
- Issue: Hardcoded English text on line 28: 'You do not have permission to use this command.'
- `common.no_permission` key already exists in translations
- Fix: Replace with `translate(lang, 'common.no_permission')`
- Note: `requireAdmin` doesn't receive `lang` parameter - needs signature change

### handleCommandError (Task 10)
- Location: `src/discord/commands/handler.ts` lines 41-51
- Issue: Defined but never used
- Could be used in index.ts catch block (Task 1)

### deferReply order (Task 9)
- `enemy-near` (line 144): defers BEFORE guildId check (line 151)
- `diplomacy-list` (line 261): defers BEFORE guildId check (line 263)
- Other handlers like `diplomacy-set` (line 238) check guildId BEFORE deferReply - correct pattern

### handleDistance reduce (Task 11)
- Location: `src/discord/commandRouter.ts` lines 495-499
- Issue: `unitResults.reduce((a, b) => {...})` without initial value
- If `unitResults` is empty, reduce throws error
- Fix: Add initial value or check array length first
