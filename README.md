# Eduvos IT SupportHub — Group 12

Campus IT support ticketing app. Research artefact for ITDMA3 (Research Design and
Methodology), evaluated with SUS, TAM, DeLone & McLean and ISO/IEC 25010.

## How context works in this repo

Nothing bulky is loaded by default. Each layer is opened only when it's needed:

| File | Loaded | Purpose |
|---|---|---|
| `CLAUDE.md` | every session, automatically | Constraints, stack, domain vocabulary, routing table |
| `.claude/skills/supporthub-ui/SKILL.md` | automatically, on front-end work | UI, accessibility and form rules |
| `docs/proposal-brief.md` | on request | The 10% of the research proposal that changes build decisions |
| `docs/registry.md` | on request | Curated external skills/libraries and when to use each |
| `prompts/*.md` | pasted by you | One prompt per build slice |

Adding a large "read everything" file would defeat this. If a rule is needed on
every task, it belongs in `CLAUDE.md`. If it's needed sometimes, it belongs in a
skill. If it's needed rarely, it belongs behind a row in `docs/registry.md`.

## Building

Slice 1 is the front-end foundation. Paste `prompts/frontend-foundation.md` into
Claude Code from the repo root.

## Group 12

Nkosinathi Skosana · Konokono Mgiba · Tshegofatso Manzini · Kagiso Modisane
