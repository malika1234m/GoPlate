/**
 * Menu templates — the palettes an owner can pick for their customer-facing menu.
 *
 * Single source of truth on purpose. These values used to live in three places:
 * the palette map inside MenuClient, a swatch list inside SettingsTab, and a
 * hardcoded zod enum in two separate API routes. Adding one template meant four
 * edits, and forgetting the enum silently rejected the new value at save time.
 *
 * Every template defines the same eight variables so the menu never has to
 * guard for a missing one, and each is hand-checked for contrast: menus are
 * read in dim restaurants on phone screens, so `--m-dim` against `--m-bg` is
 * the pair that actually decides whether a description is legible.
 */

import { PLAN_TIER, type Plan } from "./plans";

export type MenuPalette = {
  "--m-bg": string;
  "--m-surface": string;
  "--m-raised": string;
  "--m-border": string;
  "--m-text": string;
  "--m-dim": string;
  "--m-faint": string;
  "--m-scrim": string;
};

export type MenuTheme = {
  id: string;
  label: string;
  /** Grouped in the picker so an owner sees light and dark options separately. */
  tone: "dark" | "light";
  /**
   * Headline typeface. Colour alone does not make a menu look designed — a
   * cream background under a geometric sans still reads like a web app, while
   * the same palette under a serif reads like a printed restaurant menu. This
   * picks between the two faces the site already loads, so no template adds a
   * font download.
   */
  display: "sans" | "serif";
  /** A word on who the template suits, shown under its name in the picker. */
  note: string;
  /** Shown in the picker; the background colour is what an owner recognises. */
  swatch: string;
  /** Reads well with this template — offered as a one-tap suggestion. */
  suggestedAccent: string;
  /**
   * Lowest plan tier that may select it. The neutral templates are available to
   * everyone; the styled ones are part of what a Starter subscription buys.
   */
  minTier: number;
  palette: MenuPalette;
};

