---
name: readability-friction
description: Skim a codebase for visual-readability friction — comment bloat, narration paragraphs, spec-ref archaeology, walls of prose between functions — and report prune-worthy findings under the locked keep/prune policy. Read-only; never edits.
disable-model-invocation: true
---

# Readability Friction

Skim freely and surface **readability friction**: the places where a developer trying to visually understand and tweak a file has to fight through comment bloat, narration paragraphs, and prose walls before they can see the shape of the code.

This is the sibling of `/improve-codebase-architecture`, and it inherits exactly one thing from it: the **friction method** — explore organically, don't follow rigid heuristics, and note where *you* experience friction while reading. It does **not** hunt for deep modules, seams, or refactors. The unit of interest here is the *page*, not the architecture: what a developer's eyes hit when they open the file.

**This skill is strictly read-only.** It never edits code, never removes a comment, never "fixes while it's in there." The output is a findings report. Pruning happens later, in separate batch sessions, under the verification contract in §5.

## 1. The philosophy (extracted from the prune commits)

This policy was locked and proven in this repo's history — `7f1c2ef` (the audited agent pass, net −581 lines, code byte-identical after comment stripping, 186/186 tests) and the batch commits that followed (`fb05f00`, `f8c1d8f`, `34c7129`, `7c0d513`, `d7d064b`, `232e8fc`). Study those diffs when calibrating; they are the reference standard.

The core rule:

> **A comment earns its place only by stating a constraint the code cannot show.** Everything else — what the next line does, which spec asked for it, how we got here, why the change was correct — is the author talking to a past reviewer, and it is noise to every future reader.

And the second, subtler rule the diffs teach:

> **The unit of pruning is the sentence, not the comment.** Most findings are not "delete this comment" but "this 6-line paragraph carries one load-bearing clause — the rest is narration." Compression, not deletion, is the default move.

A real example from `7f1c2ef` (`DashboardViewModel.swift`):

```
BEFORE (6 lines):
/// The coordinate the most recent POST actually used. Lets a late GPS fix
/// trigger a reload only when it would move the forecast location — the
/// distance gate is what prevents a request→fix→request loop, since every
/// load calls requestLocation() and every fix lands back in the sink below.
/// nil = no POST has happened yet, so any first fix is a meaningful move
/// (#5c: the no-location empty state must react to the first grant).

AFTER (2 lines):
/// Coordinate of the last POST; a new GPS fix reloads only when it moves
/// meaningfully. nil = no POST yet, so any first fix triggers a load.
```

The constraint survived (the nil semantics, the meaningful-move gate). The mechanism narration and the issue citation died.

## 2. KEEP — the survivors

These categories are load-bearing. **Never propose pruning them**; at most propose rewriting them terser (the audit pass did exactly that with MARK headers). Flag a finding that would touch one of these as `keep — compress only`.

