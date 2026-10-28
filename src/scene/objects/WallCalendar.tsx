"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { useNow } from "@/hooks/useNow";
import { dayKey } from "@/lib/day";
import { useStudyStore } from "@/stores/study";
import { useThemeStore } from "@/stores/theme";
import { useTimerStore } from "@/stores/timer";
import { useUiStore } from "@/stores/ui";
import { calendarMarks, monthGrid } from "@/study/calendar";
import { mix } from "@/theme/color";
import { highlight, useHighlightColor } from "../materials";
import { FIXED } from "../palette";
import { SLOTS } from "../slots";
import { useInteractable } from "../useInteractable";

const W = 420;
const H = 580;
const SIZE = { width: 0.42, height: 0.58 };
const GRID_TOP = 255;
const GRID_LEFT = 20;
const CELL_W = (W - 40) / 7;
const HAND = '"Caveat", "Segoe Print", cursive';

/** Deterministic wobble so hand-drawn marks look the same every render. */
function jitter(seed: string, i: number): number {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return (((h >> (i % 16)) & 7) - 3.5) * 0.9;
}

function useFontReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    document.fonts.load(`40px ${HAND}`).catch(() => undefined).then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  return ready;
}

/**
 * The wall calendar above the bed: this month, exam days circled in red, studied days crossed off
 * ("don't break the chain"). Click to look closely; then click a day to see its plan.
 */
export function WallCalendar() {
  const { active, bind } = useInteractable("calendar");
  const focused = useUiStore((s) => s.focus === "calendar");
  const { month, day: selected } = useUiStore((s) => s.calendar);
  const setCalendar = useUiStore((s) => s.setCalendar);
  const modules = useStudyStore((s) => s.modules);
  const tasks = useStudyStore((s) => s.tasks);
  const sessions = useTimerStore((s) => s.sessions);
  const room = useThemeStore((s) => s.active.room);
  const accent = useThemeStore((s) => s.active.tokens.accent);
  const glow = useHighlightColor();
  const fontReady = useFontReady();
  const today = dayKey(useNow(60_000));
  const [y, m] = month.split("-").map(Number) as [number, number];
  const weeks = useMemo(() => monthGrid(y, m), [y, m]);
  const marks = useMemo(() => calendarMarks(modules, tasks, sessions), [modules, tasks, sessions]);
  const cellH = (H - GRID_TOP - 30) / weeks.length;

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = room.paper;
    ctx.fillRect(0, 0, W, H);
    // Picture band.
    const sky = ctx.createLinearGradient(0, 18, 0, 170);
    sky.addColorStop(0, mix(room.decor, room.paper, 0.35));
    sky.addColorStop(1, mix(accent, room.paper, 0.55));
    ctx.fillStyle = sky;
    ctx.fillRect(14, 18, W - 28, 152);
    ctx.fillStyle = mix(room.plant, room.paper, 0.15);
    ctx.beginPath();
    ctx.moveTo(14, 140);
    ctx.quadraticCurveTo(140, 90, 260, 135);
    ctx.quadraticCurveTo(340, 110, W - 14, 125);
    ctx.lineTo(W - 14, 170);
    ctx.lineTo(14, 170);
    ctx.fill();
    // Binding rings.
    ctx.fillStyle = mix(room.metal, "#000000", 0.2);
    for (let x = 60; x < W; x += 75) ctx.fillRect(x, 4, 6, 22);
    // Month and weekdays.
    const title = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
    ctx.fillStyle = FIXED.ink;
    ctx.textAlign = "center";
    ctx.font = fontReady ? `600 40px ${HAND}` : "600 30px Georgia, serif";
    ctx.fillText(title, W / 2, 212);
    ctx.font = "600 15px system-ui, sans-serif";
    ["M", "T", "W", "T", "F", "S", "S"].forEach((d, i) => ctx.fillText(d, GRID_LEFT + CELL_W * (i + 0.5), GRID_TOP - 10));

    weeks.forEach((week, wi) =>
      week.forEach((key, di) => {
        const x = GRID_LEFT + di * CELL_W;
        const yy = GRID_TOP + wi * cellH;
        ctx.strokeStyle = mix(room.paper, FIXED.ink, 0.15);
        ctx.lineWidth = 1;
        ctx.strokeRect(x, yy, CELL_W, cellH);
        if (!key) return;
        const cx = x + CELL_W / 2;
        const cy = yy + cellH / 2 + 2;
        if (key === today) {
          ctx.fillStyle = mix(accent, room.paper, 0.75);
          ctx.fillRect(x + 1, yy + 1, CELL_W - 2, cellH - 2);
        }
        if (key === selected && focused) {
          ctx.strokeStyle = accent;
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 2, yy + 2, CELL_W - 4, cellH - 4);
        }
        ctx.fillStyle = FIXED.ink;
        ctx.font = "500 17px system-ui, sans-serif";
        ctx.fillText(String(Number(key.slice(8))), cx, cy + 6);
        if (marks.done.has(key)) {
          ctx.strokeStyle = mix(FIXED.ink, room.decor, 0.25);
          ctx.lineWidth = 3.2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(x + 9 + jitter(key, 1), yy + 8 + jitter(key, 2));
          ctx.lineTo(x + CELL_W - 9 + jitter(key, 3), yy + cellH - 8 + jitter(key, 4));
          ctx.moveTo(x + CELL_W - 10 + jitter(key, 5), yy + 9 + jitter(key, 6));
          ctx.lineTo(x + 10 + jitter(key, 7), yy + cellH - 9 + jitter(key, 8));
          ctx.stroke();
        }
        if (marks.exams.has(key)) {
          ctx.strokeStyle = FIXED.examRed;
          ctx.lineWidth = 3;
          for (let pass = 0; pass < 2; pass++) {
            ctx.beginPath();
            ctx.ellipse(cx + jitter(key, 9 + pass), cy + jitter(key, 11 + pass) * 0.5, CELL_W / 2 - 3 + pass, cellH / 2 - 4, jitter(key, 13) * 0.04, 0.2 + pass * 0.3, Math.PI * 2 + 0.1 + pass * 0.3);
            ctx.stroke();
          }
        }
      }),
    );
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, [room, accent, y, m, weeks, marks, today, selected, focused, fontReady, cellH]);
  useEffect(() => () => texture.dispose(), [texture]);

  // Zoomed in: clicking the paper picks a day.
  const onPaperClick = (e: ThreeEvent<MouseEvent>) => {
    if (!focused || !e.uv) return;
    e.stopPropagation();
    const px = e.uv.x * W;
    const py = (1 - e.uv.y) * H;
    const wi = Math.floor((py - GRID_TOP) / cellH);
    const di = Math.floor((px - GRID_LEFT) / CELL_W);
    const key = weeks[wi]?.[di];
    if (key) setCalendar({ day: key });
  };

  return (
    <group position={SLOTS["wall-bed"].position} {...bind}>
      <mesh castShadow>
        <boxGeometry args={[SIZE.width + 0.02, SIZE.height + 0.02, 0.008]} />
        <meshStandardMaterial color={room.paper} roughness={0.95} {...highlight(active && !focused, glow)} />
      </mesh>
      <mesh position={[0, 0, 0.0045]} onClick={onPaperClick}>
        <planeGeometry args={[SIZE.width, SIZE.height]} />
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
    </group>
  );
}
