"use client";

/**
 * Placeholder geometry for every model in the room. Each component is registered in
 * ./registry.ts; replacing one with a .glb is a registry change, not a scene change.
 * Animated parts (drawer box, laptop lid, window panes) are separate assets so their
 * parent objects can move them.
 */
import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import { DoubleSide, PlaneGeometry } from "three";
import { DESK, ROOM, WINDOW } from "../layout";
import { highlight, Rod, useHighlightColor, useRoomColors } from "../materials";
import { FIXED } from "../palette";
import { fabricTexture, planksTexture, wallpaperTexture } from "../textures";

export type PlaceholderProps = { highlight?: boolean };

/* ---------- Room shell ---------- */

export function RoomShell() {
  const c = useRoomColors();
  const planks = useMemo(() => {
    const t = planksTexture().clone();
    t.repeat.set(3, 3);
    t.needsUpdate = true;
    return t;
  }, []);
  const paper = useMemo(() => {
    const t = wallpaperTexture().clone();
    t.repeat.set(10, 5);
    t.needsUpdate = true;
    return t;
  }, []);
  const sidePaper = useMemo(() => {
    const t = wallpaperTexture().clone();
    t.repeat.set(10, 5);
    t.needsUpdate = true;
    return t;
  }, []);

  const { halfWidth: hw, backZ, frontZ, height: h, wallThickness: t } = ROOM;
  const wz = backZ - t / 2;
  const left = WINDOW.x - WINDOW.width / 2;
  const right = WINDOW.x + WINDOW.width / 2;
  const bottom = WINDOW.y - WINDOW.height / 2;
  const top = WINDOW.y + WINDOW.height / 2;
  const depth = frontZ - backZ;
  const wall = <meshStandardMaterial color={c.wall} map={paper} roughness={0.95} />;

  return (
    <group>
      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, backZ + depth / 2]} receiveShadow>
        <planeGeometry args={[hw * 2, depth]} />
        <meshStandardMaterial color={c.floor} map={planks} roughness={0.75} />
      </mesh>
      {/* Back wall, built around the window opening */}
      <mesh position={[(-hw + left) / 2, h / 2, wz]} receiveShadow>
        <boxGeometry args={[left + hw, h, t]} />
        {wall}
      </mesh>
      <mesh position={[(right + hw) / 2, h / 2, wz]} receiveShadow>
        <boxGeometry args={[hw - right, h, t]} />
        {wall}
      </mesh>
      <mesh position={[WINDOW.x, bottom / 2, wz]} receiveShadow>
        <boxGeometry args={[WINDOW.width, bottom, t]} />
        {wall}
      </mesh>
      <mesh position={[WINDOW.x, (top + h) / 2, wz]}>
        <boxGeometry args={[WINDOW.width, h - top, t]} />
        {wall}
      </mesh>
      {/* Side walls and ceiling */}
      <mesh position={[-hw, h / 2, backZ + depth / 2]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[depth, h]} />
        <meshStandardMaterial color={c.wall} map={sidePaper} roughness={0.95} />
      </mesh>
      <mesh position={[hw, h / 2, backZ + depth / 2]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[depth, h]} />
        <meshStandardMaterial color={c.wall} map={sidePaper} roughness={0.95} />
      </mesh>
      <mesh position={[0, h, backZ + depth / 2]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[hw * 2, depth]} />
        <meshStandardMaterial color={c.trim} roughness={1} />
      </mesh>
      {/* Baseboards */}
      <mesh position={[0, 0.05, backZ + 0.01]}>
        <boxGeometry args={[hw * 2, 0.1, 0.02]} />
        <meshStandardMaterial color={c.trim} roughness={0.6} />
      </mesh>
      <mesh position={[-hw + 0.01, 0.05, backZ + depth / 2]}>
        <boxGeometry args={[0.02, 0.1, depth]} />
        <meshStandardMaterial color={c.trim} roughness={0.6} />
      </mesh>
      <mesh position={[hw - 0.01, 0.05, backZ + depth / 2]}>
        <boxGeometry args={[0.02, 0.1, depth]} />
        <meshStandardMaterial color={c.trim} roughness={0.6} />
      </mesh>
    </group>
  );
}

/* ---------- Furniture ---------- */

