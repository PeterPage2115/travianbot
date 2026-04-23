# Naprawa jednostek + ulepszenie embedów

## TL;DR
> Naprawa `unitSpeeds.ts` z poprawnymi nazwami i prędkościami jednostek + dodanie tłumaczeń nazw + poprawa wizualna wszystkich embedów.
>
> **Deliverables**:
> - Poprawiony `src/travian/unitSpeeds.ts` z 9 jednostkami/plemię (wszystkie poza osadnikami)
> - Tłumaczenia nazw jednostek i plemion w `pl.ts` i `en.ts`
> - Ulepszone embedy wizualnie
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 fale

## Context

### Zebrane problemy
1. **unitSpeeds.ts** zawiera WYMYSŁONE nazwy jednostek i błędne prędkości
2. Brak tłumaczeń nazw jednostek i plemion w i18n
3. Wszystkie embedy wymagają poprawy wizualnej

### Prawdziwe dane jednostek (z oficjalnej tabeli Travian Legends)

**Romans**:
- Legionnaire 6, Praetorian 5, Imperian 7, Equites Legati 16, Equites Imperatoris 14, Equites Caesaris 10, Battering Ram 4, Fire Catapult 3, Senator 4

**Teutons**:
- Clubswinger 7, Spearman 7, Axeman 6, Scout 9, Paladin 10, Teutonic Knight 9, Ram 4, Catapult 3, Chief 4

**Gauls**:
- Phalanx 7, Swordsman 6, Pathfinder 17, Theutates Thunder 19, Druidrider 16, Haeduan 13, Ram 4, Trebuchet 3, Chieftain 5

**Egyptians**:
- Slave Militia 7, Ash Warden 6, Khopesh Warrior 7, Sopdu Explorer 16, Anhur Guard 15, Resheph Chariot 10, Ram 4, Catapult 3, Chieftain 5

**Huns**:
- Mercenary 7, Bowman 6, Spotter 19, Steppe Rider 16, Marksman 15, Marauder 14, Ram 4, Catapult 3, Logades 5

**Spartans**:
- Hoplite 6, Sentinel 9, Shieldsman 8, Twinsteel Therion 6, Elpida Rider 16, Corinthian Crusher 9, Ram 4, Catapult 3, Chieftain 4

## Work Objectives

### Core Objective
Naprawić dane jednostek w `unitSpeeds.ts`, dodać tłumaczenia, poprawić wizualnie embedy.

### Must Have
- [ ] Poprawne nazwy i prędkości wszystkich jednostek (bez osadników)
- [ ] Tłumaczenia PL/EN nazw jednostek i plemion
- [ ] Ulepszone embedy (czytelniejsze, lepsza struktura)

### Must NOT Have
- Osadnicy (settlers) - użytkownik wyraźnie powiedział "oprócz osadników"
- Żadnych nowych funkcji - tylko naprawy i poprawa wyglądu

## Execution Strategy

### Wave 1 (Foundation - dane i tłumaczenia):
- Task 1: Poprawić `unitSpeeds.ts` - poprawne nazwy i prędkości
- Task 2: Dodać tłumaczenia nazw jednostek i plemion do `pl.ts` i `en.ts`
- Task 3: Aktualizacja `distance` command i embeda

### Wave 2 (Visual improvements - embedy):
- Task 4: Poprawić `createVillageListEmbed`
- Task 5: Poprawić `createVillageWithDistanceEmbed`
- Task 6: Poprawić `createInactiveReportEmbed`
- Task 7: Poprawić `createPlayerInfoEmbed`
- Task 8: Poprawić `createWotwInfoEmbed`
- Task 9: Poprawić `createDiplomacyListEmbed`
- Task 10: Poprawić `createServerInfoEmbed`
- Task 11: Poprawić `createDistanceEmbed`
- Task 12: Poprawić `createHelpEmbed`

## TODOs

- [x] 1. Poprawić `src/travian/unitSpeeds.ts` - poprawne nazwy i prędkości

  **What to do**:
  - Zastąpić obecne dane poprawnymi nazwami i prędkościami (z sekcji Context)
  - Upewnić się że `SERVER_SPEED_MULTIPLIER = 2` pozostaje
  - Każde plemię ma 9 jednostek (6 bojowych + zwiad + taran + katapulta + szef)
  - `TRIBE_ID_MAP` i `TRIBE_DISPLAY_NAMES` zostają bez zmian lub z tłumaczeniami

  **Must NOT do**:
  - Nie zmieniać logiki `calculateTravelTime` ani `formatTravelTime`
  - Nie dodawać osadników

  **QA Scenarios**:
  ```
  Scenario: Unit speeds are correct
    Tool: Bash (node REPL)
    Steps:
      1. node -e "import('./dist/travian/unitSpeeds.js').then(m => console.log(m.TRIBE_UNITS.huns))"
    Expected Result: Shows Mercenary(7), Bowman(6), Spotter(19), Steppe Rider(16), Marksman(15), Marauder(14), Ram(4), Catapult(3), Logades(5)
    Evidence: .sisyphus/evidence/task-1-unit-speeds.txt
  ```

