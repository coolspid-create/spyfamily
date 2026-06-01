# Codex Integration Log

Latest integration:
2026-06-01 - Debug app weight and reduce PWA precache

Source handoff:
Direct user request in Codex asking to debug the app and check whether there are heavy parts.

Integrated:
- Ran lint/build diagnostics and checked generated bundle, public assets, Capacitor assets, and APK artifact sizes.
- Confirmed the JavaScript/CSS production bundle is modest, while copied `public` assets dominate the web asset and Android asset footprint.
- Confirmed seven sample PDFs total about 15.68 MiB and public images total about 4.30 MiB; these are copied into `dist` and Capacitor Android assets.
- Confirmed app code references only the small book preview JPG files from those diary sample assets; larger sample PDFs/PNGs are not referenced from current source.
- Reduced the PWA Workbox precache from broad `png` inclusion to only app launcher icons, dropping precache from 4,991.19 KiB to 1,118.09 KiB.

Intentionally left out:
- Public/release assets were not deleted or moved because that should be a separate product decision.
- Auth, payment/Supabase behavior, calendar sync behavior, Android packaging, release signing, and app icons were not changed.

Files changed:
- `app/vite.config.js`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Public/dist/Capacitor asset size scans with PowerShell
- Source pattern scans with `rg`

Open follow-ups:
- To reduce APK size meaningfully, move unused sample PDFs and large unused PNGs out of `app/public` or serve them remotely/on demand. This should remove most of the roughly 20 MiB static web asset payload from Android assets.
- Browser runtime console/performance inspection could not be completed because the in-app browser blocked local URL inspection under its URL policy.

Previous integration:
2026-06-01 - Resize circular time picker and refresh app icons

Source handoff:
Direct user request in Codex after confirming the app-rendered circular time picker fixed the Android WebView native picker issue, asking to slightly reduce the picker size and update the app logo/icon by removing test branding and making the calendar logo fill more of the icon.

Integrated:
- Reduced the app-rendered circular time picker width, estimated height, clock face size, and clock radius.
- Removed the debug build `applicationIdSuffix ".test"` and `versionNameSuffix "-test"` so debug APKs no longer install under a `.test` package/version label.
- Updated debug resource strings so package/custom URL scheme no longer use the `.test` suffix.
- Regenerated PWA and Android launcher icon PNGs from a tighter crop of the existing calendar logo, making the calendar fill more of the icon and reducing the visible top blue margin.
- Built a fresh debug APK and copied it to `artifacts/FamilyScheduler-debug-20260601-161535.apk`.

Intentionally left out:
- Auth, payment/Supabase behavior, calendar sync behavior, release signing, Play Store/AAB packaging, and store metadata were not changed.

Files changed:
- `app/src/components/NativeSafeControls.jsx`
- `app/android/app/build.gradle`
- `app/android/app/src/debug/res/values/strings.xml`
- `app/public/app-icon-192.png`
- `app/public/app-icon-512.png`
- `app/public/pwa-icon.png`
- `app/android/app/src/main/res/mipmap-mdpi/ic_launcher.png`
- `app/android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png`
- `app/android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png`
- `app/android/app/src/main/res/mipmap-hdpi/ic_launcher.png`
- `app/android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png`
- `app/android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png`
- `app/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png`
- `app/android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png`
- `app/android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png`
- `app/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png`
- `app/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png`
- `app/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png`
- `app/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`
- `app/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png`
- `app/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png`
- `docs/codex-integration-log.md`
- Generated APK artifact: `artifacts/FamilyScheduler-debug-20260601-161535.apk`

Commands run:
- `npm run lint`
- `npm run build`
- `npx cap sync android`
- `.\gradlew.bat assembleDebug`
- `Get-FileHash ... -Algorithm SHA256`

Open follow-ups:
- Install the new APK and confirm the launcher icon crop looks full enough on the target Android launcher mask.

Previous integration:
2026-06-01 - Replace Android native time picker with app circular clock

Source handoff:
Direct user report in Codex with an installed-APK screenshot showing Android WebView's native `input[type="time"]` picker rendering as a large red/navy dialog after prior edge-to-edge/theme work, while the web view looked normal.

Integrated:
- Identified the problematic surface as Android WebView's native time picker, not the app-rendered calendar/time UI.
- Reworked `NativeSafeTimeInput` popup mode into an app-rendered circular clock picker with AM/PM controls, hour/minute display toggles, a round dial, 5-minute minute selection, and +/- 1 minute adjustment.
- Kept the full-row/full-card time touch target for weekly schedule add/edit rows and the diary composer time card.
- Pointed weekly schedule and diary composer time controls back to the app-rendered circular picker, avoiding Android WebView's native time dialog and its theme/edge-to-edge rendering quirks.
- Built a fresh debug APK and copied it to `artifacts/FamilyScheduler-debug-20260601-160335.apk`.

Intentionally left out:
- Android edge-to-edge settings, app theme colors, auth/payment/Supabase behavior, calendar sync behavior, release signing, Play Store/AAB packaging, app icons, and release metadata were not changed.

Files changed:
- `app/src/components/NativeSafeControls.jsx`
- `app/src/components/HomeBoard.jsx`
- `app/src/components/FamilyDiaryTab.jsx`
- `docs/codex-integration-log.md`
- Generated APK artifact: `artifacts/FamilyScheduler-debug-20260601-160335.apk`

Commands run:
- `npm run lint`
- `npm run build`
- `git diff --check`
- `npx cap sync android`
- `.\gradlew.bat assembleDebug`
- `Get-FileHash ... -Algorithm SHA256`

Open follow-ups:
- Install the new debug APK and confirm the app-rendered circular clock appears instead of Android WebView's native red/navy time picker.

Previous integration:
2026-06-01 - Rebuild debug APK after picker fixes

Source handoff:
Direct user request in Codex to generate a new APK after the payment calendar clipping fix and native clock time picker restoration.

Integrated:
- Built the current Vite web bundle.
- Synced the latest `dist` assets into the Capacitor Android project.
- Generated a fresh debug APK with Gradle.
- Copied the generated APK to `artifacts/FamilyScheduler-debug-20260601-153531.apk` for easier phone transfer.

Intentionally left out:
- No release signing, Play Store/AAB packaging, auth/payment/Supabase behavior, calendar sync behavior, app icons, or release metadata were changed.

Files changed:
- `docs/codex-integration-log.md`
- Generated APK artifact: `artifacts/FamilyScheduler-debug-20260601-153531.apk`

Commands run:
- `npm run build`
- `npx cap sync android`
- `.\gradlew.bat assembleDebug`
- `Get-FileHash ... -Algorithm SHA256`

Open follow-ups:
- Install the debug APK on an Android phone and confirm the payment calendar is not clipped and time fields open the native circular clock picker.

Previous integration:
2026-06-01 - Unclip payment calendar and restore native clock time pickers

Source handoff:
Direct user request in Codex with a screenshot showing the payment due-day calendar clipped inside the payment form card, plus a request to make time setting controls use the previous circular clock style because it is faster for recording times.

