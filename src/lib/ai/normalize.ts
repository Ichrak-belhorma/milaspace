import { z } from "zod";
import { curriculumResponse, flashcardsResponse, type CurriculumNodeOut } from "./contracts";

/**
 * What the model is asked to return. Structured outputs don't allow recursive schemas or numeric
 * bounds, so the model fills a fixed three-level shape and the server clamps and validates it.
 */
const contentType = z.enum(["memorize", "conceptual", "math", "coding"]);
const leaf = z.object({ title: z.string(), contentType, estMinutes: z.number() });
const concept = leaf.extend({ skills: z.array(leaf) });
const chapter = z.object({ title: z.string(), contentType, concepts: z.array(concept) });

export const curriculumModelOutput = z.object({ chapters: z.array(chapter) });
export type CurriculumModelOutput = z.infer<typeof curriculumModelOutput>;

export const flashcardsModelOutput = z.object({ cards: z.array(z.object({ front: z.string(), back: z.string() })) });
export type FlashcardsModelOutput = z.infer<typeof flashcardsModelOutput>;

const clampMinutes = (m: number) => Math.min(600, Math.max(5, Math.round(Number.isFinite(m) ? m / 5 : 9) * 5));
const cleanTitle = (t: string) => t.replace(/\s+/g, " ").trim().slice(0, 160);

/** Model output → the curriculum tree contract. Drops empty titles, caps sizes, clamps estimates. */
export function toCurriculum(out: CurriculumModelOutput) {
  const chapters: CurriculumNodeOut[] = out.chapters
    .filter((c) => cleanTitle(c.title))
    .slice(0, 40)
    .map((c) => {
      const children: CurriculumNodeOut[] = c.concepts
        .filter((k) => cleanTitle(k.title))
        .slice(0, 60)
        .map((k) => ({
          title: cleanTitle(k.title),
          kind: "concept",
          contentType: k.contentType,
          estMinutes: clampMinutes(k.estMinutes),
          children: k.skills
            .filter((s) => cleanTitle(s.title))
            .slice(0, 60)
            .map((s) => ({ title: cleanTitle(s.title), kind: "skill", contentType: s.contentType, estMinutes: clampMinutes(s.estMinutes), children: [] })),
        }));
      const total = children.reduce((sum, k) => sum + (k.children.length ? k.children.reduce((a, s) => a + s.estMinutes, 0) : k.estMinutes), 0);
      return { title: cleanTitle(c.title), kind: "chapter", contentType: c.contentType, estMinutes: clampMinutes(total || 60), children };
    });
  return curriculumResponse.safeParse({ chapters });
}

/** Model output → flashcards contract (trimmed, de-duplicated, capped at `count`). */
export function toFlashcards(out: FlashcardsModelOutput, count: number) {
  const seen = new Set<string>();
  const cards = out.cards
    .map((c) => ({ front: c.front.trim().slice(0, 1000), back: c.back.trim().slice(0, 2000) }))
    .filter((c) => c.front && c.back && !seen.has(c.front.toLowerCase()) && seen.add(c.front.toLowerCase()))
    .slice(0, count);
  return flashcardsResponse.safeParse({ cards });
}
