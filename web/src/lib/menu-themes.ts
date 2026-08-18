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
  /** Shown in the picker; the background colour is what an owner recognises. */
  swatch: string;
  /** Reads well with this template — offered as a one-tap suggestion. */
  suggestedAccent: string;
  palette: MenuPalette;
};

export const MENU_THEMES: MenuTheme[] = [
  {
    id: "midnight",
    label: "Midnight",
    tone: "dark",
    swatch: "#070708",
    suggestedAccent: "#f0762e",
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
    swatch: "#14100c",
    suggestedAccent: "#e0a34a",
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
    swatch: "#141619",
    suggestedAccent: "#5fb3d6",
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
    swatch: "#0d1712",
    suggestedAccent: "#7fc08a",
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
    swatch: "#170b10",
    suggestedAccent: "#e08a6a",
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
    swatch: "#0b1220",
    suggestedAccent: "#f0a83e",
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
    swatch: "#f8f4ec",
    suggestedAccent: "#c2410c",
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
    swatch: "#f5f6f8",
    suggestedAccent: "#1f6feb",
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
    swatch: "#eef2ec",
    suggestedAccent: "#3f7d4f",
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
