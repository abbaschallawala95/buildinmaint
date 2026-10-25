# Per-building themes — design

**Date:** 2026-10-25 · **Status:** approved by user · **Scope:** local only (dev DB), no push until approved

## Goal
The super admin picks a visual theme for each building. Everyone in that building (its building admin and
members) sees it. Seven themes, matching the mockups in `standalone.html` (#1 Ledger, #2 Courtyard) and
`standalone-current.html` (#1 Indigo, #2 Emerald, #3 Ocean, #5 Mono, #6 Lavender).

## Decisions (from the user)
- Theme applies to **everyone in the building**; the super admin sees the theme of the building selected in the switcher.
- Ledger and Courtyard include their **special widgets** (not just the look).
- **Dark mode is per user** (Light / Dark / Auto, remembered on their device). Ledger and Courtyard are light-only.
- Managed on a **new "Themes" page**, super admin only.

## Data
- `Settings.theme String @default("indigo")` — one additive migration. Unknown values fall back to `indigo`.

## Themes = CSS token sets
- `src/lib/themes.ts`: the list of themes (key, name, description, swatches, `darkMode: boolean`, `widgets`) — single source of truth for the Themes page and validation.
- `src/app/globals.css`: one block per theme, `[data-skin="<key>"] { --background … --sidebar … --radius … --font-sans … }`, plus `.dark [data-skin="<key>"]` for themes with dark mode. Light-only themes repeat their light tokens under `.dark` so they never turn dark.
- Fonts loaded once with `next/font/google` (Plus Jakarta Sans, Figtree, Bricolage Grotesque, Onest, Inter Tight, Nunito Sans), exposed as CSS variables; each theme sets `--font-sans` (Courtyard also `--font-heading`). All include the ₹ glyph.

| Key | Sidebar | Accent | Font | Dark |
|---|---|---|---|---|
| ledger | white | #3355FF | Plus Jakarta Sans | no |
| courtyard | #1E3A2C forest | #F0A43A marigold | Bricolage Grotesque + Figtree | no |
| indigo (default) | #0F1222 navy | #5B5BD6 | Plus Jakarta Sans | yes |
| emerald | #0B2A1E | #0E9F6E | Figtree | yes |
| ocean | white | #2563EB | Onest | yes |
| mono | white | #111827 | Inter Tight | yes |
| lavender | #F1EDFF | #7C5CFA | Nunito Sans | yes |

## Applying it
- `getSettings(buildingId).theme` is read in `src/app/admin/layout.tsx` and `src/app/member/layout.tsx` and passed to `NavShell`, which renders `data-skin` on its root element. Login and other pre-auth pages keep the default (`indigo` tokens in `:root`).
- Dark mode: `next-themes` (already installed) `ThemeProvider` with `attribute="class"`, `defaultTheme="system"`; `forcedTheme="light"` when the building's theme is light-only. A Light/Dark/Auto toggle sits in the sidebar footer and is hidden for light-only themes.

## Themes page (`/admin/themes`, SUPER_ADMIN only)
- Nav item "Themes" (after Buildings), guarded with `requireSuperAdmin()`.
- Top: 7 preview cards (swatches, font name, light-only note, widget note).
- Below: table of every building → current theme → select + Save. Server action `setBuildingTheme(buildingId, theme)` validates the key against `themes.ts`, upserts the settings row, writes an audit entry (`UPDATE_THEME`), revalidates `/admin` and `/member` layouts; wrapped with `withErrors()`, dialog/toast via `succeeded()`.

## Widgets (admin dashboard only, real data)
- **Ledger → Dues calendar:** each flat × 12 months of the selected/current year; Paid / Unpaid / Not due yet, from `buildDueSchedule` (same as the Total Dues report).
- **Courtyard → Noticeboard:** up to 3 pinned notes from real data — overdue electricity bills, the flat with the most unpaid months, and the latest Additional Income collection's progress ("14 of 24 paid").
- **Courtyard → Letterbox wall:** every flat coloured by this month's maintenance status.
- Rendered only when the building's theme lists that widget; every existing dashboard section is unchanged.

## Out of scope
Custom/user-made themes; widgets on the member page; theming the login page.

## Testing
- `scripts/check-themes.ts` (in `npm test`): every theme in `themes.ts` has a CSS block defining every required token; keys are unique; default exists.
- Browser (dev DB): set "Sunrise Apartments" to each theme as super admin; building admin + member of that building see it; "My Building" unaffected; dark toggle works and is hidden for Ledger/Courtyard; both widgets show correct data; phone width has no sideways scroll.
