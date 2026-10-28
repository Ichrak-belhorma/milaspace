"use client";

import { Fragment, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useThemeStore } from "@/stores/theme";
import { ORNAMENT_MASKS } from "@/theme/ornaments";
import type { Ornament } from "@/theme/schema";

type Edge = "top" | "bottom";
type Tag = "div" | "nav" | "section" | "aside" | "header" | "footer";

export type GlassSurfaceProps = HTMLAttributes<HTMLElement> & {
  /** Edge ornament. "theme" (default) uses the active theme's ornament token. */
  ornament?: Ornament | "theme";
  /** Which edges carry the ornament. */
  edges?: Edge[];
  /** Scales the ornament strip height (1 = 26px). */
  ornamentScale?: number;
  as?: Tag;
  contentClassName?: string;
  children?: ReactNode;
};

const ORNAMENT_HEIGHT = 26;

/**
 * The single glass primitive: translucent blurred body, inner highlight, shadow/glow, and an
 * optional ornamental edge that feathers into the body. Everything visual comes from theme tokens.
 */
export function GlassSurface({
  ornament = "theme",
  edges = ["bottom"],
  ornamentScale = 1,
  as: Component = "div",
  className,
  contentClassName,
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const themeOrnament = useThemeStore((s) => s.active.tokens.ornament);
  const radius = useThemeStore((s) => s.active.tokens.radius);
  const kind = ornament === "theme" ? themeOrnament : ornament;
  const mask = kind === "none" ? null : ORNAMENT_MASKS[kind];
  const activeEdges = mask ? edges : [];

  const vars = {
    ...style,
    "--orn-h": `${Math.round(ORNAMENT_HEIGHT * ornamentScale)}px`,
    // Keep ornaments clear of rounded corners.
    "--orn-inset": `${Math.round(radius * 0.7)}px`,
  } as CSSProperties;

  return (
    <Component
      className={cn("glass", className)}
      data-edge-top={activeEdges.includes("top") || undefined}
      data-edge-bottom={activeEdges.includes("bottom") || undefined}
      style={vars}
      {...rest}
    >
      <div className="glass__shadow" aria-hidden />
      <div className="glass__body" aria-hidden />
      {mask &&
        activeEdges.map((edge) => (
          <Fragment key={edge}>
            <div className={`glass__seam glass__seam--${edge}`} aria-hidden />
            <div className={`glass__orn glass__orn--${edge}`} style={{ "--orn-mask": mask[edge] } as CSSProperties} aria-hidden />
          </Fragment>
        ))}
      <div className={cn("glass__content", contentClassName)}>{children}</div>
    </Component>
  );
}