Integrated:
- Changed the app-rendered `NativeSafeDateInput` popup to render through a body-level portal with fixed positioning, so it is no longer clipped by payment cards or accordion containers with `overflow-hidden`.
- Kept the date popup visually aligned to its triggering field and constrained within the mobile app shell.
- Switched weekly schedule add/edit time controls and the diary composer time card back to the native `type="time"` path, preserving the full-row/full-card touch target while letting Android WebView show the native circular clock picker.

Intentionally left out:
- No auth, payment processing, Supabase schema, calendar sync, Android packaging, app icons, or release metadata were changed.
- A new APK was not rebuilt in this step.

Files changed:
- `app/src/components/NativeSafeControls.jsx`
- `app/src/components/HomeBoard.jsx`
- `app/src/components/FamilyDiaryTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/payment` confirmed the payment date picker is mounted under `body`, not inside the clipped payment card, and no native date/time input is mounted for that date popup.
- Browser check on `http://127.0.0.1:5175/diary` confirmed the diary composer uses a native `input[type="time"]` surface again and no app-rendered time picker popup is mounted.

Open follow-ups:
- Rebuild the debug APK when the user is ready to test this native circular time picker behavior on a phone.

Previous integration:
2026-06-01 - Build phone-test debug APK

Source handoff:
Direct user request in Codex to convert the current app into an APK for testing on a phone.

Integrated:
- Built the current Vite web bundle.
- Synced the latest `dist` assets into the Capacitor Android project.
- Generated a debug APK with Gradle for local phone testing.
- Copied the generated APK to `artifacts/FamilyScheduler-debug-20260601-151537.apk` for easier access.

Intentionally left out:
- No release signing, Play Store/AAB packaging, auth/payment/Supabase behavior, calendar sync behavior, app icons, or release metadata were changed.

Files changed:
- `docs/codex-integration-log.md`
- Generated APK artifact: `artifacts/FamilyScheduler-debug-20260601-151537.apk`

Commands run:
- `npm run build`
- `npx cap sync android`
- `.\gradlew.bat assembleDebug`
- `Get-FileHash ... -Algorithm SHA256`

Open follow-ups:
- Install the debug APK on an Android phone and confirm the date/time popup behavior in the real WebView.

Previous integration:
2026-06-01 - Align shared date and time picker popups

Source handoff:
Direct user request in Codex with screenshots showing the diary date search, family schedule deadline date, weekly schedule time, and payment due-day controls still surfacing browser/native picker panels instead of the diary composer-style app popup.

Integrated:
- Added popup alignment options to `NativeSafeDateInput` and `NativeSafeTimeInput` so app-rendered picker panels can stay inside the narrow mobile app viewport from both left and right column fields.
- Switched the diary date search controls, diary export date range controls, family schedule `기한/실행일` fields, weekly schedule add/edit `시간` rows, payment `결제일 / 주기` fields, payment history date fields, and monthly event date field to the app-rendered popup picker mode.
- Kept the existing stored value shapes intact: schedule times stay as `HH:mm`, family/monthly dates stay as ISO dates, and payment due days still save as labels such as `1일`.

Intentionally left out:
- Auth, payment processing behavior, Supabase schema, calendar sync, Android packaging, app icons, and release assets were not changed.
- A new APK was not rebuilt in this step.

Files changed:
- `app/src/components/NativeSafeControls.jsx`
- `app/src/components/FamilyDiaryTab.jsx`
- `app/src/components/HomeBoard.jsx`
- `app/src/components/SpecialOpsTab.jsx`
- `app/src/components/PaymentTab.jsx`
- `app/src/components/RouteMapTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- `git diff --check`
- Browser check on `http://127.0.0.1:5175/diary` confirmed the diary date search opens the app-rendered date popup with no native date/time inputs mounted.
- Browser check on `http://127.0.0.1:5175/payment` confirmed the payment `결제일` control opens the app-rendered date popup with no native date/time inputs mounted.
- Browser automation for opening the hidden family/weekly add forms did not reliably activate those add buttons, so those two paths were verified by source inspection plus lint/build rather than a completed click-through.

Open follow-ups:
- Manual tap confirmation on the in-app browser or Android WebView is still useful for the family schedule add form and weekly schedule add form because the browser automation could not open those forms reliably in this run.

Previous integration:
2026-06-01 - Expand picker touch targets and unclipped header logo

Source handoff:
Direct user requests in Codex with screenshots showing the schedule/diary time picker only opened from a small part of the time field, the header logo still clipping, and the payment scheduled day field needing the calendar popup.

Integrated:
- Expanded `NativeSafeTimeInput` so the hidden native `type="time"` input covers the full styled label/card area.
- Refined `NativeSafeTimeInput` again so the visible row/card handles the click and calls the native picker, while the real input is kept as a tiny fallback target instead of a full transparent overlay.
- Added app-rendered popup picker modes for date and time, used by the diary composer so the panels open below their cards instead of overlaying the cards.
- Ensured opening the diary date picker closes the time picker and opening the time picker closes the date picker.
- Hid the diary composer scrollbars while preserving vertical scroll.
- Updated weekly schedule add/edit time rows so tapping anywhere in the `시간` row opens the time picker.
- Updated the diary composer time card so tapping anywhere in that card opens the time picker.
- Changed payment scheduled `결제일 / 주기` add/edit fields from text inputs to date-picker controls; the selected date's day is stored as the existing monthly day label such as `5일`.
- Relaxed the header title side padding and slightly reduced the logo text so `Family × Scheduler` renders fully between the left child selector and right local badge.

Intentionally left out:
- Auth, payment processing behavior, Supabase schema, calendar sync, Android packaging, app icons, and release assets were not changed.
- A new APK was not rebuilt in this step.

Files changed:
- `app/src/App.jsx`
- `app/src/components/NativeSafeControls.jsx`
- `app/src/components/HomeBoard.jsx`
- `app/src/components/FamilyDiaryTab.jsx`
- `app/src/components/PaymentTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/` confirmed the header title is not clipped and the weekly schedule time input covers the full time row.
- Browser check on `http://127.0.0.1:5175/payment` confirmed the scheduled payment day field renders as a hidden native `type="date"` picker while showing `1일`.
- Browser check on `http://127.0.0.1:5175/diary` confirmed the diary composer time input covers the full time card.
- Follow-up browser check on `http://127.0.0.1:5175/diary` confirmed the visible diary time card receives hit tests and the hidden time input is no longer a full-card transparent overlay.
- Follow-up browser check on `http://127.0.0.1:5175/diary` confirmed the diary date popup opens below the date card, the time popup opens below the time card, only one picker stays open, and the composer scrollbar width is 0.

Open follow-ups:
- Physical Android confirmation is still useful because native picker surfaces are controlled by the device WebView/OS.

Previous integration:
2026-06-01 - Restore native date and time pickers

Source handoff:
Direct user request in Codex after screenshots showed weekly schedule time entry opening a numeric keyboard instead of the previous circular time picker, with date picking expected to remain popup-style.

