# Project instructions

## Project overview and setup

- Purpose: A cellular-automaton toy in the browser. Pentagon-shaped "houses" (an
  underside, two walls, two roof sides) snap together edge to edge and grow, survive or
  die depending on how many of their sides are connected. The concept is in
  `README.md`; read it before working on simulation rules.
- Stage: Prototype, client only, no backend.
  - Houses: each house is a node in a connection graph. Sides only connect to sides of
    the same kind (underside to underside, wall to wall, roof to roof). New houses are
    placed by transforming them onto a free side of a host house; overlapping placements
    are rejected unless overlap is allowed.
  - Simulation: each tick, every house looks up the behavior for its number of covered
    sides (0–5) in a player-editable rule table: `die`, `nothing` or `grow`. Dying houses
    are removed and disconnected, then growing houses try to attach a new house to a
    random free side. A spatial index speeds up overlap checks.
  - Click actions: clicking a house can start a ripple that travels through the
    connection graph (breadth-first, in hops) and briefly tints the houses it reaches.
  - UI: a pannable and zoomable canvas and a settings sidebar (play/pause, speed, rule
    table, add house, overlap, click action and ripple settings, house geometry,
    colors, debug profiling logs).
- Frontend: React 19 + TypeScript with CSS Modules, built with Vite. The world is drawn
  on a 2D `<canvas>` in `HouseCanvas.tsx`. App state lives in a React context
  (`HouseCanvasProvider`), which runs the tick loop with `setInterval`.
- Runtime and package manager: Node.js 24, npm, TypeScript 6 (`strict` mode).
- Deployment: GitHub Pages via `.github/workflows/deploy.yml` on every push to `main`.
  Vite builds with `base: '/game_of_house'`.
- Environment setup: `npm install`.
- Repository map:
  - `src/types.ts` — shared types and rule constants (houses, sides, geometry, rule
    table and its defaults, ripples).
  - `src/domain/house/` — house model without simulation state: `geometry.ts`
    (polygons, transforms, overlap tests), `graph.ts` (sides, connections),
    `growth.ts` (placing a new house on a free side).
  - `src/engine/simulation/` — one tick: `runTick.ts` (rule application, removal,
    growth), `growFromHost.ts` (growth with the spatial index), `worldState.ts`
    (cached world transforms and spatial index), `profiling.ts` (debug timings),
    `types.ts`.
  - `src/engine/actions/` — click actions; `ripple.ts` computes ripple propagation.
  - `src/context/` — `HouseCanvasProvider.tsx` owns app state and the tick loop;
    `useHouseCanvas.ts` reads it.
  - `src/components/` — `HouseCanvas.tsx` (rendering, pan, zoom, clicks) and
    `Sidebar.tsx` (settings).
  - `public/` — static assets (favicon).
- Rule and design requirements are supplied per task. Do not invent new rules,
  click actions or house shapes; ask.

Before editing, inspect the relevant code, scripts, configuration, and repository
instructions. Use npm and the existing tooling. Do not add or replace dependencies,
frameworks, or development tools without a concrete need for the requested task.
Prefer existing utilities and platform capabilities. Keep credentials out of source
code and committed configuration.

## Commands

Run all commands from the repository root.

| Action | Command |
| --- | --- |
| Install dependencies | `npm install` |
| Start dev server (Vite, port 5173) | `npm run dev` |
| Type-check | `npm run typecheck` |
| Build (type-check + Vite build into `dist/`) | `npm run build` |
| Preview production build | `npm run preview` |
| Lint | Not set up yet |
| Check formatting | Not set up yet |
| Run automated tests | Not set up yet |

Never invent missing commands. When tooling is added, update this table. Report
checks that cannot be run and explain why.

## Clarification and scope

- Inspect the repository first; do not ask questions it can answer.
- If a requirement is ambiguous or several reasonable interpretations exist, ask
  before implementing. Don't silently pick one.
