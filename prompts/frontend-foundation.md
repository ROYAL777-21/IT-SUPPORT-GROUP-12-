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
3. `docs/proposal-brief.md` — the six usability tasks are your acceptance criteria

Do **not** open `docs/registry.md`, the source `.docx`, or any external repository
unless you hit a specific problem a registry row names. If you do open one, say
which row sent you there and why.

State in one paragraph what you understood the scope to be. If it conflicts with
this prompt, ask before proceeding.

## Stack — fixed

React 18 · Vite · TypeScript strict · Tailwind · React Router · MSW for mocked data ·
installable PWA. No other runtime dependencies without asking me first and naming
which step of the ladder in `CLAUDE.md` failed.

## Domain model — implement exactly this, invent nothing

```ts
type Role = 'student' | 'lecturer' | 'staff' | 'technician' | 'manager';
type Status = 'submitted' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
type Priority = 'low' | 'medium' | 'high' | 'critical';
type Category = 'wifi' | 'lms' | 'account' | 'printing' | 'lab_computer'
              | 'software' | 'email' | 'projector' | 'other';

interface User { id: string; name: string; email: string; role: Role; }

interface Ticket {
  id: string;              // human-readable, e.g. "EDU-1042"
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: Status;
  location: string;        // campus, building, room
  deviceInfo?: string;
  attachments: Attachment[];
  reportedBy: User;
  assignedTo?: User;
  createdAt: string;       // ISO
  updatedAt: string;
  resolvedAt?: string;
  comments: Comment[];
  feedback?: Feedback;
}

interface Attachment { id: string; filename: string; url: string; sizeBytes: number; }
interface Comment { id: string; author: User; body: string; createdAt: string; isStaffReply: boolean; }
interface Feedback { rating: 1|2|3|4|5; comment?: string; submittedAt: string; }
```

Mocked endpoints (MSW handlers, realistic latency, and a deliberate failure case
so error states are real):

```
POST   /api/auth/login
GET    /api/tickets                 // current user's tickets
POST   /api/tickets
GET    /api/tickets/:id
POST   /api/tickets/:id/comments
POST   /api/tickets/:id/feedback
POST   /api/attachments
GET    /api/knowledge-base?q=
```

Seed ~12 tickets spread across every status and category, with realistic campus
wording ("Wi-Fi drops in Library level 2", "Moodle won't accept my submission").
Bland seed data makes usability tests unrealistic.

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