Integrated:
- Changed `NativeSafeTimeInput` back to a native `type="time"` control under the existing styled surface, so mobile WebView/browser opens the native circular time picker instead of a numeric keyboard.
- Changed `NativeSafeDateInput` back to a native `type="date"` control under the existing styled surface, preserving the app's visible date label while restoring system calendar popup behavior.
- Kept the existing reusable control API so weekly schedule, family schedule, payment, monthly event date, and diary date/time call sites do not need broad source rewrites.

Intentionally left out:
- Auth, payment behavior, Supabase schema, calendar sync, Android packaging, app icons, and release assets were not changed.
- A new APK was not rebuilt in this step.

Files changed:
- `app/src/components/NativeSafeControls.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Started local dev server on `http://127.0.0.1:5175/`
- Browser DOM checks confirmed the weekly schedule time field renders as `type="time"` and family/diary date controls render as `type="date"`.

Open follow-ups:
- Physical Android confirmation is still useful because the exact native picker surface is controlled by the device WebView/OS.

Previous integration:
2026-05-31 - Disable Android dark inversion and fix header clipping

Source handoff:
Direct user report in Codex that installed Android app still shows inverted/dark native picker dialogs and clips the `Family × Scheduler` header while the web version is normal.

Integrated:
- Changed Android app themes from `DayNight` to explicit light themes.
- Disabled Android force-dark on the application, activity theme, dialogs, and splash/post-splash themes.
- Added light dialog styling for Android alert, date picker, and time picker surfaces.
- Disabled WebView force-dark and algorithmic darkening in `MainActivity`.
- Adjusted the header title container and font size so `Family × Scheduler` has more horizontal room and no longer clips at the edges in the app.
- Rebuilt and replaced `artifacts/FamilyScheduler-1.1.6-test-debug.apk`.

Intentionally left out:
- Feature behavior, data, auth, payment behavior, Supabase schema, calendar sync, package id, and version number were not changed.

Files changed:
- `app/src/App.jsx`
- `app/android/app/src/main/AndroidManifest.xml`
- `app/android/app/src/main/java/com/coolspid/familyxscheduler/MainActivity.java`
- `app/android/app/src/main/res/values/styles.xml`
- `artifacts/FamilyScheduler-1.1.6-test-debug.apk`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- `npx cap sync android`
- `gradlew.bat assembleDebug`
- `aapt dump badging artifacts/FamilyScheduler-1.1.6-test-debug.apk`
- `apksigner verify --verbose artifacts/FamilyScheduler-1.1.6-test-debug.apk`
- `Get-FileHash artifacts/FamilyScheduler-1.1.6-test-debug.apk -Algorithm SHA256`

Open follow-ups:
- Physical-device confirmation is still needed because the reported issue occurs inside Android WebView/native picker surfaces rather than the desktop browser.

Previous integration:
2026-05-31 - Build test APK for device install

Source handoff:
Direct user request in Codex to create an APK for phone testing.

Integrated:
- Rebuilt the web app.
- Synced the latest web assets into the Capacitor Android project.
- Built a debug/test APK using the separated test package id.
- Copied the installable APK to `artifacts/FamilyScheduler-1.1.6-test-debug.apk`.

Intentionally left out:
- No new feature code, auth, payment behavior, Supabase schema, calendar sync, or release signing changes were made in this step.

Files changed:
- `app/android/app/src/main/assets/**` via Capacitor sync
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- `npx cap sync android`
- `gradlew.bat assembleDebug`
- `aapt dump badging artifacts/FamilyScheduler-1.1.6-test-debug.apk`
- `apksigner verify --verbose artifacts/FamilyScheduler-1.1.6-test-debug.apk`
- `Get-FileHash artifacts/FamilyScheduler-1.1.6-test-debug.apk -Algorithm SHA256`

Open follow-ups:
- None.

Previous integration:
2026-05-31 - Android native popup color regression fix

Source handoff:
Direct user request in Codex after APK screenshots showed Android-native date/time/select/confirm popups with inverted colors.

Integrated:
- Replaced active app `date`, `time`, `select`, `confirm`, and rename `prompt` usage with app-rendered controls so Android WebView no longer opens the system-styled dark navy popups in schedule, family, monthly, payment, diary, and app profile flows.
- Added reusable `NativeSafeControls` components for date picker, time input, select menu, confirm dialog, and text dialog.
- Tightened the main header title sizing and reserved side-control space so `Family × Scheduler` does not sit under the child selector or local-mode pill in the Android viewport.
- Rebuilt the synced Android debug APK at `artifacts/FamilyScheduler-1.1.6-test-debug.apk`.

Intentionally left out:
- The PWA install prompt still uses the browser install API because it is a platform prompt, not one of the app form controls causing this regression.
- `app/src/original_backup` was not modified.

Files changed:
- `app/src/App.jsx`
- `app/src/components/NativeSafeControls.jsx`
- `app/src/components/HomeBoard.jsx`
- `app/src/components/SpecialOpsTab.jsx`
- `app/src/components/PaymentTab.jsx`
- `app/src/components/FamilyDiaryTab.jsx`
- `app/src/components/RouteMapTab.jsx`
- `app/android/app/src/main/AndroidManifest.xml`
- `app/android/app/src/main/java/com/coolspid/familyxscheduler/MainActivity.java`
- `app/android/app/src/main/res/values/styles.xml`
- `app/android/app/src/main/assets/public/**`
- `artifacts/FamilyScheduler-1.1.6-test-debug.apk`
- `docs/codex-integration-log.md`

Commands run:
- `rg -n 'type="date"|type="time"|<select|window\.confirm|prompt\(' app/src --glob '!**/original_backup/**'`
- `npm run lint`
- `npm run build`
- `npx cap sync android`
- `.\gradlew.bat assembleDebug`
- `aapt dump badging artifacts\FamilyScheduler-1.1.6-test-debug.apk`
- `apksigner verify --verbose artifacts\FamilyScheduler-1.1.6-test-debug.apk`
- Browser check on `http://127.0.0.1:5175/` for active native control counts and header bounds

Open follow-ups:
- Physical Android install should be checked once more because the original regression only appeared in the installed APK, but the app no longer contains the native form/dialog triggers that produced those screenshots.

Previous integration:
2026-05-31 - Rebuild 1.1.6 test APK

Source handoff:
Direct user request in Codex.

Integrated:
- Rebuilt the current web app and synced it into the Android Capacitor project.
- Regenerated the test debug APK at `artifacts/FamilyScheduler-1.1.6-test-debug.apk`.

Intentionally left out:
- No source behavior changes were made in this rebuild-only step.

Files changed:
- `app/android/app/src/main/assets/public/**`
- `artifacts/FamilyScheduler-1.1.6-test-debug.apk`
- `docs/codex-integration-log.md`

