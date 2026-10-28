# Mila — Implementation Plan

Status: **Phase 1 complete**, plus room additions (sit at the desk with close-ups, bed with look-around and sleep,
nightstand phone, drink choice, custom painting, curtains). **Phase 2 complete except AI**: Supabase auth and sync,
modules, curriculum editor (outline import), backward planner, daily tasks, FSRS flashcards. The AI routes
(`/api/ai/curriculum`, `/api/ai/flashcards`) validate input and return 501 until the model integration lands.

## Stack (pinned at current stable)

Next.js 16 (App Router, TS strict) · React 19 · @react-three/fiber 9 + drei 10 · three 0.186 ·
Zustand 5 · Tailwind CSS 4 · Supabase (`@supabase/ssr`) · Anthropic SDK (server routes only) ·
ts-fsrs 5 · Web Audio · KaTeX · CodeMirror 6 · zod 4 · Vitest · Playwright (smoke/screenshots).
(Howler was dropped: one Web Audio graph handles procedural sound, files and the window filter.)
Package manager: npm. Fonts self-hosted via `@fontsource/*` (no build-time network dependency).

## Key design decisions

- **Theme = JSON, two halves.** `tokens` (CSS custom properties written on `:root`) and `room`
  (wall/floor colors, light color/intensity, consumed by the R3F scene via Zustand — three.js needs JS values,
  not CSS vars). Tailwind v4 `@theme inline` maps utilities to the vars, so components never hold a color.
  A zod schema validates presets, user edits and imported JSON.
- **Contrast is tested, not eyeballed.** A Vitest suite composites each preset's glass tint at its opacity over
  dark and light backdrop samples and asserts WCAG AA (4.5:1 body, 3:1 large/UI) for text tokens. The theme
  editor shows a live contrast warning when a user override fails.
- **`<GlassSurface ornament="lace|bubbles|vines|none">`** is the one glass primitive: translucent tint +
  `backdrop-filter` + inner highlight + border; an ornament layer (inline SVG pattern as `mask-image`) along the
  edges with a feathered gradient mask and a blur band at the seam. Default ornament comes from the theme token.
  `@supports not (backdrop-filter)` fallback raises opacity to a near-solid tint.
- **Room is a fixed-camera diorama.** Parallax = small camera offset lerped toward the pointer (disabled under
  `prefers-reduced-motion`). Clicking the laptop tweens the camera to the screen, then opens the glass study view
  (Esc to return). Every mesh comes from `scene/assets/registry.ts` (id → placeholder component | `.glb` URL),
  so swapping in real models is a one-line change per asset. `PerformanceMonitor` adapts DPR; assets lazy-load
  via `Suspense`.
- **Keyboard parity for 3D.** Each interactable registers in a store; a focusable DOM "object bar" mirrors them
  (Tab/Enter triggers the object and highlights it in the scene).
- **Timer uses wall-clock end timestamps**, not interval decrements, so throttled background tabs stay accurate.
- **Audio:** ambient layers (rain, café, fireplace) are procedural Web Audio placeholders (filtered noise and
  crackle) behind an audio registry; real CC0/licensed files drop in later. The music player plays from a track
  registry (empty until you supply licensed lo-fi tracks) and accepts a local file.
- **Phase 1 persists to localStorage** (Zustand `persist`); Phase 2 migrates theme, room and timer history to
  Supabase on first sign-in. The app works signed-out.
- **AI:** route handlers validate input with zod, require auth, rate-limit per user, use structured JSON output,
  and return typed errors the UI can show gently. Syllabus PDFs go to Claude as document blocks (no local PDF
  parsing). Model ID comes from env with a sensible default.
- **Scheduling is pure TS** (no I/O), so it is fully unit-tested; adaptation = idempotent `replan(today)` that
  rewrites only future, auto-generated, not-done tasks and keeps manual and completed ones.

## Folder structure

```
src/
  app/
    layout.tsx  page.tsx  globals.css           # room + HUD at "/"
    (auth)/login/  auth/callback/               # P2
    api/ai/{curriculum,flashcards,practice}/route.ts   # P2/P3
    api/focus/route.ts  api/shop/route.ts       # P3 (server-validated currency)
    u/[username]/page.tsx  rooms/[id]/page.tsx  # P4
  theme/        schema.ts  presets/{gothic,aero,cottage,minimal}.ts  apply.ts  contrast.ts  ornaments.ts
  components/
    glass/      GlassSurface  GlassButton  GlassSlider  GlassModal  GlassTabs
    chrome/     Navbar  TimerWidget  AmbiencePanel  ThemeEditor/  NotebookPanel  ObjectBar  StudyView/
    study/      CurriculumTree  FlashcardReview  MathPractice  CodePractice     # P2/P3
  scene/
    Scene.tsx  CameraRig.tsx  Lighting.tsx  Room.tsx  Interactable.tsx
    objects/    DeskLamp  Window  Mug  Drawer  Laptop  Notebook  Fidget  WallSlots  Polaroid
    weather/    Rain  Snow  SkyBackdrop
    assets/registry.ts                           # the GLB swap point
  audio/        engine.ts  registry.ts  procedural/{noise,crackle,murmur}.ts
  study/        scheduler/  fsrs/  curriculum/  practice/   (pure logic + tests)
  items/        registry.ts                       # P3 shop items: id, name, category, price, tags, modelRef, slots
  stores/       theme  room  timer  audio  ui  study
  lib/          supabase/{client,server,middleware}.ts  ai/{client,prompts,schemas}.ts  rateLimit.ts
supabase/migrations/   0001_init.sql …
tests/e2e/             Playwright smoke + per-preset screenshots
```

