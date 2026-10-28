"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, Group, SRGBColorSpace } from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useThemeStore } from "@/stores/theme";
import { useUiStore } from "@/stores/ui";
import { mix } from "@/theme/color";
import { Asset } from "../assets/Asset";
import { LAPTOP } from "../assets/placeholders";
import { damp } from "../damp";
import { POSITIONS } from "../layout";
import { useInteractable } from "../useInteractable";

/** A tiny painted Mila UI for the screen, in the theme's screen-glow color. */
function useScreenTexture(glow: string, ink: string) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 340;
    const ctx = canvas.getContext("2d")!;
    const bg = ctx.createLinearGradient(0, 0, 0, 340);
    bg.addColorStop(0, glow);
    bg.addColorStop(1, mix(glow, "#000000", 0.35));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 340);
    ctx.fillStyle = mix(glow, "#ffffff", 0.5);
    ctx.fillRect(0, 0, 512, 34);
    ctx.fillStyle = ink;
    ctx.font = "600 20px Georgia, serif";
    ctx.fillText("Mila · Today", 18, 24);
    for (let i = 0; i < 4; i++) {
      const y = 62 + i * 62;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = mix(glow, "#ffffff", 0.65);
      ctx.beginPath();
      ctx.roundRect(18, y, 300, 46, 10);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3;
      ctx.strokeRect(32, y + 14, 18, 18);
      ctx.fillStyle = mix(ink, glow, 0.35);
      ctx.fillRect(64, y + 19, 120 + ((i * 53) % 110), 8);
    }
    ctx.fillStyle = mix(glow, "#ffffff", 0.65);
    ctx.beginPath();
    ctx.roundRect(340, 62, 154, 170, 12);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(417, 147, 50, -Math.PI / 2, Math.PI * 0.9);
    ctx.stroke();
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [glow, ink]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Click to zoom in and open the study view. The lid opens a little wider while you study. */
export function Laptop() {
  const glow = useThemeStore((s) => s.active.room.screenGlow);
  const studying = useUiStore((s) => s.focus === "laptop");
  const reduced = useReducedMotion();
  const { active, bind } = useInteractable("laptop");
  const screen = useScreenTexture(glow, "#1d1d24");
  const lid = useRef<Group>(null);

  useFrame((_, dt) => {
    if (!lid.current) return;
    const target = LAPTOP.openAngle - (studying ? 0.12 : 0);
    lid.current.rotation.x = reduced ? target : damp(lid.current.rotation.x, target, 5, dt);
  });

  return (
    <group position={POSITIONS.laptop} rotation-y={0.04} {...bind}>
      <Asset id="laptop.base" highlight={active} />
      <group ref={lid} position={[0, LAPTOP.baseH, -LAPTOP.depth / 2]} rotation-x={LAPTOP.openAngle}>
        <Asset id="laptop.lid" highlight={active} />
        <mesh position={[0, -0.001, LAPTOP.depth / 2]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[LAPTOP.width - 0.03, LAPTOP.depth - 0.03]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[0, 0.16, 0.05]} color={glow} intensity={0.25} distance={1.2} decay={2} />
    </group>
  );
}
