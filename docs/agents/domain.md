# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.
- **`docs/plans/multi-agent-build-plan.md`** — if you're executing a build task, find your wave and context pack here.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## Multi-agent workflow

When you are dispatched as a build agent, your task spec lives in
[`docs/plans/multi-agent-build-plan.md`](../plans/multi-agent-build-plan.md). Each wave
has:

- A **context pack** — the exact subset of reference docs you need (don't read the whole repo)
- **Task IDs** (e.g., M0.1, U1.3, F3.2) — use these in your commit messages
- **Acceptance criteria** — what "done" means
- **Handoff artifacts** — what you must produce for the next wave's agent

If a task requires a new architectural decision not covered by an existing ADR,
flag it for the **controller** (the session that dispatched you). Do not silently
override an ADR.

## File structure

Single-context repo:

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-phase-2-ui-foundation.md
│   └── 0002-shared-document-canvas.md
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding.
