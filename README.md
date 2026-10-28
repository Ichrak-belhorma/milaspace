# Mila

A cozy, fully customizable virtual study space by **Mila Space**: an atmospheric 3D study room you make
your own, plus a study engine that turns "exam on June 12" into daily progress.

> Status: **Phase 1 (the Space)** and **Phase 2 (accounts and the study engine, including AI)** are built.
> AI needs a server-side Anthropic key. See [`docs/PLAN.md`](docs/PLAN.md).

## Run it

Requires Node 20.9+.

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / server |
| `npm run check` | Typecheck + lint + unit tests |
| `npm test` | Unit tests (Vitest): theme engine, contrast, timer |
| `npm run test:e2e` | Browser smoke tests (Playwright); builds must exist (`npm run build`) |

Copy `.env.example` to `.env.local` for cloud sync (it already contains the project's public Supabase URL
and publishable key). Without it Mila runs fully local: everything is saved in the browser.

For AI (syllabus PDF → curriculum and plan, notes → flashcards), add `ANTHROPIC_API_KEY` to `.env.local` (server
only, never `NEXT_PUBLIC_`). `MILA_AI_MODEL` optionally overrides the default model (`claude-opus-5-5`). Without a
key the AI buttons show "off" and everything else works. AI routes require sign-in when Supabase is configured and
are rate-limited to 12 requests per hour per user.

## Supabase setup (once)

1. In the Supabase dashboard → SQL editor, run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   (tables, row-level security, the `room-images` storage bucket), then
   [`0003_schedule.sql`](supabase/migrations/0003_schedule.sql) (module archive and grade, task time blocks,
   task-linked focus sessions). `0002_future.sql` adds the Phase 3/4 tables; it is safe to run now or later.
2. Authentication → URL configuration: set the Site URL (e.g. `http://localhost:3000`) and add
   `http://localhost:3000/auth/callback` (and your production equivalent) to the redirect URLs.
3. Sign up from the Account button in the navbar. With email confirmation on, the email link signs you in.

Until the migration runs, signing in works but the Account panel says sync needs setup; nothing local is lost.

### How sync works

Local-first: every store saves to the device immediately, and when you are signed in a sync engine mirrors it to
Postgres (`src/lib/sync`). Merges are last-write-wins per row; deletions are detected from the ids last seen on
the server, so they propagate across devices. Generated plan tasks are never stored: each device re-derives them
from modules, topics, flashcards and task history with the deterministic planner. Data made while signed out is
merged into the first account that signs in; signing out removes personal study data from the device.

## Architecture

```
src/
  app/          Next.js App Router entry (layout, page). The app is client-rendered after a themed splash.
  theme/        Theme engine: zod schema, 4 presets, CSS-variable mapping, contrast checks, ornaments, cursors, import/export
  components/   Glass UI: glass/ (GlassSurface + controls), chrome/ (navbar, panels, timer, object bar, study view)
  scene/        React Three Fiber room: Scene, CameraRig, Lighting, Room, objects/, weather/, decor/, assets/registry.ts
  audio/        Web Audio engine, procedural sounds, and the audio registry
  timer/        Pure Pomodoro state machine + focus stats (unit-tested)
  study/        Study engine: outline parser, backward planner, FSRS wrapper, curriculum tree (all pure, unit-tested)
  lib/sync/     Local-first Supabase sync (pure reconcile + validated row mappers + engine)
  lib/ai/       AI contracts (zod), prompts, structured-output calls (server only); app/api/ai/* routes
  stores/       Zustand stores (theme, room, timer, audio, ui, notebook) and shared object actions
  items/        Décor item registry (prices are in focus minutes; the shop arrives in Phase 3)
```

Key rules:

- **No hard-coded colors in components.** Tailwind's default palette is disabled; utilities like `text-ink`,
  `bg-accent` and `rounded-glass` map to theme CSS variables (`src/app/globals.css`).
- **One glass primitive.** `<GlassSurface ornament="theme|lace|bubbles|vines|none" edges={["top","bottom"]}>`
  renders blur, tint, highlight, shadow/glow and the feathered ornamental edge. Its layers are siblings because
  nested `backdrop-filter` elements cannot see the scene.
- **Decorating never blocks studying.** Panels are non-modal; the timer and object bar stay usable.
- **Every room object is reachable by keyboard** through the object bar (focusing a button highlights the object).

## Theming

A theme is JSON with `tokens` (UI → CSS variables) and `room` (3D palette):

