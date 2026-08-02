/**
 * GoPlate design system — matches the web brand: true-black stage,
 * orange + sky accents, Poppins typography.
 */
export const colors = {
  bg: "#070708",
  surface: "#121214",
  surfaceRaised: "#1b1b1f",
  border: "#26262c",
  borderLight: "#35353d",
  text: "#f4f4f1",
  textDim: "#b9b9b2",
  textFaint: "#80807a",
  accent: "#f0762e",
  accentSoft: "rgba(240,118,46,0.14)",
  sky: "#3fa9e0",
  skySoft: "rgba(63,169,224,0.14)",
  danger: "#e0523f",
  dangerSoft: "rgba(224,82,63,0.14)",
  success: "#7bb26a",
  successSoft: "rgba(123,178,106,0.16)",
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, full: 999 };

/** Font families — loaded in the root layout. */
export const font = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
  heavy: "Poppins_800ExtraBold",
  icon: "MaterialSymbols_400Regular",
};

/**
 * Material Symbols glyph codepoints (stable across Material Icons/Symbols).
 * Rendered as text with the icon font — see <Icon /> in components/ui.
 */
export const glyphs = {
  add: "\ue145",
  arrow_forward: "\ue5c8",
  check: "\ue5ca",
  chevron_right: "\ue5cc",
  close: "\ue5cd",
  delete: "\ue872",
  edit: "\ue3c9",
  eco: "\uea35",
  expand_more: "\ue5cf",
  fire: "\uef55",
  image: "\ue3f4",
  link: "\ue157",
  logout: "\ue9ba",
  movie: "\ue02c",
  lock: "\ue897",
  payments: "\uef63",
  person: "\ue7fd",
  photo_camera: "\ue412",
  qr_code: "\ue00a",
  receipt: "\uef6e",
  restaurant_menu: "\ue561",
  schedule: "\ue8b5",
  search: "\ue8b6",
  settings: "\ue8b8",
  share: "\ue80d",
  storefront: "\uea12",
  videocam: "\ue04b",
  view_in_ar: "\ue9fe",
  visibility: "\ue8f4",
  workspace_premium: "\ue7af",
} as const;

export type GlyphName = keyof typeof glyphs;