## Data model (Supabase Postgres, RLS on every table)

Static catalogs (decor items, presets, audio) live in code registries; the DB stores only user state.
Ids are generated on the device (local-first), so user tables use `(user_id, id)` primary keys. Generated plan
tasks are not stored; only task history (done/skipped) and manual tasks are.

| Table | Key columns | Phase |
|---|---|---|
| `profiles` | id (=auth.users), username, display_name, avatar_url, bio, active_theme jsonb, settings jsonb (timer, audio, motion), showcase jsonb, is_public | 2 (public fields used in 4) |
| `themes` | id, owner_id, name, tokens jsonb, room jsonb, is_public, forked_from, likes_count | 2 (sharing in 4) |
| `room_state` | user_id PK, state jsonb (lamp, window, curtains, drink, phone), painting_path, slots jsonb | 2 |
| `modules` | id, user_id, name, exam_date?, target_grade?, syllabus_text?, syllabus_path?, color, daily_minutes? | 2 |
| `curriculum_nodes` | id, module_id, parent_id, kind (chapter/concept/skill), title, position, content_type (memorize/math/coding/conceptual), est_minutes, mastery 0–1, user_edited | 2 |
| `study_tasks` | id, user_id, module_id, node_id?, date, kind (learn/review/flashcards/practice/buffer), est_minutes, status (todo/done/skipped), source (auto/manual), completed_at | 2 |
| `flashcards` | id, user_id, module_id, node_id?, front, back, FSRS fields (due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review) | 2 |
| `review_logs` | id, card_id, rating, state, due, stability, difficulty, reviewed_at | 2 |
| `practice_items` | id, module_id, node_id, kind (math/coding), prompt, solution_steps jsonb, language?, starter_code?, tests jsonb | 3 |
| `practice_attempts` | id, user_id, item_id, correct, score, created_at | 3 |
| `focus_sessions` | id, user_id, module_id?, started_at, ended_at, focus_minutes, completed | 2 (currency in 3) |
| `todos` | id, user_id, text, done, day, created_at, done_at, updated_at (the notebook's own to-dos) | 2 |
| `currency_ledger` | id, user_id, delta, reason (focus/purchase/bonus), ref_id, created_at (balance = sum; written only server-side) | 3 |
| `user_items` | user_id, item_id, acquired_at | 3 |
| `polaroids` | id, user_id, storage_path, caption, created_at (Storage bucket `polaroids`) | 3 |
| `study_rooms` / `study_room_members` | id, host_id, name, is_public, theme_id / room_id, user_id, joined_at (live timers via Supabase Realtime presence, not tables) | 4 |
| `theme_likes`, `follows` | composite PKs | 4 |

Streaks and per-module stats are SQL views over `focus_sessions` (no denormalized counters to drift).

## Study engine algorithm (Phase 2)

1. Flatten the curriculum tree into ordered concepts with effort (`est_minutes`, weighted by content type).
2. Window = today → exam date minus a review buffer (max(2 days, 15% of the window)).
3. Assign `learn` tasks to fit the daily minute budget (default 60 min, user-editable); after each learn, add
   expanding `review` touches (+1, +3, +7 days) and put mixed-topic `practice` on buffer days (interleaving).
4. FSRS due cards become one daily `flashcards` task per module.
5. No exam date → rolling mode: steady pace with no buffer. No curriculum → flashcards and manual tasks only.
6. `replan(today)` runs on load and after reviews: missed tasks roll forward, weak concepts (low mastery or
   failed reviews) get extra review slots, and an overloaded window warns instead of silently overpacking.

## Phases

**Phase 1: Space and theming** (this is what I'd build first)
1. Scaffold: Next 16, TS strict, Tailwind 4 wired to tokens, ESLint, Vitest, Playwright.
2. Theme engine: schema, 4 presets, apply, persistence, editor (color pickers, blur/opacity/radius sliders,
   fonts, ornament, cursor), live preview, JSON import/export, contrast tests.
3. Glass primitives and the ornament-edged floating navbar, with the no-blur fallback.
4. 3D room with placeholder meshes: lamp (on/off, warmth, brightness), window (open/close plus 5 weathers that
   change sky, light and ambience), mug with steam, drawer with notebook and flashcards, laptop zoom into the
   study-view shell, notebook (local to-dos), fidget pen with click animation and sound. Theme tints the room.
5. Pomodoro timer (configurable, session log, streak stub) and ambience panel (3 layers with per-layer volume,
   music player).
6. Verify: typecheck, lint, unit tests, production build, Playwright screenshots of all 4 presets, then a summary.

**Phase 2: Accounts and the study engine:** Supabase auth and migrations, local→cloud migration, modules CRUD,
`/api/ai/curriculum` with an editable tree, scheduler and replan, daily to-dos in the notebook, AI flashcard
generation with an editor, FSRS review UI. Tests for the scheduler and FSRS.

**Phase 3: Practice and rewards:** math practice (KaTeX, stepwise reveal), coding practice (CodeMirror plus test
runner in a sandboxed Web Worker; JS/TS first, Python via Pyodide later), server-validated focus currency,
item shop, slot customization, Polaroid uploads.

**Phase 4: Community:** public profiles, theme gallery (share, fork, like), study-together rooms with Realtime
presence (avatars and live timers).

## What I need from you (by Phase 2)

- A Supabase project URL and anon key (plus service role key for server-only writes) and an Anthropic API key,
  as environment variables. I'll ship `.env.example` and the SQL migrations; you run `supabase db push`.
- Licensed or CC0 lo-fi tracks and ambient recordings whenever you have them (placeholders until then).
