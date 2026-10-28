"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, Group, SRGBColorSpace } from "three";
import { useNow } from "@/hooks/useNow";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAudioStore } from "@/stores/audio";
import { useRoomStore } from "@/stores/room";
import { useThemeStore } from "@/stores/theme";
import { useUiStore } from "@/stores/ui";
import { mix } from "@/theme/color";
import { Asset } from "../assets/Asset";
import { PHONE } from "../assets/placeholders";
import { damp } from "../damp";
import { PHONE_POSITION, POSITIONS } from "../layout";
import { FIXED } from "../palette";
import { useInteractable } from "../useInteractable";

function useLockScreen(now: number, nowPlaying: string | null) {
  const room = useThemeStore((s) => s.active.room);
  const accent = useThemeStore((s) => s.active.tokens.accent);
  const minute = Math.floor(now / 60_000);
  const texture = useMemo(() => {
    const d = new Date(minute * 60_000);
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 532;
    const ctx = canvas.getContext("2d")!;
    const bg = ctx.createLinearGradient(0, 0, 0, 532);
    bg.addColorStop(0, mix(accent, "#000000", 0.35));
    bg.addColorStop(1, mix(room.decor, "#000000", 0.6));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 532);
    ctx.fillStyle = FIXED.phoneText;
    ctx.textAlign = "center";
    ctx.font = "300 76px system-ui, sans-serif";
    ctx.fillText(new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d), 128, 150);
    ctx.font = "500 20px system-ui, sans-serif";
    ctx.fillText(new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(d), 128, 186);
    if (nowPlaying) {
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.roundRect(24, 400, 208, 60, 18);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = "500 18px system-ui, sans-serif";
      ctx.fillText(`♪ ${nowPlaying}`, 128, 437);
    }
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [minute, nowPlaying, accent, room.decor]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/**
 * The phone on the nightstand. Its screen wakes while you check it; flipped face-down
 * (focus mode) it stays dark. Clicking opens the phone panel.
 */
export function Phone() {
  const faceDown = useRoomStore((s) => s.phone.faceDown);
  const checking = useUiStore((s) => s.inspect === "phone");
  const music = useAudioStore((s) => s.music);
  const reduced = useReducedMotion();
  const { active, bind } = useInteractable("phone");
  const now = useNow(30_000);
  const screen = useLockScreen(now, music.playing ? "Mila Radio" : null);
  const flip = useRef<Group>(null);
  const awake = checking && !faceDown;

  useFrame((_, dt) => {
    const g = flip.current;
    if (!g) return;
    const target = faceDown ? Math.PI : 0;
    g.rotation.z = reduced ? target : damp(g.rotation.z, target, 7, dt);
    const t = g.rotation.z / Math.PI;
    // Lift while flipping, and rest on the screen side when face-down.
    g.position.y = Math.sin(t * Math.PI) * 0.05 + t * PHONE.thickness;
  });

  return (
    <group position={PHONE_POSITION} rotation-y={0.45} {...bind}>
      <group ref={flip}>
        <Asset id="phone.body" highlight={active} />
        <mesh position={[0, PHONE.thickness + 0.0004, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[PHONE.width - 0.006, PHONE.depth - 0.008]} />
          {awake ? <meshBasicMaterial map={screen} toneMapped={false} /> : <meshStandardMaterial color={FIXED.phoneOff} roughness={0.15} metalness={0.3} />}
        </mesh>
      </group>
      {awake && <pointLight position={[0, 0.08, 0]} color={FIXED.phoneGlow} intensity={0.12} distance={0.6} decay={2} />}
    </group>
  );
}

export function NightstandWithPhone() {
  return (
    <>
      <group position={POSITIONS.nightstand}>
        <Asset id="nightstand" />
      </group>
      <Phone />
    </>
  );
}
