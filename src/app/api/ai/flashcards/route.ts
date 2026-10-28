import { NextResponse } from "next/server";
import { flashcardsRequest } from "@/lib/ai/contracts";
import { aiError, readAiRequest } from "@/lib/ai/route";

/** Course material → flashcards. Validated today; the model call is not wired yet. */
export async function POST(request: Request) {
  const req = await readAiRequest(request, flashcardsRequest);
  if (req instanceof NextResponse) return req;
  return aiError("not_implemented", "AI flashcard generation is coming soon. Write cards by hand for now.");
}
