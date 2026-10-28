import { create } from "zustand";
import { persist } from "zustand/middleware";
import { dayKey } from "@/lib/day";
import { uid } from "@/lib/id";
import { localJSONStorage } from "@/lib/storage";

/** A to-do in the room notebook. Phase 2 adds generated study tasks alongside these manual ones. */
export type Todo = {
  id: string;
  text: string;
  done: boolean;
  /** Day the to-do was planned for (YYYY-MM-DD, local). */
  day: string;
  createdAt: number;
  doneAt: number | null;
};

type NotebookStore = {
  todos: Todo[];
  add: (text: string) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  edit: (id: string, text: string) => void;
};

/** Today's page: today's to-dos plus unfinished ones carried over from earlier days. */
export function todayTodos(todos: Todo[], now: number): Todo[] {
  const today = dayKey(now);
  return todos.filter((t) => t.day === today || (!t.done && t.day < today) || (t.done && t.doneAt !== null && dayKey(t.doneAt) === today));
}

export const useNotebookStore = create<NotebookStore>()(
  persist(
    (set) => ({
      todos: [],
      add: (text) => {
        const clean = text.trim().slice(0, 200);
        if (!clean) return;
        const now = Date.now();
        set((s) => ({ todos: [...s.todos, { id: uid("td_"), text: clean, done: false, day: dayKey(now), createdAt: now, doneAt: null }] }));
      },
      toggle: (id) =>
        set((s) => ({
          todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: t.done ? null : Date.now() } : t)),
        })),
      remove: (id) => set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
      edit: (id, text) => {
        const clean = text.trim().slice(0, 200);
        if (clean) set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, text: clean } : t)) }));
      },
    }),
    { name: "mila:notebook", version: 1, storage: localJSONStorage },
  ),
);
