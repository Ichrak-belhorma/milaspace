"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { mix } from "@/theme/color";
import { useRoomColors } from "../materials";

/** A framed print, painted on a canvas in the room's colors so it matches every theme. */
export function Poster() {
  const c = useRoomColors();
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 340;
    const ctx = canvas.getContext("2d")!;
    const sky = ctx.createLinearGradient(0, 0, 0, 340);
    sky.addColorStop(0, mix(c.decor, "#000000", 0.55));
    sky.addColorStop(1, mix(c.decor, c.paper, 0.35));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 256, 340);
    ctx.fillStyle = c.paper;
    ctx.beginPath();
    ctx.arc(170, 95, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 18; i++) ctx.fillRect((i * 97) % 256, (i * 53) % 150, 2, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = mix(c.plant, "#000000", 0.25);
    ctx.beginPath();
    ctx.moveTo(0, 250);
    ctx.quadraticCurveTo(80, 170, 170, 240);
    ctx.quadraticCurveTo(220, 200, 256, 225);
    ctx.lineTo(256, 340);
    ctx.lineTo(0, 340);
    ctx.fill();
    ctx.fillStyle = mix(c.plant, "#000000", 0.5);
    ctx.beginPath();
    ctx.moveTo(0, 300);
    ctx.quadraticCurveTo(120, 230, 256, 290);
    ctx.lineTo(256, 340);
    ctx.lineTo(0, 340);
    ctx.fill();
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [c.decor, c.paper, c.plant]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.64, 0.02]} />
        <meshStandardMaterial color={c.wood} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[0.44, 0.58]} />
        <meshStandardMaterial map={texture} roughness={0.85} />
      </mesh>
    </group>
  );
}
