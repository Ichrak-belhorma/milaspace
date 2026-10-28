import { z } from "zod";
import type { Todo } from "@/stores/notebook";
import type { Flashcard, ReviewLog } from "@/stores/study";
import type { CurriculumNode, Module, StudyTask } from "@/study/types";
import { themeSchema, type Theme } from "@/theme/schema";
import type { FocusSession } from "@/timer/machine";

/**
 * Mapping between local objects and database rows. Rows coming back from the server are validated,
 * so a bad row is skipped instead of corrupting local state.
 */
type Row = Record<string, unknown>;

const ms = (v: string | null | undefined) => (v ? Date.parse(v) : null);
const iso = (v: number | null | undefined) => (v ? new Date(v).toISOString() : null);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ts = z.string().refine((v) => !Number.isNaN(Date.parse(v)));

export type Mapper<T> = { table: string; toRow: (item: T, userId: string) => Row; fromRow: (row: unknown) => T | null };

function mapper<T, S extends z.ZodType>(table: string, schema: S, toRow: (item: T) => Row, fromRow: (row: z.infer<S>) => T): Mapper<T> {
  return {
    table,
    toRow: (item, userId) => ({ user_id: userId, ...toRow(item) }),
    fromRow: (row) => {
      const parsed = schema.safeParse(row);
      return parsed.success ? fromRow(parsed.data) : null;
    },
  };
}

const moduleSchema = z.object({
  id: z.string(),
  name: z.string(),
  exam_date: day.nullable(),
  target_grade: z.string().nullable(),
  syllabus_text: z.string().nullable(),
  daily_minutes: z.number(),
  archived_at: ts.nullish(),
  final_grade: z.string().nullish(),
  created_at: ts,
  updated_at: ts,
});
export const moduleRows = mapper<Module, typeof moduleSchema>(
  "modules",
  moduleSchema,
  (m) => ({ id: m.id, name: m.name, exam_date: m.examDate, target_grade: m.targetGrade, syllabus_text: m.syllabusText, daily_minutes: m.dailyMinutes, archived_at: iso(m.archivedAt), final_grade: m.finalGrade ?? null, created_at: iso(m.createdAt), updated_at: iso(m.updatedAt) }),
  (r) => ({
    id: r.id,
    name: r.name,
    examDate: r.exam_date,
    targetGrade: r.target_grade,
    syllabusText: r.syllabus_text,
    dailyMinutes: r.daily_minutes,
    ...(r.archived_at ? { archivedAt: ms(r.archived_at), finalGrade: r.final_grade ?? null } : {}),
    createdAt: ms(r.created_at)!,
    updatedAt: ms(r.updated_at)!,
  }),
);

const nodeSchema = z.object({
  id: z.string(),
  module_id: z.string(),
  parent_id: z.string().nullable(),
  kind: z.enum(["chapter", "concept", "skill"]),
  title: z.string(),
  position: z.number(),
  content_type: z.enum(["memorize", "conceptual", "math", "coding"]),
  est_minutes: z.number(),
  mastery: z.number(),
  updated_at: ts,
});
export const nodeRows = mapper<CurriculumNode, typeof nodeSchema>(
  "curriculum_nodes",
  nodeSchema,
  (n) => ({ id: n.id, module_id: n.moduleId, parent_id: n.parentId, kind: n.kind, title: n.title, position: n.position, content_type: n.contentType, est_minutes: n.estMinutes, mastery: n.mastery, updated_at: iso(n.updatedAt) }),
  (r) => ({ id: r.id, moduleId: r.module_id, parentId: r.parent_id, kind: r.kind, title: r.title, position: r.position, contentType: r.content_type, estMinutes: r.est_minutes, mastery: r.mastery, updatedAt: ms(r.updated_at)! }),
);

const taskSchema = z.object({
  id: z.string(),
  module_id: z.string(),
  node_id: z.string().nullable(),
  node_ids: z.array(z.string()).nullable(),
  date: day,
  kind: z.enum(["learn", "review", "practice", "flashcards", "buffer"]),
  title: z.string(),
  est_minutes: z.number(),
  status: z.enum(["todo", "done", "skipped"]),
  source: z.enum(["auto", "manual"]),
  completed_at: ts.nullable(),
  start_minute: z.number().int().nullish(),
  updated_at: ts,
});
export const taskRows = mapper<StudyTask, typeof taskSchema>(
  "study_tasks",
  taskSchema,
  (t) => ({
    id: t.id,
    module_id: t.moduleId,
    node_id: t.nodeId,
    node_ids: t.nodeIds ?? null,
    date: t.date,
    kind: t.kind,
    title: t.title,
    est_minutes: t.estMinutes,
    status: t.status,
    source: t.source,
    completed_at: iso(t.completedAt),
    start_minute: t.start ?? null,
    updated_at: iso(t.updatedAt ?? t.completedAt ?? Date.now()),
  }),
  (r) => ({
    id: r.id,
    moduleId: r.module_id,
    nodeId: r.node_id,
    ...(r.node_ids ? { nodeIds: r.node_ids } : {}),
    date: r.date,
    kind: r.kind,
    title: r.title,
    estMinutes: r.est_minutes,
    status: r.status,
    source: r.source,
    completedAt: ms(r.completed_at),
    ...(r.start_minute != null ? { start: r.start_minute } : {}),
    updatedAt: ms(r.updated_at)!,
  }),
);

