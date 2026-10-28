/** Study engine domain types. Plain data (dates as YYYY-MM-DD or epoch ms) so they persist and sync as JSON. */

export type ContentType = "memorize" | "conceptual" | "math" | "coding";
export type NodeKind = "chapter" | "concept" | "skill";

export type Module = {
  id: string;
  name: string;
  /** Exam day (local, YYYY-MM-DD). Null = rolling mode. */
  examDate: string | null;
  targetGrade: string | null;
  /** Pasted course outline or syllabus text. */
  syllabusText: string | null;
  /** Daily study budget for this module, in minutes. */
  dailyMinutes: number;
  createdAt: number;
  updatedAt: number;
};

export type CurriculumNode = {
  id: string;
  moduleId: string;
  parentId: string | null;
  kind: NodeKind;
  title: string;
  /** Order among siblings. */
  position: number;
  contentType: ContentType;
  estMinutes: number;
  /** 0–1, raised by finished work and good flashcard reviews, lowered by lapses. */
  mastery: number;
  updatedAt: number;
};

export type TaskKind = "learn" | "review" | "practice" | "flashcards" | "buffer";
export type TaskStatus = "todo" | "done" | "skipped";

export type StudyTask = {
  id: string;
  moduleId: string;
  nodeId: string | null;
  /** Planned day (YYYY-MM-DD). */
  date: string;
  kind: TaskKind;
  title: string;
  estMinutes: number;
  status: TaskStatus;
  /** "auto" tasks are owned by the planner; "manual" ones are the user's and never rewritten. */
  source: "auto" | "manual";
  completedAt: number | null;
  /** For practice tasks: the units being interleaved. */
  nodeIds?: string[];
  /** Last user change (status, edit). Generated tasks have none until the user touches them. */
  updatedAt?: number;
};

export const CONTENT_TYPES: { value: ContentType; label: string; defaultMinutes: number }[] = [
  { value: "memorize", label: "Memorize", defaultMinutes: 30 },
  { value: "conceptual", label: "Understand", defaultMinutes: 45 },
  { value: "math", label: "Math", defaultMinutes: 60 },
  { value: "coding", label: "Coding", defaultMinutes: 60 },
];

export function defaultMinutes(type: ContentType): number {
  return CONTENT_TYPES.find((c) => c.value === type)?.defaultMinutes ?? 45;
}
