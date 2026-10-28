import { NextResponse } from "next/server";
import { checkRateLimit, structuredCall } from "@/lib/ai/call";
import { flashcardsRequest } from "@/lib/ai/contracts";
import { flashcardsModelOutput, toFlashcards } from "@/lib/ai/normalize";
import { FLASHCARDS_SYSTEM, flashcardsUserText } from "@/lib/ai/prompts";
import { aiError, readAiRequest } from "@/lib/ai/route";

export const maxDuration = 120;

/** Course material → flashcards. */
export async function POST(request: Request) {
  const req = await readAiRequest(request, flashcardsRequest);
  if (req instanceof NextResponse) return req;
  const limited = checkRateLimit(request, req.userId);
  if (limited) return limited;

  const { input } = req;
  const result = await structuredCall({
    system: FLASHCARDS_SYSTEM,
    schema: flashcardsModelOutput,
    maxTokens: 8000,
    content: [{ type: "text", text: flashcardsUserText(input) }],
  });
  if (result instanceof NextResponse) return result;
  const cards = toFlashcards(result.output, input.count);
  if (!cards.success) return aiError("upstream", "No flashcards came out of those notes. Try adding a bit more detail.");
  return NextResponse.json(cards.data);
}