Commands run:
- `npm run build`
- `npx cap sync android`
- `.\gradlew.bat assembleDebug`
- `aapt dump badging artifacts\FamilyScheduler-1.1.6-test-debug.apk`
- `apksigner verify --verbose artifacts\FamilyScheduler-1.1.6-test-debug.apk`
- `Get-FileHash artifacts\FamilyScheduler-1.1.6-test-debug.apk -Algorithm SHA256`

Open follow-ups:
- None.

Previous integration:
2026-05-31 - Refresh app launcher icon and installed name

Source handoff:
Direct user request in Codex to create a simple app icon matching the current app design and set the installed app name to `가족일정`.

Integrated:
- Generated a new text-free launcher icon with a navy background, cream calendar tile, family mark, red check, and small accent sparkle.
- Rebuilt PWA icons at `192px` and `512px`, plus the browser favicon and Apple touch icon.
- Rebuilt Android launcher, round, and adaptive foreground icons for all density buckets.
- Rebuilt debug/test launcher icons from the same artwork with a red `TEST` badge while keeping the debug package id separated.
- Updated main and debug Android display strings so the installed app label is `가족일정`.
- Aligned launcher background color to the app navy tone.

Intentionally left out:
- Package ids, version numbers, auth, payment behavior, Supabase schema, calendar sync, and Play Store release metadata were not changed.
- The previously created debug/test package separation was preserved.

Files changed:
- `app/index.html`
- `app/public/app-icon-192.png`
- `app/public/app-icon-512.png`
- `app/public/pwa-icon.png`
- `app/android/app/src/main/res/**/ic_launcher*.png`
- `app/android/app/src/debug/res/**/ic_launcher*.png`
- `app/android/app/src/main/res/values/strings.xml`
- `app/android/app/src/debug/res/values/strings.xml`
- `app/android/app/src/main/res/values/ic_launcher_background.xml`
- `app/android/app/src/debug/res/values/ic_launcher_background.xml`
- `app/android/app/src/main/res/drawable/ic_launcher_background.xml`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- `gradlew.bat assembleDebug`
- `aapt dump badging app-debug.apk` confirmed package `com.coolspid.familyxscheduler.test` and application label `가족일정`.

Open follow-ups:
- None.

Previous integration:
2026-05-31 - Weekly schedule card compact sizing

Source handoff:
Direct user request in Codex to slightly reduce weekly schedule card height and set the time text to 14px bold.

Integrated:
- Reduced non-editing weekly schedule card height from 96px to 88px.
- Reduced card padding from 4.5 to 4 for both past and active/future weekly schedule cards.
- Changed weekly schedule time labels to 14px bold in both past and active/future sections.

Intentionally left out:
- Weekly schedule edit forms, data behavior, animations, auth, payment, Supabase schema, calendar sync, Android packaging, and release assets were not changed.

Files changed:
- `app/src/components/HomeBoard.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/` confirmed weekly schedule cards render at 88px height and time labels render at 14px / font-weight 700 on days with existing schedules.

Open follow-ups:
- None.

Previous integration:
2026-05-31 - Header and picker visual cleanup

Source handoff:
Direct user request in Codex with screenshots showing header overlap, Android picker styling, and crowded completed payment cards.

Integrated:
- Reduced and constrained the `Family × Scheduler` header title so it stays between the child selector and right-side controls.
- Forced light color-scheme handling for native form controls to avoid dark Android date/time picker surfaces bleeding into the app.
- Replaced the family schedule priority native select with an in-app three-button priority picker.
- Removed the large diagonal completed-payment stamp that could cover card contents; completed payments now rely on the compact status row already in the card.

Intentionally left out:
- Android packaging, app icons, auth, Supabase schema, calendar sync, and payment data behavior were not changed.
- Existing local data was not edited.

Files changed:
- `app/src/App.jsx`
- `app/src/index.css`
- `app/src/components/SpecialOpsTab.jsx`
- `app/src/components/PaymentTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/family` confirmed the header title no longer overlaps side controls and the family priority picker renders as in-app buttons with no native select.
- Browser check on `http://127.0.0.1:5175/payment` confirmed the header title no longer overlaps side controls and the large completed-payment stamp element is absent.

Open follow-ups:
- Android native date/time picker color is now forced to light via CSS; final appearance should still be checked on the physical test APK because OS picker rendering is device-controlled.

Previous integration:
2026-05-31 - Limit and delete family checklist items

Source handoff:
Direct user requests in Codex for the family schedule detailed checklist text limit and delete function.

Integrated:
- Added a 30-character limit to the family schedule detailed checklist input.
- Clamped checklist text again before saving so pasted or programmatic input cannot exceed the limit.
- Added a delete button to each detailed checklist item.
- Split checklist completion and deletion into separate buttons so deleting an item does not also toggle its completion state.

Intentionally left out:
- Existing checklist items longer than 30 characters were not modified.
- Family schedule card layout, expand/collapse behavior, auth, payment behavior, Supabase schema, calendar sync, Android packaging, and release assets were not changed.

Files changed:
- `app/src/components/SpecialOpsTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/family` confirmed the checklist input has `maxlength=30`, populated checklist items render independent delete buttons with trash icons, and there are no console errors.

Open follow-ups:
- None.

Previous integration:
2026-05-31 - Limit daily task text and smooth family expand motion

Source handoff:
Direct user request in Codex with screenshots of the daily task list and family schedule expand/collapse cards.

Integrated:
- Added a 50-character limit to the today task input and also clamps the value before saving.
- Changed the family schedule expanded detail area from y-only enter/exit motion to a height + opacity expand/collapse animation matching the softer form motions used elsewhere in the app.

Intentionally left out:
- Existing today task records longer than 50 characters were not modified.
- Family schedule data, checklist behavior, auth, payment behavior, Supabase schema, calendar sync, Android packaging, and release assets were not changed.

Files changed:
- `app/src/components/DailyTasksTab.jsx`
- `app/src/components/SpecialOpsTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/daily` confirmed the today task input has `maxlength=50` and user input is capped at 50 characters.
- Browser check on `http://127.0.0.1:5175/family` confirmed the family schedule expanded detail area still opens with hidden overflow, height-based expanded content, and no console errors.

Open follow-ups:
- None.

Previous integration:
2026-05-31 - Restore weekly add schedule plus icon

Source handoff:
Direct user request in Codex after the weekly `새 일정 추가` button style update.

Integrated:
- Changed the weekly `새 일정 추가` button icon back to the plus icon.
- Kept the soft filled, solid-border, shadowed button style and the onboarding `data-tour="add-schedule"` target.
- Removed the now-unused `FileSignature` import from the weekly schedule component.

Intentionally left out:
- The weekly add button layout, expanded form behavior, and family schedule add button were not changed.
- No diary records, photos, auth, payment behavior, Supabase schema, calendar sync, Android packaging, or release assets were changed.

Files changed:
- `app/src/components/HomeBoard.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/` confirmed the weekly `새 일정 추가` button renders the lucide plus icon, keeps the solid-border card style, and has no console errors.

Open follow-ups:
- None.

Previous integration:
2026-05-31 - Match weekly add schedule button to family add style