const fsrsSchema = z.object({
  due: ts,
  stability: z.number(),
  difficulty: z.number(),
  elapsedDays: z.number(),
  scheduledDays: z.number(),
  learningSteps: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: z.enum(["new", "learning", "review", "relearning"]),
  lastReview: ts.nullable(),
});
const cardSchema = z.object({ id: z.string(), module_id: z.string(), node_id: z.string().nullable(), front: z.string(), back: z.string(), fsrs: fsrsSchema, created_at: ts, updated_at: ts });
export const cardRows = mapper<Flashcard, typeof cardSchema>(
  "flashcards",
  cardSchema,
  (c) => ({ id: c.id, module_id: c.moduleId, node_id: c.nodeId, front: c.front, back: c.back, fsrs: c.fsrs, due: c.fsrs.due, created_at: iso(c.createdAt), updated_at: iso(c.updatedAt) }),
  (r) => ({ id: r.id, moduleId: r.module_id, nodeId: r.node_id, front: r.front, back: r.back, fsrs: r.fsrs, createdAt: ms(r.created_at)!, updatedAt: ms(r.updated_at)! }),
);

const logSchema = z.object({
  id: z.string(),
  card_id: z.string(),
  rating: z.enum(["again", "hard", "good", "easy"]),
  state: z.enum(["new", "learning", "review", "relearning"]),
  due: ts,
  stability: z.number(),
  difficulty: z.number(),
  reviewed_at: ts,
});
export const logRows = mapper<ReviewLog, typeof logSchema>(
  "review_logs",
  logSchema,
  (l) => ({ id: l.id, card_id: l.cardId, rating: l.rating, state: l.state, due: l.due, stability: l.stability, difficulty: l.difficulty, reviewed_at: l.reviewedAt }),
  (r) => ({ id: r.id, cardId: r.card_id, rating: r.rating, state: r.state, due: new Date(r.due).toISOString(), stability: r.stability, difficulty: r.difficulty, reviewedAt: new Date(r.reviewed_at).toISOString() }),
);

const sessionSchema = z.object({
  id: z.string(),
  started_at: ts,
  ended_at: ts,
  focus_minutes: z.number(),
  completed: z.boolean(),
  module_id: z.string().nullish(),
  task_id: z.string().nullish(),
});
export const sessionRows = mapper<FocusSession, typeof sessionSchema>(
  "focus_sessions",
  sessionSchema,
  (s) => ({ id: s.id, started_at: iso(s.startedAt), ended_at: iso(s.endedAt), focus_minutes: s.minutes, completed: s.completed, module_id: s.moduleId || null, task_id: s.taskId || null }),
  (r) => ({
    id: r.id,
    startedAt: ms(r.started_at)!,
    endedAt: ms(r.ended_at)!,
    minutes: r.focus_minutes,
    completed: r.completed,
    ...(r.task_id ? { taskId: r.task_id } : {}),
    ...(r.module_id ? { moduleId: r.module_id } : {}),
  }),
);

const todoSchema = z.object({ id: z.string(), text: z.string(), done: z.boolean(), day, created_at: ts, done_at: ts.nullable(), updated_at: ts });
export const todoRows = mapper<Todo, typeof todoSchema>(
  "todos",
  todoSchema,
  (t) => ({ id: t.id, text: t.text, done: t.done, day: t.day, created_at: iso(t.createdAt), done_at: iso(t.doneAt), updated_at: iso(t.updatedAt) }),
  (r) => ({ id: r.id, text: r.text, done: r.done, day: r.day, createdAt: ms(r.created_at)!, doneAt: ms(r.done_at), updatedAt: ms(r.updated_at)! }),
);

const themeRowSchema = z.object({ id: z.string(), name: z.string(), based_on: z.string().nullable(), tokens: z.unknown(), room: z.unknown(), updated_at: ts });
export const themeRows: Mapper<Theme> = {
  table: "themes",
  toRow: (t, userId) => ({ user_id: userId, id: t.id, name: t.name, based_on: t.basedOn ?? null, tokens: t.tokens, room: t.room, updated_at: iso(t.updatedAt ?? Date.now()) }),
  fromRow: (row) => {
    const r = themeRowSchema.safeParse(row);
    if (!r.success) return null;
    const theme = themeSchema.safeParse({ schema: "mila.theme/1", id: r.data.id, name: r.data.name, basedOn: r.data.based_on ?? undefined, tokens: r.data.tokens, room: r.data.room, updatedAt: ms(r.data.updated_at) });
    return theme.success ? theme.data : null;
  },
};
