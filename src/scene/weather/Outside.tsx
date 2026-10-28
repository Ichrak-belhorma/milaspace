"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, Color, LineSegments, Mesh, PlaneGeometry, Points } from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { Weather } from "@/stores/room";
import { WEATHER_LOOK } from "../palette";

/** Sky gradient via vertex colors (color-managed like any other material), eased between weathers. */
function Sky({ weather }: { weather: Weather }) {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(26, 14, 1, 12);
    g.setAttribute("color", new BufferAttribute(new Float32Array(g.attributes.position!.count * 3), 3));
    return g;
  }, []);
  const mesh = useRef<Mesh>(null);
  const colors = useRef({
    top: new Color(WEATHER_LOOK[weather].skyTop),
    bottom: new Color(WEATHER_LOOK[weather].skyBottom),
    goal: new Color(),
    mixed: new Color(),
  });
  const reduced = useReducedMotion();

  useFrame((_, dt) => {
    const g = mesh.current?.geometry;
    if (!g) return;
    const c = colors.current;
    const look = WEATHER_LOOK[weather];
    const k = reduced ? 1 : 1 - Math.exp(-2.5 * Math.min(dt, 0.1));
    c.top.lerp(c.goal.set(look.skyTop), k);
    c.bottom.lerp(c.goal.set(look.skyBottom), k);
    const pos = g.attributes.position!;
    const col = g.attributes.color as BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const v = (pos.getY(i) + 7) / 14; // 0 at the bottom edge, 1 at the top
      c.mixed.copy(c.bottom).lerp(c.top, v * v * (3 - 2 * v));
      col.setXYZ(i, c.mixed.r, c.mixed.g, c.mixed.b);
    }
    col.needsUpdate = true;
  });

  return (
    <mesh ref={mesh} geometry={geometry} position={[-4, 3, -14]}>
      <meshBasicMaterial vertexColors toneMapped={false} />
    </mesh>
  );
}

function Hills({ weather }: { weather: Weather }) {
  const look = WEATHER_LOOK[weather];
  const trees: [number, number, number][] = [
    [-6.2, -7.5, 1.3],
    [-5.1, -9.5, 1.6],
    [-3.9, -6.8, 1.1],
    [-2.8, -10.5, 1.8],
    [-7.4, -11, 1.9],
    [-4.6, -12, 1.5],
    [-1.6, -8.5, 1.2],
  ];
  return (
    <group>
      <mesh position={[-4, -6.2, -13]} scale={[1.6, 1, 1]}>
        <sphereGeometry args={[7.2, 32, 16]} />
        <meshBasicMaterial color={look.hills} />
      </mesh>
      <mesh position={[2, -6.6, -11]} scale={[1.4, 1, 1]}>
        <sphereGeometry args={[6.8, 32, 16]} />
        <meshBasicMaterial color={look.hills} />
      </mesh>
      {trees.map(([x, z, h], i) => (
        <mesh key={i} position={[x, -0.2 + h / 2, z]}>
          <coneGeometry args={[h * 0.32, h, 8]} />
          <meshBasicMaterial color={look.trees} />
        </mesh>
      ))}
      {look.orb && (
        <mesh position={look.orb.position}>
          <circleGeometry args={[look.orb.size, 32]} />
          <meshBasicMaterial color={look.orb.color} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/** Volume just outside the window where precipitation is drawn. */
const BOX = { x0: -3.2, x1: -0.4, y0: 0.4, y1: 3.2, z0: -4.6, z1: -2.35 };

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function Rain() {
  const reduced = useReducedMotion();
  const count = 260;
  const { geometry, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 6);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = rand(BOX.x0, BOX.x1);
      const y = rand(BOX.y0, BOX.y1);
      const z = rand(BOX.z0, BOX.z1);
      positions.set([x, y, z, x + 0.015, y + 0.13, z], i * 6);
      speeds[i] = rand(4.5, 6.5);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    return { geometry: g, speeds };
  }, []);

  const lines = useRef<LineSegments>(null);
  useFrame((_, dt) => {
    if (reduced || !lines.current) return;
    const p = lines.current.geometry.attributes.position as BufferAttribute;
    const a = p.array as Float32Array;
    const step = Math.min(dt, 0.1);
    for (let i = 0; i < count; i++) {
      const o = i * 6;
      const dy = speeds[i]! * step;
      a[o + 1]! -= dy;
      a[o + 4]! -= dy;
      a[o]! -= dy * 0.11;
      a[o + 3]! -= dy * 0.11;
      if (a[o + 4]! < BOX.y0) {
        const x = rand(BOX.x0, BOX.x1);
        a[o] = x;
        a[o + 3] = x + 0.015;
        a[o + 1] = BOX.y1;
        a[o + 4] = BOX.y1 + 0.13;
      }
    }
    p.needsUpdate = true;
  });

  return (
    <lineSegments ref={lines} geometry={geometry}>
      <lineBasicMaterial color="#c9d6e2" transparent opacity={0.55} />
    </lineSegments>
  );
}

function Snow() {
  const reduced = useReducedMotion();
  const count = 280;
  const { geometry, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions.set([rand(BOX.x0, BOX.x1), rand(BOX.y0, BOX.y1), rand(BOX.z0, BOX.z1)], i * 3);
      seeds[i] = Math.random() * 10;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    return { geometry: g, seeds };
  }, []);

  const points = useRef<Points>(null);
  useFrame(({ clock }, dt) => {
    if (reduced || !points.current) return;
    const p = points.current.geometry.attributes.position as BufferAttribute;
    const a = p.array as Float32Array;
    const t = clock.elapsedTime;
    const step = Math.min(dt, 0.1);
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      const s = seeds[i]!;
      a[o + 1]! -= (0.25 + (s % 1) * 0.3) * step;
      a[o]! += Math.sin(t * 0.8 + s) * 0.12 * step;
      if (a[o + 1]! < BOX.y0) {
        a[o] = rand(BOX.x0, BOX.x1);
        a[o + 1] = BOX.y1;
      }
    }
    p.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color="#ffffff" size={0.03} sizeAttenuation transparent opacity={0.9} depthWrite={false} />
    </points>
  );
}

function Stars() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(160 * 3);
    for (let i = 0; i < 160; i++) positions.set([rand(-10, 1), rand(1.2, 7), -13.8], i * 3);
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(positions, 3));
    return g;
  }, []);
  return (
    <points geometry={geometry}>
      <pointsMaterial color="#fffbe8" size={2} sizeAttenuation={false} transparent opacity={0.85} toneMapped={false} />
    </points>
  );
}

/** Everything seen through the window. Unlit materials, so it costs almost nothing. */
export function Outside({ weather }: { weather: Weather }) {
  return (
    <group>
      <Sky weather={weather} />
      <Hills weather={weather} />
      {weather === "rain" && <Rain />}
      {weather === "snow" && <Snow />}
      {weather === "night" && <Stars />}
    </group>
  );
}
