import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays, dayKey } from "@/lib/day";
import { uid } from "@/lib/id";
import { localJSONStorage } from "@/lib/storage";
import { isDue, masteryAfterReview, newCardState, review, type CardState, type ReviewLogEntry, type ReviewRating } from "@/study/fsrs";
import { parseOutline, type OutlineNode } from "@/study/outline";
import { planAll, type PlanSummary, type PlanWarning } from "@/study/scheduler";
import { useScheduleStore } from "./schedule";
import { descendantIds, leafUnits, outlineToNodes } from "@/study/tree";
import type { CurriculumNode, Module, StudyTask } from "@/study/types";

export type Flashcard = {
  id: string;
  moduleId: string;
  nodeId: string | null;
  front: string;
  back: string;
  fsrs: CardState;
  createdAt: number;
  updatedAt: number;
};

export type ReviewLog = ReviewLogEntry & { id: string; cardId: string };

type PlanMeta = { warnings: PlanWarning[]; summary: PlanSummary };

type StudyStore = {
  modules: Module[];
  nodes: CurriculumNode[];
  tasks: StudyTask[];
  cards: Flashcard[];
  reviewLogs: ReviewLog[];
  /** Latest planner output per module (derived, not persisted). */
  plans: Record<string, PlanMeta>;
  /** Day the plans were last computed for; a new day triggers a replan. */
  plannedFor: string | null;

  addModule: (input: Pick<Module, "name" | "examDate" | "targetGrade" | "dailyMinutes"> & { outline?: string }) => string;
  updateModule: (id: string, patch: Partial<Omit<Module, "id" | "createdAt">>) => void;
  deleteModule: (id: string) => void;

  importOutline: (moduleId: string, text: string) => number;
  /** Add a ready-made tree (e.g. from the AI syllabus breakdown). Returns how many nodes were added. */
  importTree: (moduleId: string, tree: OutlineNode[]) => number;
  addNode: (moduleId: string, parentId: string | null, title: string) => string;
  updateNode: (id: string, patch: Partial<Pick<CurriculumNode, "title" | "contentType" | "estMinutes" | "mastery">>) => void;
  moveNode: (id: string, direction: -1 | 1) => void;
  deleteNode: (id: string) => void;

  setTaskStatus: (id: string, status: StudyTask["status"]) => void;
  addManualTask: (moduleId: string, title: string, date: string, estMinutes?: number) => void;
  /** "I'm stuck" on a task: the topic counts as shaky (more reviews) and a gentle revisit is planned. */
  markStuck: (taskId: string) => void;
  deleteTask: (id: string) => void;

  addCard: (moduleId: string, front: string, back: string, nodeId?: string | null) => void;
  addCards: (moduleId: string, cards: { front: string; back: string }[], nodeId?: string | null) => number;
  updateCard: (id: string, patch: Partial<Pick<Flashcard, "front" | "back" | "nodeId">>) => void;
  deleteCard: (id: string) => void;
  reviewCard: (id: string, rating: ReviewRating) => void;

  /** After the exam: record the grade and put the module away (it leaves the plan). */
  archiveModule: (id: string, finalGrade: string | null) => void;
  unarchiveModule: (id: string) => void;

  /** Re-run the planner. All active modules are planned together (they share one budget). */
  replan: (moduleId?: string) => void;
};

const MAX_LOGS = 5000;

