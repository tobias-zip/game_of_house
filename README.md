# Game of House

A cellular-automaton toy in the spirit of Conway's Game of Life, but with houses.
Play it at <https://tobias-zip.github.io/game_of_house/>.

## Houses

- A house is a pentagon: an **underside**, two **walls** and two **roof** sides.
- Houses connect edge to edge, and only matching sides connect: underside to underside,
  wall to wall, roof to roof. The connected houses form a graph that tiles the plane.
- The shape is adjustable (underside length, wall length, roof angle), which changes
  which tilings are possible.

## Rules

- Each tick, every house counts its **covered sides** (0–5) and looks up what to do in
  the rule table:
  - **die** — the house is removed and its neighbours lose that connection.
  - **nothing** — the house stays as it is.
  - **grow** — the house attaches a new house to a random free side.
- The default rules: 0 → die, 1–2 → grow, 3 → nothing, 4–5 → die. Every entry can be
  changed in the sidebar while the simulation runs.
- New houses may not overlap existing ones unless overlap is allowed.

## Interaction

- Play, pause and set the simulation speed, or add houses by hand.
- **Click actions:** clicking a house can send a **ripple** through the connection
  graph. Its colour, opacity, speed, range (in hops) and lifetime are adjustable.
- Drag to pan, scroll to zoom.

## Development

Commands, project structure and conventions are in [`AGENTS.md`](AGENTS.md).
