"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import { Group } from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useRoomStore } from "@/stores/room";
import { useTimerStore } from "@/stores/timer";
import { Asset } from "../assets/Asset";
import { damp } from "../damp";
import { POSITIONS } from "../layout";
import { highlight, useHighlightColor, useRoomColors } from "../materials";
import { FIXED } from "../palette";
import { useInteractable } from "../useInteractable";

type Activity = "type" | "write" | "think" | "stretch" | "read";

/** Joint targets per activity: [shoulderL, elbowL, shoulderR, elbowR, lean, headPitch]. Positive x swings an arm forward. */
const POSES: Record<Activity, [number, number, number, number, number, number]> = {
  type: [0.95, 0.75, 0.95, 0.75, 0.12, 0.22],
  write: [0.55, 0.9, 1.05, 0.55, 0.18, 0.38],
  think: [0.9, 0.7, 0.35, 2.3, 0.05, 0.05],
  stretch: [3.0, 0.1, 3.0, 0.1, -0.12, -0.25],
  read: [0.75, 1.1, 0.75, 1.1, 0.0, 0.3],
};

function Arm({ side, shoulder, elbow, sleeve }: { side: 1 | -1; shoulder: RefObject<Group | null>; elbow: RefObject<Group | null>; sleeve: string }) {
  return (
    <group ref={shoulder} position={[side * 0.2, 0.47, 0]}>
      <mesh position={[0, -0.13, 0]} castShadow>
        <cylinderGeometry args={[0.048, 0.042, 0.27, 10]} />
        <meshStandardMaterial color={sleeve} roughness={0.95} />
      </mesh>
      <group ref={elbow} position={[0, -0.26, 0]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <cylinderGeometry args={[0.042, 0.036, 0.24, 10]} />
          <meshStandardMaterial color={sleeve} roughness={0.95} />
        </mesh>
        <mesh position={[0, -0.26, 0]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color={FIXED.skin} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * A study buddy at the window desk: body doubling. They work while your timer runs (typing,
 * writing in their notebook, thinking), stretch on your breaks, and read quietly otherwise.
 */
export function StudyBuddy() {
  const visible = useRoomStore((s) => s.buddy.visible);
  const reduced = useReducedMotion();
  const c = useRoomColors();
  const glow = useHighlightColor();
  const { active, bind } = useInteractable("buddy");
  const torso = useRef<Group>(null);
  const head = useRef<Group>(null);
  const sL = useRef<Group>(null);
  const eL = useRef<Group>(null);
  const sR = useRef<Group>(null);
  const eR = useRef<Group>(null);
  const plan = useRef({ activity: "read" as Activity, until: 0 });

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const timer = useTimerStore.getState().timer;
    const p = plan.current;
    const working = timer.status === "running" && timer.phase === "focus";
    const onBreak = timer.phase !== "focus" && timer.status === "running";
    if (t > p.until || (onBreak && p.activity !== "stretch" && p.activity !== "read") || (working && (p.activity === "stretch" || p.activity === "read"))) {
      const r = Math.random();
      p.activity = onBreak ? (r < 0.5 ? "stretch" : "read") : working ? (r < 0.6 ? "type" : r < 0.85 ? "write" : "think") : "read";
      p.until = t + (p.activity === "stretch" ? 4 : 7 + Math.random() * 9);
    }
    const [l1, l2, r1, r2, lean, pitch] = POSES[p.activity];
    const k = reduced ? 1 : undefined;
    const go = (g: Group | null, x: number, lambda = 4) => g && (g.rotation.x = k ? x : damp(g.rotation.x, x, lambda, dt));
    const bob = reduced ? 0 : 1;
    const typing = p.activity === "type" ? bob : 0;
    const writing = p.activity === "write" ? bob : 0;
    go(sL.current, l1 + typing * Math.sin(t * 13) * 0.05);
    go(eL.current, l2 + typing * Math.sin(t * 11 + 1) * 0.08);
    go(sR.current, r1 + typing * Math.sin(t * 12 + 2) * 0.05);
    go(eR.current, r2 + typing * Math.sin(t * 14 + 3) * 0.08);
    if (sR.current) sR.current.rotation.z = k ? 0 : damp(sR.current.rotation.z, writing * Math.sin(t * 5) * 0.12, 8, dt);
    go(torso.current, lean + (reduced ? 0 : Math.sin(t * 0.9) * 0.012), 2);
    if (head.current) {
      go(head.current, pitch + (reduced ? 0 : Math.sin(t * 0.7) * 0.03), 3);
      head.current.rotation.y = reduced ? 0 : Math.sin(t * 0.23) * (p.activity === "think" ? 0.35 : 0.08);
    }
  });

  if (!visible) return null;
  const sweater = c.fabric;
  const [dx, , dz] = POSITIONS.buddyDesk;
  const [cx, , cz] = POSITIONS.buddyChair;

  return (
    <group {...bind}>
      {/* Their desk under the window, with a laptop, notebook and mug. */}
      <group position={[dx, 0, dz]}>
        <RoundedBox args={[1.15, 0.04, 0.55]} radius={0.01} position={[0, 0.73, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={c.wood} roughness={0.65} {...highlight(active, glow)} />
        </RoundedBox>
        {[-0.53, 0.53].map((x) =>
          [-0.23, 0.23].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.355, z]} castShadow>
              <boxGeometry args={[0.04, 0.71, 0.04]} />
              <meshStandardMaterial color={c.wood} roughness={0.7} />
            </mesh>
          )),
        )}
        <group position={[0.02, 0.75, 0.02]}>
          <mesh position={[0, 0.008, 0.06]} castShadow>
            <boxGeometry args={[0.34, 0.016, 0.23]} />
            <meshStandardMaterial color={c.metal} metalness={0.5} roughness={0.4} />
          </mesh>
          <group position={[0, 0.016, -0.055]} rotation-x={-0.25}>
            <mesh position={[0, 0.11, 0]} castShadow>
              <boxGeometry args={[0.34, 0.22, 0.01]} />
              <meshStandardMaterial color={c.metal} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.11, 0.006]}>
              <planeGeometry args={[0.31, 0.19]} />
              <meshBasicMaterial color={c.screenGlow} toneMapped={false} />
            </mesh>
          </group>
          <pointLight position={[0, 0.2, 0.25]} color={c.screenGlow} intensity={0.35} distance={1.4} decay={2} />
        </group>
        <mesh position={[0.36, 0.758, 0.1]} rotation-y={0.3} castShadow>
          <boxGeometry args={[0.16, 0.014, 0.22]} />
          <meshStandardMaterial color={c.paper} roughness={1} />
        </mesh>
        <mesh position={[-0.38, 0.8, 0.12]} castShadow>
          <cylinderGeometry args={[0.035, 0.032, 0.09, 18]} />
          <meshStandardMaterial color={c.decor} roughness={0.5} />
        </mesh>
      </group>

      {/* Chair and person, facing the desk. */}
      <group position={[cx, 0, cz]}>
        <Asset id="chair" />
        <group position={[0, 0.49, 0]}>
          {/* Legs */}
          {[-0.09, 0.09].map((x) => (
            <group key={x}>
              <mesh position={[x, 0.02, -0.17]} castShadow>
                <boxGeometry args={[0.13, 0.12, 0.36]} />
                <meshStandardMaterial color={FIXED.denim} roughness={0.9} />
              </mesh>
              <mesh position={[x, -0.22, -0.34]} castShadow>
                <boxGeometry args={[0.11, 0.46, 0.11]} />
                <meshStandardMaterial color={FIXED.denim} roughness={0.9} />
              </mesh>
            </group>
          ))}
          {/* Torso pivots at the hips so they can lean in or back. */}
          <group ref={torso}>
            <RoundedBox args={[0.38, 0.5, 0.22]} radius={0.08} position={[0, 0.27, 0]} castShadow>
              <meshStandardMaterial color={sweater} roughness={1} {...highlight(active, glow)} />
            </RoundedBox>
            <Arm side={-1} shoulder={sL} elbow={eL} sleeve={sweater} />
            <Arm side={1} shoulder={sR} elbow={eR} sleeve={sweater} />
            <group ref={head} position={[0, 0.56, 0]}>
              <mesh position={[0, 0.03, 0]}>
                <cylinderGeometry args={[0.045, 0.05, 0.08, 10]} />
                <meshStandardMaterial color={FIXED.skin} roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.15, 0]} castShadow>
                <sphereGeometry args={[0.105, 20, 16]} />
                <meshStandardMaterial color={FIXED.skin} roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.18, 0.025]} scale={[1.05, 1, 1.08]} castShadow>
                <sphereGeometry args={[0.108, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
                <meshStandardMaterial color={FIXED.hair} roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.25, 0.1]} castShadow>
                <sphereGeometry args={[0.05, 14, 12]} />
                <meshStandardMaterial color={FIXED.hair} roughness={0.9} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