export const MENU_THEMES: MenuTheme[] = [
  {
    id: "midnight",
    label: "Midnight",
    tone: "dark",
    display: "sans",
    note: "Clean and neutral. Works for any cuisine.",
    swatch: "#070708",
    suggestedAccent: "#f0762e",
    minTier: 0,
    palette: {
      "--m-bg": "#070708",
      "--m-surface": "#121214",
      "--m-raised": "#1b1b1f",
      "--m-border": "#28282e",
      "--m-text": "#f4f4f1",
      "--m-dim": "#b9b9b2",
      "--m-faint": "#80807a",
      "--m-scrim": "rgba(7,7,8,0.97)",
    },
  },
  {
    id: "espresso",
    label: "Espresso",
    tone: "dark",
    display: "sans",
    note: "Warm and low-lit. Suits coffee shops and grills.",
    swatch: "#14100c",
    suggestedAccent: "#e0a34a",
    minTier: 1,
    palette: {
      "--m-bg": "#14100c",
      "--m-surface": "#1c1610",
      "--m-raised": "#2a2118",
      "--m-border": "#3b2f22",
      "--m-text": "#f3e9dc",
      "--m-dim": "#c9bba9",
      "--m-faint": "#8f8171",
      "--m-scrim": "rgba(20,16,12,0.97)",
    },
  },
  {
    id: "charcoal",
    label: "Charcoal",
    tone: "dark",
    display: "sans",
    note: "Cool and understated. Good for modern kitchens.",
    swatch: "#141619",
    suggestedAccent: "#5fb3d6",
    minTier: 0,
    palette: {
      "--m-bg": "#141619",
      "--m-surface": "#1d2025",
      "--m-raised": "#272b31",
      "--m-border": "#363b43",
      "--m-text": "#f1f3f5",
      "--m-dim": "#b6bcc4",
      "--m-faint": "#7e858e",
      "--m-scrim": "rgba(20,22,25,0.97)",
    },
  },
  {
    id: "forest",
    label: "Forest",
    tone: "dark",
    display: "sans",
    note: "Calm and earthy. Suits vegetarian and farm menus.",
    swatch: "#0d1712",
    suggestedAccent: "#7fc08a",
    minTier: 1,
    palette: {
      "--m-bg": "#0d1712",
      "--m-surface": "#13201a",
      "--m-raised": "#1c2c24",
      "--m-border": "#2a3f34",
      "--m-text": "#eef4ef",
      "--m-dim": "#b2c6b8",
      "--m-faint": "#7d9385",
      "--m-scrim": "rgba(13,23,18,0.97)",
    },
  },
  {
    id: "wine",
    label: "Wine",
    tone: "dark",
    display: "serif",
    note: "Deep and formal. Suits wine bars and fine dining.",
    swatch: "#170b10",
    suggestedAccent: "#e08a6a",
    minTier: 1,
    palette: {
      "--m-bg": "#170b10",
      "--m-surface": "#211018",
      "--m-raised": "#2e1822",
      "--m-border": "#40232f",
      "--m-text": "#f6eaee",
      "--m-dim": "#cbaeb8",
      "--m-faint": "#957a84",
      "--m-scrim": "rgba(23,11,16,0.97)",
    },
  },
  {
    id: "harbour",
    label: "Harbour",
    tone: "dark",
    display: "sans",
    note: "Cool navy. Suits seafood and coastal menus.",
    swatch: "#0b1220",
    suggestedAccent: "#f0a83e",
    minTier: 1,
    palette: {
      "--m-bg": "#0b1220",
      "--m-surface": "#111a2b",
      "--m-raised": "#19243a",
      "--m-border": "#24334e",
      "--m-text": "#eef2f9",
      "--m-dim": "#b0bccf",
      "--m-faint": "#7b8799",
      "--m-scrim": "rgba(11,18,32,0.97)",
    },
  },
  {
    id: "ivory",
    label: "Ivory",
    tone: "light",
    display: "sans",
    note: "Bright and simple. Good for cafés and bakeries.",
    swatch: "#f8f4ec",
    suggestedAccent: "#c2410c",
    minTier: 0,
    palette: {
      "--m-bg": "#f8f4ec",
      "--m-surface": "#ffffff",
      "--m-raised": "#f1ead9",
      "--m-border": "#e5dcc8",
      "--m-text": "#241d14",
      "--m-dim": "#5f5546",
      "--m-faint": "#94897a",
      "--m-scrim": "rgba(248,244,236,0.97)",
    },
  },
  {
    id: "paper",
    label: "Paper",
    tone: "light",
    display: "sans",
    note: "Crisp and minimal. Suits fast casual and takeaway.",
    swatch: "#f5f6f8",
    suggestedAccent: "#1f6feb",
    minTier: 1,
    palette: {
      "--m-bg": "#f5f6f8",
      "--m-surface": "#ffffff",
      "--m-raised": "#eceef2",
      "--m-border": "#dde0e6",
      "--m-text": "#15181d",
      "--m-dim": "#525862",
      "--m-faint": "#858c97",
      "--m-scrim": "rgba(245,246,248,0.97)",
    },
  },
  {
    id: "sage",
    label: "Sage",
    tone: "light",
    display: "sans",
    note: "Soft and fresh. Suits brunch and health food.",
    swatch: "#eef2ec",
    suggestedAccent: "#3f7d4f",
    minTier: 1,
    palette: {
      "--m-bg": "#eef2ec",
      "--m-surface": "#ffffff",
      "--m-raised": "#e2e9de",
      "--m-border": "#d3ddcd",
      "--m-text": "#1b241c",
      "--m-dim": "#4f5b4f",
      "--m-faint": "#828d81",
      "--m-scrim": "rgba(238,242,236,0.97)",
    },
  },
  {
    id: "trattoria",
    label: "Trattoria",
    tone: "light",
    display: "serif",
    note: "Printed-menu look. Made for Italian and Mediterranean.",
    swatch: "#faf6ef",
    suggestedAccent: "#a4161a",
    minTier: 1,
    palette: {
      "--m-bg": "#faf6ef",
      "--m-surface": "#ffffff",
      "--m-raised": "#f2ebdd",
      "--m-border": "#e3d9c6",
      "--m-text": "#1f1a14",
      "--m-dim": "#584e40",
      "--m-faint": "#8c8272",
      "--m-scrim": "rgba(250,246,239,0.97)",
    },
  },
  {
    id: "ristorante",
    label: "Ristorante",
    tone: "dark",
    display: "serif",
    note: "Candlelit and formal. Made for evening dining.",
    swatch: "#100d0b",
    suggestedAccent: "#c9a227",
    minTier: 1,
    palette: {
      "--m-bg": "#100d0b",
      "--m-surface": "#191512",
      "--m-raised": "#241e19",
      "--m-border": "#342b23",
      "--m-text": "#f6f1e8",
      "--m-dim": "#c5b9a8",
      "--m-faint": "#8d8274",
      "--m-scrim": "rgba(16,13,11,0.97)",
    },
  },
  {
    id: "ceylon",
    label: "Ceylon",
    tone: "light",
    display: "serif",
    note: "Warm and spiced. Made for South Asian kitchens.",
    swatch: "#fbf4ea",
    suggestedAccent: "#b5551d",
    minTier: 1,
    palette: {
      "--m-bg": "#fbf4ea",
      "--m-surface": "#ffffff",
      "--m-raised": "#f4e8d8",
      "--m-border": "#e6d5bd",
      "--m-text": "#231a11",
      "--m-dim": "#5b4a37",
      "--m-faint": "#8e7c66",
      "--m-scrim": "rgba(251,244,234,0.97)",
    },
  },
];

/** Lookup used when rendering a menu. */
export const MENU_PALETTES: Record<string, MenuPalette> = Object.fromEntries(
  MENU_THEMES.map((t) => [t.id, t.palette])
);

export const DEFAULT_THEME_ID = "midnight";

export const MENU_THEME_IDS = MENU_THEMES.map((t) => t.id);

/**
 * Validation helper for the API. Kept here so a new template is accepted the
 * moment it is added above, rather than being rejected by a stale enum.
 */
export function isMenuTheme(value: string): boolean {
  return MENU_THEME_IDS.includes(value);
}

export function paletteOf(themeId: string): MenuPalette {
  return MENU_PALETTES[themeId] ?? MENU_PALETTES[DEFAULT_THEME_ID];
}

export function themeOf(themeId: string): MenuTheme {
  return MENU_THEMES.find((t) => t.id === themeId) ?? MENU_THEMES[0];
}

/** Which display font a template asks for, as a CSS variable reference. */
export function displayFontOf(themeId: string): string {
  return themeOf(themeId).display === "serif"
    ? "var(--font-fraunces)"
    : "var(--font-poppins)";
}

/**
 * Whether a plan may select a template. Enforced on the server as well as in
 * the picker — a locked template is a paid feature, not a UI hint.
 */
export function canUseTheme(plan: Plan, themeId: string): boolean {
  return PLAN_TIER[plan] >= themeOf(themeId).minTier;
}

export function themesForPlan(plan: Plan): MenuTheme[] {
  return MENU_THEMES.filter((t) => PLAN_TIER[plan] >= t.minTier);
}