export const useStudyStore = create<StudyStore>()(
  persist(
    (set, get) => ({
      modules: [],
      nodes: [],
      tasks: [],
      cards: [],
      reviewLogs: [],
      plans: {},
      plannedFor: null,

      addModule: ({ outline, ...input }) => {
        const now = Date.now();
        const id = uid("mod_");
        set((s) => ({
          modules: [...s.modules, { id, syllabusText: outline?.trim() || null, createdAt: now, updatedAt: now, ...input, name: input.name.trim().slice(0, 80) || "Untitled module" }],
        }));
        if (outline?.trim()) get().importOutline(id, outline);
        else get().replan(id);
        return id;
      },

      updateModule: (id, patch) => {
        set((s) => ({ modules: s.modules.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m)) }));
        get().replan(id);
      },

      deleteModule: (id) =>
        set((s) => {
          const plans = { ...s.plans };
          delete plans[id];
          return {
            modules: s.modules.filter((m) => m.id !== id),
            nodes: s.nodes.filter((n) => n.moduleId !== id),
            tasks: s.tasks.filter((t) => t.moduleId !== id),
            cards: s.cards.filter((c) => c.moduleId !== id),
            reviewLogs: s.reviewLogs.filter((l) => s.cards.some((c) => c.id === l.cardId && c.moduleId !== id)),
            plans,
          };
        }),

      importOutline: (moduleId, text) => get().importTree(moduleId, parseOutline(text)),

      importTree: (moduleId, outline) => {
        if (!outline.length) return 0;
        const now = Date.now();
        const start = get().nodes.filter((n) => n.moduleId === moduleId && n.parentId === null).length;
        const added = outlineToNodes(outline, moduleId, () => uid("node_"), now, start);
        set((s) => ({ nodes: [...s.nodes, ...added] }));
        get().replan(moduleId);
        return added.length;
      },

      addNode: (moduleId, parentId, title) => {
        const now = Date.now();
        const id = uid("node_");
        const siblings = get().nodes.filter((n) => n.moduleId === moduleId && n.parentId === parentId);
        const parent = get().nodes.find((n) => n.id === parentId);
        const kind = !parent ? "chapter" : parent.kind === "chapter" ? "concept" : "skill";
        set((s) => ({
          nodes: [
            ...s.nodes,
            { id, moduleId, parentId, kind, title: title.trim().slice(0, 160) || "New topic", position: siblings.length, contentType: parent?.contentType ?? "conceptual", estMinutes: 45, mastery: 0, updatedAt: now },
          ],
        }));
        get().replan(moduleId);
        return id;
      },

      updateNode: (id, patch) => {
        const node = get().nodes.find((n) => n.id === id);
        if (!node) return;
        set((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)) }));
        get().replan(node.moduleId);
      },

      moveNode: (id, direction) => {
        const node = get().nodes.find((n) => n.id === id);
        if (!node) return;
        const siblings = get()
          .nodes.filter((n) => n.moduleId === node.moduleId && n.parentId === node.parentId)
          .sort((a, b) => a.position - b.position);
        const i = siblings.findIndex((n) => n.id === id);
        const j = i + direction;
        if (j < 0 || j >= siblings.length) return;
        const order = [...siblings];
        [order[i], order[j]] = [order[j]!, order[i]!];
        const now = Date.now();
        const positions = new Map(order.map((n, k) => [n.id, k]));
        set((s) => ({ nodes: s.nodes.map((n) => (positions.has(n.id) ? { ...n, position: positions.get(n.id)!, updatedAt: now } : n)) }));
        get().replan(node.moduleId);
      },

      deleteNode: (id) => {
        const node = get().nodes.find((n) => n.id === id);
        if (!node) return;
        const ids = [id, ...descendantIds(get().nodes, id)];
        set((s) => ({
          nodes: s.nodes.filter((n) => !ids.includes(n.id)),
          cards: s.cards.map((c) => (c.nodeId && ids.includes(c.nodeId) ? { ...c, nodeId: null, updatedAt: Date.now() } : c)),
        }));
        get().replan(node.moduleId);
      },

      setTaskStatus: (id, status) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;
        const now = Date.now();
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, status, completedAt: status === "done" ? now : null, updatedAt: now } : t)),
          // Finishing work raises mastery; this feeds the planner's "shaky unit" reviews.
          nodes:
            status === "done" && task.nodeId
              ? s.nodes.map((n) =>
                  n.id === task.nodeId ? { ...n, mastery: Math.min(1, task.kind === "learn" ? Math.max(n.mastery, 0.5) : n.mastery + 0.08), updatedAt: now } : n,
                )
              : s.nodes,
        }));
        get().replan(task.moduleId);
      },

      addManualTask: (moduleId, title, date, estMinutes = 25) => {
        const clean = title.trim().slice(0, 200);
        if (!clean) return;
        set((s) => ({
          tasks: [...s.tasks, { id: uid("task_"), moduleId, nodeId: null, date, kind: "practice", title: clean, estMinutes, status: "todo", source: "manual", completedAt: null, updatedAt: Date.now() }],
        }));
      },

      markStuck: (taskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        const now = Date.now();
        set((s) => ({
          nodes: task.nodeId ? s.nodes.map((n) => (n.id === task.nodeId ? { ...n, mastery: Math.max(0, n.mastery - 0.2), updatedAt: now } : n)) : s.nodes,
        }));
        const topic = task.title.replace(/^(Learn|Review|Catch-up review|Extra review|Mixed practice):\s*/, "");
        get().addManualTask(task.moduleId, `Revisit ${topic}: try another explanation, or ask someone`, addDays(dayKey(now), 1), 20);
        get().replan();
      },

      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addCard: (moduleId, front, back, nodeId = null) => {
        const f = front.trim().slice(0, 1000);
        const b = back.trim().slice(0, 2000);
        if (!f || !b) return;
        const now = Date.now();
        set((s) => ({ cards: [...s.cards, { id: uid("card_"), moduleId, nodeId, front: f, back: b, fsrs: newCardState(new Date(now)), createdAt: now, updatedAt: now }] }));
        get().replan(moduleId);
      },

      addCards: (moduleId, cards, nodeId = null) => {
        const now = Date.now();
        const added: Flashcard[] = cards
          .map((c) => ({ front: c.front.trim().slice(0, 1000), back: c.back.trim().slice(0, 2000) }))
          .filter((c) => c.front && c.back)
          .map((c) => ({ id: uid("card_"), moduleId, nodeId, ...c, fsrs: newCardState(new Date(now)), createdAt: now, updatedAt: now }));
        if (!added.length) return 0;
        set((s) => ({ cards: [...s.cards, ...added] }));
        get().replan(moduleId);
        return added.length;
      },

      updateCard: (id, patch) => set((s) => ({ cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)) })),

      deleteCard: (id) => {
        const card = get().cards.find((c) => c.id === id);
        set((s) => ({ cards: s.cards.filter((c) => c.id !== id), reviewLogs: s.reviewLogs.filter((l) => l.cardId !== id) }));
        if (card) get().replan(card.moduleId);
      },

      reviewCard: (id, rating) => {
        const card = get().cards.find((c) => c.id === id);
        if (!card) return;
        const now = new Date();
        const { state, log } = review(card.fsrs, rating, now);
        set((s) => ({
          cards: s.cards.map((c) => (c.id === id ? { ...c, fsrs: state, updatedAt: now.getTime() } : c)),
          reviewLogs: [...s.reviewLogs, { ...log, id: uid("rl_"), cardId: id }].slice(-MAX_LOGS),
          nodes: card.nodeId ? s.nodes.map((n) => (n.id === card.nodeId ? { ...n, mastery: masteryAfterReview(n.mastery, rating), updatedAt: now.getTime() } : n)) : s.nodes,
        }));
      },

      archiveModule: (id, finalGrade) => {
        set((s) => ({
          modules: s.modules.map((m) => (m.id === id ? { ...m, archivedAt: Date.now(), finalGrade: finalGrade?.trim() || null, updatedAt: Date.now() } : m)),
          // Its unfinished plan goes away; history stays.
          tasks: s.tasks.filter((t) => !(t.moduleId === id && t.source === "auto" && t.status === "todo")),
        }));
        get().replan();
      },

      unarchiveModule: (id) => {
        set((s) => ({ modules: s.modules.map((m) => (m.id === id ? { ...m, archivedAt: null, updatedAt: Date.now() } : m)) }));
        get().replan();
      },

      replan: () => {
        const s = get();
        const now = new Date();
        const today = dayKey(now.getTime());
        const schedule = useScheduleStore.getState();
        const active = s.modules.filter((m) => !m.archivedAt);
        const result = planAll({
          modules: active.map((m) => ({
            moduleId: m.id,
            moduleName: m.name,
            examDate: m.examDate,
            units: leafUnits(s.nodes, m.id),
            existing: s.tasks.filter((t) => t.moduleId === m.id),
            dueCards: s.cards.filter((c) => c.moduleId === m.id && isDue(c.fsrs, now)).length,
          })),
          today,
          dailyBudget: schedule.dailyBudget,
          availability: schedule.availability,
          nowMinute: now.getHours() * 60 + now.getMinutes(),
          paceFactor: schedule.pace.factor,
        });
        const activeIds = new Set(active.map((m) => m.id));
        set({
          tasks: [...s.tasks.filter((t) => !activeIds.has(t.moduleId) && !(t.source === "auto" && t.status === "todo")), ...result.tasks],
          plans: result.modules,
          plannedFor: today,
        });
      },
    }),
    {
      name: "mila:study",
      version: 1,
      storage: localJSONStorage,
      partialize: (s) => ({ modules: s.modules, nodes: s.nodes, tasks: s.tasks, cards: s.cards, reviewLogs: s.reviewLogs }),
    },
  ),
);

/** Today's study tasks across all modules (reviews first), for the notebook and the Today tab. */
export function useStudyTasksForToday(): StudyTask[] {
  const tasks = useStudyStore((s) => s.tasks);
  const plannedFor = useStudyStore((s) => s.plannedFor);
  return useMemo(() => {
    // The planner stamps the day it planned for (StudyPlanner replans at midnight).
    const today = plannedFor ?? "";
    return tasks.filter((t) => t.date === today || (t.source === "manual" && t.status === "todo" && t.date < today));
  }, [tasks, plannedFor]);
}

export function dueCardsFor(cards: Flashcard[], now: Date, moduleId?: string): Flashcard[] {
  return cards
    .filter((c) => (!moduleId || c.moduleId === moduleId) && isDue(c.fsrs, now))
    .sort((a, b) => a.fsrs.due.localeCompare(b.fsrs.due));
}
