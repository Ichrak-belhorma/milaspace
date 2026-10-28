"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, Group, SRGBColorSpace } from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useNow } from "@/hooks/useNow";
import { todayTodos, useNotebookStore, type Todo } from "@/stores/notebook";
import { useStudyTasksForToday } from "@/stores/study";
import { useThemeStore } from "@/stores/theme";
import { useUiStore } from "@/stores/ui";
import { mix } from "@/theme/color";
import { Asset } from "../assets/Asset";
import { NOTEBOOK } from "../assets/placeholders";
import { damp } from "../damp";
import { FIXED } from "../palette";
import { POSITIONS } from "../layout";
import { useInteractable } from "../useInteractable";

const HAND = '"Caveat", "Segoe Print", cursive';

/** Wait for the handwriting font so the first paint of the page is not in a fallback font. */
function useHandwritingReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    document.fonts
      .load(`40px ${HAND}`)
      .catch(() => undefined)
      .then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  return ready;
}

type Line = { text: string; done: boolean };

/** Today's page, handwritten on ruled paper in the room's colors. */
function usePageTexture(lines: Line[], paper: string, ink: string, accent: string, fontReady: boolean) {
  const texture = useMemo(() => {
    const W = 512;
    const H = Math.round((W * NOTEBOOK.depth) / NOTEBOOK.width);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = mix(paper, FIXED.rule, 0.35);
    ctx.lineWidth = 2;
    for (let y = 120; y < H; y += 46) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.strokeStyle = mix(paper, accent, 0.6);
    ctx.beginPath();
    ctx.moveTo(64, 0);
    ctx.lineTo(64, H);
    ctx.stroke();
    if (!fontReady) return new CanvasTexture(canvas);

    ctx.fillStyle = ink;
    ctx.font = `600 50px ${HAND}`;
    const date = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "short" }).format(new Date());
    ctx.fillText(date, 80, 90);
    ctx.font = `42px ${HAND}`;
    const shown = lines.slice(0, Math.floor((H - 130) / 46));
    if (shown.length === 0) {
      ctx.fillStyle = mix(ink, paper, 0.4);
      ctx.fillText("Nothing yet. One tiny step?", 80, 158);
    }
    shown.forEach((line, i) => {
      const y = 158 + i * 46;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3;
      ctx.strokeRect(80, y - 26, 26, 26);
      if (line.done) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(84, y - 14);
        ctx.lineTo(93, y - 4);
        ctx.lineTo(112, y - 34);
        ctx.stroke();
      }
      ctx.fillStyle = line.done ? mix(ink, paper, 0.45) : ink;
      let text = line.text;
      while (ctx.measureText(text).width > W - 140 && text.length > 4) text = `${text.slice(0, -2)}…`;
      ctx.fillText(text, 120, y);
      if (line.done) {
        const w = ctx.measureText(text).width;
        ctx.strokeStyle = mix(ink, paper, 0.3);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(118, y - 12);
        ctx.lineTo(122 + w, y - 14);
        ctx.stroke();
      }
    });
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [lines, paper, ink, accent, fontReady]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/**
 * The desk notebook. From afar it opens today's list in a panel; seated, it also opens on the
 * desk so you can read today's page (generated study tasks first, then your own to-dos).
 */
export function Notebook() {
  const { active, bind } = useInteractable("notebook");
  const open = useUiStore((s) => s.focus === "notebook");
  const reduced = useReducedMotion();
  const room = useThemeStore((s) => s.active.room);
  const todos = useNotebookStore((s) => s.todos);
  const studyTasks = useStudyTasksForToday();
  const fontReady = useHandwritingReady();
  const cover = useRef<Group>(null);

  const now = useNow(60_000);

  const lines = useMemo<Line[]>(() => {
    const mine = todayTodos(todos, now).map((t: Todo) => ({ text: t.text, done: t.done }));
    const planned = studyTasks.map((t) => ({ text: t.title, done: t.status === "done" }));
    return [...planned, ...mine];
  }, [todos, studyTasks, now]);

  const page = usePageTexture(lines, room.paper, FIXED.ink, room.decor, fontReady);

  useFrame((_, dt) => {
    const c = cover.current;
    if (!c) return;
    const target = open ? Math.PI : 0;
    c.rotation.z = reduced ? target : damp(c.rotation.z, target, 6, dt);
    // Lower the hinge as the cover opens so it rests flat on the desk.
    const t = c.rotation.z / Math.PI;
    c.position.y = NOTEBOOK.pageTop - t * 0.016;
  });

  return (
    <group position={POSITIONS.notebook} rotation-y={0.18} {...bind}>
      <Asset id="notebook.base" highlight={active} />
      <mesh position={[0.002, NOTEBOOK.pageTop + 0.0004, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[NOTEBOOK.width - 0.008, NOTEBOOK.depth - 0.01]} />
        <meshStandardMaterial map={page} roughness={1} />
      </mesh>
      <group ref={cover} position={[-NOTEBOOK.width / 2, NOTEBOOK.pageTop, 0]}>
        <Asset id="notebook.cover" highlight={active} />
      </group>
    </group>
  );
}
