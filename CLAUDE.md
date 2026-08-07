# Eduvos IT SupportHub

Campus IT support ticketing app. Group 12, ITDMA3 Research Design & Methodology.
The app is the research artefact for a Design Science Research study — it gets
**evaluated by real users**, so usability and ticket-data completeness matter more
than feature count.

## Prime directive: build the smallest thing that works

This project is deliberately lean. Before adding anything, apply the ladder:

1. **Don't** — can we ship the objective without it? (default answer: yes)
2. **Reuse** — does it already exist in this repo?
3. **Platform** — can the browser/CSS/HTML do it natively?
4. **Dependency** — only if 1–3 genuinely fail, and only one, and note why.

Reject on sight: state-management libraries, component libraries, animation
libraries, form libraries, chart libraries, icon mega-packs, `any`, barrel files,
abstractions with one caller, "future-proofing", and features no research
objective asks for.

## Stack (fixed — do not substitute)

React 18 + Vite + TypeScript (strict) + Tailwind + React Router.
Data is **mocked via MSW** against a typed contract. No real backend yet.
Ships as an installable PWA (mobile-first: phones first, lab PCs second).

## Domain vocabulary (use these exact terms — never invent variants)

- **Roles**: `student` · `lecturer` · `staff` · `technician` · `manager`
- **Ticket status** (exactly five): `submitted` → `assigned` → `in_progress` → `resolved` → `closed`
- **Priority**: `low` · `medium` · `high` · `critical`
- **Categories**: `wifi` · `lms` · `account` · `printing` · `lab_computer` · `software` · `email` · `projector` · `other`
- A ticket is **complete** when it carries category, description, urgency, location,
  and (where relevant) an attachment. Ticket completeness is a measured research
  variable — guided forms exist to raise it.

## POPIA / privacy (non-negotiable)

Collect the minimum. Never build a field for passwords-in-ticket-body, ID numbers,
or personal files. Prototype testing uses simulated data only. Any attachment UI
must warn the user not to upload personal documents.

## Routing: where to look things up

Do **not** load these unless the current task needs them.

| Need | Open |
|---|---|
| Research objectives, evaluation measures, scope justification | `docs/proposal-brief.md` |
| External skills/plugins/libraries — what exists and when to use it | `docs/registry.md` |
| Build prompts for each slice | `prompts/` |

UI conventions live in `.claude/skills/supporthub-ui/SKILL.md` and load
automatically when you touch front-end code. Don't duplicate them here.

## Definition of done

TypeScript clean · keyboard-navigable · visible focus · labelled inputs ·
works at 360px wide · loading + empty + error states present · no console errors.