export function Desk() {
  const c = useRoomColors();
  const { width: w, depth: d, topY, thickness: th } = DESK;
  const leg = (x: number, z: number) => (
    <mesh position={[x, (topY - th) / 2, z]} castShadow>
      <boxGeometry args={[0.05, topY - th, 0.05]} />
      <meshStandardMaterial color={c.wood} roughness={0.7} />
    </mesh>
  );
  return (
    <group position={[DESK.x, 0, DESK.z]}>
      <RoundedBox args={[w, th, d]} radius={0.012} position={[0, topY - th / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={c.wood} roughness={0.6} />
      </RoundedBox>
      {leg(-w / 2 + 0.05, -d / 2 + 0.05)}
      {leg(-w / 2 + 0.05, d / 2 - 0.05)}
    </group>
  );
}

const UNIT = { width: 0.5, height: 0.66, depth: 0.66, y0: 0.04 };
export const DRAWER_UNIT = UNIT;

export function DrawerBody() {
  const c = useRoomColors();
  const { width: w, height: h, depth: d, y0 } = UNIT;
  const panel = <meshStandardMaterial color={c.wood} roughness={0.65} />;
  return (
    <group>
      <mesh position={[-w / 2 + 0.01, y0 + h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.02, h, d]} />
        {panel}
      </mesh>
      <mesh position={[w / 2 - 0.01, y0 + h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.02, h, d]} />
        {panel}
      </mesh>
      <mesh position={[0, y0 + 0.01, 0]}>
        <boxGeometry args={[w, 0.02, d]} />
        {panel}
      </mesh>
      <mesh position={[0, y0 + h / 2, -d / 2 + 0.01]}>
        <boxGeometry args={[w, h, 0.02]} />
        {panel}
      </mesh>
      {/* The two fixed lower drawer fronts */}
      {[0.12, 0.32].map((y) => (
        <group key={y}>
          <mesh position={[0, y0 + y, d / 2 - 0.01]} castShadow>
            <boxGeometry args={[w - 0.04, 0.18, 0.02]} />
            {panel}
          </mesh>
          <mesh position={[0, y0 + y, d / 2 + 0.012]}>
            <sphereGeometry args={[0.013, 12, 12]} />
            <meshStandardMaterial color={c.metal} metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The top drawer: front panel, knob and an open tray. Slides along +z. */
export function DrawerBox({ highlight: hl }: PlaceholderProps) {
  const c = useRoomColors();
  const glow = useHighlightColor();
  const { width: w, depth: d, y0, height: h } = UNIT;
  const y = y0 + h - 0.1;
  const tray = <meshStandardMaterial color={c.wood} roughness={0.7} />;
  return (
    <group>
      <mesh position={[0, y, d / 2 - 0.01]} castShadow>
        <boxGeometry args={[w - 0.04, 0.16, 0.02]} />
        <meshStandardMaterial color={c.wood} roughness={0.6} {...highlight(hl, glow)} />
      </mesh>
      <mesh position={[0, y, d / 2 + 0.012]}>
        <sphereGeometry args={[0.014, 12, 12]} />
        <meshStandardMaterial color={c.metal} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, y - 0.06, 0.02]}>
        <boxGeometry args={[w - 0.08, 0.012, d - 0.06]} />
        {tray}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.045), y - 0.015, 0.02]}>
          <boxGeometry args={[0.012, 0.09, d - 0.06]} />
          {tray}
        </mesh>
      ))}
    </group>
  );
}

