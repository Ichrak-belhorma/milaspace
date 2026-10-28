import { isDark } from "./color";
import { cursorCss } from "./cursors";
import { FONTS } from "./fonts";
import type { Theme } from "./schema";

/**
 * Map a theme's UI tokens to CSS custom properties. Derived values (glass background, border color)
 * are computed in globals.css with color-mix(), so this stays a flat, inspectable mapping.
 */
export function themeToCssVars(theme: Theme): Record<string, string> {
  const t = theme.tokens;
  return {
    "--mila-bg": t.background,
    "--mila-glass-tint": t.glassTint,
    "--mila-glass-opacity": String(t.glassOpacity),
    "--mila-glass-blur": `${t.glassBlur}px`,
    "--mila-glass-saturation": `${t.glassSaturation}%`,
    "--mila-highlight": t.highlight,
    "--mila-highlight-strength": String(t.highlightStrength),
    "--mila-border-color": t.borderColor,
    "--mila-border-opacity": String(t.borderOpacity),
    "--mila-border-width": `${t.borderWidth}px`,
    "--mila-border-style": t.borderStyle,
    "--mila-radius": `${t.radius}px`,
    "--mila-shadow-color": t.shadowColor,
    "--mila-shadow-strength": String(t.shadowStrength),
    "--mila-glow-color": t.glowColor,
    "--mila-glow-strength": String(t.glowStrength),
    "--mila-text": t.text,
    "--mila-text-muted": t.textMuted,
    "--mila-accent": t.accent,
    "--mila-accent-2": t.accent2,
    "--mila-on-accent": t.onAccent,
    "--mila-font-display": FONTS[t.fontDisplay].stack,
    "--mila-font-body": FONTS[t.fontBody].stack,
    "--mila-ornament-color": t.ornamentColor,
    "--mila-cursor": cursorCss(t.cursor),
    "color-scheme": isDark(t.glassTint) ? "dark" : "light",
  };
}

export function cssVarsToRule(vars: Record<string, string>, selector = ":root"): string {
  const body = Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join("");
  return `${selector}{${body}}`;
}

export const THEME_VARS_STORAGE_KEY = "mila:theme-vars";

/** Write vars on an element (default :root). */
export function applyCssVars(vars: Record<string, string>, el: HTMLElement = document.documentElement): void {
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
}

/**
 * Inline script for <head>: re-applies the last theme from localStorage before first paint,
 * so returning users never see the default theme flash.
 */
export const NO_FLASH_SCRIPT = `try{var v=JSON.parse(localStorage.getItem(${JSON.stringify(THEME_VARS_STORAGE_KEY)})||"null");if(v&&typeof v==="object"){var s=document.documentElement.style;for(var k in v){if(typeof v[k]==="string")s.setProperty(k,v[k]);}}}catch(e){}`;
