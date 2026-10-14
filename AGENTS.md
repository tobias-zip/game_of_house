# Project instructions

<!-- Sections marked "project-specific" are written per project. All other sections
come from project-defaults and are kept in sync with it; change them there first. -->

## Project overview and setup

<!-- project-specific -->

- Purpose: A cellular-automaton toy in the browser. Pentagon-shaped "houses" (an
  underside, two walls, two roof sides) snap together edge to edge and grow, survive or
  die depending on how many of their sides are connected. It invites people to explore
  which patterns this shape produces. The concept is in `README.md`; read it before
  working on simulation rules.
- Look and feel: playful to use but calm and simple in appearance, closer to a
  scientific or generative-art piece than to a cartoon game. One dark design: system
  monospace font (no web fonts), square corners, hairline borders, flat panels and
  background (no gradients, glass blur or drop shadows). The player picks three colors:
  few sides and many sides (house fills for 0 and 5 connected sides, blended in OKLCH in
  between) and an accent (UI highlights, pulses, frozen outline). The defaults are
  navy, mint green and sky blue. Avoid decorative effects that don't help reading the pattern.
- Stage: Prototype, client only, no backend. Merges to `main` are deployed to
  https://overhouse.tobias.world by Dokploy, which builds the `Dockerfile` (static
  files served by nginx, `nginx.conf`).
  - Houses: each house is a node in a connection graph. Sides only connect to sides of
    the same kind (underside to underside, wall to wall, roof to roof). New houses are
    placed by transforming them onto a free side of a host house; overlapping placements
    are rejected unless overlap is allowed.
  - Simulation: each tick, every house looks up the behavior for its number of covered
    sides (0–5) in a player-editable rule table: `die`, `nothing` (shown as "stay") or `grow`. Dying houses
    are removed and disconnected, then growing houses take turns (in random order by
    default, or oldest first) to attach a new house to a random free side. All
    randomness comes from a seeded generator, one seed per world, so a seed reproduces a
    world. A spatial index speeds up overlap checks, and hosts whose free sides are all
    blocked are skipped until a nearby house dies.
  - Click actions, picked in an always-visible toolbar on the canvas:
    - ripple: a wave travels through the connection graph (breadth-first, in hops) and
      briefly tints the houses it reaches;
    - echo: a ripple that bounces back from dead ends (a house at distance d whose
      branch turns at distance t lights again at 2t − d);
    - lineage: lights the house and its parent chain back to the oldest living
      ancestor;
    - seed: grows a house on a random free side of the clicked house;
    - remove: deletes the house like a dying one;
    - freeze: toggles a frozen flag; frozen houses ignore "die" and get an accent
      outline.
    Ripple, echo and lineage each have their own pulse settings (range up to 300 hops,
    100 by default, for ripple and echo; speed, glow time, strength), shown for the active tool in the "Tool settings" section of the
    settings panel. The tools have no visible
    explanations. Pulses use the accent color.
  - Start: one house, "Slow bloom" rules, playing at 2 ticks per second, ripple on click,
    houses colored by connected sides. A shared link (`#rules=…&underside=…&seed=…`)
    overrides the rules, shape, growth order and seed.
  - Overload guard: three ticks in a row that take over 200 ms (or start that late)
    pause the simulation and show a notice (reset or keep going).
  - UI: full-screen canvas (pan, wheel or pinch zoom) with no title. The play bar
    (play/pause, step, speed, tick and house counts; Space toggles play) sits at the
    bottom, centered. A top bar spreads out the click toolbar, a Settings toggle and the
    actions: Fit (frames the houses clear of the bars), Reset view, Reset world and
    Reset all (each with a confirm popup; Reset all reloads the page without the setup
    in the link and clears the stored colors, like a fresh visit), Screenshot (downloads
    the canvas as a PNG without the interface) and Share (copies the link). Below
    1280px the tools and actions are icons with tooltips. Settings opens a panel below
    the top bar with the sections as columns: tool settings, rules (presets, Random, rule table as
    die/stay/grow toggles with each count's house color), world (growth order, overlap,
    add house), shape (with preview), look (accent, color by connected sides, house
    colors) and debug. Settings carry no descriptions. Below 700px width the top bar
    is one row of icon buttons: a tool button showing the active tool (tapping it drops
    down the labelled tool list), Settings and the actions; the panel stacks its
    sections in one scrolling column.
- Analytics: page views and sessions go to Umami at https://umami.tobias.world
  (site "overhouse"), via the tracker tag in `client/index.html`.
