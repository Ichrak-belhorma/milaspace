/** Self-hosted font registry (files come from @fontsource, imported in app/fonts.ts). */
export const FONTS = {
  cinzel: { label: "Cinzel", stack: '"Cinzel Variable", Georgia, serif' },
  "eb-garamond": { label: "EB Garamond", stack: '"EB Garamond Variable", Garamond, Georgia, serif' },
  fraunces: { label: "Fraunces", stack: '"Fraunces Variable", Georgia, serif' },
  lora: { label: "Lora", stack: '"Lora Variable", Georgia, serif' },
  "varela-round": { label: "Varela Round", stack: '"Varela Round", ui-rounded, system-ui, sans-serif' },
  nunito: { label: "Nunito", stack: '"Nunito Variable", ui-rounded, system-ui, sans-serif' },
  "dm-sans": { label: "DM Sans", stack: '"DM Sans Variable", system-ui, sans-serif' },
  inter: { label: "Inter", stack: '"Inter Variable", system-ui, sans-serif' },
  system: { label: "System", stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
} as const;

export type FontId = keyof typeof FONTS;
export const FONT_IDS = Object.keys(FONTS) as [FontId, ...FontId[]];
