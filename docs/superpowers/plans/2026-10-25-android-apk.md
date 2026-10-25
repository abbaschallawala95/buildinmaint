# Android APK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A sideloadable Android `.apk` for Build Maintain that opens the live site full-screen with its own icon and no browser bar.

**Architecture:** Add a web app manifest + PNG icons to the Next.js app; generate a Trusted Web Activity APK on pwabuilder.com; publish its `assetlinks.json` so Android trusts the site and hides the URL bar. The APK always loads `https://buildinmaint.vercel.app`, so web updates need no new APK.

**Tech Stack:** Next.js 16 metadata route (`src/app/manifest.ts`), `sharp` (already in `node_modules` via Next) for a one-off icon render, PWABuilder (website), Android sideload.

**Spec:** `docs/superpowers/specs/2026-10-25-android-apk-design.md`

## Global Constraints
- Local first, test, then push **only with the user's approval** (push to `main` = production deploy on Vercel).
- No new `package.json` dependencies. No database changes.
- Never commit the signing keystore, its passwords, or the PWABuilder zip.
- Keep `standalone.html` / `standalone-current.html` out of commits.
- Before writing Next.js code, read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md` (this Next version differs from older docs).

---

### Task 1: Manifest + icons (web app)

**Files:**
- Create: `src/app/manifest.ts`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`
- One-off (scratchpad, not committed): `make-icons.mjs`

- [ ] **Step 1: Render the icons from `src/app/icon.svg`**

The SVG uses `stroke="currentColor"`, so render it white on an Indigo tile. Save as `make-icons.mjs` in the scratchpad and run it from the project root (`node <scratchpad>/make-icons.mjs`):

```js
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";

const glyph = readFileSync("src/app/icon.svg", "utf8").replace(/currentColor/g, "#FFFFFF");
mkdirSync("public/icons", { recursive: true });

// pad = share of the tile left empty around the glyph on each side (maskable needs ~20%+ safe zone)
async function make(size, pad, file) {
  const inner = Math.round(size * (1 - 2 * pad));
  const art = await sharp(Buffer.from(glyph)).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#5B5BD6" } })
    .composite([{ input: art, gravity: "center" }])
    .png()
    .toFile(`public/icons/${file}`);
}
await make(192, 0.18, "icon-192.png");
await make(512, 0.18, "icon-512.png");
await make(512, 0.28, "icon-maskable-512.png");
console.log("icons written");
```

Expected: `icons written`; open the three PNGs and check a white building centred on indigo.

- [ ] **Step 2: Add the manifest**

`src/app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";

// Makes the site installable and lets PWABuilder package it as an Android app (TWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Build Maintain",
    short_name: "Build Maintain",
    description: "Building maintenance management app",
    start_url: "/",
    display: "standalone",
    background_color: "#0F1222",
    theme_color: "#0F1222",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

- [ ] **Step 3: Verify locally (production build)**

Run: `npx tsc --noEmit && npm run lint && npm test && npx next build && npx next start -p 3000`
Then, **logged out** (e.g. `curl`):
- `curl -s http://localhost:3000/manifest.webmanifest` → JSON with `"name":"Build Maintain"` and 3 icons.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/icons/icon-512.png` → `200` (same for the other two).
- `<link rel="manifest" href="/manifest.webmanifest">` appears in the HTML of `/login`.

- [ ] **Step 4: Commit (and push only after user approval)**

```bash
git add src/app/manifest.ts public/icons
git commit -m "Add web app manifest and icons for the Android app"
```
After the user approves: `git push origin main`, wait for the Vercel deploy, and repeat the Step 3 checks against `https://buildinmaint.vercel.app`.

---

### Task 2: Generate the APK on PWABuilder (user, in the browser)

**Files:** none in the repo. Output: the PWABuilder zip (kept privately).

- [ ] **Step 1:** Open https://www.pwabuilder.com, enter `https://buildinmaint.vercel.app`, click **Start**. The report card must show the manifest as valid (service-worker/offline warnings are expected and fine).
- [ ] **Step 2:** **Package For Stores → Android → Generate Package** with these options (open "All Settings"):
  - Package ID: `app.vercel.buildinmaint.twa`
  - App name / Launcher name: `Build Maintain`
  - Signing key: **Create new** (fill in your name/organisation; let it generate passwords)
- [ ] **Step 3:** Download the zip. Unzip it **outside the repo**. It contains: `Build Maintain.apk` (install this), `.aab` (Play Store only, ignore), `signing.keystore`, `signing-key-info.txt`, `assetlinks.json`, a readme.
- [ ] **Step 4:** Back up `signing.keystore` + `signing-key-info.txt` privately (e.g. personal Google Drive). Needed only for a future APK update.

---

### Task 3: Publish Digital Asset Links (removes the URL bar)

**Files:**
- Create: `public/.well-known/assetlinks.json` (copied **as-is** from the PWABuilder zip)

- [ ] **Step 1:** Copy `assetlinks.json` from the zip to `public/.well-known/assetlinks.json`. Check it contains `"package_name": "app.vercel.buildinmaint.twa"` and a `sha256_cert_fingerprints` entry. (It holds only a public fingerprint — safe to commit.)
- [ ] **Step 2: Verify locally:** `curl -s http://localhost:3000/.well-known/assetlinks.json` (logged out, after a fresh build) → the same JSON, status 200, `content-type: application/json`.
- [ ] **Step 3: Commit (push after approval):**

```bash
git add public/.well-known/assetlinks.json
git commit -m "Add Digital Asset Links for the Android app"
```
After push + deploy: `curl -s https://buildinmaint.vercel.app/.well-known/assetlinks.json` returns it. Optional check: Google's tester `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://buildinmaint.vercel.app&relation=delegate_permission/common.handle_all_urls` lists the package.

---

### Task 4: Install and test on the phone (user)

- [ ] **Step 1:** Send `Build Maintain.apk` to the phone (WhatsApp to yourself, Google Drive, or USB) and tap it.
- [ ] **Step 2:** Allow **Install unknown apps** for the app you opened it from (Android asks). If Play Protect warns: **More details → Install anyway**.
- [ ] **Step 3:** Test:
  - Opens full-screen with **no URL bar** (if a bar shows: Task 3 not deployed yet → deploy, then clear the app's storage or reinstall).
  - Log in as super admin; switch building; change a theme on the Themes page.
  - Export a PDF and an Excel file; both download and open.
  - Android back button goes to the previous page; app icon shows in the drawer and recent apps.
- [ ] **Step 4:** Note the result in `HANDOVER.md` (package ID, where the keystore is backed up — never the passwords).

---

## Later (only if needed)
- **Web changes:** just push to `main` — the app shows them automatically.
- **New APK** (only to change icon/name/package settings): regenerate on PWABuilder **with the same `signing.keystore`** ("Use mine"), install over the old one.
- **Offline page / push notifications:** not planned (YAGNI).
