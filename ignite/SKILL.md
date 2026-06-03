---
name: ignite
description: Phase 1 of the 3-phase planning workflow. Brainstorms and structures abstract software ideas into modules and architecture proposals. Use when starting a new product idea, before /grill-me and PRD creation. Accepts an optional Obsidian note name as argument.
---

# Ignite

Phase 1 of the planning workflow. Turns raw ideas into structured module and architecture proposals, ready for stress-testing with /grill-me.

## Entry Points

- `/ignite [note-name]` — use `obsidian-vault` skill to read the existing note as starting context
- `/ignite` — start fresh; ask the user to describe their idea

## Phase A — Draw Out

Ask targeted questions **one at a time** to understand the idea:

- What does it do? (core function)
- Who is it for? (target user)
- What problem does it solve?
- What makes it different or necessary?
- What does success look like for the user?

Stay idea-focused. Do not ask about tech stack, timeline, budget, or constraints — those belong in /grill-me.

Continue until the user signals readiness with phrases like "what do you think", "do you have recommendations", "is this plausible", "how would you go about it". Recognize intent — do not wait for an exact phrase.

## Phase B — Propose

Synthesize everything and propose the following **one section at a time**, asking the user to react and refine before moving to the next:

1. **Necessary Modules** — components the product cannot function without
2. **Potential Modules** — extensions, enhancements, future possibilities
3. **Necessary Architecture** — core structural decisions that must be made
4. **Potential Architecture** — approaches that could work depending on scope and direction

## Handoff

After Phase B refinement is complete, compile the document below and save it using the `obsidian-vault` skill.

**Note path:** `[Project Name]/Phase 1 — Ignite`

```
> AGENT NOTE: This is a Phase 1 ideation artifact. Do not treat potential modules or architecture sketches as decisions. The PRD supersedes this document entirely.

---
Status: Exploratory
Phase: 1 — Ignite
Source of truth: PRD.md (Phase 3)
Note: This document is a brainstorm snapshot. Items marked "Potential" may never be built. Defer to the PRD for actual requirements.
---

# [Project Name] — Phase 1

## Summary
[2-4 sentence summary of the idea]

## Modules
### Necessary
[list]
### Potential
[list]

## Architecture
### Necessary
[list]
### Potential
[list]
```

After saving, tell the user: **Phase 1 complete. Run /grill-me when ready.**
