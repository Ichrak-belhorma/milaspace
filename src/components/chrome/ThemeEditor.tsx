"use client";

import { useRef, useState } from "react";
import { ColorField, Section, Segmented, SelectField, Slider } from "@/components/glass/controls";
import { CheckIcon, DownloadIcon, PaletteIcon, TrashIcon, UploadIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useThemeStore } from "@/stores/theme";
import { useUiStore, type MotionPref } from "@/stores/ui";
import { contrastReport } from "@/theme/contrast";
import { CURSOR_LABELS } from "@/theme/cursors";
import { FONTS, FONT_IDS } from "@/theme/fonts";
import { exportTheme } from "@/theme/io";
import { ORNAMENT_LABELS } from "@/theme/ornaments";
import { PRESETS, getPreset } from "@/theme/presets";
import { BORDER_STYLES, CURSORS, ORNAMENTS, type RoomTheme, type Theme, type ThemeTokens } from "@/theme/schema";
import { SidePanel } from "./SidePanel";

const fontOptions = FONT_IDS.map((id) => ({ value: id, label: FONTS[id].label }));
const pct = (v: number) => `${Math.round(v * 100)}%`;

type ColorKey = { [K in keyof ThemeTokens]: ThemeTokens[K] extends string ? K : never }[keyof ThemeTokens];
type RoomColorKey = { [K in keyof RoomTheme]: RoomTheme[K] extends string ? K : never }[keyof RoomTheme];

const UI_COLORS: [ColorKey, string][] = [
  ["glassTint", "Glass tint"],
  ["text", "Text"],
  ["textMuted", "Secondary text"],
  ["accent", "Accent"],
  ["onAccent", "Text on accent"],
  ["accent2", "Second accent"],
  ["borderColor", "Border"],
  ["highlight", "Highlight"],
  ["glowColor", "Glow"],
  ["shadowColor", "Shadow"],
  ["ornamentColor", "Ornament"],
  ["background", "Page background"],
];

const ROOM_COLORS: [RoomColorKey, string][] = [
  ["wall", "Walls"],
  ["floor", "Floor"],
  ["wood", "Desk wood"],
  ["rug", "Rug"],
  ["fabric", "Bedding"],
  ["decor", "Décor"],
  ["metal", "Metal"],
  ["plant", "Plants"],
  ["paper", "Paper"],
  ["trim", "Window trim"],
  ["ambientColor", "Ambient light"],
  ["accentLight", "Accent light"],
  ["screenGlow", "Laptop glow"],
];

function Swatches({ theme }: { theme: Theme }) {
  const t = theme.tokens;
  return (
    <span className="flex gap-1" aria-hidden>
      {[t.glassTint, t.accent, t.text, theme.room.wall].map((c, i) => (
        <span key={i} className="h-4 w-4 rounded-full border border-ink/25" style={{ background: c }} />
      ))}
    </span>
  );
}

function ThemeCard({ theme, active, onSelect, onDelete }: { theme: Theme; active: boolean; onSelect: () => void; onDelete?: () => void }) {
  return (
    <li className="relative">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className="btn btn-soft w-full flex-col items-start gap-1.5 px-3 py-2 text-left"
        style={{ fontFamily: FONTS[theme.tokens.fontDisplay].stack }}
      >
        <span className="text-sm">{theme.name}</span>
        <Swatches theme={theme} />
      </button>
      {onDelete && (
        <button type="button" className="btn btn-icon absolute top-1 right-1 min-h-7 min-w-7 p-1" onClick={onDelete} aria-label={`Delete theme ${theme.name}`}>
          <TrashIcon size={14} />
        </button>
      )}
    </li>
  );
}

