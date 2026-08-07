# API contract — single source of truth

Every slice builds against this. If a prompt and this file disagree, **this file wins**.
Change it deliberately, in its own commit, and say what moved.

MSW mocks this exactly, so the real backend can replace the mocks without touching UI code.

## Types

```ts
type Role = 'student' | 'lecturer' | 'staff' | 'technician' | 'manager';
type Status = 'submitted' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
type Priority = 'low' | 'medium' | 'high' | 'critical';
type Category = 'wifi' | 'lms' | 'account' | 'printing' | 'lab_computer'
              | 'software' | 'email' | 'projector' | 'other';

interface User { id: string; name: string; email: string; role: Role; }

interface Ticket {
  id: string;                 // human-readable, e.g. "EDU-1042"
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: Status;
  location: string;           // campus, building, room
  deviceInfo?: string;
  attachments: Attachment[];
  reportedBy: User;
  assignedTo?: User;
  createdAt: string;          // ISO 8601
  updatedAt: string;
  firstResponseAt?: string;   // first staff reply or assignment — drives response-time metric
  resolvedAt?: string;
  closedAt?: string;
  closeReason?: 'resolved' | 'duplicate' | 'withdrawn' | 'no_action_required';
  escalation?: Escalation;
  comments: Comment[];
  events: TicketEvent[];      // audit trail
  feedback?: Feedback;
}

interface Attachment { id: string; filename: string; url: string; sizeBytes: number; }

interface Comment {
  id: string;
  author: User;
  body: string;
  createdAt: string;
  isStaffReply: boolean;
  isInternal: boolean;        // technician-only note — see the rule below
}

interface Escalation { reason: string; at: string; by: User; }

interface TicketEvent {
  id: string;
  at: string;
  actor: User;
  kind: 'created' | 'assigned' | 'status_changed' | 'priority_changed'
      | 'escalated' | 'commented' | 'resolved' | 'closed' | 'reopened';
  from?: string;
  to?: string;
}

interface Feedback { rating: 1|2|3|4|5; comment?: string; submittedAt: string; }
```

## Internal notes — hard rule

`Comment.isInternal === true` must **never** reach a student, lecturer or staff
user: not in the UI, not in the API response, not in a network payload they could
open dev tools and read. Filter server-side in the MSW handler, not in the
component. A technician's candid note leaking to a reporter is a trust failure and
a POPIA problem, and it is the single most likely serious bug in this app.

Internal notes must be visually unmistakable to technicians — distinct background,
explicit "Internal — not visible to the reporter" label. Colour alone is not enough.

## Legal status transitions

Nothing may move outside this map. Reject anything else in the API layer.

```
submitted    → assigned, closed*
assigned     → in_progress, submitted, closed*
in_progress  → resolved, assigned, closed*
resolved     → closed, in_progress          (reopen)
closed       → —                             (terminal)
```

`*` Closing from `submitted`, `assigned` or `in_progress` requires a `closeReason`
of `duplicate`, `withdrawn` or `no_action_required`. Closing from `resolved` uses
`resolved`. There is no sixth status — escalation is a flag, not a state.

Every transition appends a `TicketEvent`. The audit trail is what makes response
tracking measurable, so it is not optional.

## Endpoints

```
POST   /api/auth/login

GET    /api/tickets?scope=mine|queue&status=&category=&priority=&assignee=&q=
POST   /api/tickets
GET    /api/tickets/:id
PATCH  /api/tickets/:id                 // status, priority, assignedTo — validated against the map
POST   /api/tickets/:id/comments        // { body, isInternal }
POST   /api/tickets/:id/escalate        // { reason }
POST   /api/tickets/:id/feedback
POST   /api/attachments
GET    /api/knowledge-base?q=

GET    /api/metrics?from=&to=           // manager only
GET    /api/export/tickets.csv?from=&to=
```

`scope=mine` returns the caller's own tickets. `scope=queue` is technician/manager
only and returns everything. Role is enforced in the handler — a student hitting
`scope=queue` gets 403, not an empty list.

## Metrics response

```ts
interface Metrics {
  range: { from: string; to: string };
  volumeByDay: { date: string; count: number }[];
  openByStatus: Record<Status, number>;
  byCategory: { category: Category; count: number }[];
  responseMinutes: { priority: Priority; medianFirstResponse: number; medianResolution: number }[];
  satisfaction: { average: number; distribution: Record<'1'|'2'|'3'|'4'|'5', number> };
}
```

Medians, not means — a handful of stale tickets would otherwise distort the average,
and the report has to survive a supervisor asking why.

## Seed data

~40 tickets spanning 30 days, every status and category, realistic campus wording
("Wi-Fi drops in Library level 2", "Moodle won't accept my submission"), a spread
of response times, roughly 60% carrying feedback. Include a few deliberately
incomplete tickets — they are the baseline the guided form is supposed to beat.