Source handoff:
Direct user request in Codex with screenshots comparing the weekly `새 일정 추가` dashed button and family `새 가족일정 추가` button.

Integrated:
- Changed the weekly schedule `새 일정 추가` button from a dashed transparent outline to the same soft filled, solid-border, shadowed card button style used by the family schedule add button.
- Swapped the weekly add button icon to the matching document/signature icon while preserving the onboarding `data-tour="add-schedule"` target.

Intentionally left out:
- The expanded weekly schedule form layout and behavior were not changed.
- No diary records, photos, auth, payment behavior, Supabase schema, calendar sync, Android packaging, or release assets were changed.

Files changed:
- `app/src/components/HomeBoard.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/` confirmed the weekly `새 일정 추가` button uses a solid border, soft filled background, shadowed card style, preserved `data-tour="add-schedule"`, and has no console errors.

Open follow-ups:
- None.

Previous integration:
2026-05-31 - Render diary glass panel at app layer

Source handoff:
Direct user request in Codex after noticing the diary glass panel appeared one beat late when entering the diary tab.

Integrated:
- Moved the embedded diary `타임라인`/`기록달력`/`사진모음` glass panel from inside the diary tab transition tree to the app-level fixed layer.
- Lifted the embedded diary section state into `App.jsx` so the app-level glass panel and diary content stay in sync.
- Changed the panel entrance to a short opacity-only fade so it appears with the diary tab without a delayed upward motion.
- Kept the diary content tab transition and the existing translucent glass styling.

Intentionally left out:
- The standalone non-embedded diary shell bottom navigation was not redesigned.
- No diary records, photos, auth, payment behavior, Supabase schema, calendar sync, Android packaging, or release assets were changed.

Files changed:
- `app/src/App.jsx`
- `app/src/components/FamilyDiaryTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/` -> `다이어리` confirmed the app-level diary glass panel exists within 50ms, has no upward transform, and switches to `기록달력` normally with no console errors.

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Move diary section tabs to floating glass panel

Source handoff:
Direct user request in Codex.

Integrated:
- Updated the family schedule helper copy to:
  - `가족들과 함께 일정과 준비물을 함께 관리하세요.`
  - `중요 일정 및 할일은 월간일정과 연동이 됩니다.`
- Removed the embedded diary top segmented control for `타임라인`, `기록달력`, and `사진모음`.
- Added a fixed bottom floating translucent glass pill panel for the three diary section tabs, positioned above the main app bottom navigation.
- Removed the inner gray capsule layer from the floating diary tab panel and increased panel transparency so page content remains visible behind it.
- Added bottom padding to the embedded diary content so the floating panel does not cover the final content.

Intentionally left out:
- The standalone non-embedded diary shell bottom navigation was not redesigned.
- No diary records, photos, auth, payment behavior, Supabase schema, calendar sync, Android packaging, or release assets were changed.

Files changed:
- `app/src/components/SpecialOpsTab.jsx`
- `app/src/components/FamilyDiaryTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/diary` confirmed the floating diary panel has no inner gray capsule, uses a more transparent glass background, and switches to `기록달력`/`사진모음` normally.

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Fix diary date search

Source handoff:
Direct user request in Codex after noticing the diary date search did not appear to work.

Integrated:
- Changed the diary date search control from a separated hidden input/button pair to a label-wrapped date input so tapping the visible `날짜 검색` control reliably opens the native date picker.
- Added `onInput` handling alongside `onChange` so date input changes update React state consistently.
- Updated timeline filtering to match both normalized `isoDate` and the visible Korean date label.
- Added fallback ISO-date derivation from legacy Korean date labels when older diary records do not have `isoDate`.

Intentionally left out:
- Existing diary records and photos were not modified or deleted.
- No auth, payment behavior, Supabase schema, calendar sync, Android packaging, or release assets were changed.

Files changed:
- `app/src/components/FamilyDiaryTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/diary` confirmed selecting `2026-05-30` shows `5월 30일 검색 결과 (3건)` with no console errors

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Break family summary helper sentence

Source handoff:
Direct user request in Codex with screenshot of the family schedule blue summary card.

Integrated:
- Added an explicit line break after `가족 일정과 준비물을 함께 관리하세요.` in the family schedule summary helper text.
- Moved the `담당자 버튼을...` sentence onto its own line.

Intentionally left out:
- No family schedule behavior, card sizing, icon styling, auth, payment behavior, Supabase schema, calendar sync, Android packaging, diary records, or release assets were changed.

Files changed:
- `app/src/components/SpecialOpsTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/family` confirmed the helper text renders as two lines with no console errors

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Replace family summary alert icon with star

Source handoff:
Direct user request in Codex with screenshot of the family schedule blue summary card.

Integrated:
- Replaced the circular alert icon in the family schedule `중요 일정 및 할 일` summary title with a star icon.
- Removed the now-unused `AlertCircle` import from the family schedule component.
- Used a fuchsia accent color so the family schedule star does not duplicate the weekly notice amber icon.

Intentionally left out:
- The large decorative background star and all family schedule behavior were left unchanged.
- No auth, payment behavior, Supabase schema, calendar sync, Android packaging, diary records, or release assets were changed.

