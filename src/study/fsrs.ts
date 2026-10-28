import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from "ts-fsrs";

/**
 * FSRS spaced repetition (ts-fsrs) behind a JSON-friendly interface: card state is stored with
 * ISO date strings so it can live in localStorage and Postgres unchanged.
 */
export type CardState = {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: "new" | "learning" | "review" | "relearning";
  lastReview: string | null;
};

export type ReviewRating = "again" | "hard" | "good" | "easy";
export const RATINGS: ReviewRating[] = ["again", "hard", "good", "easy"];

export type ReviewLogEntry = {
  rating: ReviewRating;
  state: CardState["state"];
  due: string;
  stability: number;
  difficulty: number;
  reviewedAt: string;
};

const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: false, enable_short_term: true }));

const STATE_NAMES: Record<State, CardState["state"]> = {
  [State.New]: "new",
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};
const STATE_VALUES: Record<CardState["state"], State> = { new: State.New, learning: State.Learning, review: State.Review, relearning: State.Relearning };
const GRADES: Record<ReviewRating, Grade> = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy };

function toState(card: Card): CardState {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: STATE_NAMES[card.state],
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

function toCard(s: CardState): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsedDays,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: STATE_VALUES[s.state],
    last_review: s.lastReview ? new Date(s.lastReview) : undefined,
  };
}

export function newCardState(now: Date): CardState {
  return toState(createEmptyCard(now));
}

export function review(state: CardState, rating: ReviewRating, now: Date): { state: CardState; log: ReviewLogEntry } {
  const { card, log } = scheduler.next(toCard(state), now, GRADES[rating]);
  const next = toState(card);
  return {
    state: next,
    log: { rating, state: STATE_NAMES[log.state], due: next.due, stability: card.stability, difficulty: card.difficulty, reviewedAt: now.toISOString() },
  };
}

/** New cards are always due; others once their due time has passed. */
export function isDue(state: CardState, now: Date): boolean {
  return state.state === "new" || new Date(state.due).getTime() <= now.getTime();
}

function humanize(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min}m`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d}d`;
  const mo = Math.round(d / 30);
  return mo < 12 ? `${mo}mo` : `${Math.round(d / 365)}y`;
}

/** When the card would come back for each rating, e.g. { again: "1m", good: "3d" }. */
export function previewIntervals(state: CardState, now: Date): Record<ReviewRating, string> {
  const preview = scheduler.repeat(toCard(state), now);
  const out = {} as Record<ReviewRating, string>;
  for (const r of RATINGS) out[r] = humanize(preview[GRADES[r]].card.due.getTime() - now.getTime());
  return out;
}

/** Mastery nudges from a review, used to find weak concepts. */
export function masteryAfterReview(mastery: number, rating: ReviewRating): number {
  const delta = { again: -0.2, hard: 0.03, good: 0.08, easy: 0.12 }[rating];
  return Math.min(1, Math.max(0, mastery + delta));
}
