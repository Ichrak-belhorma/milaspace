import type { Ornament } from "./schema";
import { svgUrl } from "./svg";

/**
 * Edge ornaments are shape-only SVG tiles used as CSS mask-images, so their color comes from
 * --mila-ornament-color and their transparency from the glass blur behind them.
 * Each tile is drawn for the bottom edge (attached at y=0, hanging down); the top edge is mirrored.
 */
type OrnamentTile = { width: number; height: number; body: string };

function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

const TILES: Record<Exclude<Ornament, "none">, OrnamentTile> = {
  // Scalloped lace: an eyelet band, a scallop with cut-out holes and picot dots.
  lace: {
    width: 36,
    height: 23,
    body: `
      <path fill-rule="evenodd" d="M0 0H36V6.5H0Z M0 6.5C0 14.5 7 19.5 18 19.5C29 19.5 36 14.5 36 6.5Z
        ${circle(9, 3.2, 1.5)} ${circle(27, 3.2, 1.5)} ${circle(18, 3.2, 0.9)} ${circle(0, 3.2, 0.9)} ${circle(36, 3.2, 0.9)}
        ${circle(18, 12, 2.6)} ${circle(10.2, 10.3, 1.35)} ${circle(25.8, 10.3, 1.35)}
        ${circle(13.6, 15.6, 1)} ${circle(22.4, 15.6, 1)} ${circle(18, 7.6, 0.8)}"/>
      <circle cx="18" cy="21.2" r="1.3"/><circle cx="0" cy="9.4" r="1"/><circle cx="36" cy="9.4" r="1"/>
      <circle cx="11" cy="19.6" r="0.75"/><circle cx="25" cy="19.6" r="0.75"/>`,
  },
  // Bubbles and droplets with a small sheen dot inside the larger ones.
  bubbles: {
    width: 56,
    height: 26,
    body: `
      <g fill="none" stroke="#000" stroke-width="1.4">
        <circle cx="10" cy="9" r="5.5"/><circle cx="35" cy="14" r="7.5"/><circle cx="50" cy="19" r="3.6"/><circle cx="21" cy="19.5" r="2.6"/>
      </g>
      <circle cx="8" cy="6.8" r="1.3"/><circle cx="32" cy="10.6" r="1.7"/><circle cx="24" cy="5" r="2.1"/>
      <circle cx="46" cy="6" r="1.5"/><circle cx="3" cy="20" r="1.1"/><circle cx="14" cy="23" r="0.9"/>
      <path d="M40 0c0 2.5 1.6 3.6 1.6 5.2a1.6 1.6 0 0 1-3.2 0c0-1.6 1.6-2.7 1.6-5.2Z"/>`,
  },
  // A trailing vine with leaves, a tendril and a small five-petal flower.
  vines: {
    width: 64,
    height: 26,
    body: `
      <path d="M0 4.5C10 8.5 22 8.5 32 4.5S54 0.5 64 4.5" fill="none" stroke="#000" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M12 7.3C16.2 9.8 16.4 15 12.2 18.6C8 15.3 8.2 10.2 12 7.3Z"/>
      <path d="M44.5 2.6C48.3 4.4 48.8 8.9 45.6 12C42.4 9.8 42 5.6 44.5 2.6Z"/>
      <path d="M22 7.6C25 7.8 27.4 10.4 26.6 13.4C23.6 13 21.5 10.6 22 7.6Z"/>
      <path d="M55 3.6c1 2.6 3.6 3.6 5.2 1.6" fill="none" stroke="#000" stroke-width="1" stroke-linecap="round"/>
      <g transform="translate(35 15)">
        <circle cx="0" cy="-2.3" r="1.7"/><circle cx="2.2" cy="-0.7" r="1.7"/><circle cx="1.4" cy="1.9" r="1.7"/>
        <circle cx="-1.4" cy="1.9" r="1.7"/><circle cx="-2.2" cy="-0.7" r="1.7"/>
      </g>
      <path d="M33.2 5.5L34.6 11.6" stroke="#000" stroke-width="0.9"/>`,
  },
};

export type OrnamentMask = { top: string; bottom: string; aspect: number; height: number };

function tileSvg(tile: OrnamentTile, edge: "top" | "bottom"): string {
  const flip = edge === "top" ? ` transform="translate(0 ${tile.height}) scale(1 -1)"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tile.width}" height="${tile.height}" viewBox="0 0 ${tile.width} ${tile.height}"><g${flip}>${tile.body}</g></svg>`;
}

export const ORNAMENT_MASKS: Record<Exclude<Ornament, "none">, OrnamentMask> = Object.fromEntries(
  (Object.keys(TILES) as Exclude<Ornament, "none">[]).map((id) => {
    const tile = TILES[id];
    return [
      id,
      {
        top: svgUrl(tileSvg(tile, "top")),
        bottom: svgUrl(tileSvg(tile, "bottom")),
        aspect: tile.width / tile.height,
        height: tile.height,
      },
    ];
  }),
) as Record<Exclude<Ornament, "none">, OrnamentMask>;

export const ORNAMENT_LABELS: Record<Ornament, string> = {
  none: "None",
  lace: "Lace",
  bubbles: "Bubbles",
  vines: "Vines",
};