Files changed:
- `app/src/components/SpecialOpsTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Compact today task summary card height

Source handoff:
Direct user request in Codex with screenshot of the today task blue summary card.

Integrated:
- Reduced the today task blue summary card vertical padding and internal row gaps.
- Aligned the date/progress row more tightly and reduced the progress bar height so the card feels closer to the other blue summary cards.
- Kept the previous unified title, divider, color, and progress content styling intact.

Intentionally left out:
- Weekly, payment, and family schedule summary card dimensions were not changed in this pass.
- No auth, payment behavior, Supabase schema, calendar sync, Android packaging, diary records, or release assets were changed.

Files changed:
- `app/src/components/DailyTasksTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/` and `/daily` confirmed weekly notice card single divider, amber icon, compact today card height, and no console errors

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Refine weekly notice summary divider and icon color

Source handoff:
Direct user request in Codex with screenshot of the weekly `가족 알림장` blue card.

Integrated:
- Removed the extra input-area top divider from the weekly `가족 알림장` card so the middle area shows only one horizontal divider.
- Changed the `가족 알림장` title icon from white to an amber accent color to match the app's colored-summary-icon pattern.

Intentionally left out:
- The add button icon and existing notice interaction behavior were not changed.
- No auth, payment behavior, Supabase schema, calendar sync, Android packaging, diary records, or release assets were changed.

Files changed:
- `app/src/components/HomeBoard.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/` confirmed title divider remains, input divider is removed, amber icon color is applied, and no console errors

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Unify blue summary cards across main tabs

Source handoff:
Direct user request in Codex with comparison screenshots from payment, family schedule, weekly schedule, and today tasks.

Integrated:
- Restyled the weekly `가족 알림장` blue card to match the payment/family summary-card pattern: `p-5`, same rounded border, subtle background icon, section divider, and smaller title/body text hierarchy.
- Restyled the today task progress blue card to use the same title row, divider, icon size, date text, and compact progress typography pattern.
- Kept existing colors, gradients, and functional controls intact while making the blue cards feel more consistent across tabs.

Intentionally left out:
- Payment and family schedule blue cards were used as references and not changed.
- No auth, payment behavior, Supabase schema, calendar sync, Android packaging, diary records, or release assets were changed.

Files changed:
- `app/src/components/HomeBoard.jsx`
- `app/src/components/DailyTasksTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/` and `/daily` confirmed matching `13px` heading, `p-5` card padding, divider, radius, and no console errors

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Align weekly schedule title rows

Source handoff:
Direct user request in Codex.

Integrated:
- Increased weekly schedule card titles from `15px` to `17px`.
- Reserved the location row space even when no location exists, so schedule titles start from the same vertical position regardless of location data.
- Applied the same title sizing and alignment behavior to both upcoming cards and completed/past schedule cards.

Intentionally left out:
- Edit-mode schedule forms were left unchanged.
- No auth, payment, Supabase schema, calendar sync, Android packaging, diary records, or release assets were changed.

Files changed:
- `app/src/components/HomeBoard.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/` confirmed `96px` schedule card height, `17px` title styling, reserved hidden location row, and `15px`/900 time label styling

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Compact weekly schedule cards and enlarge time labels

Source handoff:
Direct user request in Codex with screenshot of weekly schedule cards.

Integrated:
- Reduced the fixed height of non-edit weekly schedule cards from `104px` to `96px`.
- Increased weekly schedule time labels from `10px` to `15px` and made them heavier for better readability.
- Applied the same compact card and larger time styling to both upcoming cards and completed/past schedule cards.

Intentionally left out:
- Edit-mode schedule forms were left auto-height so all fields remain usable.
- No auth, payment, Supabase schema, calendar sync, Android packaging, diary records, or release assets were changed.

Files changed:
- `app/src/components/HomeBoard.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/` confirmed `96px` schedule card height and `15px`/900 time label styling

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Normalize weekly schedule card height

Source handoff:
Direct user request in Codex with screenshot of weekly schedule cards.

Integrated:
- Fixed non-edit weekly schedule cards to a consistent compact height regardless of whether location or contact data exists.
- Matched location-present cards to the smaller no-location card feel by fitting the location row into the same card height.
- Applied the same sizing behavior to visible upcoming cards and completed/past schedule cards.

Intentionally left out:
- Edit-mode schedule forms were left auto-height so all fields remain usable.
- No auth, payment, Supabase schema, calendar sync, Android packaging, diary records, or release assets were changed.

Files changed:
- `app/src/components/HomeBoard.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/` with completed schedule card height measurement

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Refine gallery photo modal shadow

Source handoff:
Direct user request in Codex with screenshot of the gallery photo modal.

Integrated:
- Reduced the photo-card shadow for photos opened from `사진모음` so the shadow stays visually tied to the image box instead of reading as a shadow below the date.
- Increased the gallery modal date label size and weight slightly.
- Kept the richer timeline photo modal styling unchanged.

Intentionally left out:
- No diary records, photos, comments, premium behavior, auth flow, Supabase schema, payment flow, or release assets were changed.

Files changed:
- `app/src/components/FamilyDiaryTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Simplify gallery photo viewer content

Source handoff:
Direct user request in Codex.

Integrated:
- Marked photos opened from `사진모음` with a gallery viewer source.
- Changed the photo modal so gallery-opened photos show only the image and date.
- Kept the existing richer photo modal content for photos opened from the timeline.
- Preserved previous/next navigation in the gallery modal while keeping the simplified image/date view across navigation.

Intentionally left out:
- No diary records, photos, comments, premium behavior, auth flow, Supabase schema, payment flow, or release assets were changed.

Files changed:
- `app/src/components/FamilyDiaryTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Prevent diary calendar preview date overlap

Source handoff:
Direct user request in Codex with screenshot of the selected diary preview card.

Integrated:
- Moved the selected diary preview date badge out of absolute positioning and into the normal card layout.
- Added a dedicated top metadata row for the date badge so long titles no longer render underneath it.
- Updated the selected preview title row to allow safe wrapping with a fixed mood icon column.
- Applied the same title/body display length limits already used in the timeline card to the selected preview card.

Intentionally left out:
- No diary records, photos, comments, premium behavior, auth flow, Supabase schema, payment flow, or release assets were changed.

Files changed:
- `app/src/components/FamilyDiaryTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser inspection on `http://127.0.0.1:5175/diary`

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Hide diary viewer scrollbars and limit comments

Source handoff:
Direct user request in Codex.

Integrated:
- Hid the photo viewer card scrollbar while preserving scroll behavior for tall viewer content.
- Hid the expanded photo description scrollbar while preserving touch/trackpad scrolling when the text is taller than the visible area.
- Limited diary comments to 50 characters in the input and save path.
- Truncated normalized/displayed diary comments to the same 50-character limit for consistency.

Intentionally left out:
- No diary records, photos, premium behavior, auth flow, Supabase schema, payment flow, or release assets were changed.

Files changed:
- `app/src/components/FamilyDiaryTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/diary` for comment input maxlength and hidden-scrollbar style hooks.

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Smooth diary text expand and collapse motion

Source handoff:
Direct user request in Codex.

Integrated:
- Reworked diary `더보기`/`접기` text expansion to use the same short height/opacity accordion feel used in the other app tabs.
- Added measured-height animation for diary card text so long text opens and closes through a real height transition instead of snapping between states.
- Applied the same measured collapse pattern to the photo viewer description, while keeping expanded viewer text bounded to the viewport.
- Added a small fade/slide transition to the `더보기`/`접기` label swap.

Intentionally left out:
- No diary records, photos, premium behavior, auth flow, Supabase schema, payment flow, or release assets were changed.

Files changed:
- `app/src/components/FamilyDiaryTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/diary` for diary card text expand/collapse.

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Limit and collapse diary writing text

Source handoff:
Direct user request in Codex.

Integrated:
- Limited diary titles to 25 characters in the composer and save path.
- Limited diary body text to 500 characters in the composer and save path.
- Collapsed long diary card text to three lines by default, with click-to-expand/collapse behavior on the text area.
- Applied the same three-line collapse behavior to the photo viewer description and constrained expanded viewer text so it no longer pushes through the viewport.

Intentionally left out:
- No diary records, photos, premium behavior, auth flow, Supabase schema, payment flow, or release assets were changed.

Files changed:
- `app/src/components/FamilyDiaryTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/diary` for title/body length limits, diary text expand/collapse, and photo viewer text clamp.

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Remove diary first-entry lazy loading delay

Source handoff:
Direct user question in Codex about diary menu loading delay.

Integrated:
- Confirmed the diary tab was still loaded as a lazy React chunk, so first entry could briefly show a loading state while the separate diary bundle was fetched/compiled.
- Changed `FamilyDiaryTab` to load with the main app instead of behind a `Suspense` fallback.
- Kept the earlier diary mount optimization that skips immediate localStorage re-save on first hydration.
- Added lazy/async decoding attributes to diary images so photo-heavy records do less work on initial render.

