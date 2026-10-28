"use client";

import { useId, useState } from "react";
import { TrashIcon, UploadIcon } from "@/components/icons";
import { useNow } from "@/hooks/useNow";
import { dayKey } from "@/lib/day";
import { useStudyStore } from "@/stores/study";
import { MAX_PDF_BYTES } from "@/lib/ai/contracts";
import { fileToBase64, postAi, useAiEnabled } from "@/lib/ai/browser";
import { countLeaves, parseOutline, type OutlineNode } from "@/study/outline";
import { CurriculumEditor } from "./CurriculumEditor";
import { AiButton, KindBadge, minutesLabel } from "./shared";

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });
const parseDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};

function OutlineImport({ moduleId }: { moduleId: string }) {
  const importOutline = useStudyStore((s) => s.importOutline);
  const importTree = useStudyStore((s) => s.importTree);
  const mod = useStudyStore((s) => s.modules.find((m) => m.id === moduleId));
  const aiEnabled = useAiEnabled();
  const [text, setText] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const id = useId();
  const preview = text.trim() ? countLeaves(parseOutline(text)) : 0;

  const breakDown = async () => {
    if (!mod) return;
    if (pdf && pdf.size > MAX_PDF_BYTES) return setMessage("That PDF is over 10 MB. Try a smaller export or paste the text.");
    setBusy(true);
    setMessage(pdf ? "Reading your syllabus… this can take a minute." : "Breaking it down…");
    const result = await postAi<{ chapters: OutlineNode[] }>("/api/ai/curriculum", {
      moduleName: mod.name,
      examDate: mod.examDate ?? undefined,
      syllabusText: text.trim() || undefined,
      syllabusPdf: pdf ? await fileToBase64(pdf) : undefined,
    });
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    const n = importTree(moduleId, result.data.chapters);
    setMessage(`Added ${n} topic${n === 1 ? "" : "s"} from your syllabus. Edit anything that looks off; your plan is updated.`);
    setText("");
    setPdf(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm">
        Paste a course outline: one topic per line, indent subtopics. Times like &ldquo;(30m)&rdquo; or &ldquo;[2h]&rdquo; are optional.
      </label>
      <textarea id={id} className="field h-28 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder={"Week 1: Limits\n  - Definition of a limit\n  - Continuity (45m)"} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-accent text-sm"
          disabled={!preview || busy}
          onClick={() => {
            const n = importOutline(moduleId, text);
            setMessage(`Added ${n} topic${n === 1 ? "" : "s"}.`);
            setText("");
          }}
        >
          Add {preview || ""} topic{preview === 1 ? "" : "s"}
        </button>
        {aiEnabled !== false && (
          <label className={`btn btn-soft text-sm ${busy || !aiEnabled ? "opacity-60" : "cursor-pointer"}`}>
            <UploadIcon size={16} /> {pdf ? pdf.name.slice(0, 28) : "Syllabus PDF"}
            <input type="file" accept="application/pdf" className="sr-only" disabled={busy || !aiEnabled} onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
          </label>
        )}
        <AiButton label="Break down my syllabus" busyLabel="Reading…" enabled={aiEnabled} busy={busy} disabled={!pdf && !text.trim()} onClick={breakDown} />
      </div>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}

function PlanOverview({ moduleId }: { moduleId: string }) {
  const plan = useStudyStore((s) => s.plans[moduleId]);
  const tasks = useStudyStore((s) => s.tasks);
  if (!plan) return null;
  const { summary, warnings } = plan;
  const upcoming = tasks.filter((t) => t.moduleId === moduleId && t.status === "todo").slice(0, 60);
  const days = [...new Set(upcoming.map((t) => t.date))].slice(0, 7);
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {[
          ["Topics left", String(summary.unitsLeft)],
          ["Time left", minutesLabel(summary.minutesLeft)],
          ["New material / day", summary.unitsLeft ? minutesLabel(summary.pace) : "—"],
          [summary.examMode ? "Review buffer" : "Mode", summary.examMode ? `${summary.bufferDays} day${summary.bufferDays === 1 ? "" : "s"}` : "At your pace"],
        ].map(([k, v]) => (
          <div key={k} className="well px-3 py-2">
            <dt className="text-xs text-ink-muted">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      {warnings.map((w) => (
        <p key={w.kind} role="note" className="well px-3 py-2 text-sm">
          {w.message}
        </p>
      ))}
      {summary.finishDate && <p className="text-sm text-ink-muted">New material finishes {dayFmt.format(parseDay(summary.finishDate))}; after that it&rsquo;s review and mixed practice.</p>}
      {days.length > 0 && (
        <ol className="flex flex-col gap-2" aria-label="Next days">
          {days.map((d) => (
            <li key={d}>
              <h4 className="text-xs font-semibold text-ink-muted">{dayFmt.format(parseDay(d))}</h4>
              <ul className="mt-1 flex flex-col gap-1">
                {upcoming
                  .filter((t) => t.date === d)
                  .map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-sm">
                      <KindBadge kind={t.kind} />
                      <span className="min-w-0 flex-1 truncate">{t.title}</span>
                      <span className="text-xs text-ink-muted">{minutesLabel(t.estMinutes)}</span>
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** After the exam: how did it go? Compare with the target, then put the module away on the shelf. */
function FinishModule({ moduleId }: { moduleId: string }) {
  const mod = useStudyStore((s) => s.modules.find((m) => m.id === moduleId));
  const archiveModule = useStudyStore((s) => s.archiveModule);
  const [grade, setGrade] = useState("");
  const [open, setOpen] = useState(false);
  const id = useId();
  const today = dayKey(useNow(60_000));
  if (!mod) return null;
  const examPassed = Boolean(mod.examDate && mod.examDate < today);
  if (!open && !examPassed)
    return (
      <button type="button" className="btn btn-soft self-start text-sm" onClick={() => setOpen(true)}>
        Finish this module
      </button>
    );
  return (
    <section aria-labelledby={`${id}-finish`} className="well flex flex-col gap-2 p-3">
      <h3 id={`${id}-finish`} className="font-display">
        {examPassed ? "How did the exam go?" : "Finish this module"}
      </h3>
      <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-grade`}>
        Grade you got {mod.targetGrade && <span className="text-xs text-ink-muted">(you aimed for {mod.targetGrade})</span>}
        <input id={`${id}-grade`} className="field" maxLength={20} value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. B+, 15/20, passed" />
      </label>
      <p className="text-xs text-ink-muted">Whatever it was, you showed up. The module goes into a box on your shelf, and its history stays.</p>
      <button type="button" className="btn btn-accent self-start text-sm" onClick={() => archiveModule(mod.id, grade)}>
        Put it on the shelf
      </button>
    </section>
  );
}

/** One module: its settings, curriculum and plan. */
export function ModuleDetail({ moduleId, onDeleted }: { moduleId: string; onDeleted: () => void }) {
  const mod = useStudyStore((s) => s.modules.find((m) => m.id === moduleId));
  const { updateModule, deleteModule } = useStudyStore.getState();
  const [confirming, setConfirming] = useState(false);
  const id = useId();
  if (!mod) return null;

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby={`${id}-settings`} className="flex flex-col gap-3">
        <h3 id={`${id}-settings`} className="label">
          Settings
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-name`}>
            Name
            <input id={`${id}-name`} className="field" defaultValue={mod.name} maxLength={80} onBlur={(e) => e.target.value.trim() && updateModule(mod.id, { name: e.target.value.trim() })} />
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-exam`}>
            Exam date
            <input id={`${id}-exam`} type="date" className="field" value={mod.examDate ?? ""} onChange={(e) => updateModule(mod.id, { examDate: e.target.value || null })} />
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-grade`}>
            Target grade
            <input id={`${id}-grade`} className="field" defaultValue={mod.targetGrade ?? ""} maxLength={20} onBlur={(e) => updateModule(mod.id, { targetGrade: e.target.value.trim() || null })} />
          </label>
        </div>
      </section>

      <section aria-labelledby={`${id}-plan`} className="flex flex-col gap-3">
        <h3 id={`${id}-plan`} className="label">
          Plan
        </h3>
        <PlanOverview moduleId={mod.id} />
      </section>

      <section aria-labelledby={`${id}-curriculum`} className="flex flex-col gap-3">
        <h3 id={`${id}-curriculum`} className="label">
          Curriculum
        </h3>
        <CurriculumEditor moduleId={mod.id} />
        <OutlineImport moduleId={mod.id} />
      </section>

      <FinishModule moduleId={mod.id} />

      <div className="flex items-center gap-2">
        {confirming ? (
          <>
            <span className="text-sm">Delete {mod.name} with its plan and cards?</span>
            <button
              type="button"
              className="btn btn-accent text-sm"
              onClick={() => {
                deleteModule(mod.id);
                onDeleted();
              }}
            >
              Delete
            </button>
            <button type="button" className="btn btn-soft text-sm" onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-soft text-sm" onClick={() => setConfirming(true)}>
            <TrashIcon size={16} /> Delete module
          </button>
        )}
      </div>
    </div>
  );
}
