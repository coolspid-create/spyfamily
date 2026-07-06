# Family Scheduler 1.3.0 Production Release

Date: 2026-07-06

## Android Version

- `versionCode`: 28
- `versionName`: 1.3.0
- Package: `com.coolspid.familyxscheduler`

## Scope

- App pull-to-refresh now has a 12-second safety timeout so the refresh indicator cannot remain indefinitely when a database request stalls.
- Pull-to-refresh display state is scoped to the tab where the gesture started and is cleared immediately when switching tabs.
- The `놓으면 새로고침` intermediate label was removed, leaving only the pre-refresh and refreshing states.
- Standalone diary pull-to-refresh uses the same timeout and simplified labels.
- Diary save feedback now shows a compact `다이어리 저장 중입니다.` saving state while keeping success and failure responses.
- Main tab and embedded diary entry animations were simplified to reduce flicker when entering the diary tab.

## Verification

- `npm run lint`
- `npm run build`
- `npx cap sync android`
- `./gradlew.bat bundleRelease`
- AAB signature metadata inspection
- SHA-256 hash generation

## Upload Artifact

- `artifacts/aab/FamilyScheduler-1.3.0-release.aab`
- Size: `3934257` bytes
- SHA-256: `613EF9154A15F44086F6BEFDCDF20A02082EE62266617871499707D1A3CE1B7F`

## Notes

- Play Console upload was not performed in Codex.
- No Supabase schema, RLS/storage policy, auth, payment, calendar sync, or production database data was changed.
