import { z } from "zod";

/**
 * Contracts for the AI features (curriculum breakdown, flashcard generation). The routes exist and
 * validate input today; they answer 501 until the model integration lands. When it does:
 * - calls stay server-side (src/app/api/ai/*), keyed by ANTHROPIC_API_KEY, model from MILA_AI_MODEL
 * - output is requested as structured JSON and validated with the response schemas below
 * - syllabus PDFs (Storage) are sent as document blocks; no local PDF parsing
 */

export type CurriculumNodeOut = {
  title: string;
  kind: "chapter" | "concept" | "skill";
  contentType: "memorize" | "conceptual" | "math" | "coding";
  estMinutes: number;
  children: CurriculumNodeOut[];
};

const curriculumNode: z.ZodType<CurriculumNodeOut> = z.lazy(() =>
  z.object({
    title: z.string().min(1).max(160),
    kind: z.enum(["chapter", "concept", "skill"]),
    contentType: z.enum(["memorize", "conceptual", "math", "coding"]),
    estMinutes: z.number().int().min(5).max(600),
    children: z.array(curriculumNode).max(60),
  }),
);

export const curriculumRequest = z
  .object({
    moduleName: z.string().trim().min(1).max(120),
    examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    syllabusText: z.string().max(60_000).optional(),
    /** Path of an uploaded syllabus PDF in Storage. */
    syllabusPath: z.string().max(300).optional(),
  })
  .refine((r) => r.syllabusText?.trim() || r.syllabusPath, { message: "Provide syllabus text or an uploaded syllabus." });

export const curriculumResponse = z.object({ chapters: z.array(curriculumNode).min(1).max(40) });

export const flashcardsRequest = z.object({
  moduleName: z.string().trim().min(1).max(120),
  topic: z.string().trim().max(160).optional(),
  sourceText: z.string().trim().min(20).max(30_000),
  count: z.number().int().min(1).max(50).default(10),
});

export const flashcardsResponse = z.object({
  cards: z.array(z.object({ front: z.string().min(1).max(1000), back: z.string().min(1).max(2000) })).min(1).max(50),
});

export type AiErrorCode = "not_implemented" | "unauthorized" | "invalid_input" | "rate_limited" | "upstream";
export type AiError = { error: AiErrorCode; message: string };
