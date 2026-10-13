# Overhouse

A cellular-automaton toy in the spirit of Conway's Game of Life, but with houses.

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
  - **stay**: the house stays as it is.
  - **grow**: the house attaches a new house to a random free side. Growing houses take
    turns, in random order by default or oldest first; earlier ones get the first pick
    of free space.
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

- The play bar at the bottom plays, pauses (also with Space), steps one tick and sets the speed.
- The toolbar at the top picks what clicking a house does (on phones, tap the tool button
  to choose):
  - **Ripple**: a wave travels outwards through connected houses.
  - **Echo**: a wave that bounces back from dead ends.
  - **Lineage**: lights the houses that grew this one, back to its oldest living ancestor.
  - **Seed**: grows a new house on a free side.
  - **Remove**: removes the house.
  - **Freeze**: the rules can't kill a frozen house; click again to thaw.
  - Ripple, echo and lineage each have their own speed, glow time and strength, under
    Tool settings in the settings panel. Ripple and echo also have a range (up to 300
    hops); lineage always goes back to the oldest ancestor.
- Drag to pan; scroll or pinch to zoom. The buttons in the upper right fit all houses
  into view, reset the view, reset the world or everything (after a confirmation), save
  a screenshot of the canvas without the interface, and share. **Settings** in the
  middle opens all other settings.
- Houses are colored by their number of connected sides, so growth fronts and stable
  cores stand out. Under Look you can pick the colors for few and many connected sides
  and an accent color.
- The address bar always holds a link to the current rules, house shape and the world's
  random seed, so the link grows the same world from its first house; **Share** copies
  it. Each reset starts a world with a new seed.
- When the world gets too big for the device, the simulation pauses and offers to
  start over.
- On phones the settings open as a sheet from the **Settings** button.

## Development

Commands, project structure and conventions are in [`AGENTS.md`](AGENTS.md).
