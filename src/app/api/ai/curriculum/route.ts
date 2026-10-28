import { NextResponse } from "next/server";
import { curriculumRequest } from "@/lib/ai/contracts";
import { aiError, readAiRequest } from "@/lib/ai/route";

/** Syllabus → curriculum tree (chapters → concepts → skills). Validated today; the model call is not wired yet. */
export async function POST(request: Request) {
  const req = await readAiRequest(request, curriculumRequest);
  if (req instanceof NextResponse) return req;
  return aiError("not_implemented", "AI curriculum breakdown is coming soon. Paste your outline to build the tree for now.");
}
