import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

/**
 * Procedural grayscale textures. They are multiplied by the material color, so one texture
 * serves every theme. Cached for the life of the page.
 */
const cache = new Map<string, CanvasTexture>();

function make(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void): CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, size);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

function gray(v: number): string {
  const c = Math.round(Math.min(1, Math.max(0, v)) * 255);
  return `rgb(${c},${c},${c})`;
}

/** Seeded random so textures look the same on every load. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function planksTexture(): CanvasTexture {
  return make("planks", 512, (ctx, size) => {
    const rnd = seeded(7);
    const planks = 6;
    const w = size / planks;
    for (let i = 0; i < planks; i++) {
      let y = -rnd() * size;
      while (y < size) {
        const len = size * (0.45 + rnd() * 0.5);
        ctx.fillStyle = gray(0.8 + rnd() * 0.2);
        ctx.fillRect(i * w, y, w, len);
        for (let g = 0; g < 5; g++) {
          ctx.fillStyle = gray(0.72 + rnd() * 0.1);
          ctx.globalAlpha = 0.25;
          ctx.fillRect(i * w + rnd() * w, y, 1, len);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = gray(0.55);
        ctx.fillRect(i * w, y, w, 2);
        y += len;
      }
      ctx.fillStyle = gray(0.5);
      ctx.fillRect(i * w, 0, 2, size);
    }
  });
}

export function wallpaperTexture(): CanvasTexture {
  return make("wallpaper", 256, (ctx, size) => {
    ctx.fillStyle = gray(0.97);
    ctx.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 32) {
      ctx.fillStyle = gray(0.92);
      ctx.fillRect(x, 0, 10, size);
    }
    ctx.fillStyle = gray(0.88);
    for (let y = 16; y < size; y += 32) {
      for (let x = 21; x < size; x += 32) {
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

export function fabricTexture(): CanvasTexture {
  return make("fabric", 128, (ctx, size) => {
    const rnd = seeded(3);
    ctx.fillStyle = gray(0.95);
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < size; i += 4) {
      ctx.fillStyle = gray(0.88 + rnd() * 0.06);
      ctx.fillRect(0, i, size, 1);
      ctx.fillRect(i, 0, 1, size);
    }
  });
}

/** A soft round puff for steam particles. */
export function puffTexture(): CanvasTexture {
  return make("puff", 64, (ctx, size) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(0.5, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
}
