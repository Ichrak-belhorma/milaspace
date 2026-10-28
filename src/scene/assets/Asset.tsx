"use client";

import { useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo } from "react";
import { Color, Mesh, MeshStandardMaterial } from "three";
import { useHighlightColor } from "../materials";
import type { PlaceholderProps } from "./placeholders";
import { ASSETS, type AssetEntry, type AssetId } from "./registry";

/** Renders a registered asset: its placeholder today, its .glb once the registry points to one. */
export function Asset({ id, ...props }: { id: AssetId } & PlaceholderProps) {
  const entry: AssetEntry = ASSETS[id];
  if (entry.kind === "placeholder") {
    const Component = entry.component;
    return <Component {...props} />;
  }
  return (
    <Suspense fallback={null}>
      <GltfModel entry={entry} {...props} />
    </Suspense>
  );
}

function GltfModel({ entry, highlight }: { entry: Extract<AssetEntry, { kind: "gltf" }> } & PlaceholderProps) {
  const { scene } = useGLTF(entry.url);
  const glow = useHighlightColor();
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material instanceof MeshStandardMaterial) o.material = o.material.clone();
      }
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    const color = new Color(highlight ? glow : "#000000");
    model.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        o.material.emissive.copy(color);
        o.material.emissiveIntensity = highlight ? 0.35 : 0;
      }
    });
  }, [model, highlight, glow]);

  return <primitive object={model} scale={entry.scale ?? 1} position={entry.position} rotation={entry.rotation} />;
}
