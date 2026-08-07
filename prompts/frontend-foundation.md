# Prompt — Front-end foundation (Slice 1)

Paste everything below the line into Claude Code, from the repo root.

---

You are building the first front-end slice of **Eduvos IT SupportHub**, the research
artefact for a Design Science Research study. It will be put in front of real
students in a timed usability test, and scored with SUS and TAM. Usability failures
cost marks; missing features do not.

## Before you write code

Read, in this order, and then **stop reading**:

1. `CLAUDE.md` — constraints and domain vocabulary
2. `.claude/skills/supporthub-ui/SKILL.md` — UI rules
3. `docs/api-contract.md` — types, endpoints, status transitions
4. `docs/proposal-brief.md` — the six usability tasks are your acceptance criteria

Do **not** open `docs/registry.md`, the source `.docx`, or any external repository
unless you hit a specific problem a registry row names. If you do open one, say
which row sent you there and why.

State in one paragraph what you understood the scope to be. If it conflicts with
this prompt, ask before proceeding.

## Stack — fixed

React 18 · Vite · TypeScript strict · Tailwind · React Router · MSW for mocked data ·
installable PWA. No other runtime dependencies without asking me first and naming
which step of the ladder in `CLAUDE.md` failed.

## Domain model

Implement `docs/api-contract.md` exactly — types, endpoints, status transition map,
seed data. Invent nothing; if something you need is missing from it, stop and ask,
then we change the contract in its own commit.

This slice needs only these endpoints. Mock the rest as 501 so later slices fail loudly
rather than silently:

```
POST   /api/auth/login
GET    /api/tickets?scope=mine
POST   /api/tickets
GET    /api/tickets/:id
POST   /api/tickets/:id/comments
POST   /api/tickets/:id/feedback
POST   /api/attachments
```

Give the MSW handlers realistic latency and one deliberate failure case, so the
error states you build are real rather than theoretical.

## Build exactly this

A design system plus the **student ticket lifecycle**, end to end:

1. Login (mocked — pick a role, no real auth)
2. Ticket list: status filter, search, empty state
3. Guided ticket creation: category first, then title, description, urgency in plain
   language, location, optional attachment with the POPIA warning
4. Ticket detail: status timeline, full history, comment thread
5. Reply to a technician's comment
6. Post-resolution feedback (1–5 rating plus optional comment)
7. App shell: mobile bottom nav, offline-ready PWA manifest and service worker

That list maps 1:1 to the six usability-test tasks. Nothing else ships in this slice.

## Explicitly out of scope — do not build

Technician dashboard · manager analytics · knowledge-base article pages (stub the
search endpoint only) · real auth · notifications · dark mode · i18n · admin
settings · animations beyond CSS transitions · tests for presentational components.

If you believe something out of scope is genuinely required, stop and say so.
Do not build it and tell me afterwards.

## How to work

Build in this order, and **pause after each for my review**:

- **A.** Project setup + tokens + 5–6 primitives (Button, Input, Select, Textarea, Badge, Card)
- **B.** MSW handlers + seed data + typed API client
- **C.** App shell, routing, login
- **D.** Ticket list + detail
- **E.** Guided creation form + attachment + feedback
- **F.** PWA manifest, service worker, 360px pass, keyboard pass

At each pause give me: what you built, what you deliberately left out, and anything
you're unsure about. Keep it to a few lines — no essays, no summary documents,
no README updates unless I ask.

## Done means

`tsc` clean · every screen has loading, empty, error and loaded states · fully
keyboard-navigable with visible focus · usable at 360px · no colour-only status
encoding · every input labelled · no console errors · all six usability tasks
completable on a phone without help.

## Anti-patterns — I will reject these

A state-management library. A component library. A `utils/` folder of one-line
helpers. Abstractions with a single caller. `any`. Comments restating the code.
Placeholder text standing in for labels. `alert()`. Inline hex colours. Files over
~200 lines. Features I didn't ask for, however small.

Start with step A.
