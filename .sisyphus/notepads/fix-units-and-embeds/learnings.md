## Learnings: createInactiveReportEmbed visual improvements

- Added sequential numbering (`#1`, `#2`, etc.) to embed field names for better readability.
- Added score emoji indicators based on thresholds:
  - 🔴 for score >= 80
  - 🟡 for score 50–79
  - 🟢 for score < 50
- Reformatted embed field values with clear emoji prefixes:
  - `👤 {player} | 🏘️ Pop: {population}`
  - `📊 Score: {score}/100`
  - `📈 Trend: {emoji} {delta} ({first} → {last})`
  - `🔍 Reasons: {reasons}`
- Preserved LTR mark (`\u200E`) handling for Arabic/RTL village/player/alliance names.
- Kept existing `InactiveCandidate` interface and function signature unchanged.
- Verified with `npx tsc --noEmit` — no type errors.
