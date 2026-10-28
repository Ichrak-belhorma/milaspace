"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, Group, SRGBColorSpace } from "three";
import { useNow } from "@/hooks/useNow";
import { dayKey, diffDays } from "@/lib/day";
import { useStudyStore } from "@/stores/study";
import { useTimerStore } from "@/stores/timer";
import { durationMs, remainingMs } from "@/timer/machine";
import { minutesByDay, STREAK_MIN_MINUTES } from "@/timer/stats";
import { mix } from "@/theme/color";
import { Asset } from "../assets/Asset";
import { Candle } from "../assets/placeholders";
import { damp } from "../damp";
import { POSITIONS } from "../layout";
import { useRoomColors } from "../materials";
import { FIXED } from "../palette";

const HAND = '"Caveat", "Segoe Print", cursive';

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d")!);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** A sticky note by the lamp counting down to the nearest exam, against time blindness. */
export function CountdownNote() {
  const modules = useStudyStore((s) => s.modules);
  const today = dayKey(useNow(60_000));
  const next = modules
    .filter((m) => !m.archivedAt && m.examDate && m.examDate >= today)
    .sort((a, b) => (a.examDate! < b.examDate! ? -1 : 1))[0];
  const days = next ? diffDays(today, next.examDate!) : null;
  const texture = useMemo(
    () =>
      canvasTexture(256, 256, (ctx) => {
        ctx.fillStyle = FIXED.sticky;
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = mix(FIXED.sticky, "#000000", 0.06);
        ctx.fillRect(0, 0, 256, 34);
        ctx.fillStyle = FIXED.ink;
        ctx.textAlign = "center";
        ctx.font = `600 40px ${HAND}`;
        if (!next || days === null) {
          ctx.fillText("No exams yet", 128, 120);
          ctx.font = `34px ${HAND}`;
          ctx.fillText("one step at a time", 128, 170);
          return;
        }
        let name = next.name;
        while (ctx.measureText(name).width > 220 && name.length > 4) name = `${name.slice(0, -2)}…`;
        ctx.fillText(name, 128, 92);
        ctx.font = `700 ${days === 0 ? 56 : 84}px ${HAND}`;
        ctx.fillText(days === 0 ? "today!" : String(days), 128, 182);
        ctx.font = `34px ${HAND}`;
        if (days > 0) ctx.fillText(days === 1 ? "day to go" : "days to go", 128, 226);
      }),
    [next, days],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={POSITIONS.sticky} rotation-z={0.06}>
      <planeGeometry args={[0.12, 0.12]} />
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  );
}

/** The shelf candle burns down over a focus session and is fresh again on breaks. */
export function BurningCandle({ lit }: { lit: number }) {
  const group = useRef<Group>(null);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const { timer, settings } = useTimerStore.getState();
    const focusing = timer.phase === "focus" && timer.status !== "idle";
    const left = focusing ? remainingMs(timer, Date.now()) / Math.max(1, durationMs("focus", settings)) : 1;
    g.scale.y = damp(g.scale.y, 0.3 + 0.7 * Math.min(1, left), 3, dt);
  });
  return (
    <group ref={group}>
      <Candle lit={lit} />
    </group>
  );
}

/** Qualifying study days so far (10+ focus minutes). */
function useStudyDays(): number {
  const sessions = useTimerStore((s) => s.sessions);
  return useMemo(() => [...minutesByDay(sessions).values()].filter((m) => m >= STREAK_MIN_MINUTES).length, [sessions]);
}

/** The plant grows a little with every study day, up to full size after about a month, then flowers. */
export function GrowingPlant() {
  const days = useStudyDays();
  const c = useRoomColors();
  const growth = Math.min(1, days / 30);
  const sprouts = Math.min(6, Math.floor(days / 4));
  return (
    <group position={POSITIONS.plant} scale={0.7 + growth * 0.55}>
      <Asset id="plant" />
      {Array.from({ length: sprouts }, (_, i) => {
        const a = i * 2.4;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.13, 0.72 + (i % 3) * 0.07, Math.sin(a) * 0.13]}>
            <icosahedronGeometry args={[0.08, 1]} />
            <meshStandardMaterial color={mix(c.plant, "#ffffff", 0.12)} roughness={0.9} flatShading />
          </mesh>
        );
      })}
      {days >= 30 &&
        [0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.cos(i * 2.1) * 0.12, 0.86, Math.sin(i * 2.1) * 0.12]}>
            <sphereGeometry args={[0.03, 10, 10]} />
            <meshStandardMaterial color={c.decor} emissive={c.decor} emissiveIntensity={0.15} />
          </mesh>
        ))}
    </group>
  );
}

/** Finished modules become labelled boxes on the shelf. */
export function ArchiveBoxes() {
  const modules = useStudyStore((s) => s.modules);
  const archived = useMemo(() => modules.filter((m) => m.archivedAt).slice(-4), [modules]);
  const c = useRoomColors();
  const labels = useMemo(
    () =>
      archived.map((m) =>
        canvasTexture(256, 96, (ctx) => {
          ctx.fillStyle = c.paper;
          ctx.fillRect(0, 0, 256, 96);
          ctx.fillStyle = FIXED.ink;
          ctx.textAlign = "center";
          ctx.font = `600 38px ${HAND}`;
          ctx.fillText(m.name.slice(0, 16), 128, 46);
          ctx.font = `30px ${HAND}`;
          if (m.finalGrade) ctx.fillText(m.finalGrade, 128, 82);
        }),
      ),
    [archived, c.paper],
  );
  useEffect(() => () => labels.forEach((l) => l.dispose()), [labels]);
  const [sx, sy, sz] = POSITIONS.shelf;
  return (
    <group position={[sx - 0.02, sy + 0.015, sz + 0.11]}>
      {archived.map((m, i) => (
        <group key={m.id} position={[-0.02 + i * 0.075, 0.035, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.07, 0.07, 0.13]} />
            <meshStandardMaterial color={[c.decor, c.fabric, c.plant, c.rug][i % 4]} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.005, 0.0651]}>
            <planeGeometry args={[0.062, 0.024]} />
            <meshStandardMaterial map={labels[i]} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