Intentionally left out:
- No diary data, photo data, premium behavior, auth flow, Supabase schema, or release assets were changed.
- The initial main app JavaScript bundle is about 11 KB gzip larger, intentionally traded for removing the diary first-entry loading delay.

Files changed:
- `app/src/App.jsx`
- `app/src/components/FamilyDiaryTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/` -> `다이어리`

Open follow-ups:
- If diary records with many large base64 photos grow further, consider virtualizing the diary timeline or storing image blobs outside the main localStorage JSON.

Previous integration:
2026-05-30 - Smooth weekly add schedule cancel transition

Source handoff:
Direct user request in Codex.

Integrated:
- Changed the weekly schedule add-form and `새 일정 추가` button to share one `AnimatePresence` transition area.
- Added a short height-collapse animation for the add form so canceling no longer makes the add button jump upward instantly.
- Added a subtle fade/scale return animation for the add button after the form closes.

Intentionally left out:
- No weekly schedule data, add/save behavior, Supabase schema, auth flow, or release assets were changed.

Files changed:
- `app/src/components/HomeBoard.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/` for `새 일정 추가` -> `취소`

Open follow-ups:
- None.

Previous integration:
2026-05-30 - Harden local saved data loading

Source handoff:
Direct user request in Codex.

Integrated:
- Added local guest-data normalization before saved data is rendered or re-saved.
- Filled missing local data sections with safe defaults for weekly schedules, monthly missions, funds, payments, family tasks, notices, daily tasks, and payment history.
- Normalized older field variants such as `is_checked`, `is_completed`, `payment_day`, dotted dates, numeric amounts, and `성남` payment labels.
- Added diary record normalization for the integrated diary and legacy MVP diary key so older records still render with safe defaults.
- Kept local date fallbacks based on the device's local date instead of UTC.

Intentionally left out:
- No auth flow, payment processing behavior, Supabase schema, cloud data migration, or release assets were changed.
- Existing valid local saved data is not cleared; it is only read through compatibility defaults.

Files changed:
- `app/src/store/useStore.js`
- `app/src/components/FamilyDiaryTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser smoke check on `http://127.0.0.1:5175/`, `/daily`, `/monthly`, `/payment`, `/family`, and `/diary`

Open follow-ups:
- Direct browser localStorage mutation is restricted in the current automation runtime, so compatibility was verified through lint/build and route smoke checks rather than a live injected-storage browser scenario.

Previous integration:
2026-05-29 - Compact upcoming payment cards

Source handoff:
Direct user request in Codex.

Integrated:
- Reworked upcoming payment card viewing layout into a compact action column plus two-line content area.
- Reduced card padding, card gaps, icon button size, badge size, and payment action button size.
- Added truncation constraints for long payment titles and large amount strings so the card does not overflow horizontally.

Intentionally left out:
- No payment data, payment processing behavior, payment method options, Supabase schema, or transaction history behavior was changed.
- Payment add/edit forms were left functionally unchanged.

Files changed:
- `app/src/components/PaymentTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/payment`

Open follow-ups:
- None.

Previous integration:
2026-05-29 - Remove payment fund balance cards

Source handoff:
Direct user request in Codex.

Integrated:
- Removed the payment page fund balance cards for `아동수당` and `지역사랑상품권`.
- Removed the now-unused fund card editing state, handler, store selectors, and settings icon import from `PaymentTab`.
- Kept payment method names and existing payment data intact.

Intentionally left out:
- No payment data, payment method options, Supabase schema, or transaction history behavior was changed.

Files changed:
- `app/src/components/PaymentTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/payment`

Open follow-ups:
- None.

Previous integration:
2026-05-29 - Keep diary mood emojis on one line

Source handoff:
Direct user request in Codex.

Integrated:
- Changed the diary composer mood selector from a wrapping flex row to a 9-column grid.
- Reduced mood emoji spacing and button scale so all nine emojis fit on one line without horizontal overflow.

Intentionally left out:
- No diary data, photo handling, PDF export, or premium behavior was changed.

Files changed:
- `app/src/components/FamilyDiaryTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser check on `http://127.0.0.1:5175/diary`

Open follow-ups:
- None.

Previous integration:
2026-05-29 - Fix quick guide missing target fallback

Source handoff:
Direct user report in Codex with screenshot of the guide fallback text.

Integrated:
- Restored the missing `data-tour="app-title"` marker on the header title so the first quick guide step can focus the title correctly.
- Changed the missing-target fallback behavior so users see the intended step message instead of the internal `화면을 다시 정리한 뒤...` text.
- Added a full-screen next target for rare missing-target states so the guide can continue instead of feeling stuck.

Intentionally left out:
- No guide copy was changed beyond hiding the internal fallback text.
- No auth, payment, Supabase schema, calendar sync, Android packaging, or release assets were changed.

Files changed:
- `app/src/App.jsx`
- `app/src/components/OnboardingTour.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser quick guide replay check on `http://127.0.0.1:5175/`

Open follow-ups:
- None.

Previous integration:
2026-05-29 - Add diary step to quick guide

Source handoff:
Direct user request in Codex.

Integrated:
- Added one diary-related quick guide step immediately after the family schedule step.
- The new step focuses the bottom diary tab and says: `소중한 순간은 다이어리에\n사진과 함께 남겨보세요.`
- Bumped the onboarding definition version from `4` to `5`.

Intentionally left out:
- No other guide wording or layout was changed.
- No auth, payment, Supabase schema, calendar sync, Android packaging, or release assets were changed.

Files changed:
- `app/src/components/OnboardingTour.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser quick guide replay check on `http://127.0.0.1:5175/`

Open follow-ups:
- None.

Previous integration:
2026-05-29 - Notice text toggles completion

Source handoff:
Direct user request in Codex.

Integrated:
- Updated the family notice list so clicking the notice text area toggles completion, not only the circular check control.
- Converted each notice toggle area into an accessible button with `aria-pressed` and a clear label.
- Verified on the local app by clicking the `111` notice text itself; the checked state toggled and was restored to its original state.

Intentionally left out:
- Existing notice data was not deleted or otherwise cleaned up.
- No auth, payment, Supabase schema, calendar sync, Android packaging, or release assets were changed.

Files changed:
- `app/src/components/HomeBoard.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- Browser verification on `http://127.0.0.1:5175/`

Open follow-ups:
- None.

Previous integration:
2026-05-29 - Direct interaction stress test and cleanup

Source handoff:
Direct user request in Codex.

Integrated:
- Drove the local app through the browser by clicking tabs and entering/deleting test data in weekly schedule, today tasks, payment, family schedule, monthly schedule, and diary flows.
- Confirmed no console errors and no page-level horizontal overflow during the tested tab switches and form flows.
- Cleaned up temporary `__codex_test__` records created during the browser pass.
- Added missing accessible names to icon-only controls in today tasks, payment, monthly navigation, family schedule, diary, and weekly schedule cards.
- Added user-facing validation alerts when the family schedule form is submitted without a title or date.
- Removed stray invisible diary PDF font-warmup text so it no longer appears in DOM/accessibility checks.

