"use client";

import { useEffect, useRef } from "react";
import { GlassSurface } from "@/components/glass/GlassSurface";
import { ChevronLeftIcon, LaptopIcon, SparkleIcon } from "@/components/icons";
import { useUiStore, type StudyTab } from "@/stores/ui";
import { TodoList } from "./TodoList";

const TABS: { id: StudyTab; label: string }[] = [
  { id: "tasks", label: "Tasks" },
  { id: "flashcards", label: "Flashcards" },
  { id: "practice", label: "Practice" },
];

function ComingNext({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="well flex gap-3 p-4">
      <SparkleIcon size={20} className="mt-0.5 shrink-0 text-accent" />
      <div className="flex flex-col gap-1">
        <h3 className="font-display">{title}</h3>
        <p className="text-sm text-ink-muted">{children}</p>
      </div>
    </div>
  );
}

/** The focused study view you get by clicking the laptop. Real studying happens here. */
export function StudyView() {
  const tab = useUiStore((s) => s.studyTab);
  const { setStudyTab, closeLaptop } = useUiStore.getState();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length]!;
    setStudyTab(next.id);
    document.getElementById(`study-tab-${next.id}`)?.focus();
  };

  return (
    <GlassSurface
      as="section"
      aria-labelledby="study-heading"
      edges={["bottom"]}
      className="anim-rise pointer-events-auto mx-auto flex h-full w-full max-w-3xl flex-col"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex flex-wrap items-center gap-3 px-5 pt-5 pb-3">
        <button type="button" className="btn btn-soft" onClick={closeLaptop}>
          <ChevronLeftIcon size={18} /> Room
        </button>
        <h2 id="study-heading" ref={headingRef} tabIndex={-1} className="flex items-center gap-2 font-display text-xl outline-none">
          <LaptopIcon size={20} /> Study desk
        </h2>
        <div role="tablist" aria-label="Study modes" className="well ml-auto flex gap-1 p-1" onKeyDown={onTabKey}>
          {TABS.map((t) => (
            <button
              key={t.id}
              id={`study-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`study-panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              className="btn min-h-8 px-3 py-1 text-sm"
              onClick={() => setStudyTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div id={`study-panel-${tab}`} role="tabpanel" aria-labelledby={`study-tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        {tab === "tasks" && (
          <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
            <div>
              <h3 className="label mb-2">Today</h3>
              <TodoList />
            </div>
            <ComingNext title="Backward planning">
              Add a module with an exam date and Mila maps the course, plans backwards from the exam and fills this list with
              daily tasks. Arrives with accounts in Phase 2.
            </ComingNext>
          </div>
        )}
        {tab === "flashcards" && (
          <ComingNext title="Flashcards with spaced repetition">
            Cards you write or generate from your course, scheduled with FSRS so you review each one right before you&rsquo;d
            forget it. Arrives in Phase 2.
          </ComingNext>
        )}
        {tab === "practice" && (
          <ComingNext title="Math and coding practice">
            Generated problems with step-by-step solutions, and small coding exercises with tests, mixed across topics.
            Arrives in Phase 3.
          </ComingNext>
        )}
      </div>
    </GlassSurface>
  );
}
