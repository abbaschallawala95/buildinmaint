# Per-building Themes Implementation Plan

> Executed inline in the session that wrote it (user asked for it now). Spec: `docs/superpowers/specs/2026-10-25-building-themes-design.md`.

**Goal:** Super admin sets one of 7 themes per building; everyone in that building sees it.
**Architecture:** Themes are CSS token sets keyed by `[data-skin]`; the building's choice lives in `Settings.theme`; `NavShell` applies it (wrapper + `<html>` attribute so portals match) and hosts a per-user Light/Dark/Auto toggle via `next-themes`. Ledger/Courtyard add server-rendered dashboard widgets.
**Tech Stack:** Next.js 16 App Router, Prisma 7, Tailwind 4 + shadcn tokens, next/font, next-themes.

## Global Constraints
- Local only: dev DB migration; no commit/push without user approval.
- Keys: `ledger`, `courtyard`, `indigo` (default), `emerald`, `ocean`, `mono`, `lavender`. Ledger + Courtyard light-only.
- Fonts must include ₹: Plus Jakarta Sans, Figtree, Bricolage Grotesque, Onest, Inter Tight, Nunito Sans.
- Admin actions use `withErrors()`; dialogs use `succeeded()`; test data in English.

### Task 1: Theme registry + data field
**Files:** Create `src/lib/themes.ts`, `scripts/check-themes.ts`; Modify `prisma/schema.prisma` (Settings), `package.json` (test script); migration `add_settings_theme`.
**Produces:** `THEMES: Theme[]`, `type ThemeKey`, `DEFAULT_THEME = "indigo"`, `themeOf(key: string | null | undefined): Theme`, `REQUIRED_TOKENS: string[]`.
- [ ] Write `scripts/check-themes.ts` asserting every theme key has a `[data-skin="key"]` block in globals.css defining every REQUIRED_TOKEN, keys unique, default present → run, expect FAIL (no CSS yet).
- [ ] Add `theme String @default("indigo")` to Settings; `npx prisma migrate dev --name add_settings_theme` (dev DB only); `npx prisma generate`.

### Task 2: Theme CSS + fonts
**Files:** Modify `src/app/globals.css`, `src/app/layout.tsx`.
- [ ] Load 6 fonts with next/font (variables `--font-jakarta`, `--font-figtree`, `--font-bricolage`, `--font-onest`, `--font-inter-tight`, `--font-nunito-sans`) on `<html>`.
- [ ] Add 7 `[data-skin]` light blocks + dark blocks (`[data-skin="k"]:is(.dark, .dark *)`) for dark-capable themes; light-only themes force light tokens under dark too.
- [ ] Run `npx tsx scripts/check-themes.ts` → PASS.

### Task 3: Apply theme + dark toggle + nav
**Files:** Modify `src/app/admin/layout.tsx`, `src/app/member/layout.tsx`, `src/components/nav-shell.tsx`; Create `src/components/theme-toggle.tsx`.
**Consumes:** `themeOf`. **Produces:** `NavShell` prop `skin: ThemeKey`.
- [ ] Layouts read `getSettings(buildingId).theme` and pass `skin`.
- [ ] NavShell: `data-skin` + `font-sans bg-background text-foreground` on root; effect mirrors `data-skin` onto `<html>` (cleanup removes it and `dark`); wraps in next-themes `ThemeProvider` (`attribute="class"`, `enableSystem`, `forcedTheme="light"` when light-only); toggle in footer unless light-only; "Themes" nav item for super admin.

### Task 4: Themes page
**Files:** Create `src/app/admin/themes/page.tsx`, `src/app/admin/themes/actions.ts`, `src/app/admin/themes/theme-picker.tsx`.
- [ ] `setBuildingTheme(formData)` (super admin, validates key, upserts settings, audit `UPDATE_THEME`, revalidates layouts).
- [ ] Page: preview cards for all themes + table of buildings with picker.

### Task 5: Widgets
**Files:** Create `src/components/theme-widgets/dues-calendar.tsx`, `src/components/theme-widgets/noticeboard.tsx`; Modify `src/app/admin/page.tsx`.
- [ ] Ledger: flats × 12 months (Paid/Unpaid/Not due) via `buildDueSchedule`.
- [ ] Courtyard: noticeboard (overdue bills, flat furthest behind, latest bulk charge progress) + letterbox wall (this month's status per flat).
- [ ] Dashboard renders them only when `themeOf(settings.theme).widgets` includes them.

### Task 6: Verify
- [ ] `npm test`, `npx eslint .`, `npx tsc --noEmit`, `next build`.
- [ ] Browser on dev DB: switch Sunrise Apartments through every theme; building admin + member see it; My Building unaffected; dark toggle; widgets; phone width.
