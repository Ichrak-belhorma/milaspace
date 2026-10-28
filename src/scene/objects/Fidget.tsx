"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Group } from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useRoomStore } from "@/stores/room";
import { Asset } from "../assets/Asset";
import { POSITIONS } from "../layout";
import { useInteractable } from "../useInteractable";

const KICK = 14; // rad/s added per click
const MAX_SPIN = 70;
const FRICTION = 0.32; // per second, exponential

/** A spinner you can flick any time without leaving the room. Every click adds spin. */
export function Fidget() {
  const clicks = useRoomStore((s) => s.fidgetClicks);
  const reduced = useReducedMotion();
  const { active, bind } = useInteractable("fidget");
  const spinner = useRef<Group>(null);
  const velocity = useRef(0);
  const seen = useRef(clicks);

  useEffect(() => {
    if (clicks === seen.current) return;
    seen.current = clicks;
    if (reduced && spinner.current) {
      // Reduced motion: a single one-third turn per click instead of a long spin.
      spinner.current.rotation.y += (Math.PI * 2) / 3;
    } else {
      velocity.current = Math.min(MAX_SPIN, velocity.current + KICK);
    }
  }, [clicks, reduced]);

  useFrame((_, dt) => {
    if (!spinner.current || velocity.current < 0.02) return;
    spinner.current.rotation.y += velocity.current * dt;
    velocity.current *= Math.exp(-FRICTION * Math.min(dt, 0.1));
  });

  return (
    <group position={POSITIONS.fidget} {...bind}>
      <group ref={spinner}>
        <Asset id="fidget" highlight={active} />
      </group>
    </group>
  );
}
