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

### Task 10: handleCommandError dead code (COMPLETED)
- Decision: REMOVED `handleCommandError` from `src/discord/commands/handler.ts`
- Reason: The inline error handling in `src/index.ts` (lines 72-109) is superior because:
  1. It supports i18n via `translate()` with resolved language preference
  2. It uses `editReply` for deferred interactions (better UX than `followUp`)
  3. It logs metrics via `logCommand` and `logError`
  4. It has nested try/catch for reply failures
- Integration would have been a regression in functionality
- Also removed unused `logger` import from `handler.ts`
- Verified `handleCommandError` was not imported anywhere else in the codebase
- Build passes successfully

### Task 13: Move CREATE TABLE from runtime to Prisma migrations (COMPLETED)
- Runtime functions `ensureGuildSettingsTable` and `ensureUserSettingsTable` were in:
  - `src/settings/guildSettingsRepository.ts` (not `src/discord/commands/handler.ts` as task stated)
  - `src/settings/userSettingsRepository.ts`
- Schema already had equivalent models: `GuildSetting` and `UserSetting` in `prisma/schema.prisma`
- No existing Prisma migrations in the project (CI uses `prisma db push`)
- Created manual migration `prisma/migrations/20260423230515_add_settings_tables/migration.sql` with `CREATE TABLE IF NOT EXISTS` for both tables to preserve existing data
- Also created `prisma/migrations/migration_lock.toml` (required by Prisma Migrate)
- Refactored both repositories to use typed Prisma Client API (`prisma.guildSetting.upsert/findUnique`, `prisma.userSetting.upsert/findUnique`) instead of raw SQL
- Removed `ensureGuildSettingsTable` and `ensureUserSettingsTable` functions and all their callers
- Updated `tests/settings/languagePreferences.test.ts`:
  - Removed "recreates settings tables after they are dropped" test (no longer applicable)
  - Changed cleanup in `afterAll` from raw SQL `DELETE` to `prisma.guildSetting.deleteMany()` and `prisma.userSetting.deleteMany()`
- Build passes (`npm run build` and `npm run typecheck` both succeed)
- Note: `GuildDiplomacySetting` in `src/travian/diplomacy/diplomacyRepository.ts` also has runtime `CREATE TABLE IF NOT EXISTS` but was out of scope for this task

### Task 15: Create `/nearest-enemy` command (COMPLETED)
- Command definition: `src/discord/commands/definitions/nearestEnemy.ts`
  - Options: `x` (required, -200..200), `y` (required, -200..200), `limit` (optional, 1..25, default 10)
  - No `radius` option — finds nearest enemies globally across the entire map
- Query: `src/travian/queries/findNearestEnemies.ts`
  - Reuses `getEnemyAllianceTagsForGuild` and `findEnemyVillagesNear` to avoid duplication
  - Passes radius 999 to cover the entire Travian map (max possible distance ≈ 566)
  - Returns results sorted by distance ascending
- Handler: Added `handleNearestEnemy` in `src/discord/commandRouter.ts`
  - Checks `guildId` before deferring (follows correct pattern)
  - Uses `createVillageWithDistanceEmbed` with red color (0xe74c3c)
- Registration: Added import in `src/index.ts`
- Help: Added `nearest-enemy` to `handleHelp` command list under Search category
- Translations:
  - `nearest_enemy.title`: 'Nearest enemy villages from {x}|{y}' / 'Najbliższe wrogie wioski od {x}|{y}'
  - `help.nearest-enemy`: description in both en and pl
- Build passes (`npm run build` succeeds with no errors)

### Task 14: DM Support for read-only commands (COMPLETED)
- Modified `src/discord/commandRouter.ts`:
  - Exported `getLang` function (was private)
  - Updated `getLang` to check user language override in DMs via `getUserLanguageOverride(prisma, interaction.user.id)` instead of hardcoding `'en'`
  - Added guild check to `handleMapRefresh` — now replies with `common.guild_only` in DMs (was only blocked by `requireAdmin` when `ADMIN_ROLE_ID` is set)
- Modified `src/index.ts`:
  - Imported `getLang` from `commandRouter.ts`
  - Updated catch block error handler to use `getLang(interaction, prisma)` instead of `resolveStoredLanguagePreference(prisma, guildId ?? '', userId)`
  - This fixes a bug where DM errors would cause `getGuildDefaultLanguage(prisma, '')` to throw (empty string fails `normalizeIdentifier` validation), preventing error messages from reaching users in DMs
- Guild-only commands that already rejected DMs correctly: `enemy-near`, `diplomacy-set`, `diplomacy-list`, `diplomacy-remove`, `settings-language`
- Read-only commands that now work in DMs (no changes needed, they never checked `guildId`): `/help`, `/distance`, `/player-info`, `/server-info`, `/wotw-info`, `/tribe-search`, `/alliance-near`, `/inactive-search`, `/alliance-villages`, `/player-villages`, `/last-update`
- Translation key `common.guild_only` already existed in both `en.ts` and `pl.ts` — no new keys needed
- Build passes (`npm run build` succeeds with no errors)
