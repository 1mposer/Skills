---
name: edit-loop
description: Run a multi-agent design review: Sonnet agents propose screens in Figma, an Opus judge filters and builds a final depth pass, and the orchestrator reviews before user approval.
---

# Edit Loop

You are the orchestrator. Run this pipeline on the design edits the user provides.

## Inputs
- **Edits**: the design changes to implement. Take them from the user's message or the preceding conversation. If none are clear, ask before starting.
- **Figma page**: default "Mess Around" unless the user names another.
- **Proposer count**: default 2.
- **Revision caps**: default 2 rounds per proposer, 3 rounds for orchestrator-judge review.

## Phase 1: Proposals (Sonnet 5.5, parallel)
- Spawn the proposer agents (Sonnet 5.5). Each works independently and does not see the others' work.
- Each proposer:
  1. Designs suggestion screens implementing the edits.
  2. Draws them on the Figma page in its own labeled frame (e.g. "Sonnet A - v1", "Sonnet B - v1").
  3. Reports a short summary: what it changed and why.

## Phase 2: Judging (Opus 5.5)
- After all proposers report, spawn one Opus 5.5 agent as judge.
- For each proposal, the judge either:
  - **Rejects** it, sending it back to that proposer with specific reasons and fixes, or
  - **Accepts** it, fully or in part.
- Rejected proposals are revised and resubmitted, up to the proposer revision cap. After the cap, the judge uses the best version available.
- The judge combines accepted edits into a **final depth pass**, drawn in a frame labeled "Final - Opus v1".

## Phase 3: Orchestrator review (orchestrator and judge only)
- The judge submits the final depth pass to you.
- If it is not up to standard, send it back with specific feedback. The judge revises (v2, v3...).
- Do NOT spawn new agents or re-involve proposers in this loop.
- If unresolved after the review cap, bring the user the best version plus your remaining concerns.

## Phase 4: User approval
Present to the user:
- Reference to the final Figma frame
- Short list of edits implemented
- Trade-offs or open questions

Nothing is final until the user approves.

## Running it (mechanics the orchestrator follows)
- Model mapping for the Agent tool: "Sonnet 5.5" → `model: "sonnet"`, "Opus 5.5" → `model: "opus"`. Spawn the proposers in one response so they run in parallel; keep each one resumable (SendMessage with its id) so the judge's rejections go back to the same agent with its context intact.
- Before spawning, confirm the Figma MCP server is connected in this session; if not, ask the user to run `/mcp` first.
- Every Figma brief points agents at the project's Figma notes file (for time-it: `docs/design/FIGMA.md` §1 gotchas, the page map, and the latest round record with node IDs) and requires the `figma-use` skill before any `use_figma` call and `create_session` first. Agents draw in their own labeled frames in a fresh row on the page; they never edit earlier rounds' frames (clone, then change the clone; re-set opacity on cloned variable-bound fills).
- Every proposal and the final frame get a canvas note with the design values. Design values live in Figma, never in docs.
- Each report must list node IDs. The orchestrator judges reports and screenshots; it does not run Figma checks itself (a Sonnet verifier screenshots when evidence is missing).
- Vocabulary for the user: call a mock surface a "screen", never a "phone".
- The user's approval page: one artifact, a screenshot per screen, one plain-language ask each, options a/b/c with the recommended one first.
