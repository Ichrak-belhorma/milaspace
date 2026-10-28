import type { CursorStyle } from "./schema";
import { svgUrl } from "./svg";

/** Themed cursors. Each is an SVG with an explicit hotspot and a system fallback. */
const CURSOR_SVGS: Record<Exclude<CursorStyle, "system">, { svg: string; x: number; y: number }> = {
  candle: {
    x: 7,
    y: 2,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="24" viewBox="0 0 20 24">
      <path d="M7 1.5C10.5 6 11.5 8.3 9.8 11C8.6 12.8 5.4 12.8 4.2 11C2.6 8.3 3.6 6 7 1.5Z" fill="#f6c56b" stroke="#4a230c" stroke-width="0.9"/>
      <path d="M7 6c1.3 1.9 1.4 3.1.7 4.1-.5.7-1.9.7-2.4 0-.6-1 .2-2.4 1.7-4.1Z" fill="#fff6d8"/>
      <rect x="5.6" y="13" width="2.8" height="9" rx="0.8" fill="#efe6da" stroke="#4a230c" stroke-width="0.8"/></svg>`,
  },
  bubble: {
    x: 9,
    y: 9,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <circle cx="9" cy="9" r="6.8" fill="#bfefff" fill-opacity="0.45" stroke="#0a6fa6" stroke-width="1.6"/>
      <path d="M5.4 7.2a4 4 0 0 1 3-2.8" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  },
  leaf: {
    x: 2,
    y: 2,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <path d="M2 2C12 2 18 8 16.5 16.5C8 18 2 12 2 2Z" fill="#7d9a68" stroke="#33472a" stroke-width="1.1"/>
      <path d="M2.5 2.5L14.5 14.5" stroke="#33472a" stroke-width="0.9"/></svg>`,
  },
  dot: {
    x: 6,
    y: 6,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="4" fill="#1d1d1f" stroke="#fff" stroke-width="1.5"/></svg>`,
  },
};

export function cursorCss(style: CursorStyle): string {
  if (style === "system") return "auto";
  const c = CURSOR_SVGS[style];
  return `${svgUrl(c.svg)} ${c.x} ${c.y}, auto`;
}

export const CURSOR_LABELS: Record<CursorStyle, string> = {
  system: "System",
  candle: "Candle",
  bubble: "Bubble",
  leaf: "Leaf",
  dot: "Dot",
};
