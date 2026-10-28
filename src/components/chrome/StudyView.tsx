"use client";

import { useEffect, useRef } from "react";
import { GlassSurface } from "@/components/glass/GlassSurface";
import { ChevronLeftIcon, LaptopIcon } from "@/components/icons";
import { FlashcardsTab } from "@/components/study/FlashcardsTab";
import { ModulesTab } from "@/components/study/ModulesTab";
import { ComingSoon } from "@/components/study/shared";
import { TodayTab } from "@/components/study/TodayTab";
import { useUiStore, type StudyTab } from "@/stores/ui";

const TABS: { id: StudyTab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "modules", label: "Modules" },
  { id: "flashcards", label: "Flashcards" },
  { id: "practice", label: "Practice" },
];

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
      className="anim-rise pointer-events-auto mx-auto flex h-full w-full max-w-4xl flex-col"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex flex-wrap items-center gap-3 px-5 pt-5 pb-3">
        <button type="button" className="btn btn-soft" onClick={closeLaptop}>
          <ChevronLeftIcon size={18} /> Desk
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
        {tab === "today" && <TodayTab />}
        {tab === "modules" && <ModulesTab />}
        {tab === "flashcards" && <FlashcardsTab />}
        {tab === "practice" && (
          <ComingSoon title="Math and coding practice">
            Generated problems with step-by-step solutions, and small coding exercises with tests, mixed across topics. Arrives in Phase 3.
          </ComingSoon>
        )}
      </div>
    </GlassSurface>
  );
}
