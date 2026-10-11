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

- Each tick, every house counts its **connected sides** (0–5) and looks up what to do in
  the rule table:
  - **die**: the house is removed and its neighbours lose that connection.
  - **nothing**: the house stays as it is.
  - **grow**: the house attaches a new house to a random free side.
- New houses may not overlap existing ones unless overlap is allowed.
- Presets show what the default shape can do:
  - **Slow bloom** (the default): grows steadily outwards.
  - **Crystal**: grows briefly, then freezes.
  - **Lace**: houses with 3 or 5 neighbours die.
  - **Coral**: fast growth with constant dying.
  - **Wildfire**: every house grows.
- **Random** rolls a new rule table. Every rule can also be changed while the
  simulation runs.

## Interaction

- The play bar plays, pauses (also with Space), steps one tick and sets the speed.
- Click a house to send a **ripple** through the connection graph.
- Drag to pan; scroll or pinch to zoom. **Fit** frames all houses.
- Houses are colored by their number of connected sides, so growth fronts and stable
  cores stand out. Themes: Night (default) and Classic.
- The address bar always holds a link to the current rules and house shape; **Copy
  link** in the settings shares it.
- When the world gets too big for the device, the simulation pauses and offers to
  start over.
- On phones the settings open as a sheet from the **Settings** button.

## Development

Commands, project structure and conventions are in [`AGENTS.md`](AGENTS.md).
