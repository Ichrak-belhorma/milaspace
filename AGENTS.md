<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Mila conventions

- Read `docs/PLAN.md` for the product plan, data model and phases.
- No hard-coded colors in UI components: use the theme utilities (`text-ink`, `text-ink-muted`, `bg-accent`,
  `text-on-accent`, `bg-glass`, `border-edge`, `rounded-glass`, `font-display`, `font-body`). The default
  Tailwind palette is intentionally disabled.
- UI surfaces use `<GlassSurface>`; never nest `backdrop-filter` elements.
- 3D models are resolved through `src/scene/assets/registry.ts`; audio through `src/audio/registry.ts`.
- Keep logic pure and tested where possible (`src/timer`, `src/theme`; Phase 2 adds `src/study`).
- In R3F code, mutate three.js objects through refs or the `useFrame` state argument (React Compiler lint rules).
- Before pushing: `npm run check`, `npm run build`, and `npm run test:e2e`.
