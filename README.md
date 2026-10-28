# Mila

A cozy, fully customizable virtual study space by **Mila Space**: an atmospheric 3D study room you make
your own, plus a study engine that turns "exam on June 12" into daily progress.

> Status: **Phase 1 (the Space)** and **Phase 2 (accounts and the study engine)** are built; the AI parts of
> Phase 2 have their routes and contracts in place but are switched off. See [`docs/PLAN.md`](docs/PLAN.md).

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

## Supabase setup (once)

1. In the Supabase dashboard → SQL editor, run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   (tables, row-level security, the `room-images` storage bucket). `0002_future.sql` adds the Phase 3/4 tables;
   it is safe to run now or later.
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
  lib/ai/       AI contracts (zod) and the route guard; app/api/ai/* validate input and answer 501 for now
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
- Lamp, window and weather, drawer, laptop (study view) and fidget spinner as before.

## Studying

Laptop → **Modules**: add a module (only the name is required), optionally an exam date, target grade, daily
time and a pasted course outline (indent subtopics; "(30m)" or "[2h]" sets time). The outline becomes an editable
chapter → concept → skill tree, and the planner works backwards from the exam: new material first (fit to your
daily time), reviews 1, 3 and 7 days after each topic, a buffer before the exam with interleaved mixed practice,
and a light final review. Missed or skipped work rolls forward; shaky topics get extra reviews; an impossible
schedule shows a warning instead of silently overpacking. **Today** (and the desk notebook) list the day's tasks.
**Flashcards** uses FSRS spaced repetition.

## Still to come

- AI curriculum breakdown and flashcard generation (routes and contracts exist; buttons say "soon").
- Practice (math with KaTeX, coding with tests) and the focus-minute currency, shop and décor slots: Phase 3.
- Community profiles, theme sharing, study-together rooms: Phase 4 (tables in `0002_future.sql`).
- All 3D models are placeholder primitives; all audio is procedural.
