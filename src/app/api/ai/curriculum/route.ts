import { NextResponse } from "next/server";
import { checkRateLimit, structuredCall } from "@/lib/ai/call";
import { curriculumRequest } from "@/lib/ai/contracts";
import { curriculumModelOutput, toCurriculum } from "@/lib/ai/normalize";
import { CURRICULUM_SYSTEM, curriculumUserText } from "@/lib/ai/prompts";
import { aiError, readAiRequest } from "@/lib/ai/route";

export const maxDuration = 180;

/** Syllabus (text and/or PDF) → curriculum tree (chapters → concepts → skills). */
export async function POST(request: Request) {
  const req = await readAiRequest(request, curriculumRequest);
  if (req instanceof NextResponse) return req;
  const limited = checkRateLimit(request, req.userId);
  if (limited) return limited;

  const { input } = req;
  const result = await structuredCall({
    system: CURRICULUM_SYSTEM,
    schema: curriculumModelOutput,
    maxTokens: 16000,
    content: [
      ...(input.syllabusPdf ? [{ type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: input.syllabusPdf } }] : []),
      { type: "text", text: curriculumUserText({ ...input, hasPdf: Boolean(input.syllabusPdf) }) },
    ],
  });
  if (result instanceof NextResponse) return result;
  const tree = toCurriculum(result.output);
  if (!tree.success) return aiError("upstream", "No study topics were found in that syllabus. Try another file or paste the outline.");
  return NextResponse.json(tree.data);
}