function ContrastSummary({ theme }: { theme: Theme }) {
  const report = contrastReport(theme);
  const failing = report.filter((c) => !c.pass);
  return (
    <div className={cn("well px-3 py-2 text-sm", failing.length > 0 && "ring-1 ring-accent")} role="status" aria-live="polite">
      {failing.length === 0 ? (
        <p className="flex items-center gap-2">
          <CheckIcon size={16} /> Readable: all text meets WCAG AA on this glass.
        </p>
      ) : (
        <>
          <p className="font-semibold">Some text may be hard to read:</p>
          <ul className="mt-1 list-disc pl-5">
            {failing.map((c) => (
              <li key={c.id}>
                {c.label}: {c.ratio}:1 (needs {c.min}:1)
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-ink-muted">Try more glass opacity, or a darker or lighter text color.</p>
        </>
      )}
    </div>
  );
}

function SaveControls() {
  const { active, dirty, save, saveAsNew, revert, importFromJson } = useThemeStore();
  const [name, setName] = useState("");
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isPreset = Boolean(getPreset(active.id));

  const doImport = (text: string) => {
    const r = importFromJson(text);
    setMessage(r.ok ? { kind: "ok", text: `Imported "${r.theme.name}".` } : { kind: "error", text: r.error });
    if (r.ok) {
      setPasting(false);
      setPasted("");
    }
  };

  const download = () => {
    const blob = new Blob([exportTheme(active)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.mila-theme.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex flex-col gap-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const saved = isPreset || name.trim() ? saveAsNew(name || `${active.name} (mine)`) : save();
          setMessage({ kind: "ok", text: `Saved "${saved.name}".` });
          setName("");
        }}
      >
        <label htmlFor="theme-name" className="sr-only">
          Theme name
        </label>
        <input
          id="theme-name"
          className="field"
          placeholder={isPreset ? "Name your theme" : "New name to save a copy (optional)"}
          maxLength={48}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-accent shrink-0" disabled={!dirty && !name.trim()}>
          Save
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-soft text-sm" onClick={revert} disabled={!dirty}>
          Undo changes
        </button>
        <button type="button" className="btn btn-soft text-sm" onClick={download}>
          <DownloadIcon size={16} /> Export
        </button>
        <button type="button" className="btn btn-soft text-sm" onClick={() => fileRef.current?.click()}>
          <UploadIcon size={16} /> Import file
        </button>
        <button type="button" className="btn btn-soft text-sm" onClick={() => setPasting((v) => !v)} aria-expanded={pasting}>
          Paste JSON
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) doImport(await file.text());
        }}
      />
      {pasting && (
        <div className="flex flex-col gap-2">
          <label htmlFor="theme-json" className="sr-only">
            Theme JSON
          </label>
          <textarea id="theme-json" className="field h-28 font-mono text-xs" value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder='{"name": "…", "tokens": {…}, "room": {…}}' />
          <button type="button" className="btn btn-accent text-sm" onClick={() => doImport(pasted)} disabled={!pasted.trim()}>
            Import pasted theme
          </button>
        </div>
      )}
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={cn("text-sm", message.kind === "error" && "font-semibold")}>
          {message.text}
        </p>
      )}
    </div>
  );
}

