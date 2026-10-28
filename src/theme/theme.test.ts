import { describe, expect, it } from "vitest";
import { composite, contrastRatio } from "./color";
import { contrastReport } from "./contrast";
import { cssVarsToRule, themeToCssVars } from "./cssVars";
import { exportTheme, importTheme } from "./io";
import { ORNAMENT_MASKS } from "./ornaments";
import { PRESETS, getPreset } from "./presets";
import { themeSchema } from "./schema";

describe("color math", () => {
  it("computes WCAG contrast ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("composites translucent glass over a backdrop", () => {
    expect(composite("#ffffff", 0.5, "#000000")).toBe("#808080");
    expect(composite("#123456", 1, "#ffffff")).toBe("#123456");
  });
});

describe("presets", () => {
  it("ships the four presets with unique ids", () => {
    expect(PRESETS.map((p) => p.id)).toEqual(["gothic-glass", "frutiger-aero", "cottagecore", "minimal-calm"]);
  });

  it.each(PRESETS.map((p) => [p.name, p] as const))("%s validates against the theme schema", (_name, preset) => {
    expect(themeSchema.safeParse(preset).success).toBe(true);
  });

  it.each(PRESETS.map((p) => [p.name, p] as const))("%s meets WCAG AA contrast on glass", (_name, preset) => {
    const failures = contrastReport(preset).filter((c) => !c.pass);
    expect(failures).toEqual([]);
  });

  it("each ornamented preset has a mask", () => {
    for (const p of PRESETS) {
      if (p.tokens.ornament !== "none") expect(ORNAMENT_MASKS[p.tokens.ornament].bottom).toMatch(/^url\("data:image\/svg\+xml,/);
    }
  });
});

describe("CSS variables", () => {
  it("maps every token to a CSS custom property", () => {
    const vars = themeToCssVars(getPreset("gothic-glass")!);
    expect(vars["--mila-glass-blur"]).toBe("18px");
    expect(vars["--mila-font-display"]).toContain("Cinzel");
    expect(vars["--mila-cursor"]).toMatch(/^url\(/);
    expect(vars["color-scheme"]).toBe("dark");
    expect(themeToCssVars(getPreset("minimal-calm")!)["color-scheme"]).toBe("light");
  });

  it("produces a :root rule without unescaped quotes breaking the declaration", () => {
    const rule = cssVarsToRule(themeToCssVars(getPreset("frutiger-aero")!));
    expect(rule.startsWith(":root{")).toBe(true);
    expect(rule.endsWith("}")).toBe(true);
  });

  it("flags a low-contrast custom theme", () => {
    const base = getPreset("minimal-calm")!;
    const bad = { ...base, tokens: { ...base.tokens, textMuted: "#c8c8c8" } };
    const muted = contrastReport(bad).find((c) => c.id === "muted");
    expect(muted?.pass).toBe(false);
  });
});

describe("theme import/export", () => {
  it("round-trips a preset into a new custom theme", () => {
    const preset = getPreset("cottagecore")!;
    const result = importTheme(exportTheme(preset));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.theme.id).not.toBe(preset.id);
    expect(result.theme.basedOn).toBe("cottagecore");
    expect(result.theme.tokens).toEqual(preset.tokens);
  });

  it("rejects invalid JSON and wrong shapes with a readable error", () => {
    expect(importTheme("{nope")).toEqual({ ok: false, error: "That file isn't valid JSON." });
    const wrong = importTheme(JSON.stringify({ name: "x", tokens: { text: "red" } }));
    expect(wrong.ok).toBe(false);
  });

  it("rejects colors that are not #rrggbb", () => {
    const preset = getPreset("gothic-glass")!;
    const tampered = { ...preset, tokens: { ...preset.tokens, accent: "javascript:alert(1)" } };
    expect(importTheme(JSON.stringify(tampered)).ok).toBe(false);
  });
});
