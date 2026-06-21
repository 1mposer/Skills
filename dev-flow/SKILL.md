---
name: dev-flow
description: Remind the agent of the dev-flow principles — how to plan, spec, implement, and document work within this methodology. Invoke when you want the agent aligned on the rules before starting any new or refactor work.
---

You have been reminded of the dev-flow methodology. Apply these principles to all work in this session.

## The Flow

```
Plan → Spec → Red-Green Implement → Document
```

## File Roles

**CLAUDE.md / Context.md** — what exists and works. The stable reference. Read this first.

**Status.md** — the current landmark. Where the implementation stands right now.

**Status-Log.md** — child of Status.md. The detailed edit history. Status.md stays clean; Status-Log.md holds the verbose trail.

## 1. Plan

Classify the work before anything else:

- **New code** — net-new feature or functionality
- **Refactor** — changing existing code

Both branches ask the same two questions:

1. **Cross-contamination risk?** — does this touch or affect other parts of the codebase? If yes, propose a branch. Suggest an appropriate branch name.
2. **Can it be sliced?** — can it be broken into smaller, independent pieces? If yes, slice it.

## 2. Spec — Per Slice

Each slice defines:

- **Edges and constraints** — what this slice touches, what it must not touch, what it must respect
- **Red-Green plan** — what the failing test looks like, and what passing looks like

### Slice Checklist

1. ☐ Implement
2. ☐ Red tests — write them, confirm they fail for the right reason
3. ☐ Green — make them pass
4. ☐ Documentation — update Status.md and Status-Log.md

## 3. Red-Green Implement

Standard TDD per slice. Write the failing test first. Implement until it passes. Do not move to the next slice until the current one is green and documented.

## 4. Documentation

**Status.md** sits between proposed and actual code. It documents what is mid-flight — not just what exists, but how it got there. A fresh agent reading this must know exactly what happened and what to do next.

**Status-Log.md** holds the detailed history. Status.md links to it at the bottom. Status.md stays as a clean current-state summary.

## Fresh Session Check

Before closing any slice, ask:

> Is everything documented such that a fresh agent spawned in would know exactly what happened and what to do next?

If no — the slice is not done, regardless of green tests.

## Finishing a Slice

A slice is only done when: tests pass + documentation updated + merged back to main. Code that is green but unmerged is not done.