- Frontend: React + TypeScript with CSS Modules, built with Vite. App state lives
  in a React context (`HouseCanvasProvider`), which runs the tick loop with
  `setInterval`. The simulation runs outside React state updaters (StrictMode calls
  those twice) and publishes each new world. `HouseCanvas.tsx` draws with a
  `requestAnimationFrame` loop that reads camera, ripples and the latest world from refs,
  so panning, zooming and ripples never re-render React.
- Runtime and package manager: Node.js, pnpm workspaces (only `client/`),
  TypeScript. Versions live in `package.json` and `.nvmrc` only.
- Environment setup: `pnpm install`.
- Repository map (the app lives in `client/`):
  - `client/src/types.ts` — shared types and rule constants (houses, sides, geometry, rule
    table and its defaults, ripple settings).
  - `client/src/rules.ts` — rule table encoding, presets and random rules.
  - `client/src/shareLink.ts` — reading and writing the setup in the URL hash.
  - `client/src/theme.ts` — the player's palette (defaults, blending the house colors
    per connected-side count, stored choice). Other UI colors are CSS variables in
    `client/src/index.css`; the provider sets `--accent` from the palette.
  - `client/src/domain/house/` — house model without simulation state: `geometry.ts`
    (polygons, transforms, overlap tests), `graph.ts` (sides, connections).
  - `client/src/engine/simulation/` — `runTick.ts` (one tick: rule application, removal,
    growth), `growFromHost.ts` (placing a house on a free side of a host),
    `addHouse.ts` (manual "Add house" and the seed action), `removeHouses.ts` (removal
    shared by dying and the remove action), `worldState.ts` (cached world
    transforms and polygons, spatial index, blocked hosts), `random.ts` (seeded random
    generator), `types.ts`. Tick and growth code mutate houses they copied for the
    current tick and update the world state in place.
  - `client/src/engine/actions/` — click actions; `ripple.ts` computes which houses
    ripple, echo and lineage light and when.
  - `client/src/context/` — `HouseCanvasProvider.tsx` owns app state and the tick loop;
    `useHouseCanvas.ts` reads it.
  - `client/src/components/` — `HouseCanvas.tsx` (draw loop, pointer and wheel input, ripples,
    Fit, Reset view and Screenshot for the top bar), `camera.ts` (pan/zoom math), `drawWorld.ts` (canvas drawing; house
    and ripple paths are built once per world, not per frame), `Actions.tsx`
    (view, reset, screenshot and share buttons), `ConfirmButton.tsx` (button with a
    confirm popup), `screenshot.ts` (canvas to PNG
    download), `PlayBar.tsx`, `ClickToolbar.tsx` (click action
    picker), `PulseSettings.tsx`, `RangeField.tsx` (labelled
    slider), `useDismiss.ts` (closes popups on outside click or Escape),
    `OverloadNotice.tsx`, `SettingsPanel.tsx`. `App.tsx` lays out the top bar and the play bar.
  - `client/public/` — static assets (favicon).
- Rule and design requirements are supplied per task. Do not invent new rules,
  click actions or house shapes; ask.

Before editing, inspect the relevant code, scripts, configuration, and repository
instructions. Use pnpm and the existing tooling. Do not add or replace dependencies,
frameworks, or development tools without a concrete need for the requested task.
Prefer existing utilities and platform capabilities. Keep credentials out of source
code and committed configuration.

## Commands

Run all commands from the repository root.

| Action | Command |
| --- | --- |
| Install dependencies | `pnpm install` |
| Start the dev server | `pnpm dev` |
| Preview the production build | `pnpm build && pnpm preview` |
| Lint and check formatting | `pnpm lint` |
| Format and apply safe lint fixes | `pnpm format` |
| Type-check all workspaces | `pnpm typecheck` |
| Run tests | `pnpm test` |
| Build | `pnpm build` |
| Run every check (same as CI) | `pnpm check` |

Never invent missing commands. When tooling changes, update this table. Report
checks that cannot be run and explain why.

## Git workflow

- `main` is live: every merge to it is deployed. Never commit or push to `main`
  directly; GitHub rejects it, and a Claude Code hook blocks the push.
- Work on a branch with a short descriptive name, push it, and open a pull request
  with `gh pr create`. CI must pass before merging. Pull requests are squash-merged,
  so the title becomes the commit message on `main`: write it as one. Use a merge
  commit only when the commits must keep their hashes, such as a reformat listed in
  `.git-blame-ignore-revs`.
- Merge only when the user asks. After merging, the deploy runs on its own.

## Deploys, versions, and caching

- Load everything the app shows through Vite (`import`,
  `new URL("./image.png", import.meta.url)`, `import.meta.glob`), so files get
  content-hashed names that can be cached for good. `client/public/` is only for
  files that need a fixed URL: favicons, the web manifest, `robots.txt`.

