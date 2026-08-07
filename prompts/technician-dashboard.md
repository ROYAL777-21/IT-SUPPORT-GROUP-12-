# Prompt — Technician dashboard (Slice 2)

Requires Slice 1 to be merged. Paste everything below the line into Claude Code,
from the repo root.

---

You are building the technician side of **Eduvos IT SupportHub**. Slice 1 built the
student lifecycle; this slice builds the half that closes the loop.

Technicians are the users who generate the study's *response tracking* data. Every
status change, assignment and reply they make is a measured event. A technician
who avoids the tool because it's slower than WhatsApp destroys the dataset — so
speed of triage matters more than visual polish here.

## Before you write code

Read, in this order, then **stop reading**:

1. `CLAUDE.md`
2. `.claude/skills/supporthub-ui/SKILL.md`
3. `docs/api-contract.md` — especially the internal-notes rule and the transition map
4. The Slice 1 code — reuse its primitives; do not build a second Button

Do not open `docs/registry.md` or any external repo unless you hit a problem a
registry row names. Say which row sent you there if you do.

Tell me in one paragraph what you're about to build before you build it.

## Different device assumption from Slice 1

Technicians work at lab PCs. This is the one part of the app that is **desktop-first**:
design for 1280px, but it must remain fully usable at 768px because technicians
also triage from a tablet while walking between buildings. It does not need to work
at 360px. Say so explicitly if a layout can't hold at 768px rather than shipping a
squashed table.

## Build exactly this

**1. Queue** (`/queue`) — the technician's home screen
- All tickets, default sorted by priority then age
- Filter by status, category, priority, assignee; free-text search
- Unassigned tickets visually distinct — that's the work nobody has picked up
- Show ticket age prominently; a ticket sitting at `submitted` for two days is the
  thing this whole research project exists to surface
- Row shows: id, title, category, priority, status, reporter, assignee, age
- Empty state per filter combination, not one generic "no results"

**2. My tickets** (`/queue/mine`) — same table, scoped to the current technician

**3. Ticket detail, technician view** (`/tickets/:id`)
- Everything the student sees, plus device info, full audit trail, and internal notes
- Assign to self (one click — this is the most-used control on the screen) or to another technician
- Change status, constrained to legal transitions from `docs/api-contract.md`.
  Illegal transitions must not be offered in the UI at all — don't render a control
  and then reject it
- Change priority, with the change recorded as an event
- Escalate: reason required, raises priority to at least `high`, appends an event
- Reply in two modes: **public reply** (the reporter sees it) and **internal note**
  (they never do). The mode must be obvious before sending and unmistakable after —
  a technician must never be able to think they wrote an internal note and have it
  go public
- Resolve, and close with a reason

**4. Status transition safety**
Implement the transition map in one place — a pure function — and have both the UI
and the MSW handler use it. Not two copies that drift.

## Explicitly out of scope — do not build

Manager analytics (Slice 3) · knowledge-base authoring · bulk actions · saved
filter views · technician performance league tables · shift scheduling · SLA timers
and breach alerts · real-time updates or websockets · notifications · assignment
rules or auto-routing · dark mode.

Several of those are things a commercial helpdesk has. That is precisely the sprawl
the proposal argues against. If you think one is genuinely required, stop and say so.

## How to work

Pause after each for my review:

- **A.** Transition map as a pure function + tests for it, and the PATCH handler that uses it
- **B.** Queue table, filters, search, sort, empty states
- **C.** Ticket detail technician view, assignment, status and priority controls
- **D.** Public reply vs internal note, escalation
- **E.** 768px pass, keyboard pass

The transition map is step A because everything else depends on it being right.
It is also the only part of this slice that gets unit tests — test the rules, not
the rendering.

## Done means

`tsc` clean · illegal transitions unreachable in the UI · internal notes provably
absent from every non-staff API response (show me the handler filtering them) ·
every table has loading, empty, error and loaded states · fully keyboard-navigable,
including the queue table · usable at 768px · every status change writes an event ·
no console errors.

## Anti-patterns — I will reject these

A data-grid library. A state-management library. Duplicating the transition rules.
Filtering internal notes only in the component. Rendering a disabled control for an
illegal transition instead of omitting it. `any`. Optimistic updates that lie when
the request fails. A second set of UI primitives when Slice 1 already has them.

Start with step A.
