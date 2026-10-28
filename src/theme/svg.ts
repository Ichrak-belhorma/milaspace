/** Encode an SVG string as a CSS url() value. */
export function svgUrl(svg: string): string {
  const encoded = encodeURIComponent(svg.replace(/\s{2,}/g, " ").trim()).replace(/'/g, "%27").replace(/"/g, "%22");
  return `url("data:image/svg+xml,${encoded}")`;
}
