import { z } from "zod";
import { FONT_IDS } from "./fonts";

export const ORNAMENTS = ["none", "lace", "bubbles", "vines"] as const;
export const CURSORS = ["system", "candle", "bubble", "leaf", "dot"] as const;
export const BORDER_STYLES = ["solid", "dashed", "dotted", "double"] as const;
export const THEME_SCHEMA_VERSION = "mila.theme/1" as const;

export type Ornament = (typeof ORNAMENTS)[number];
export type CursorStyle = (typeof CURSORS)[number];

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected a #rrggbb color").transform((v) => v.toLowerCase());
const unit = z.number().min(0).max(1);

/** UI tokens: every one becomes a CSS custom property on :root. */
export const themeTokensSchema = z.object({
  background: hex,
  glassTint: hex,
  glassOpacity: z.number().min(0.1).max(1),
  glassBlur: z.number().min(0).max(40),
  glassSaturation: z.number().min(50).max(250),
  highlight: hex,
  highlightStrength: unit,
  borderColor: hex,
  borderOpacity: unit,
  borderWidth: z.number().min(0).max(4),
  borderStyle: z.enum(BORDER_STYLES),
  radius: z.number().min(0).max(32),
  shadowColor: hex,
  shadowStrength: unit,
  glowColor: hex,
  glowStrength: unit,
  text: hex,
  textMuted: hex,
  accent: hex,
  accent2: hex,
  onAccent: hex,
  fontDisplay: z.enum(FONT_IDS),
  fontBody: z.enum(FONT_IDS),
  ornament: z.enum(ORNAMENTS),
  ornamentColor: hex,
  cursor: z.enum(CURSORS),
});

/** 3D room palette: read by the R3F scene, not by CSS. */
export const roomThemeSchema = z.object({
  wall: hex,
  trim: hex,
  floor: hex,
  rug: hex,
  wood: hex,
  fabric: hex,
  metal: hex,
  plant: hex,
  paper: hex,
  decor: hex,
  ambientColor: hex,
  ambientIntensity: z.number().min(0).max(3),
  accentLight: hex,
  accentLightIntensity: z.number().min(0).max(5),
  screenGlow: hex,
});

export const themeSchema = z.object({
  schema: z.literal(THEME_SCHEMA_VERSION),
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(48),
  basedOn: z.string().max(64).optional(),
  /** Last save, for sync. */
  updatedAt: z.number().optional(),
  tokens: themeTokensSchema,
  room: roomThemeSchema,
});

export type ThemeTokens = z.infer<typeof themeTokensSchema>;
export type RoomTheme = z.infer<typeof roomThemeSchema>;
export type Theme = z.infer<typeof themeSchema>;
