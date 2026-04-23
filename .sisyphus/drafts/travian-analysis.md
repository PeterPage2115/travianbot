# Draft: Analiza problemów z botem Travian

## Zebrane problemy (priorytetowe)

### 1. PRĘDKOŚCI JEDNOSTEK - CAŁKOWICIE ZŁE
**Plik**: `src/travian/unitSpeeds.ts`

**Problem**: Nazwy jednostek w kodzie to WYMYSŁONE nazwy, nieistniejące w Travian. Prędkości bazowe też są błędne.

**Przykład Hunów**:
| Kod bota | Prawdziwa jednostka | Prawdziwa prędkość | Prędkość w kodzie |
|---|---|---|---|
| Scout | Spotter (Obserwator) | 19 | 8 |
| Steppe Child | Steppe Rider (Jeździec stepowy) | 16 | 7 |
| Marksman | Marksman (Strzelec wyborowy) | 15 | 6 |
| Spotter | ??? | ??? | 9 |
| Marauder | Marauder (Łupieżca) | 14 | 10 |
| Hurler | ??? | ??? | 5 |

Brakuje: Mercenary (7), Bowman (6) - to podstawowe jednostki!

**Prawdziwe prędkości** (z oficjalnej tabeli Travian Legends):
- Romans: Legionnaire 6, Praetorian 5, Imperian 7, Equites Legati 16, Equites Imperatoris 14, Equites Caesaris 10
- Teutons: Clubswinger 7, Spearman 7, Axeman 6, Scout 9, Paladin 10, Teutonic Knight 9
- Gauls: Phalanx 7, Swordsman 6, Pathfinder 17, Theutates Thunder 19, Druidrider 16, Haeduan 13
- Egyptians: Slave Militia 7, Ash Warden 6, Khopesh Warrior 7, Sopdu Explorer 16, Anhur Guard 15, Resheph Chariot 10
- Huns: Mercenary 7, Bowman 6, Spotter 19, Steppe Rider 16, Marksman 15, Marauder 14
- Spartans: Hoplite 6, Sentinel 9, Shieldsman 8, Twinsteel Therion 6, Elpida Rider 16, Corinthian Crusher 9

**Mnożnik serwera**: `SERVER_SPEED_MULTIPLIER = 2` jest POPRAWNY. Na wszystkich serwerach speed (x2, x3, x5, x10), ruch jednostek jest zawsze 2x szybszy.

### 2. NAZWY JEDNOSTEK PO ANGIELSKU (brak tłumaczeń)
- `unitSpeeds.ts` używa stałych stringów angielskich
- Pliki `en.ts` i `pl.ts` nie mają tłumaczeń nazw jednostek
- `TRIBE_DISPLAY_NAMES` też są po angielsku

### 3. BRAKUJE JEDNOSTEK
W kodzie są tylko 6 jednostek na plemię, a powinno być więcej (kotły, tarany, osadnicy, szefowie plemion). Ale dla `/distance` wystarczą jednostki bojowe.

### 4. WERYFIKACJA KOMEND - INNE POTENCJALNE BŁĘDY
Do sprawdzenia:
- Czy wszystkie komendy mają spójne walidacje?
- Czy embedy mają poprawne formatowanie?
- Czy tłumaczenia są kompletne?

### 5. EMBEDY WIZUALNIE
- Użytkownik chce ładniejsze embedy
- Trzeba zaproponować konkretne poprawki

## Decyzje podjęte przez użytkownika
1. **Jednostki**: Pokazywać WSZYSTKIE jednostki oprócz osadników (settlers)
2. **Kolejność**: Najpierw naprawić błędy (prędkości, nazwy, tłumaczenia), potem poprawić wygląd embedów
3. **Tłumaczenia**: Dodać tłumaczenia nazw jednostek i plemion do pl.ts i en.ts
4. **Embedy**: Poprawić wizualnie wszystkie embedy