- [x] 2. Dodać tłumaczenia nazw jednostek i plemion

  **What to do**:
  - Dodać klucze tłumaczeń do `src/i18n/en.ts` i `src/i18n/pl.ts`:
    - `tribe.romans`, `tribe.teutons`, `tribe.gauls`, `tribe.egyptians`, `tribe.huns`, `tribe.spartans`
    - Dla każdej jednostki: `unit.romans.legionnaire`, itd.
  - Zaktualizować `unitSpeeds.ts` aby używał tłumaczeń zamiast stałych stringów (opcjonalnie - może być osobny task)

  **QA Scenarios**:
  ```
  Scenario: Translations exist
    Tool: Bash (grep)
    Steps:
      1. grep "tribe\.romans" src/i18n/pl.ts src/i18n/en.ts
      2. grep "unit\.huns\.spotter" src/i18n/pl.ts src/i18n/en.ts
    Expected Result: Keys found with Polish and English translations
    Evidence: .sisyphus/evidence/task-2-translations.txt
  ```

- [x] 3. Ulepszyć embed `createDistanceEmbed`

  **What to do**:
  - Lepsza struktura - podzielić na sekcje per plemię
  - Wyraźniejsze oznaczenie najszybszej jednostki
  - Może tabela lub lista z emoji

  **QA Scenarios**:
  ```
  Scenario: Distance embed looks improved
    Tool: Bash (curl / node REPL)
    Steps:
      1. Run distance command with test data
      2. Inspect embed JSON structure
    Expected Result: Embed has clear sections, fastest unit highlighted
    Evidence: .sisyphus/evidence/task-3-distance-embed.json
  ```

- [x] 4. Ulepszyć `createVillageListEmbed`

  **What to do**:
  - Lepsza struktura pól
  - Może grupowanie lub numery
  - Czytelniejsze formatowanie populacji i odległości

  **QA Scenarios**:
  ```
  Scenario: Village list embed is readable
    Tool: Bash (node REPL)
    Steps:
      1. Create embed with sample villages
      2. Check field structure
    Expected Result: Fields are well-formatted and readable
    Evidence: .sisyphus/evidence/task-4-village-embed.json
  ```

- [x] 5. Ulepszyć pozostałe embedy (inactive, player info, WOTW, diplomacy, server info, help)

  **What to do**:
  - `createInactiveReportEmbed` - lepsze formatowanie score i explanation
  - `createPlayerInfoEmbed` - ładniejsza prezentacja danych gracza
  - `createWotwInfoEmbed` - highlight VP
  - `createDiplomacyListEmbed` - kolory/statusy
  - `createServerInfoEmbed` - ładniejsza tabela
  - `createHelpEmbed` - lepsza organizacja komend

  **QA Scenarios**:
  ```
  Scenario: All embeds render correctly
    Tool: Bash (node REPL)
    Steps:
      1. Create each embed type with test data
      2. Verify JSON structure
    Expected Result: All embeds have valid structure and improved formatting
    Evidence: .sisyphus/evidence/task-5-embeds.json
  ```

## Final Verification Wave

- [ ] F1. **Build check** — `npm run build` PASS
- [ ] F2. **Type check** — `npm run typecheck` PASS
- [ ] F3. **Tests** — `npm run test -- tests/discord/` PASS
- [ ] F4. **Unit speed verification** — porównanie z oficjalną tabelą Travian

## Commit Strategy

- Commit 1: `fix(units): correct unit names and speeds in unitSpeeds.ts`
- Commit 2: `feat(i18n): add unit and tribe name translations`
- Commit 3: `style(embeds): improve visual formatting of all embeds`
- Tag: `v1.2.0`

## Success Criteria
- Wszystkie jednostki mają poprawne nazwy i prędkości
- Tłumaczenia nazw jednostek działają w obu językach
- Embedy są czytelniejsze i lepiej sformatowane
- Wszystkie testy przechodzą