- Ask about choices that are hard to undo or that change what gets built:
  architecture, libraries, data models, simulation rules, file layout.
- Don't ask about trivial things that have an obvious conventional default. Pick it
  and mention it.
- When you ask, offer 2–4 concrete options and say which one you recommend.
- Do not make speculative changes while waiting for a required answer.
- Implement the requested behavior without inventing requirements. Do not silently
  choose the broadest or most production-ready interpretation.
- Do not add visual polish, new responsive behavior, generalized configuration,
  abstractions, defensive infrastructure, or adjacent features unless requested
  or necessary for the requested behavior to work correctly.
- This is a prototype: prefer a minimal working implementation.
- If substantial unmentioned work is necessary, explain why and ask before
  expanding scope.

## General coding principles

- **KISS — Keep It Simple, Stupid:** Prefer clear, direct solutions with few moving
  parts. Avoid cleverness, unnecessary layers, and complexity without a concrete benefit.
- **YAGNI — You Aren't Gonna Need It:** Implement current requirements. Avoid
  speculative features, extension points, and hypothetical future use cases.
  Refactoring to support an actual requirement is welcome.
- **Balance DRY with simplicity:** Extract shared code when it represents the same
  concept or rule and makes the code easier to maintain. Similar-looking code alone
  is insufficient. Keep independent concepts separate, even when their implementations
  currently look alike. Rework an abstraction when it accumulates unrelated flags,
  special cases, or dependencies.
- **Use clear names:** Names should communicate purpose, meaning, and relevant units.
  Prefer `delayInMs` over `t1` with a comment, and `house` and `houses` over `h` and `hs`.
  Use enough words to be unambiguous without adding redundant context.
- **Make code understandable:** Let naming and structure explain routine behavior.
  Add comments for non-obvious intent, constraints, tradeoffs, or algorithms; do not
  narrate obvious code. Keep useful comments accurate when code changes.
- **Preserve consistency:** Follow the surrounding code and documented conventions
  unless they conflict with these instructions. Avoid unrelated style rewrites.
- **Make dependencies explicit:** Pass required data or services through clear
  interfaces. Avoid hidden coupling and unnecessary shared mutable state.

## Simulation code

- Keep simulation logic (`src/domain/`, `src/engine/`) independent of React and
  rendering, so it can run headless and be tested.
- Keep each rule in one authoritative place; do not duplicate it between the
  simulation and the UI. Shared types and rule defaults live in `src/types.ts`.
- Keep tunable numbers (geometry, ripple defaults, placement attempts) in clearly
  named values rather than scattered literals.

## Working with existing code and cleanup

- Before adding code, trace the existing behavior and identify the cause of the
  problem. Form a brief plan for what to keep, change, remove, and add.
- Look for an existing implementation to reuse or adjust before creating another.
- When it makes the requested change easier, perform a small behavior-preserving
  refactor first. Keep it local and verify that existing behavior still works.
- Remove code, styles, imports, dependencies, and comments made obsolete by your
  change, after checking their references and consumers. Do not leave superseded
  implementations, commented-out code, or compatibility layers without a current need.
- Do not turn local cleanup into a repository-wide rewrite or remove unrelated code.
  Preserve working behavior outside the requested scope.
- Prefer correcting the source of a problem to layering workarounds over it.
  The smallest useful change may include deletion or restructuring; it is not
  necessarily the change that adds the fewest lines.

## File organization and discoverability

- Organize files so a developer can find a feature and understand its behavior
  without searching across unrelated directories.
- Keep feature-specific code close together. Put code in shared locations only
  when it is genuinely shared. Avoid miscellaneous dumping grounds such as oversized
  `utils` modules.
- Split files when the boundary improves understanding, ownership, reuse, or
  testability. Do not split solely to satisfy an arbitrary line count.
- Keep related behavior easy to discover and dependencies easy to trace. Avoid
  excessive indirection and chains of trivial wrapper modules.
- Ask before adding a new top-level directory under `src/`, and keep the repository
  map above up to date.

