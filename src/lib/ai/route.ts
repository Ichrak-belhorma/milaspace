import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { AiError, AiErrorCode } from "./contracts";

const STATUS: Record<AiErrorCode, number> = { not_implemented: 501, unauthorized: 401, invalid_input: 400, rate_limited: 429, upstream: 502 };

export function aiError(error: AiErrorCode, message: string) {
  return NextResponse.json<AiError>({ error, message }, { status: STATUS[error] });
}

/** Shared guard for AI routes: valid JSON, valid input, signed-in user. */
export async function readAiRequest<S extends z.ZodType>(request: Request, schema: S): Promise<{ input: z.infer<S>; userId: string | null } | NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return aiError("invalid_input", "Send a JSON body.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return aiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.");
  if (!isSupabaseConfigured) return { input: parsed.data, userId: null };
  const supabase = await createSupabaseServer();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!data.user) return aiError("unauthorized", "Sign in to use AI features.");
  return { input: parsed.data, userId: data.user.id };
}
