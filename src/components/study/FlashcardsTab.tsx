"use client";

import { useId, useMemo, useState } from "react";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { useNow } from "@/hooks/useNow";
import { dueCardsFor, useStudyStore } from "@/stores/study";
import { previewIntervals, RATINGS, type ReviewRating } from "@/study/fsrs";
import { leafUnits } from "@/study/tree";
import { AiButton, EmptyState } from "./shared";

const RATING_LABEL: Record<ReviewRating, string> = { again: "Again", hard: "Hard", good: "Good", easy: "Easy" };

/** One card at a time: recall first, then reveal, then rate. Retrieval before re-reading. */
function ReviewSession({ moduleId }: { moduleId: string | null }) {
  const cards = useStudyStore((s) => s.cards);
  const reviewCard = useStudyStore((s) => s.reviewCard);
  const replan = useStudyStore((s) => s.replan);
  const now = useNow(30_000);
  const due = useMemo(() => dueCardsFor(cards, new Date(now), moduleId ?? undefined), [cards, now, moduleId]);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const card = due[0];

  if (!card) {
    return (
      <div className="well flex flex-col items-start gap-2 p-4">
        <p className="font-display">{reviewed ? `Done: ${reviewed} card${reviewed === 1 ? "" : "s"} reviewed.` : "No cards due right now."}</p>
        <p className="text-sm text-ink-muted">Cards come back right before you&rsquo;d forget them.</p>
      </div>
    );
  }

  const preview = previewIntervals(card.fsrs, new Date());
  const rate = (r: ReviewRating) => {
    reviewCard(card.id, r);
    setRevealed(false);
    setReviewed((n) => n + 1);
    if (due.length === 1) replan();
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink-muted" aria-live="polite">
        {due.length} due · {reviewed} reviewed this session
      </p>
      <div className="well flex min-h-40 flex-col justify-center gap-3 p-5 text-center">
        <p className="font-display text-xl whitespace-pre-wrap">{card.front}</p>
        {revealed && (
          <>
            <hr className="border-ink/20" />
            <p className="whitespace-pre-wrap">{card.back}</p>
          </>
        )}
      </div>
      {!revealed ? (
        <button type="button" className="btn btn-accent" onClick={() => setRevealed(true)} autoFocus>
          Show answer
        </button>
      ) : (
        <div role="group" aria-label="How well did you remember?" className="grid grid-cols-4 gap-2">
          {RATINGS.map((r) => (
            <button key={r} type="button" className={`btn ${r === "good" ? "btn-accent" : "btn-soft"} flex-col gap-0 text-sm`} onClick={() => rate(r)}>
              {RATING_LABEL[r]}
              <span className="text-xs font-normal opacity-80">{preview[r]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CardEditor({ moduleId }: { moduleId: string }) {
  const nodes = useStudyStore((s) => s.nodes);
  const cards = useStudyStore((s) => s.cards);
  const { addCard, deleteCard } = useStudyStore.getState();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [nodeId, setNodeId] = useState("");
  const id = useId();
  const units = leafUnits(nodes, moduleId);
  const mine = cards.filter((c) => c.moduleId === moduleId);

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addCard(moduleId, front, back, nodeId || null);
          setFront("");
          setBack("");
          document.getElementById(`${id}-front`)?.focus();
        }}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-front`}>
            Question
            <textarea id={`${id}-front`} className="field h-20" value={front} maxLength={1000} onChange={(e) => setFront(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-back`}>
            Answer
            <textarea id={`${id}-back`} className="field h-20" value={back} maxLength={2000} onChange={(e) => setBack(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {units.length > 0 && (
            <>
              <label htmlFor={`${id}-topic`} className="text-sm">
                Topic
              </label>
              <select id={`${id}-topic`} className="field w-auto max-w-56 py-1 text-sm" value={nodeId} onChange={(e) => setNodeId(e.target.value)}>
                <option value="">None</option>
                {units.map((u) => (
                  <option key={u.nodeId} value={u.nodeId}>
                    {u.title}
                  </option>
                ))}
              </select>
            </>
          )}
          <button type="submit" className="btn btn-accent text-sm" disabled={!front.trim() || !back.trim()}>
            <PlusIcon size={16} /> Add card
          </button>
          <AiButton label="Generate from my notes" />
        </div>
      </form>
      {mine.length === 0 ? (
        <EmptyState>No cards in this module yet. Short, single-fact questions work best.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-1" aria-label="Cards">
          {mine.map((c) => (
            <li key={c.id} className="well flex items-center gap-2 px-3 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate">{c.front}</span>
              <span className="text-xs text-ink-muted">{c.fsrs.state === "new" ? "new" : `due ${new Date(c.fsrs.due).toLocaleDateString()}`}</span>
              <button type="button" className="btn btn-icon min-h-7 min-w-7 p-1" onClick={() => deleteCard(c.id)} aria-label={`Delete card ${c.front}`}>
                <TrashIcon size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FlashcardsTab() {
  const modules = useStudyStore((s) => s.modules);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const id = useId();
  const editing = moduleId ?? modules[0]?.id ?? null;

  if (modules.length === 0) return <EmptyState>Create a module first; its cards live with it.</EmptyState>;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-sm">
          Module
        </label>
        <select id={id} className="field w-auto py-1 text-sm" value={moduleId ?? ""} onChange={(e) => setModuleId(e.target.value || null)}>
          <option value="">All modules</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <section aria-labelledby={`${id}-review`} className="flex flex-col gap-2">
        <h3 id={`${id}-review`} className="label">
          Review
        </h3>
        <ReviewSession key={moduleId ?? "all"} moduleId={moduleId} />
      </section>
      {editing && (
        <section aria-labelledby={`${id}-edit`} className="flex flex-col gap-2">
          <h3 id={`${id}-edit`} className="label">
            Cards in {modules.find((m) => m.id === editing)?.name}
          </h3>
          <CardEditor moduleId={editing} />
        </section>
      )}
    </div>
  );
}
