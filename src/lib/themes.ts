// The building themes the super admin can choose from. Each key has a matching
// [data-skin="<key>"] token block in src/app/globals.css (checked by scripts/check-themes.ts).

export type ThemeWidget = "dues-calendar" | "noticeboard" | "collection-ring";

export type Theme = {
  key: string;
  name: string;
  description: string;
  font: string;
  fontVar: string; // CSS variable from src/app/layout.tsx, used to preview the theme in its own font
  swatches: [string, string, string]; // sidebar, accent, page background
  darkMode: boolean; // false = always light, no Light/Dark toggle
  widgets: ThemeWidget[];
  rail?: true; // desktop sidebar collapses to an icon-only rail
};

export const THEMES = [
  {
    key: "indigo",
    name: "Indigo",
    description: "Navy sidebar with an indigo accent. Polished and premium.",
    font: "Plus Jakarta Sans",
    fontVar: "--font-jakarta",
    swatches: ["#0F1222", "#5B5BD6", "#F6F7FB"],
    darkMode: true,
    widgets: [],
  },
  {
    key: "ledger",
    name: "Ledger",
    description: "Crisp banking-app style: white, one strong blue. Adds a dues calendar to the dashboard.",
    font: "Plus Jakarta Sans",
    fontVar: "--font-jakarta",
    swatches: ["#FFFFFF", "#3355FF", "#F5F7FB"],
    darkMode: false,
    widgets: ["dues-calendar"],
  },
  {
    key: "courtyard",
    name: "Courtyard",
    description: "Warm society noticeboard: garden green and marigold. Adds a noticeboard and letterbox wall.",
    font: "Bricolage Grotesque + Figtree",
    fontVar: "--font-bricolage",
    swatches: ["#1E3A2C", "#F0A43A", "#E9EFE4"],
    darkMode: false,
    widgets: ["noticeboard"],
  },
  {
    key: "bento",
    name: "Bento",
    description: "Soft pastel tiles with an icon-only rail. Adds a collection ring and unpaid-flat chips.",
    font: "Outfit",
    fontVar: "--font-outfit",
    swatches: ["#F4F2FF", "#1C1633", "#F4F2FF"],
    darkMode: false,
    widgets: ["collection-ring"],
    rail: true,
  },
  {
    key: "emerald",
    name: "Emerald",
    description: "Dark forest sidebar with a fresh green accent. Calm and healthy.",
    font: "Figtree",
    fontVar: "--font-figtree",
    swatches: ["#0B2A1E", "#0E9F6E", "#F4F8F6"],
    darkMode: true,
    widgets: [],
  },
  {
    key: "ocean",
    name: "Ocean",
    description: "White sidebar with a clear blue accent. Bright, open, classic business app.",
    font: "Onest",
    fontVar: "--font-onest",
    swatches: ["#FFFFFF", "#2563EB", "#F5F7FB"],
    darkMode: true,
    widgets: [],
  },
  {
    key: "mono",
    name: "Mono",
    description: "Black and white, minimal and very clean.",
    font: "Inter Tight",
    fontVar: "--font-inter-tight",
    swatches: ["#FFFFFF", "#111827", "#FAFAFA"],
    darkMode: true,
    widgets: [],
  },
  {
    key: "lavender",
    name: "Lavender",
    description: "Soft lavender sidebar, purple accent, extra-rounded corners. Gentle and friendly.",
    font: "Nunito Sans",
    fontVar: "--font-nunito-sans",
    swatches: ["#F1EDFF", "#7C5CFA", "#F8F6FE"],
    darkMode: true,
    widgets: [],
  },
] as const satisfies readonly Theme[];

export type ThemeKey = (typeof THEMES)[number]["key"];
export const DEFAULT_THEME: ThemeKey = "indigo";

export function isThemeKey(key: string): key is ThemeKey {
  return THEMES.some((t) => t.key === key);
}

// Unknown or missing keys (old rows, typos) fall back to the default theme.
export function themeOf(key: string | null | undefined): Theme {
  return THEMES.find((t) => t.key === key) ?? THEMES.find((t) => t.key === DEFAULT_THEME)!;
}

// Every theme's CSS block must define these (scripts/check-themes.ts).
export const REQUIRED_TOKENS = [
  "--background", "--foreground", "--card", "--card-foreground", "--popover", "--popover-foreground",
  "--primary", "--primary-foreground", "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
  "--accent", "--accent-foreground", "--border", "--input", "--ring", "--radius",
  "--sidebar", "--sidebar-foreground", "--sidebar-primary", "--sidebar-primary-foreground",
  "--sidebar-accent", "--sidebar-accent-foreground", "--sidebar-border", "--sidebar-ring",
  "--font-sans", "--font-heading",
];
