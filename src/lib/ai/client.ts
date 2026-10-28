import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** Default model; override with MILA_AI_MODEL. */
export const DEFAULT_MODEL = "claude-opus-5-5";

export const aiModel = () => process.env.MILA_AI_MODEL?.trim() || DEFAULT_MODEL;
export const isAiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY?.trim());

let client: Anthropic | null = null;

/** Server-only client. Returns null when no key is set (the routes then answer 501). */
export function getAnthropic(): Anthropic | null {
  if (!isAiConfigured()) return null;
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 170_000 });
  return client;
}
