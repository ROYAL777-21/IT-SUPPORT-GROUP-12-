---
name: supporthub-ui
description: UI conventions for the Eduvos IT SupportHub front end. Use whenever writing, reviewing, or restyling React components, Tailwind classes, screens, forms, or navigation in this repo — including ticket forms, status displays, dashboards, and any accessibility or responsive-layout work.
---

# SupportHub UI conventions

Read `docs/proposal-brief.md` if you need to know *why* a rule exists. Otherwise
just follow it.

## Non-negotiables

Participants are graded on completing tasks on a **phone**, unaided, first try.

- **360px is the design width.** Build mobile, then let it breathe on desktop.
- **Touch targets ≥ 44px.** Nothing smaller is tappable.
- **Every input has a real `<label>`.** Placeholders are not labels.
- **Visible focus ring on everything focusable.** Never `outline: none` without a replacement.
- **System status is always visible** — loading, saving, saved, failed. Silence reads as a broken app.
- **No dead ends.** Every empty state names the next action.
- **Errors say what to do**, not what went wrong internally. "Add a description so the technician can help" — not "Validation failed: description required".

## Tokens — define once in `index.css`, never hardcode a hex in a component

```css
:root {
  --brand: /* Eduvos primary — confirm before locking */;
  --bg; --surface; --border; --text; --text-muted;
  --status-submitted; --status-assigned; --status-in-progress;
  --status-resolved; --status-closed;
  --priority-low; --priority-medium; --priority-high; --priority-critical;
}
```

Status and priority colours are **semantic**, used identically everywhere. A
student and a technician must read the same colour as the same meaning.

Contrast: body text ≥ 4.5:1, large text and UI borders ≥ 3:1. Check it, don't eyeball it.
**Never encode status by colour alone** — always pair the colour with a text label
or icon. Colour-blind participants are in the sample.

## Component rules

- Function components, named exports, one component per file.
- Props typed with an explicit `interface`. No `any`, no `React.FC`.
- Server state lives in the component that fetches it; lift only when a second
  consumer actually appears. No global store.
- Extract a component at the **third** repetition, not the first.
- Tailwind utilities inline. Reach for `@apply` only when the same 6+ class
  string appears 3+ times.
- Compose class names with a 5-line local `cn()` helper — not a dependency.

## Screen skeleton

Every screen renders one of four states, in this order of implementation:
`loading` → `empty` → `error` → `loaded`. A screen missing any of them is unfinished.

## Forms — this is where the research data comes from

The guided ticket form exists to raise **ticket completeness**, a measured variable.

- Validate on blur and on submit. Never on every keystroke.
- Keep errors adjacent to the field, tied via `aria-describedby`.
- Category first — it should drive which follow-up fields appear.
- Urgency uses plain language with consequences, not bare severity words
  ("I can't work at all" beats "Critical").
- Never block submission on an optional field; nudge instead.
- Attachment control must carry the POPIA warning: no personal documents, no
  passwords, screenshots only.

## Accessibility floor

Semantic HTML first — `<button>`, `<nav>`, `<main>`, `<form>`. ARIA only when no
element fits. Full keyboard reachability. Live regions for status changes. One
`<h1>` per screen, headings in order.

## Copy

Plain South African English, second person, no jargon, no exclamation marks.
"Your ticket is with a technician" — not "Ticket successfully assigned to
technician queue". Never promise a resolution time the system can't guarantee.
