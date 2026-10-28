import { z } from "zod";
import { isPresetId } from "./presets";
import { THEME_SCHEMA_VERSION, themeSchema, type Theme } from "./schema";

export function newThemeId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Serialize a theme for sharing. */
export function exportTheme(theme: Theme): string {
  return JSON.stringify(theme, null, 2);
}

export type ImportResult = { ok: true; theme: Theme } | { ok: false; error: string };

/**
 * Parse and validate shared theme JSON. Imported themes always become custom themes:
 * they get a fresh id so they can never overwrite a preset or an existing theme.
 */
export function importTheme(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (raw && typeof raw === "object" && !("schema" in raw)) {
    raw = { ...raw, schema: THEME_SCHEMA_VERSION };
  }
  const parsed = themeSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join(".") || "theme";
    return { ok: false, error: `Not a Mila theme: ${where}: ${issue?.message ?? "invalid"}` };
  }
  const theme = parsed.data;
  return {
    ok: true,
    theme: { ...theme, id: newThemeId(), basedOn: theme.basedOn ?? (isPresetId(theme.id) ? theme.id : undefined) },
  };
}

/** Validate a stored theme, returning undefined when it is corrupt or from an unknown version. */
export function safeTheme(value: unknown): Theme | undefined {
  const parsed = themeSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export const themeListSchema = z.array(themeSchema);