1. **Landmines** — a comment whose absence lets a future edit silently break something. E.g. the UTC-instant parse warning in `timeBoundary.js` ("a bare `new Date(...)` parses in the SERVER's zone, silently shifting every bucket"), or the APNs bundle-ID ownership note. Test: would a competent developer plausibly make the mistake without the comment? Keep.
2. **Contract/seam comments with ADR refs** — timeless rules at module boundaries. The ADR ref stays (`(ADR-0003)`); the story around it gets compressed. ADRs are the durable record; spec/issue numbers are not (see PRUNE #1).
3. **Regression guards** — dated notes marking a real bug the code now prevents (e.g. the 2026-07-12 `uv_index` null decode). The date is the proof it happened; keep it.
4. **Do-not-hand-roll warnings** — single-source-of-truth markers ("shared by the digest's labels and the detector's dedup key — do not hand-roll a sibling").
5. **Structure markers** — `MARK:` sections and grouping headers. These are the opposite of friction: they give a long file a skimmable spine. Rewrite terser if wordy; never delete. A long file *missing* them is itself a finding (§3, signal F6).
6. **Flagged-for-owner-review divergence notes** — anything explicitly parked for a human decision stays until the human decides.

## 3. PRUNE — the friction signals

Skim with these questions. Each "yes" is a finding. Don't grep for these mechanically — read the file the way a developer would, top to bottom, and record where your eyes stalled.

- **F1 — Spec/issue archaeology.** Does the comment cite a volatile document instead of stating the rule? (`#5c`, `spec 14 §1`, `audit F5`.) Issue and spec refs rot; the rule belongs in the comment, the citation doesn't. (ADR refs are the exception — KEEP #2.)
- **F2 — Narration of visible control flow.** Does the comment tell you what the next line does? (`// Resolved here, not as default arguments` above a line that resolves it there.) The code already says it.
- **F3 — History-telling.** "used to fire...", "before the fix...", "this was moved from...". The surviving constraint matters; the journey doesn't. Git holds the journey.
- **F4 — Reviewer-directed justification.** Prose whose real audience is whoever approved the PR ("a separately-injected copy would silently diverge" as a paragraph). Compress to the one clause the next reader needs.
- **F5 — The prose wall.** Can you see the function signatures when you scroll, or do multi-sentence paragraphs between every member turn the file into an essay with code interruptions? This is the *spacing* friction: measure it visually — if a screenful shows more comment lines than code lines and the file isn't a header/contract file, it's a finding.
- **F6 — Dense unstructured blocks.** The inverse wall: 100+ lines of view/styling/config code with no `MARK:`/section rhythm at all, unskimmable in the other direction. (Report it; the fix is structure markers, not comments.)
- **F7 — Sibling repetition.** The same explanation copy-pasted across neighboring members ("Exposed for the same reason as `store`" done *wrong* — the original repeated the whole paragraph; the pruned version says "for the same reason as `store`" and points).

## 4. Process

### Scope — YAGNI (inherited)

Readability friction only costs when someone reads. Weight the scan toward files that get read:

- If the user named a direction — a directory, a module, a pain point — take it and skip inference.
- Otherwise walk `git log --oneline` for hot spots — the files that keep coming up — and let those pull attention first. Check which areas the earlier prune batches already covered (`git log --grep="prune comments"`) so you don't re-report cleaned files; the commit messages name their files.

### Skim — freely (inherited)

Use the Agent tool with `subagent_type=Explore` for breadth, but do the calibration reads yourself: open 2–3 of the hottest files end to end and record every place your own reading stalled. No rigid checklist-walking — the §3 signals are a vocabulary for naming friction you actually felt, not a grep list. A comment that technically matches F2 but took nothing from you is not a finding.

### Report — findings, not edits

Produce a report (terminal markdown, or a scratchpad file if long) with one card per file:

- **File** — path, and the friction density at a glance (e.g. "~140 comment lines / ~210 code lines").
- **Findings** — each with signal tag (F1–F7), line refs (`file:line`), a short excerpt, and the verdict: `prune`, `compress` (quote the one clause that survives), or `keep — compress only` (§2 material).
- **Severity** — how much the file's skimmability suffers: `wall` (prose dominates the page), `drag` (frequent stalls), `nits` (isolated).

End with a **batch proposal**: group the files into prune-batches of 4–8 (the proven batch size from this repo's history), ordered by severity, ready to hand to a prune session. Then stop and ask which batch, if any, to schedule — **do not begin pruning in this session.**

## 5. Contract for downstream prune sessions

The report is the input to separate prune passes. Encode these expectations in the batch proposal so they carry over:

- **Comment-only, verified mechanically** — after the pass, every file's code must be byte-identical to HEAD once comments are stripped; run the full test suite. (This is how `7f1c2ef` proved itself.)
- **The audit restores** — a pruning agent will over-delete; an audit pass re-checks every deletion against §2 and restores landmines, ADR refs, regression guards, MARKs, and owner-review flags.
- **No side-effects** — lockfiles, formatting churn, and "while I'm here" edits get reverted.
