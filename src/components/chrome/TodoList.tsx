"use client";

import { useState } from "react";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { useNow } from "@/hooks/useNow";
import { todayTodos, useNotebookStore } from "@/stores/notebook";

/** Today's to-dos. Shared by the desk notebook panel and the laptop study view. */
export function TodoList({ autoFocus = false }: { autoFocus?: boolean }) {
  const todos = useNotebookStore((s) => s.todos);
  const { add, toggle, remove } = useNotebookStore.getState();
  const [draft, setDraft] = useState("");
  const now = useNow(60_000);
  const list = todayTodos(todos, now);
  const done = list.filter((t) => t.done).length;

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(draft);
          setDraft("");
        }}
      >
        <label htmlFor="todo-input" className="sr-only">
          New to-do
        </label>
        <input
          id="todo-input"
          className="field"
          placeholder="One small next step…"
          value={draft}
          maxLength={200}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus={autoFocus}
        />
        <button type="submit" className="btn btn-accent btn-icon" aria-label="Add to-do" disabled={!draft.trim()}>
          <PlusIcon size={18} />
        </button>
      </form>

      {list.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nothing planned yet. Write the smallest possible first step, like &ldquo;open chapter 3&rdquo;.
        </p>
      ) : (
        <>
          <p className="text-xs text-ink-muted" aria-live="polite">
            {done} of {list.length} done
          </p>
          <ul className="flex flex-col gap-1">
            {list.map((t) => (
              <li key={t.id} className="group flex items-center gap-2 rounded-glass-sm px-1 py-1 hover:bg-ink/5">
                <input
                  id={`todo-${t.id}`}
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggle(t.id)}
                  className="h-4 w-4 shrink-0"
                />
                <label htmlFor={`todo-${t.id}`} className={t.done ? "flex-1 text-ink-muted line-through" : "flex-1"}>
                  {t.text}
                </label>
                <button
                  type="button"
                  className="btn btn-icon min-h-7 min-w-7 p-1 opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => remove(t.id)}
                  aria-label={`Delete "${t.text}"`}
                >
                  <TrashIcon size={14} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