export function ThemeEditor() {
  const { active, custom, dirty, selectTheme, setTokens, setRoom, deleteCustom } = useThemeStore();
  const motion = useUiStore((s) => s.motion);
  const setMotion = useUiStore((s) => s.setMotion);
  const t = active.tokens;
  const r = active.room;

  return (
    <SidePanel title="Theme" icon={<PaletteIcon size={18} />}>
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="label mb-2">Presets</h3>
          <ul className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <ThemeCard key={p.id} theme={p} active={active.id === p.id && !dirty} onSelect={() => selectTheme(p.id)} />
            ))}
          </ul>
        </div>
        {custom.length > 0 && (
          <div>
            <h3 className="label mb-2">Your themes</h3>
            <ul className="grid grid-cols-2 gap-2">
              {custom.map((c) => (
                <ThemeCard key={c.id} theme={c} active={active.id === c.id && !dirty} onSelect={() => selectTheme(c.id)} onDelete={() => deleteCustom(c.id)} />
              ))}
            </ul>
          </div>
        )}

        <p className="text-sm text-ink-muted">
          Editing <span className="font-semibold text-ink">{active.name}</span>
          {dirty && " (unsaved changes)"}. Changes preview live.
        </p>
        <ContrastSummary theme={active} />

        <Section title="Colors">
          {UI_COLORS.map(([key, label]) => (
            <ColorField key={key} label={label} value={t[key]} onChange={(v) => setTokens({ [key]: v })} />
          ))}
        </Section>

        <Section title="Glass">
          <Slider label="Opacity" min={0.1} max={1} value={t.glassOpacity} format={pct} onChange={(v) => setTokens({ glassOpacity: v })} />
          <Slider label="Blur" min={0} max={40} step={1} value={t.glassBlur} format={(v) => `${v}px`} onChange={(v) => setTokens({ glassBlur: v })} />
          <Slider label="Saturation" min={50} max={250} step={5} value={t.glassSaturation} format={(v) => `${v}%`} onChange={(v) => setTokens({ glassSaturation: v })} />
          <Slider label="Highlight" value={t.highlightStrength} format={pct} onChange={(v) => setTokens({ highlightStrength: v })} />
          <Slider label="Glow" value={t.glowStrength} format={pct} onChange={(v) => setTokens({ glowStrength: v })} />
          <Slider label="Shadow" value={t.shadowStrength} format={pct} onChange={(v) => setTokens({ shadowStrength: v })} />
        </Section>

        <Section title="Shape & border">
          <Slider label="Corner radius" min={0} max={32} step={1} value={t.radius} format={(v) => `${v}px`} onChange={(v) => setTokens({ radius: v })} />
          <Slider label="Border width" min={0} max={4} step={0.5} value={t.borderWidth} format={(v) => `${v}px`} onChange={(v) => setTokens({ borderWidth: v })} />
          <Slider label="Border opacity" value={t.borderOpacity} format={pct} onChange={(v) => setTokens({ borderOpacity: v })} />
          <SelectField
            label="Border style"
            value={t.borderStyle}
            options={BORDER_STYLES.map((s) => ({ value: s, label: s[0]!.toUpperCase() + s.slice(1) }))}
            onChange={(v) => setTokens({ borderStyle: v })}
          />
        </Section>

        <Section title="Fonts">
          <SelectField label="Headings" value={t.fontDisplay} options={fontOptions} onChange={(v) => setTokens({ fontDisplay: v })} />
          <SelectField label="Body" value={t.fontBody} options={fontOptions} onChange={(v) => setTokens({ fontBody: v })} />
        </Section>

        <Section title="Edges & cursor">
          <span className="text-sm">Edge ornament</span>
          <Segmented label="Edge ornament" value={t.ornament} options={ORNAMENTS.map((o) => ({ value: o, label: ORNAMENT_LABELS[o] }))} onChange={(v) => setTokens({ ornament: v })} />
          <span className="text-sm">Cursor</span>
          <Segmented label="Cursor" value={t.cursor} options={CURSORS.map((c) => ({ value: c, label: CURSOR_LABELS[c] }))} onChange={(v) => setTokens({ cursor: v })} />
        </Section>

        <Section title="Room">
          {ROOM_COLORS.map(([key, label]) => (
            <ColorField key={key} label={label} value={r[key]} onChange={(v) => setRoom({ [key]: v })} />
          ))}
          <Slider label="Ambient brightness" min={0} max={3} value={r.ambientIntensity} format={(v) => v.toFixed(2)} onChange={(v) => setRoom({ ambientIntensity: v })} />
          <Slider label="Accent light" min={0} max={5} value={r.accentLightIntensity} format={(v) => v.toFixed(2)} onChange={(v) => setRoom({ accentLightIntensity: v })} />
        </Section>

        <Section title="Comfort">
          <span className="text-sm">Motion</span>
          <Segmented<MotionPref>
            label="Motion"
            value={motion}
            options={[
              { value: "system", label: "System" },
              { value: "reduce", label: "Reduced" },
              { value: "full", label: "Full" },
            ]}
            onChange={setMotion}
          />
          <p className="text-xs text-ink-muted">Reduced turns off camera parallax, particles and animations.</p>
        </Section>

        <div className="flex flex-col gap-2 pt-1">
          <h3 className="label">Save & share</h3>
          <SaveControls />
        </div>
      </div>
    </SidePanel>
  );
}
