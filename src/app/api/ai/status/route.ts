import { NextResponse } from "next/server";
import type { AiStatus } from "@/lib/ai/contracts";
import { isAiConfigured } from "@/lib/ai/client";

/** Lets the UI enable AI buttons only when the server has a key. */
export function GET() {
  return NextResponse.json<AiStatus>({ enabled: isAiConfigured() });
}
