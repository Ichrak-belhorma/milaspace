import { composite, contrastRatio } from "./color";
import type { Theme } from "./schema";

export type ContrastCheck = {
  id: "text" | "muted" | "on-accent" | "accent-ui";
  label: string;
  ratio: number;
  min: number;
  pass: boolean;
};

/** Neutral mid-grey stands in for a blurred, busy scene behind the glass. */
const NEUTRAL_BACKDROP = "#808080";

/** The colors glass is likely to sit over: the theme's own room surfaces plus a neutral mid-grey. */
export function backdropSamples(theme: Theme): string[] {
  return [theme.room.wall, theme.room.floor, theme.room.wood, NEUTRAL_BACKDROP];
}

/** Resulting glass colors after compositing the tint over each backdrop sample. */
export function glassSamples(theme: Theme): string[] {
  const { glassTint, glassOpacity } = theme.tokens;
  return backdropSamples(theme).map((b) => composite(glassTint, glassOpacity, b));
}

function worst(fg: string, bgs: string[]): number {
  return Math.min(...bgs.map((bg) => contrastRatio(fg, bg)));
}

/** WCAG AA checks for a theme: 4.5:1 for text, 3:1 for non-text UI (accent on glass). */
export function contrastReport(theme: Theme): ContrastCheck[] {
  const t = theme.tokens;
  const glass = glassSamples(theme);
  const checks: Omit<ContrastCheck, "pass">[] = [
    { id: "text", label: "Text on glass", ratio: worst(t.text, glass), min: 4.5 },
    { id: "muted", label: "Secondary text on glass", ratio: worst(t.textMuted, glass), min: 4.5 },
    { id: "on-accent", label: "Button text on accent", ratio: contrastRatio(t.onAccent, t.accent), min: 4.5 },
    { id: "accent-ui", label: "Accent on glass", ratio: worst(t.accent, glass), min: 3 },
  ];
  return checks.map((c) => ({ ...c, ratio: Math.round(c.ratio * 100) / 100, pass: c.ratio >= c.min }));
}
