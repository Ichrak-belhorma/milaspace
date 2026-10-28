# Mila

A cozy, fully customizable virtual study space by **Mila Space**: an atmospheric 3D study room you make
your own, plus a study engine that turns "exam on June 12" into daily progress.

> Status: **Phase 1 (the Space and theming)** is built. See [`docs/PLAN.md`](docs/PLAN.md) for the full
> plan and the phases ahead.

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

Phase 1 needs no environment variables or accounts; everything is saved in the browser (localStorage).

## Architecture

```
src/
  app/          Next.js App Router entry (layout, page). The app is client-rendered after a themed splash.
  theme/        Theme engine: zod schema, 4 presets, CSS-variable mapping, contrast checks, ornaments, cursors, import/export
  components/   Glass UI: glass/ (GlassSurface + controls), chrome/ (navbar, panels, timer, object bar, study view)
  scene/        React Three Fiber room: Scene, CameraRig, Lighting, Room, objects/, weather/, decor/, assets/registry.ts
  audio/        Web Audio engine, procedural sounds, and the audio registry
  timer/        Pure Pomodoro state machine + focus stats (unit-tested)
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

## What's stubbed in Phase 1

- Accounts and cloud sync (Phase 2): everything persists to localStorage.
- Study engine: the laptop's Flashcards and Practice tabs, and backward planning, are labeled placeholders.
- Décor shop and focus-minute currency (Phase 3): two starter items (poster, fairy lights) fill their slots.
- All 3D models are placeholder primitives; all audio is procedural.
