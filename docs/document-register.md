# Document register

Every document in this repository, what it is for, and when it is read.
Regenerate this whenever a document is added, removed or repurposed.

Repository: `ROYAL777-21/IT-SUPPORT-GROUP-12-`
Branch of record: `claude/it-support-prompt-optimization-0m3ibq`
Last recorded: 2026-08-07 · 9 documents · ~41,200 characters · ~10,300 tokens

## Governing documents

Read by the agent, not by people. These constrain how the app gets built.

| # | Document | Purpose | Loaded | Size |
|---|---|---|---|---|
| 1 | `CLAUDE.md` | Prime directive, fixed stack, domain vocabulary, POPIA rules, routing table, definition of done | Automatically, every session | 64 lines · ~762 tok |
| 2 | `.claude/skills/supporthub-ui/SKILL.md` | UI, accessibility, forms and copy conventions | Automatically, on front-end work | 81 lines · ~939 tok |

## Reference documents

Opened deliberately, when a task needs them. Never loaded by default.

| # | Document | Purpose | Authority | Size |
|---|---|---|---|---|
| 3 | `docs/api-contract.md` | Types, endpoints, legal status transitions, internal-note rule, metrics shape, seed data | **Authoritative** for anything data-shaped | 143 lines · ~1,288 tok |
| 4 | `docs/proposal-brief.md` | The research proposal compressed to the ~12% that changes build decisions: objectives, evaluation instruments, the six usability-test tasks, architecture, constraints | Derived — the `.docx` is the source | 87 lines · ~1,143 tok |
| 5 | `docs/registry.md` | All 35 candidate external repositories, reviewed and tiered: install now (5), on demand with triggers (15), excluded with reasons (8) | Decision record | 61 lines · ~1,881 tok |
| 6 | `docs/document-register.md` | This file | — | — |

## Build prompts

Pasted into a fresh Claude Code session by a person. One per slice, in order.

| # | Document | Slice | Scope | Size |
|---|---|---|---|---|
| 7 | `prompts/frontend-foundation.md` | 1 | Design system + student ticket lifecycle. Maps 1:1 to the six usability-test tasks | 109 lines · ~1,084 tok |
| 8 | `prompts/technician-dashboard.md` | 2 | Queue, triage, assignment, constrained status transitions, public reply vs internal note, escalation | 108 lines · ~1,253 tok |
| 9 | `prompts/manager-analytics.md` | 3 | Demand, responsiveness, recurring problems, satisfaction, pseudonymised CSV export | 125 lines · ~1,476 tok |

## Orientation

| # | Document | Purpose |
|---|---|---|
| 10 | `README.md` | Human entry point: how context loading works, the build order, group members |

## Documents referenced but not held in this repository

| Document | Where it lives | Status |
|---|---|---|
| `ITDMA3_Eduvos_IT_SupportHub_Research_Proposal_Final2.docx` | Uploaded to the working session only | **Not committed** — see the caution below |

`docs/proposal-brief.md` is derived from that file. If the proposal is revised, the
brief must be regenerated or the two will silently disagree.

> **Before committing the proposal `.docx`:** it carries four students' full names
> and student numbers. If this repository is public, committing it publishes that
> personal information — which sits badly beside the project's own POPIA and
> data-minimisation commitments. Check the repository's visibility first. If it is
> public, either keep the proposal outside the repo or commit a redacted copy.

## Provenance

| Commit | Contents |
|---|---|
| `dbfcaed` | Initial commit — README only |
| `c980381` | Context system: `CLAUDE.md`, UI skill, proposal brief, registry, Slice 1 prompt |
| `460ca81` | API contract extracted; Slice 2 and Slice 3 prompts |

## Known gaps

Recorded rather than silently carried:

- **No source code yet.** All three slices are specified; none are built. Deliberate.
- **`--brand` is unresolved.** The UI skill leaves the Eduvos primary colour as a
  TODO rather than inventing a hex.
- **No wireframes or workflow diagrams.** The proposal's system-design phase calls
  for them; if the group produced any, they belong in `docs/`.
- **No test strategy document.** The prompts specify unit tests for the transition
  map and the metric maths only; the proposal's QA claims are broader.
- **No ethics artefacts.** The participant information sheet and consent form the
  proposal commits to are not held here.
