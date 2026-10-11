@AGENTS.md

## Claude Code

### Project knowledge

- Record project knowledge, conventions, and working preferences in this repository
  (`AGENTS.md`, or this file for Claude-specific instructions), not in Claude's
  personal memory, so everything lives in one versioned place.

### Subagents

- The main session plans and does the difficult or tightly coupled coding.
- Delegate only cleanly separable, fully specified, simpler coding tasks, and run
  them on Sonnet (`model: "sonnet"`).
- Keep work inline when a subagent would need a lot of context rebuilt.
