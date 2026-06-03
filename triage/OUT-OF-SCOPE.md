# Out-of-Scope Knowledge Base

The `.out-of-scope/` directory in a repo stores persistent records of rejected feature requests. It serves two purposes:

1. **Institutional memory** — why a feature was rejected, so the reasoning isn't lost when the issue is closed
2. **Deduplication** — when a new issue comes in that matches a prior rejection, the skill can surface the previous decision instead of re-litigating it

## Directory structure

```
.out-of-scope/
├── dark-mode.md
├── plugin-system.md
└── graphql-api.md
```

One file per **concept**, not per issue. Multiple issues requesting the same thing are grouped under one file.

## File format

```markdown
# Dark Mode

This project does not support dark mode or user-facing theming.

## Why this is out of scope

The rendering pipeline assumes a single color palette defined in
`ThemeConfig`. Supporting multiple themes would require significant
architectural change that doesn't align with the project's focus.

## Prior requests

- #42 — "Add dark mode support"
- #87 — "Night theme for accessibility"
```

### Naming the file

Use a short, descriptive kebab-case name for the concept: `dark-mode.md`, `plugin-system.md`. The name should be recognizable without opening the file.

### Writing the reason

The reason should be substantive — not "we don't want this" but why. Good reasons reference:

- Project scope or philosophy
- Technical constraints
- Strategic decisions

## When to check `.out-of-scope/`

During triage (Step 1: Gather context), read all files in `.out-of-scope/`. When evaluating a new issue:

- Check if the request matches an existing out-of-scope concept
- Matching is by concept similarity, not keyword — "night theme" matches `dark-mode.md`
- If there's a match, surface it to the maintainer

The maintainer may confirm, reconsider, or disagree — act accordingly.

## When to write to `.out-of-scope/`

Only when an **enhancement** (not a bug) is rejected as `wontfix`. Check if a matching file already exists; if yes, append; if no, create. Post a comment on the issue, then close with `wontfix`.