## Analytics

- The tracker tag in `client/index.html` counts only on the domain in
  `data-domains`, so dev and CI builds send nothing. Keep it matching the deploy
  domain.
- Add custom events only when asked, with a `data-umami-event="name"` attribute, or
  `umami.track("name")` where no element fits.

## Clarification and scope

- Inspect the repository first; do not ask questions it can answer.
- If a requirement is ambiguous or several reasonable interpretations exist, ask
  before implementing. Don't silently pick one.
- Ask about choices that are hard to undo or that change what gets built:
  architecture, libraries, data models, game rules, file layout.
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
  Prefer `delayInMs` over `t1` with a comment, and `row` and `grid` over `r` and `g`.
  Use enough words to be unambiguous without adding redundant context.
- **Make code understandable:** Let naming and structure explain routine behavior.
  Add comments for non-obvious intent, constraints, tradeoffs, or algorithms; do not
  narrate obvious code. Keep useful comments accurate when code changes.
- **Preserve consistency:** Follow the surrounding code and documented conventions
  unless they conflict with these instructions. Avoid unrelated style rewrites.
- **Make dependencies explicit:** Pass required data or services through clear
  interfaces. Avoid hidden coupling and unnecessary shared mutable state.

## Simulation code

<!-- project-specific -->

- Keep simulation logic (`client/src/domain/`, `client/src/engine/`) independent of React and
  rendering, so it can run headless and be tested.
- Keep each rule in one authoritative place; do not duplicate it between the
  simulation and the UI. Shared types and rule defaults live in `client/src/types.ts`.
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
- Keep feature-specific code close together. Put code in shared directories only
  when it is genuinely shared. Avoid miscellaneous dumping grounds such as oversized
  `utils` modules.
- Split files when the boundary improves understanding, ownership, reuse, or
  testability. Do not split solely to satisfy an arbitrary line count.
- Keep related behavior easy to discover and dependencies easy to trace. Avoid
  excessive indirection and chains of trivial wrapper modules.
- Put code in the workspace that runs it (`client/`, `server/`); move it to `shared/`
  only when both sides need it. Ask before adding a new workspace, and keep the
  repository map above up to date.

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
  `import styles from "./Example.module.css";`.
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
- Hooks and other TypeScript modules use camelCase: `useAuth.ts`, `formatDate.ts`,
  `apiClient.ts`. Do not use snake_case in frontend filenames.
- Tests sit next to the code they test and end in `.test.ts`: `grid.ts` and
  `grid.test.ts`.

## Formatting and static checks

- Biome (`biome.json`) is the formatter and linter; TypeScript is the type checker.
  They are the authority for mechanical rules. Do not hand-format to personal
  preference.
- A Claude Code hook formats each file after it is edited. Run `pnpm format` before
  finishing to apply safe lint fixes and sort imports.
- Do not disable rules, weaken types, or add suppression comments merely to make
  checks pass. Address the cause; explain a narrowly scoped exception when necessary.
- Do not add other formatters or linters.

## Testing policy

**Selected policy: Minimal Vitest tests for stable core logic.**

<!-- project-specific: list the project's stable core logic in the second bullet. -->

- Tests use Vitest. There is no browser test setup; ask before adding Playwright.
- Test only core logic that is unlikely to change soon, such as side compatibility and
  connections, house placement and overlap detection, rule application per tick, and
  ripple propagation.
- Do not test UI, rendering, or values that are still being tuned.
- Test observable behavior and important edge cases, not implementation details.
- Keep tests deterministic (inject or seed randomness), readable, and proportionate
  to the risk of the change.
- Update tests affected by intentional behavior changes. Do not weaken assertions or
  delete failing tests to conceal a regression.
- A passing build does not establish that interactions, styling, or the game look
  and feel correct; inspect affected behavior directly when possible.

## Before completing changes

- Review the diff for scope, unnecessary additions, obsolete code, and accidental
  behavior changes. Check that cleanup is complete within the modified area.
- Run `pnpm format`, then `pnpm check`. It runs lint, type checks, tests, and the
  build, the same as CI.
- Verify affected behavior manually where automated checks cannot establish correctness.
- Fix failures introduced by the change. Report unrelated existing failures separately.
- Update documentation (`README.md`, this file) when setup, commands, structure, or
  game design changes. Do not repeat what config files already say, such as
  dependency versions.
- Summarize what changed, what was removed or simplified when relevant, what was
  verified, and any remaining limitations. Never claim a check ran when it did not.

## Deviations from project defaults

<!-- project-specific: maintained by the sync-defaults skill. -->

None.
