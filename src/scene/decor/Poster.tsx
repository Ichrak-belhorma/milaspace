"use client";

import { useEffect, useMemo, useState } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { getImage, PAINTING_KEY } from "@/lib/media";
import { useRoomStore } from "@/stores/room";
import { mix } from "@/theme/color";
import type { PlaceholderProps } from "../assets/placeholders";
import { highlight, useHighlightColor, useRoomColors } from "../materials";

const W = 256;
const H = 340;

/** Load the user's painting picture from IndexedDB whenever it changes. */
function useCustomPicture(): ImageBitmap | null {
  const { custom, version } = useRoomStore((s) => s.painting);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  useEffect(() => {
    let live = true;
    if (!custom) {
      queueMicrotask(() => live && setBitmap(null));
      return;
    }
    getImage(PAINTING_KEY)
      .then((blob) => (blob ? createImageBitmap(blob) : null))
      .catch(() => null)
      .then((b) => {
        if (live) setBitmap(b);
        else b?.close();
      });
    return () => {
      live = false;
    };
  }, [custom, version]);
  return bitmap;
}

function paintDefault(ctx: CanvasRenderingContext2D, c: { decor: string; paper: string; plant: string }) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, mix(c.decor, "#000000", 0.55));
  sky.addColorStop(1, mix(c.decor, c.paper, 0.35));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = c.paper;
  ctx.beginPath();
  ctx.arc(170, 95, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 18; i++) ctx.fillRect((i * 97) % W, (i * 53) % 150, 2, 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = mix(c.plant, "#000000", 0.25);
  ctx.beginPath();
  ctx.moveTo(0, 250);
  ctx.quadraticCurveTo(80, 170, 170, 240);
  ctx.quadraticCurveTo(220, 200, W, 225);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
  ctx.fillStyle = mix(c.plant, "#000000", 0.5);
  ctx.beginPath();
  ctx.moveTo(0, 300);
  ctx.quadraticCurveTo(120, 230, W, 290);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
}

/**
 * The framed painting above the desk: a print in the room's colors, or the user's own picture
 * (already cropped to the frame when it was chosen).
 */
export function Poster({ highlight: hl }: PlaceholderProps) {
  const c = useRoomColors();
  const glow = useHighlightColor();
  const picture = useCustomPicture();

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = picture ? picture.width : W;
    canvas.height = picture ? picture.height : H;
    const ctx = canvas.getContext("2d")!;
    if (picture) ctx.drawImage(picture, 0, 0);
    else paintDefault(ctx, c);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [picture, c]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.64, 0.02]} />
        <meshStandardMaterial color={c.wood} roughness={0.6} {...highlight(hl, glow)} />
      </mesh>
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[0.44, 0.58]} />
        <meshStandardMaterial map={texture} roughness={0.85} />
      </mesh>
    </group>
  );
}
