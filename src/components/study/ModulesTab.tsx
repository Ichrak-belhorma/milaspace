"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/icons";
import { useStudyStore } from "@/stores/study";
import { ModuleDetail } from "./ModuleDetail";
import { ModuleForm } from "./ModuleForm";

const dateFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

export function ModulesTab() {
  const all = useStudyStore((s) => s.modules);
  const unarchiveModule = useStudyStore((s) => s.unarchiveModule);
  const modules = all.filter((m) => !m.archivedAt);
  const finished = all.filter((m) => m.archivedAt);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const current = modules.find((m) => m.id === selected) ?? (adding ? null : modules[0]);

  return (
    <div className="grid gap-5 md:grid-cols-[13rem_1fr]">
      <nav aria-label="Modules" className="flex flex-col gap-1.5">
        {modules.map((m) => (
          <button
            key={m.id}
            type="button"
            className="btn btn-soft w-full flex-col items-start gap-0.5 text-left text-sm"
            aria-current={current?.id === m.id && !adding ? "true" : undefined}
            data-active={current?.id === m.id && !adding}
            onClick={() => {
              setSelected(m.id);
              setAdding(false);
            }}
          >
            <span className="w-full truncate">{m.name}</span>
            <span className="text-xs font-normal text-ink-muted">{m.examDate ? `Exam ${dateFmt.format(new Date(`${m.examDate}T12:00`))}` : "No exam date"}</span>
          </button>
        ))}
        <button type="button" className="btn btn-accent text-sm" onClick={() => setAdding(true)} aria-pressed={adding}>
          <PlusIcon size={16} /> New module
        </button>
        {finished.length > 0 && (
          <details className="mt-2 text-sm">
            <summary className="label cursor-pointer">On the shelf ({finished.length})</summary>
            <ul className="mt-1 flex flex-col gap-1">
              {finished.map((m) => (
                <li key={m.id} className="well flex items-center gap-2 px-2 py-1">
                  <span className="min-w-0 flex-1 truncate">
                    {m.name}
                    {m.finalGrade && <span className="text-ink-muted"> · {m.finalGrade}</span>}
                    {m.targetGrade && <span className="text-ink-muted"> (aim {m.targetGrade})</span>}
                  </span>
                  <button type="button" className="btn min-h-7 px-2 py-0.5 text-xs" onClick={() => unarchiveModule(m.id)}>
                    Bring back
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </nav>
      <div>
        {adding || !current ? (
          <ModuleForm
            onCreated={(id) => {
              setSelected(id);
              setAdding(false);
            }}
            onCancel={modules.length ? () => setAdding(false) : undefined}
          />
        ) : (
          <ModuleDetail key={current.id} moduleId={current.id} onDeleted={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}
