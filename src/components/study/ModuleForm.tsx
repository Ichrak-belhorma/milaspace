"use client";

import { useId, useState } from "react";
import { UploadIcon } from "@/components/icons";
import { fileToBase64, postAi, useAiEnabled } from "@/lib/ai/browser";
import { MAX_PDF_BYTES } from "@/lib/ai/contracts";
import { useStudyStore } from "@/stores/study";
import type { OutlineNode } from "@/study/outline";

/** New module: everything but the name is optional; the app works with partial info. */
export function ModuleForm({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel?: () => void }) {
  const addModule = useStudyStore((s) => s.addModule);
  const id = useId();
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetGrade, setTargetGrade] = useState("");
  const [outline, setOutline] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aiEnabled = useAiEnabled();

  const create = (tree?: OutlineNode[]) => {
    const moduleId = addModule({ name, examDate: examDate || null, targetGrade: targetGrade.trim() || null, dailyMinutes: 60, outline: tree ? "" : outline });
    if (tree) useStudyStore.getState().importTree(moduleId, tree);
    onCreated(moduleId);
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim() || busy) return;
        if (!pdf) return create();
        if (pdf.size > MAX_PDF_BYTES) return setError("That PDF is over 10 MB. Try a smaller export or paste the outline.");
        // Read the syllabus first, so a failure leaves the form as it was.
        setBusy(true);
        setError(null);
        const result = await postAi<{ chapters: OutlineNode[] }>("/api/ai/curriculum", {
          moduleName: name.trim(),
          examDate: examDate || undefined,
          syllabusText: outline.trim() || undefined,
          syllabusPdf: await fileToBase64(pdf),
        });
        setBusy(false);
        if (!result.ok) return setError(`${result.message} You can also create the module without the PDF.`);
        create(result.data.chapters);
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
      {aiEnabled && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className={`btn btn-soft text-sm ${busy ? "opacity-60" : "cursor-pointer"}`}>
            <UploadIcon size={16} /> {pdf ? pdf.name.slice(0, 32) : "Add a syllabus PDF"}
            <input type="file" accept="application/pdf" className="sr-only" disabled={busy} onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
          </label>
          {pdf ? (
            <button type="button" className="btn btn-soft text-sm" disabled={busy} onClick={() => setPdf(null)}>
              Remove
            </button>
          ) : (
            <span className="text-ink-muted">Mila&rsquo;s AI turns it into topics and a plan.</span>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-accent" disabled={!name.trim() || busy} aria-busy={busy || undefined}>
          {busy ? "Reading your syllabus…" : pdf ? "Create module from syllabus" : "Create module"}
        </button>
        {pdf && error && !busy && (
          <button type="button" className="btn btn-soft" onClick={() => create()}>
            Create without the PDF
          </button>
        )}
        {onCancel && (
          <button type="button" className="btn btn-soft" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