export function Bed() {
  const c = useRoomColors();
  const fabric = useMemo(() => {
    const t = fabricTexture().clone();
    t.repeat.set(4, 4);
    t.needsUpdate = true;
    return t;
  }, []);
  return (
    <group>
      <RoundedBox args={[1.3, 0.28, 1.9]} radius={0.03} position={[0, 0.14, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={c.wood} roughness={0.7} />
      </RoundedBox>
      <RoundedBox args={[1.25, 0.18, 1.85]} radius={0.06} position={[0, 0.36, 0]} receiveShadow>
        <meshStandardMaterial color={c.paper} roughness={0.95} />
      </RoundedBox>
      <RoundedBox args={[1.32, 0.12, 1.25]} radius={0.05} position={[0, 0.42, 0.33]} castShadow receiveShadow>
        <meshStandardMaterial color={c.fabric} map={fabric} roughness={1} />
      </RoundedBox>
      <RoundedBox args={[0.9, 0.12, 0.32]} radius={0.06} position={[0, 0.5, -0.7]} rotation-x={-0.25} castShadow>
        <meshStandardMaterial color={c.paper} roughness={1} />
      </RoundedBox>
      <RoundedBox args={[1.3, 0.75, 0.06]} radius={0.02} position={[0, 0.58, -0.94]} castShadow>
        <meshStandardMaterial color={c.wood} roughness={0.7} />
      </RoundedBox>
    </group>
  );
}

export function Shelf() {
  const c = useRoomColors();
  const books = [c.decor, c.fabric, c.plant, c.rug, c.decor, c.paper];
  return (
    <group>
      <mesh position={[0, 0, 0.11]} castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.03, 0.2]} />
        <meshStandardMaterial color={c.wood} roughness={0.7} />
      </mesh>
      {[-0.32, 0.32].map((x) => (
        <Rod key={x} from={[x, -0.01, 0.01]} to={[x, -0.01, 0.18]} radius={0.008}>
          <meshStandardMaterial color={c.metal} metalness={0.6} roughness={0.35} />
        </Rod>
      ))}
      {books.map((color, i) => {
        const h = 0.17 + ((i * 37) % 5) * 0.012;
        return (
          <mesh key={i} position={[-0.35 + i * 0.045, 0.015 + h / 2, 0.11]} rotation-z={i === 5 ? -0.25 : 0} castShadow>
            <boxGeometry args={[0.038, h, 0.14]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

export function Candle({ lit }: { lit: number }) {
  const c = useRoomColors();
  return (
    <group>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.1, 16]} />
        <meshStandardMaterial color={c.paper} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.118, 0]} scale={[1, 1.8, 1]}>
        <sphereGeometry args={[0.009, 10, 10]} />
        <meshStandardMaterial color={c.accentLight} emissive={c.accentLight} emissiveIntensity={lit * 2.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Plant() {
  const c = useRoomColors();
  const leaves: [number, number, number, number][] = [
    [0, 0.62, 0, 0.2],
    [0.12, 0.52, 0.06, 0.15],
    [-0.11, 0.5, -0.04, 0.16],
    [0.02, 0.78, 0.05, 0.13],
    [-0.06, 0.68, 0.1, 0.12],
  ];
  return (
    <group>
      <mesh position={[0, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.34, 20]} />
        <meshStandardMaterial color={c.decor} roughness={0.8} />
      </mesh>
      {leaves.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color={c.plant} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

export function Rug() {
  const c = useRoomColors();
  return (
    <group rotation-x={-Math.PI / 2}>
      <mesh scale={[1, 0.68, 1]} receiveShadow>
        <circleGeometry args={[1.25, 48]} />
        <meshStandardMaterial color={c.rug} roughness={1} />
      </mesh>
      <mesh scale={[1, 0.68, 1]} position={[0, 0, 0.002]} receiveShadow>
        <ringGeometry args={[1.02, 1.08, 48]} />
        <meshStandardMaterial color={c.paper} roughness={1} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/* ---------- Desk objects ---------- */

/** Lamp body in local space: base at the origin; the bulb sits at LAMP_BULB. */
export const LAMP_BULB: [number, number, number] = [0.17, 0.36, 0.1];

export function LampBody({ highlight: hl }: PlaceholderProps) {
  const c = useRoomColors();
  const glow = useHighlightColor();
  const metal = <meshStandardMaterial color={c.metal} metalness={0.6} roughness={0.35} {...highlight(hl, glow)} />;
  return (
    <group>
      <mesh position={[0, 0.012, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.09, 0.024, 24]} />
        {metal}
      </mesh>
      <Rod from={[0, 0.02, 0]} to={[0.02, 0.32, -0.05]} radius={0.009}>
        {metal}
      </Rod>
      <Rod from={[0.02, 0.32, -0.05]} to={[0.15, 0.41, 0.07]} radius={0.008}>
        {metal}
      </Rod>
      <mesh position={[0.02, 0.32, -0.05]}>
        <sphereGeometry args={[0.014, 12, 12]} />
        {metal}
      </mesh>
      <mesh position={[0.17, 0.39, 0.1]} rotation={[0.55, 0, -0.45]} castShadow>
        <coneGeometry args={[0.07, 0.11, 24, 1, true]} />
        <meshStandardMaterial color={c.decor} roughness={0.5} side={DoubleSide} {...highlight(hl, glow)} />
      </mesh>
    </group>
  );
}

export const LAPTOP = { width: 0.38, depth: 0.26, baseH: 0.016, lidH: 0.01, openAngle: -1.82 };

export function LaptopBase({ highlight: hl }: PlaceholderProps) {
  const c = useRoomColors();
  const glow = useHighlightColor();
  const { width: w, depth: d, baseH } = LAPTOP;
  return (
    <group>
      <RoundedBox args={[w, baseH, d]} radius={0.006} position={[0, baseH / 2, 0]} castShadow>
        <meshStandardMaterial color={c.metal} metalness={0.5} roughness={0.4} {...highlight(hl, glow)} />
      </RoundedBox>
      <mesh position={[0, baseH + 0.0005, -0.02]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[w - 0.04, d * 0.45]} />
        <meshStandardMaterial color={FIXED.keyboard} roughness={0.8} />
      </mesh>
      <mesh position={[0, baseH + 0.0005, d * 0.3]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.1, 0.06]} />
        <meshStandardMaterial color={FIXED.keyboard} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Lid modeled closed (lying along +z from the hinge); the Laptop object rotates it open. */
export function LaptopLid({ highlight: hl }: PlaceholderProps) {
  const c = useRoomColors();
  const glow = useHighlightColor();
  const { width: w, depth: d, lidH } = LAPTOP;
  return (
    <group>
      <RoundedBox args={[w, lidH, d]} radius={0.004} position={[0, lidH / 2, d / 2]} castShadow>
        <meshStandardMaterial color={c.metal} metalness={0.5} roughness={0.4} {...highlight(hl, glow)} />
      </RoundedBox>
      <mesh position={[0, -0.0005, d / 2]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[w - 0.008, d - 0.008]} />
        <meshStandardMaterial color={FIXED.bezel} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function NotebookModel({ highlight: hl }: PlaceholderProps) {
  const c = useRoomColors();
  const glow = useHighlightColor();
  return (
    <group>
      <RoundedBox args={[0.2, 0.022, 0.27]} radius={0.004} position={[0, 0.011, 0]} castShadow>
        <meshStandardMaterial color={c.decor} roughness={0.7} {...highlight(hl, glow)} />
      </RoundedBox>
      <mesh position={[0.004, 0.011, 0]}>
        <boxGeometry args={[0.196, 0.016, 0.262]} />
        <meshStandardMaterial color={c.paper} roughness={1} />
      </mesh>
      <mesh position={[0.07, 0.0115, 0]}>
        <boxGeometry args={[0.012, 0.0235, 0.272]} />
        <meshStandardMaterial color={c.metal} roughness={0.6} />
      </mesh>
      <Rod from={[0.125, 0.008, -0.1]} to={[0.13, 0.008, 0.1]} radius={0.006}>
        <meshStandardMaterial color={c.metal} metalness={0.5} roughness={0.4} />
      </Rod>
    </group>
  );
}

export function MugModel({ highlight: hl }: PlaceholderProps) {
  const c = useRoomColors();
  const glow = useHighlightColor();
  return (
    <group>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.042, 0.038, 0.1, 24, 1, true]} />
        <meshStandardMaterial color={c.decor} roughness={0.4} side={DoubleSide} {...highlight(hl, glow)} />
      </mesh>
      <mesh position={[0, 0.002, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.004, 24]} />
        <meshStandardMaterial color={c.decor} roughness={0.4} />
      </mesh>
      <mesh position={[0.048, 0.052, 0]} rotation-z={Math.PI / 2}>
        <torusGeometry args={[0.024, 0.006, 8, 20, Math.PI]} />
        <meshStandardMaterial color={c.decor} roughness={0.4} {...highlight(hl, glow)} />
      </mesh>
    </group>
  );
}

export function Coaster({ highlight: hl }: PlaceholderProps) {
  const c = useRoomColors();
  const glow = useHighlightColor();
  return (
    <mesh position={[0, 0.003, 0]} receiveShadow>
      <cylinderGeometry args={[0.055, 0.055, 0.006, 28]} />
      <meshStandardMaterial color={c.rug} roughness={0.95} {...highlight(hl, glow)} />
    </mesh>
  );
}

export function FidgetModel({ highlight: hl }: PlaceholderProps) {
  const c = useRoomColors();
  const glow = useHighlightColor();
  const body = <meshStandardMaterial color={c.decor} roughness={0.35} metalness={0.2} {...highlight(hl, glow)} />;
  return (
    <group position={[0, 0.008, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.012, 20]} />
        {body}
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        const x = Math.cos(a) * 0.036;
        const z = Math.sin(a) * 0.036;
        return (
          <group key={i}>
            <mesh position={[x, 0, z]} castShadow>
              <cylinderGeometry args={[0.019, 0.019, 0.01, 20]} />
              {body}
            </mesh>
            <mesh position={[x, 0.0055, z]}>
              <cylinderGeometry args={[0.009, 0.009, 0.002, 16]} />
              <meshStandardMaterial color={c.metal} metalness={0.8} roughness={0.25} />
            </mesh>
            <mesh position={[x / 2, 0, z / 2]} rotation-y={-a}>
              <boxGeometry args={[0.036, 0.008, 0.016]} />
              {body}
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 0.0075, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.003, 16]} />
        <meshStandardMaterial color={c.metal} metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
}

export function Flashcards({ highlight: hl }: PlaceholderProps) {
  const c = useRoomColors();
  const glow = useHighlightColor();
  return (
    <group>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, 0.002 + i * 0.003, 0]} rotation-y={(i - 2) * 0.06} castShadow>
          <boxGeometry args={[0.12, 0.0025, 0.075]} />
          <meshStandardMaterial color={i === 4 ? c.paper : c.trim} roughness={1} {...highlight(hl, glow)} />
        </mesh>
      ))}
      <mesh position={[0, 0.0155, -0.012]} rotation-x={-Math.PI / 2} rotation-z={0.12}>
        <planeGeometry args={[0.08, 0.004]} />
        <meshStandardMaterial color={c.decor} />
      </mesh>
    </group>
  );
}

export function SmallNotebook({ highlight: hl }: PlaceholderProps) {
  const c = useRoomColors();
  const glow = useHighlightColor();
  return (
    <RoundedBox args={[0.11, 0.014, 0.15]} radius={0.003} position={[0, 0.007, 0]} castShadow>
      <meshStandardMaterial color={c.plant} roughness={0.8} {...highlight(hl, glow)} />
    </RoundedBox>
  );
}

/* ---------- Window ---------- */

export function WindowFrame({ highlight: hl }: PlaceholderProps) {
  const c = useRoomColors();
  const glow = useHighlightColor();
  const { width: w, height: h } = WINDOW;
  const trim = <meshStandardMaterial color={c.trim} roughness={0.6} {...highlight(hl, glow)} />;
  const f = 0.06;
  return (
    <group>
      <mesh position={[0, h / 2 + f / 2, 0]} castShadow>
        <boxGeometry args={[w + f * 2, f, 0.14]} />
        {trim}
      </mesh>
      <mesh position={[-w / 2 - f / 2, 0, 0]}>
        <boxGeometry args={[f, h, 0.14]} />
        {trim}
      </mesh>
      <mesh position={[w / 2 + f / 2, 0, 0]}>
        <boxGeometry args={[f, h, 0.14]} />
        {trim}
      </mesh>
      {/* Sill */}
      <mesh position={[0, -h / 2 - 0.02, 0.06]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.2, 0.04, 0.24]} />
        {trim}
      </mesh>
    </group>
  );
}

/** One casement pane, modeled with its hinge at x=0 and extending along +x by `width`. */
export function WindowPane({ highlight: hl, width = WINDOW.width / 2 }: PlaceholderProps & { width?: number }) {
  const c = useRoomColors();
  const glow = useHighlightColor();
  const h = WINDOW.height;
  const bar = 0.035;
  const trim = <meshStandardMaterial color={c.trim} roughness={0.6} {...highlight(hl, glow)} />;
  return (
    <group>
      {[bar / 2, width - bar / 2].map((x) => (
        <mesh key={x} position={[x, 0, 0]} castShadow>
          <boxGeometry args={[bar, h, 0.04]} />
          {trim}
        </mesh>
      ))}
      {[-h / 2 + bar / 2, 0, h / 2 - bar / 2].map((y) => (
        <mesh key={y} position={[width / 2, y, 0]}>
          <boxGeometry args={[width, bar, 0.04]} />
          {trim}
        </mesh>
      ))}
      <mesh position={[width / 2, 0, 0]}>
        <planeGeometry args={[width - bar, h - bar]} />
        <meshStandardMaterial color={FIXED.glass} transparent opacity={0.12} roughness={0.05} depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}

function wavyPlane(width: number, height: number): PlaneGeometry {
  const g = new PlaneGeometry(width, height, 16, 1);
  const pos = g.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, Math.sin((x / width) * Math.PI * 6) * 0.018);
  }
  g.computeVertexNormals();
  return g;
}

export function Curtains() {
  const c = useRoomColors();
  const geometry = useMemo(() => wavyPlane(0.32, 1.65), []);
  const { width: w, height: h } = WINDOW;
  const fabric = useMemo(() => {
    const t = fabricTexture().clone();
    t.repeat.set(2, 6);
    t.needsUpdate = true;
    return t;
  }, []);
  return (
    <group position={[0, 0, 0.12]}>
      <Rod from={[-w / 2 - 0.35, h / 2 + 0.16, 0]} to={[w / 2 + 0.35, h / 2 + 0.16, 0]} radius={0.012}>
        <meshStandardMaterial color={c.metal} metalness={0.6} roughness={0.35} />
      </Rod>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={geometry} position={[s * (w / 2 + 0.17), h / 2 + 0.16 - 0.825, 0]} castShadow>
          <meshStandardMaterial color={c.fabric} map={fabric} roughness={1} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
