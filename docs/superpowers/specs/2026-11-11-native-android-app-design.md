# Native Android App (own WebView) — Design

**Date:** 2026-11-11 · **Status:** approved by owner (option A), building

## Goal
Replace the Chrome-based Trusted Web Activity (see `2026-10-25-android-apk-design.md`) with a real Android app
that does not open Chrome or any browser. Personal sideload only, no Play Store.

## Decision
A plain Android project in `android/` (Java, one Activity, no libraries). Its screen is the system WebView,
loading the live site. Owner was shown the alternative, a full native rewrite (22 screens, a new API for every
server action, every feature built twice), and chose this one. A native rewrite can still happen later, screen
by screen, starting with the member side.

Why not the old reasons for rejecting this: the old spec rejected an own-WebView app because there was no
Android toolchain and because downloads need extra code. The PC now has Android Studio (SDK 34–36, build-tools
34/36, JBR 21) and JDK 17; the download code is covered below.

## What the app does
| Thing | How |
|---|---|
| Start page | Release: `https://buildinmaint.vercel.app`. Debug: `http://localhost:3000` (local dev server, dev DB, reached through `adb reverse tcp:3000 tcp:3000`). Set by `BuildConfig.START_URL`. |
| Login kept | WebView cookies (`CookieManager`), flushed when the app goes to the background. |
| Own-site links | Stay inside the app. `window.open(...)` loads in the same screen (no multiple windows). |
| Other links (`wa.me`, `whatsapp:`, `tel:`, `mailto:`, `intent:`, any other host) | Handed to Android (`ACTION_VIEW`), so `wa.me` opens WhatsApp. Nothing installed to handle it → short toast. |
| Downloads (PDF/Excel exports, the receipt image) | `DownloadListener` runs a `fetch` of that URL inside the page (same origin, so the login cookie goes along; also works for `blob:` URLs), reads it as base64 and passes it to a Java bridge that saves it with `MediaStore`: images to **Pictures/Build Maintain** (shows in the gallery, ready to attach in WhatsApp), everything else to **Downloads**. Toast "Saved to …". The page's `URL.revokeObjectURL` is delayed by 60 s so a `blob:` link is still readable when the save runs. |
| Print Receipt | `window.print` is replaced with a bridge call that opens Android's print screen for the current page (`PrintManager` + `createPrintDocumentAdapter`; "Save as PDF" is one of the printers). A `/receipt/...?print=1` page prints itself once loaded. Calls within 2 s of each other are ignored. |
| Back button | Goes back through pages; exits on the first page. |
| No connection | Main-page load error → a small built-in page "No connection" with a Retry button. |
| Look | Theme background and status bar `#0F1222` (Indigo sidebar), app name "Build Maintain", adaptive icon from `public/icons/icon-maskable-512.png` on `#5B5BD6`. |

## Build facts
- Package `app.buildmaintain`, minSdk 29 (Android 10, so `MediaStore` saves need no storage permission),
  targetSdk/compileSdk 34 (so Android 15 doesn't force edge-to-edge layout), versionCode 1 / versionName 1.0.
- Only permission: `INTERNET`. Cleartext HTTP allowed in the debug build only.
- Gradle wrapper committed; Android Gradle Plugin from Google's repo; no other dependencies.
- Release signing key is created on this PC **outside the repo** (`%USERPROFILE%\BuildMaintain-keys\`), with its
  passwords in `keystore.properties` next to it. Gradle reads that folder; nothing secret is committed.
  Losing the key only means uninstalling and reinstalling the app.
- Website code does not change. The old TWA files (`manifest.ts`, icons, `assetlinks.json`) stay, since the
  Chrome "Install app" fallback still uses the manifest.

## Phone install
Uninstall the old "Build Maintain" (Chrome-based, package `app.vercel.buildinmaint.twa`), then install
`app-release.apk` (allow "Install unknown apps"; if Play Protect warns: More details → Install anyway).

## Testing (Android emulator, debug build against the local server)
Opens with no browser UI; log in as `admin@test.local`; navigate menus; back button walks back and exits;
monthly report PDF and Excel export save to Downloads; Send on WhatsApp saves the receipt image to Pictures and
hands the `wa.me` link to Android; Print Receipt opens the print screen; airplane mode shows the retry page and
Retry recovers. Release build: installs, opens the live login page.

## Out of scope
Push notifications, offline data, direct image sharing into a WhatsApp chat (owner declined on 2026-11-04),
iPhone app, Play Store.
