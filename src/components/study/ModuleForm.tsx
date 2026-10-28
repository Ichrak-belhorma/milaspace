"use client";

import { useId, useState } from "react";
import { useStudyStore } from "@/stores/study";

/** New module: everything but the name is optional; the app works with partial info. */
export function ModuleForm({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel?: () => void }) {
  const addModule = useStudyStore((s) => s.addModule);
  const id = useId();
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetGrade, setTargetGrade] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [outline, setOutline] = useState("");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onCreated(addModule({ name, examDate: examDate || null, targetGrade: targetGrade.trim() || null, dailyMinutes, outline }));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-name`}>
          Module name
          <input id={`${id}-name`} className="field" required maxLength={80} placeholder="e.g. Cell Biology" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-exam`}>
          Exam date <span className="text-xs text-ink-muted">(optional)</span>
          <input id={`${id}-exam`} type="date" className="field" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-grade`}>
          Target grade <span className="text-xs text-ink-muted">(optional)</span>
          <input id={`${id}-grade`} className="field" maxLength={20} placeholder="e.g. A, 16/20, pass" value={targetGrade} onChange={(e) => setTargetGrade(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-minutes`}>
          Daily study time: {dailyMinutes} min
          <input id={`${id}-minutes`} type="range" min={15} max={240} step={15} value={dailyMinutes} onChange={(e) => setDailyMinutes(Number(e.target.value))} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-outline`}>
        Course outline <span className="text-xs text-ink-muted">(optional: paste chapters and topics, one per line; indent subtopics)</span>
        <textarea
          id={`${id}-outline`}
          className="field h-32 font-mono text-xs"
          value={outline}
          onChange={(e) => setOutline(e.target.value)}
          placeholder={"Chapter 1: Cells\n  - Membranes (30m)\n  - Organelles\nChapter 2: Genetics\n  - Mendel's laws"}
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-accent" disabled={!name.trim()}>
          Create module
        </button>
        {onCancel && (
          <button type="button" className="btn btn-soft" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