```json
{ "schema": "mila.theme/1", "id": "…", "name": "Midnight study",
  "tokens": { "glassTint": "#1a0f22", "glassOpacity": 0.62, "glassBlur": 18, "ornament": "lace", "fontDisplay": "cinzel", "…": "…" },
  "room":   { "wall": "#3a2845", "floor": "#3a2529", "accentLight": "#ffb46b", "…": "…" } }
```

The theme editor (navbar → Theme) edits any token with a live preview, flags WCAG contrast failures, saves custom
themes, and exports/imports JSON. Imported JSON is validated (colors must be `#rrggbb`, fonts/ornaments/cursors are
enums) and always becomes a new custom theme. `src/theme/theme.test.ts` asserts every preset meets AA contrast.

## Swapping in real assets

- **3D models:** add `.glb` files under `public/models/` and change the entry in
  [`src/scene/assets/registry.ts`](src/scene/assets/registry.ts), e.g.
  `lamp.body: { kind: "gltf", url: "/models/lamp.glb" }`. Each placeholder documents its origin and
  orientation; match them and no scene code changes. Moving parts (drawer box, laptop lid, window panes) are
  separate assets.
- **Audio:** add files under `public/audio/` and list them in [`src/audio/registry.ts`](src/audio/registry.ts)
  (`{ kind: "file", src: "/audio/rain.mp3" }`). Until then, every sound is synthesized: rain, café, fireplace,
  weather, room sound effects, and "Mila Radio", a generative lo-fi stream. Users can also play their own music files.

## In the room

Click things (or use the object bar at the bottom, which mirrors every object for keyboard users):

- **Desk chair**: sit down. Seated, desk objects open close-ups: the notebook opens on today's handwritten page,
  the spinner, your drink, the lamp. Esc steps back (close-up → desk → standing).
- **Bed**: get under the covers and look around with the mouse (sheets rustle as you move). Close your eyes for a
  nap with an optional alarm: eyelids leave a slit of the room, ZZZs drift up, and you can still look around.
- **Phone** on the nightstand: clock, music controls, today's focus, and "flip face-down" while you study.
- **Drink**: coffee, tea, matcha latte, hot chocolate or water; hot drinks steam until they cool.
- **Painting**: hang your own picture (cropped to the frame, kept on the device, synced when signed in).
- **Curtains**: draw them to dim the daylight and muffle the weather.
- **Wall calendar**: exam days circled in red, studied days crossed off by hand. Click to zoom in, pick a day to see
  its plan, page through months, and export the whole plan as `.ics` for Google or Apple Calendar.
- **Study buddy**: someone working at the desk under the window (body doubling). They type, write and think while
  you focus, and stretch or read on your breaks. "Start together" begins a 5-minute session. Can be hidden.
- **Visible time**: a sticky note counts down to your next exam; the candle burns down during a focus session.
- **Progress**: the plant grows with your study days (flowers after 30), and finished modules become labelled
  boxes on the shelf.
- **Phone alarm**: set a wake-up time on the phone; it rings (and wakes you from a nap) with Stop and Snooze.
- Lamp, window and weather, drawer, laptop (study view) and fidget spinner as before.

## Studying

Laptop → **Modules**: add a module (only the name is required), optionally an exam date, target grade, a
pasted course outline (indent subtopics; "(30m)" or "[2h]" sets time) or, with AI on, a **syllabus PDF** that is
broken down into topics for you. The curriculum is an editable chapter → concept → skill tree.

**Schedule**: one daily study budget shared by all modules, and a weekly grid of when you're free (drag to paint).
The planner fits everything into that time: modules compete by exam date (the nearest exam goes first), new
material first, reviews 1, 3 and 7 days after each topic, a buffer before each exam with interleaved practice,
and timed blocks inside your free hours. Estimates learn from you: finishing tasks teaches Mila your pace (e.g.
"you take about 1.4× the estimate"). An impossible schedule shows a warning instead of silently overpacking.

**Today** (and the desk notebook) list the day's blocks with start times. Press play on a task to focus on it;
when the session ends Mila asks: done, need more time, or stuck (stuck lowers that topic's mastery and adds a
gentle "revisit" task tomorrow). "Just start: 5 minutes" commits you to five minutes on the next task, then asks
whether to keep going. Missed work quietly moves forward: no red overdue counters.

**Flashcards** uses FSRS spaced repetition; with AI on, paste notes to generate cards.

After the exam, **Finish module** records your grade against your target and puts the module on the shelf.

## Still to come

- Polaroids for study milestones.
- Practice (math with KaTeX, coding with tests) and the focus-minute currency, shop and décor slots: Phase 3.
- Community profiles, theme sharing, study-together rooms: Phase 4 (tables in `0002_future.sql`).
- All 3D models are placeholder primitives; all audio is procedural.
