# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (localhost:5173)
npm run build      # Type-check + production build (tsc -b && vite build)
npm run lint       # ESLint
npm run preview    # Serve the production build locally
```

There are no tests yet. Type errors are caught by `npm run build`.

## Architecture

Static SPA: React 19 + Vite 8 + TypeScript, styled with Tailwind CSS v4 (imported via `@tailwindcss/vite` plugin, not PostCSS). Routing is client-side only via React Router v7 (`createBrowserRouter`).

### Adding a new mathematical model

1. **Register** it in `src/data/modelRegistry.ts` — add a `ModelMeta` entry to the appropriate `Category` (or create a new category). The `path` field becomes the URL.
2. **Implement** it under `src/models/<id>/index.tsx` (default export = React page component).
3. **Route** it in `src/routes/index.tsx` — replace the `ModelPlaceholderPage` fallback with the new component for that model's `id`.

Models not yet implemented use `ModelPlaceholderPage` automatically (the route map in `routes/index.tsx` falls back to it for any unrecognised `model.id`).

### Model file convention

```
src/models/<id>/
├── index.tsx       UI component (state, refs, event handlers, JSX)
├── solids.ts / simulation.ts   Pure math/geometry (no React)
└── render.ts       Canvas drawing helpers (pure functions)
```

The polyhedra model (`src/models/polyhedra/`) is the reference implementation.

### Canvas animation pattern (see `polyhedra/index.tsx`)

- Mutable per-frame state (`rotX`, `rotY`, `zoom`, drag flags) → `useRef`; never causes re-renders.
- UI-visible state (`show` flags, `autoRotate`, `currentSolid`) → `useState`.
- Animation loop lives in a `useEffect` with `[solidData, show, autoRotate, usePersp]` deps; cleanup cancels `requestAnimationFrame`.
- Touch events and `wheel` need `{ passive: false }` and are registered in separate `useEffect` hooks.

### Projection model (`src/models/polyhedra/render.ts`)

Vertices are normalized to circumradius = 1. Projection divisor is `3.5` for parallel mode; initial zoom = 350 gives a ~100 px projected radius on the 480 px canvas. Depth fade for edges: `alpha = 0.15 + 0.85 * max(0, (z+1)/2)` maps back(z=−1)→0.15 to front(z=+1)→1.0.

### Visualization libraries (installed, not yet used outside polyhedra)

| Library | Intended use |
|---------|--------------|
| `recharts` | 2D time-series charts (ODE models) |
| `three` | 3D scenes beyond simple canvas (Lorenz attractor etc.) |
| `katex` | Math formula rendering |