## Frontend — React and TypeScript

### Components and state

- Keep components focused on a coherent responsibility.
- Prefer roughly one main component per file, with its component-specific styles
  colocated. Small private helper components may remain in the same file when that
  improves readability.
- Extract distinct or reusable UI sections when doing so clarifies the structure
  or behavior. Do not extract trivial markup solely to create more files.
- Keep state near the components that own it. Avoid duplicating state that can be
  derived from existing values. Lift state or introduce shared state only when needed.
- Keep business logic separate from rendering when the separation is useful;
  do not create hooks or service layers for every small operation.
- Preserve existing accessibility and interaction behavior. Use semantic elements
  for new controls and keep them operable by keyboard.

### Styling

- Use CSS Modules for component-specific styles. A component named `Example.tsx`
  may have one colocated stylesheet named `Example.module.css`.
- Create the stylesheet only when styles are needed. Import it with
  `import styles from './Example.module.css'`.
- Do not create ordinary `.css` files for components. Put global styles only in
  `src/index.css`, limited to resets, fonts, shared CSS variables, and base element styles.
- Do not use global selectors for component-specific styling.
- Do not use Tailwind, Sass, CSS-in-JS, or static inline styles unless requested.
  Inline styles are acceptable for values calculated at runtime.
- Before changing styles, inspect the markup, existing rules, cascade, and layout
  constraints. Fix the rule or structure responsible for the problem.
- Edit or replace existing declarations and remove obsolete ones. Do not accumulate
  duplicate selectors, contradictory overrides, increasing specificity, or `!important`
  declarations to compensate for an unexplained layout issue.
- Reuse relevant shared design values. Check the affected UI states and layouts
  after changing markup or styling.

### File naming

- React component files use PascalCase: `App.tsx`, `MyComponent.tsx`.
- CSS Modules match the component name: `App.module.css`, `MyComponent.module.css`.
- Hooks and other TypeScript modules use camelCase: `useHouseCanvas.ts`,
  `runTick.ts`. Do not use snake_case in frontend filenames.

## Formatting and static checks

- Treat the configured type checker as the authority for mechanical rules. Use
  project commands and configuration rather than hand-formatting to personal
  preference. Match the existing style: single quotes, no semicolons.
- No formatter or linter is configured. Ask before adding one; do not introduce
  competing configurations.
- Do not disable rules, weaken types, or add suppression comments merely to make
  checks pass. Address the cause; explain a narrowly scoped exception when necessary.
- Limit formatting changes to the relevant files or changed code where tooling allows.

## Testing policy

**Selected policy: Minimal tests for stable core logic.**

- Keep the test setup minimal. No test runner is installed yet; ask before adding one.
- Test only core logic that is unlikely to change soon, such as side compatibility and
  connections, house placement and overlap detection, rule application per tick, and
  ripple propagation.
- Do not test UI, rendering, or values that are still being tuned.
- Test observable behavior and important edge cases, not implementation details.
- Keep tests deterministic (inject or seed randomness), readable, and proportionate
  to the risk of the change.
- Update tests affected by intentional behavior changes. Do not weaken assertions or
  delete failing tests to conceal a regression.
- A passing build does not establish that interactions, styling, or the simulation
  look and feel correct; inspect affected behavior directly when possible.

## Before completing changes

- Review the diff for scope, unnecessary additions, obsolete code, and accidental
  behavior changes. Check that cleanup is complete within the modified area.
- Run `npm run typecheck` and any other configured checks and tests that are relevant.
  Run `npm run build` when dependencies or build configuration change.
- Verify affected behavior manually where automated checks cannot establish correctness.
- Fix failures introduced by the change. Report unrelated existing failures separately.
- Update documentation (`README.md`, this file) when setup, commands, structure, or
  simulation rules change.
- Summarize what changed, what was removed or simplified when relevant, what was
  verified, and any remaining limitations. Never claim a check ran when it did not.
