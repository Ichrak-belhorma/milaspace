import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { NextResponse } from "next/server";
import type { z } from "zod";
import { aiModel, getAnthropic } from "./client";
import { createRateLimiter } from "./rateLimit";
import { aiError } from "./route";

const limiter = createRateLimiter(12, 60 * 60_000);

/** Per user (or IP when accounts are off): 12 AI requests an hour. */
export function checkRateLimit(request: Request, userId: string | null): NextResponse | null {
  const key = userId ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const wait = limiter.take(key);
  if (!wait) return null;
  return aiError("rate_limited", `That's a lot of AI for one hour. Try again in ${Math.ceil(wait / 60_000)} min.`);
}

/**
 * One structured-output call. Returns the parsed model output or a gentle, typed error response.
 * Refusals fall back server-side to another model ("default" routing) before giving up.
 */
export async function structuredCall<S extends z.ZodType>(opts: {
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  schema: S;
  maxTokens: number;
}): Promise<{ output: z.infer<S> } | NextResponse> {
  const client = getAnthropic();
  if (!client) return aiError("not_configured", "AI isn't switched on for this Mila yet. Add ANTHROPIC_API_KEY on the server.");
  try {
    const response = await client.beta.messages.parse({
      model: aiModel(),
      max_tokens: opts.maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(opts.schema) },
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: opts.content }],
    });
    if (response.stop_reason === "refusal") return aiError("upstream", "The AI couldn't help with this document. Try pasting the outline instead.");
    if (response.stop_reason === "max_tokens") return aiError("upstream", "That was too long to finish in one go. Try a shorter document or fewer cards.");
    if (!response.parsed_output) return aiError("upstream", "The AI's answer came back malformed. Please try again.");
    return { output: response.parsed_output as z.infer<S> };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return aiError("rate_limited", "The AI is busy right now. Try again in a minute.");
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      console.error("[ai] credentials rejected", error.status);
      return aiError("not_configured", "The server's AI key was rejected. Check ANTHROPIC_API_KEY.");
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error("[ai] bad request", error.message);
      return aiError("invalid_input", "The AI couldn't read that. If it's a PDF, check it isn't password-protected or over 100 pages.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error("[ai] upstream error", error.status, error.message);
      return aiError("upstream", "The AI service had a hiccup. Please try again.");
    }
    console.error("[ai] request failed", error);
    return aiError("upstream", "Couldn't reach the AI service. Please try again.");
  }
}