Intentionally left out:
- `docs/antigravity-out.md` remains Antigravity-owned and was not edited by Codex.
- Existing untracked prototype assets, backups, generated samples, and scratch files were left untouched.
- The browser automation runtime did not expose frame timing APIs for a numeric rAF-based animation benchmark, so motion was checked through repeated real UI interaction, console logs, and layout checks instead.

Files changed:
- `app/src/components/DailyTasksTab.jsx`
- `app/src/components/HomeBoard.jsx`
- `app/src/components/PaymentTab.jsx`
- `app/src/components/RouteMapTab.jsx`
- `app/src/components/SpecialOpsTab.jsx`
- `app/src/components/FamilyDiaryTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- Browser interaction test on `http://127.0.0.1:5175/`
- `npm run lint`
- `npm run build`
- `npm audit --omit=dev`
- `npm audit --audit-level=moderate`

Open follow-ups:
- Full `npm audit` still reports dev-toolchain vulnerabilities from Babel/SystemJS, brace-expansion, and fast-uri via build tooling. Production dependency audit remains clean.
- Native confirm dialogs can interrupt browser automation; consider replacing them with in-app confirmation UI during a later UX polish pass.

Previous integration:
2026-05-29 - Debug and lightweight pass after single-app integration

Source handoff:
Direct user request in Codex.

Integrated:
- Re-ran app debugging after the main/MVP unification and confirmed lint/build still pass.
- Code-split the integrated diary tab with `React.lazy` and preloaded it after the app becomes idle, reducing initial app JavaScript while keeping the tab responsive after first paint.
- Removed the static `html2pdf.js` import from the diary tab so PDF-generation dependencies are no longer pulled into the initial app bundle.
- Removed unused `puppeteer` from app dependencies and moved `@capacitor/cli` to `devDependencies`, since both are development/build concerns rather than runtime app dependencies.
- Confirmed production dependency audit with `npm audit --omit=dev` reports zero vulnerabilities.

Intentionally left out:
- Full `npm audit` still reports dev-toolchain vulnerabilities from Vite PWA/Workbox/Babel-related packages. They are not production runtime dependencies, so automatic `npm audit fix` was not applied in this pass.
- Existing untracked prototype assets, backups, and scratch files were left untouched.

Files changed:
- `app/src/App.jsx`
- `app/src/components/FamilyDiaryTab.jsx`
- `app/package.json`
- `app/package-lock.json`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- `npm audit --omit=dev`
- `npm audit --audit-level=moderate`
- Production preview smoke check on `http://127.0.0.1:4175/`, including home, diary tab, and `/custom-memory`

Open follow-ups:
- Consider a separate dependency-maintenance pass for dev-only audit warnings if/when a package update window is acceptable.
- PDF export code remains gated behind the premium flow; if premium export is enabled later, re-test the dynamic `html2pdf.js` load path directly.

Previous integration:
2026-05-29 - Single app diary integration

Source handoff:
Direct user request in Codex.

Integrated:
- Promoted the former standalone diary work into the single Family Scheduler app as `FamilyDiaryTab`.
- Removed the separate MVP HTML entry, Vite memory config, and memory entry component.
- Removed the main Vite dev-server rule that blocked `/custom-memory` and pointed users to a separate 5174 MVP server.
- Added app route aliases so `/diary`, `/custom-memory`, and legacy `/memory-mvp.html` load the integrated diary tab inside the main app shell.
- Updated agent coordination docs so Codex and Antigravity now work against one integrated app while still avoiding simultaneous edits to the same source files.
- Kept legacy diary localStorage reads so existing `memory-mvp-records-v2` records can still load before being saved under the new app key.

Intentionally left out:
- `docs/antigravity-out.md` was not edited by Codex; it already had Antigravity-owned pending notes.
- Existing untracked prototype assets, backups, and scratch files were left untouched.

Files changed:
- `AGENTS.md`
- `AGENTS.local.md`
- `.agents/rules/00-antigravity-mvp-workroom.md`
- `app/package.json`
- `app/vite.config.js`
- `app/eslint.config.js`
- `app/src/App.jsx`
- `app/src/components/FamilyDiaryTab.jsx`
- `app/memory-mvp.html` removed
- `app/src/MemoryMvpEntry.jsx` removed
- `app/src/components/CustomMemoryMvp.jsx` removed
- `app/vite.memory.config.js` removed
- `docs/agent-contract.md`
- `docs/agent-handoff.md`
- `docs/handoff-template.md`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Restarted local dev server on `http://127.0.0.1:5175/`
- Browser check for `/`, `/diary`, `/custom-memory`, `/memory-mvp.html`, and bottom nav transitions

Open follow-ups:
- Large vendor chunk and circular manual chunk warnings still appear during build; existing behavior, not introduced by this integration.
- Consider removing now-unused standalone diary shell branches from `FamilyDiaryTab` after the unified app settles.

Previous integration:
2026-05-28 - Revert main app soft design pass

Source handoff:
Direct user request in Codex.

Integrated:
- Reverted the MVP-inspired soft content design layer from the main app.
- Removed the temporary `app-soft-skin` wrapper, `soft-*` component classes, soft shadow CSS, and MVP Google Font loading.
- Restored the app styling to the pre-design-pass state so future design changes can be reintroduced one by one.

Intentionally left out:
- MVP/prototype files were not edited.
- Existing functional fixes and 1.1.6 behavior were not reverted.

Files changed:
- `app/index.html`
- `app/src/App.jsx`
- `app/src/index.css`
- `app/src/components/HomeBoard.jsx`
- `app/src/components/DailyTasksTab.jsx`
- `app/src/components/RouteMapTab.jsx`
- `app/src/components/PaymentTab.jsx`
- `app/src/components/SpecialOpsTab.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser reload check on `http://127.0.0.1:5175/`

Open follow-ups:
- Restart design refinement in small, separately verified steps.

Previous integration:
2026-05-28 - Main tab first-switch response and completion stamp alignment

Source handoff:
Direct user request in Codex.

Integrated:
- Restored immediate loading for the five main tabs so first tab switches after refresh do not wait on lazy-loaded tab chunks.
- Kept guide, login, support modal, and vendor code split so the main bundle remains below the large-chunk warning threshold.
- Removed the tilted rotation from the weekly completion stamp animation and SVG group so the stamp displays upright.

Intentionally left out:
- MVP/prototype files were not edited.

Files changed:
- `app/src/App.jsx`
- `app/src/components/HomeBoard.jsx`
- `docs/codex-integration-log.md`

Commands run:
- `npm run lint`
- `npm run build`
- Browser refresh and first-switch tab check on `http://127.0.0.1:5175/`

Open follow-ups:
- None.
