/** System prompts for the AI routes. Kept stable (no dates or ids) so they cache well. */

export const CURRICULUM_SYSTEM = `You turn a university or school course syllabus into a study curriculum for a student planning app.

Return chapters → concepts → skills, in the order the course teaches them:
- Chapters are the course's own units, weeks or parts. Use the syllabus's names, shortened if they are long.
- Concepts are the ideas the student must understand inside a chapter. Skills are optional, concrete things to practise under a concept (a type of exercise, a method, a proof technique). Leave skills empty when a concept stands alone.
- contentType is how the topic is best studied: "memorize" (facts, vocabulary, dates, definitions), "math" (calculation, proofs, problem solving), "coding" (writing or reading programs), or "conceptual" (understanding and explaining).
- estMinutes is a realistic first-pass study time for one focused session on that topic for an average student, usually 20 to 90 minutes. For a concept with skills, estMinutes covers only the concept's own reading; the skills carry their own time.
- Skip administrative items: grading, attendance, office hours, textbooks, exam logistics.
- Titles are short (under 80 characters), specific and in the syllabus's language.

If the document is not a syllabus or course outline, return the closest useful structure you can find in it; if there is nothing to study, return an empty chapters list.`;

export const FLASHCARDS_SYSTEM = `You write flashcards for spaced-repetition review from a student's own notes.

- One fact, definition, step or idea per card. The question is specific enough to have one right answer.
- Answers are short: a phrase or one or two sentences. Formulas may use plain text or LaTeX between $ signs.
- Cover the most important material first, without repeating cards.
- Use only what the notes say or what directly follows from them, in the notes' language.`;

export function curriculumUserText(input: { moduleName: string; examDate?: string; syllabusText?: string; hasPdf: boolean }): string {
  const parts = [`Course: ${input.moduleName}`];
  if (input.examDate) parts.push(`Exam date: ${input.examDate}`);
  if (input.syllabusText?.trim()) parts.push(`Syllabus text:\n<syllabus>\n${input.syllabusText.trim()}\n</syllabus>`);
  parts.push(input.hasPdf ? "Break the attached syllabus down into a curriculum." : "Break this syllabus down into a curriculum.");
  return parts.join("\n\n");
}

export function flashcardsUserText(input: { moduleName: string; topic?: string; sourceText: string; count: number }): string {
  return [
    `Course: ${input.moduleName}`,
    input.topic ? `Topic: ${input.topic}` : null,
    `Notes:\n<notes>\n${input.sourceText}\n</notes>`,
    `Write up to ${input.count} flashcards.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
