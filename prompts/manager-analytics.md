# Prompt — Manager analytics (Slice 3)

Requires Slices 1 and 2 to be merged. Paste everything below the line into Claude
Code, from the repo root.

---

You are building the campus manager view of **Eduvos IT SupportHub** — the smallest
slice, and the one most likely to be over-built.

This screen answers four questions and nothing else: *how much support demand is
there, how fast are we responding, what keeps breaking, and are people satisfied?*
Those four map directly to the proposal's service-improvement claim. A fifth chart
that answers no research question is a liability, not a bonus.

## Before you write code

Read, in this order, then **stop reading**:

1. `CLAUDE.md`
2. `.claude/skills/supporthub-ui/SKILL.md`
3. `docs/api-contract.md` — the `Metrics` shape and the export endpoint
4. `docs/proposal-brief.md` — the evaluation-instruments section

Then, **before writing a single line of chart code**, load the `dataviz` skill. It
carries the colour, axis and accessibility rules for charts; don't improvise them.

Tell me in one paragraph what you're about to build before you build it.

## Charts without a chart library

`CLAUDE.md` rejects chart libraries and that holds here. Four charts of these shapes
are a few dozen lines of SVG each, and hand-built SVG is more accessible than most
library output because you control the markup.

If you reach a chart you genuinely cannot build this way, stop and tell me which one
and why — do not quietly `npm install`.

Every chart needs a text equivalent: a caption stating the headline number, and an
accessible table of the same data (visually hidden is fine). A chart no screen
reader can read is a chart that fails the ISO 25010 usability criterion this project
is graded on.

## Build exactly this

**Dashboard** (`/dashboard`, manager role only — a technician hitting it gets 403, not a blank page)

Date-range control at the top: last 7 days · last 30 days · this term. Everything
below responds to it.

1. **Demand** — ticket volume per day across the range. Line or bar. Caption states
   the total and the direction of travel.
2. **Pipeline** — open tickets by status, as five counts. This is a small-numbers
   display, not a chart; big legible figures beat a donut. Tickets sitting in
   `submitted` are the number a manager acts on, so make that one impossible to miss.
3. **Responsiveness** — median first-response and median resolution time, broken
   down by priority. Medians, not means; state the sample size next to each, because
   a median of two tickets is not a finding.
4. **Recurring problems** — tickets by category, ranked, horizontal bars. This is the
   "analyse recurring problems" objective — the whole point is that it tells the
   manager where to fix the underlying cause.
5. **Satisfaction** — average rating plus the 1–5 distribution, with the response
   count and response rate. An average of 4.6 from three responses must not look
   like an average of 4.6 from ninety.

**CSV export** — `GET /api/export/tickets.csv` for the selected range, wired to a
download button.

Do not skip this or treat it as a nice-to-have. The proposal states that quantitative
data will be analysed in Excel and SPSS. Without export, the group hand-copies data
out of a prototype at analysis time, which is both a waste of days and a route to
transcription errors in the submitted results. It is roughly twenty lines and it is
the highest research-value item in this slice.

Export the ticket fields only. **Never export reporter names or email addresses** —
export a stable pseudonymous participant id instead. POPIA, and the ethics protocol
promises aggregate reporting.

## Empty and thin data

This dashboard will be demonstrated before there is much data. Design for that: a
range with no tickets shows a proper empty state, and any metric computed from fewer
than five tickets is labelled as indicative rather than presented as a finding.
Overstating thin data in a research artefact is the kind of thing a moderator notices.

## Explicitly out of scope — do not build

Per-technician performance metrics · SLA targets and breach reporting · forecasting
or trend prediction · drill-through from chart to ticket list · scheduled email
reports · PDF export · custom date pickers beyond the three presets · comparison
against a previous period · anything answering a question the proposal doesn't ask.

Per-technician metrics in particular: the proposal's ethics section notes staff may
fear workflow criticism reflecting on their performance. Building a technician
leaderboard into an artefact used in a study with those staff is an ethics problem,
not a feature. Don't.

## How to work

Pause after each for my review:

- **A.** `/api/metrics` handler + the aggregation functions, with unit tests on the median and rate maths
- **B.** Date range control, pipeline counts, satisfaction — no SVG yet
- **C.** The three charts, with their accessible tables
- **D.** CSV export with pseudonymisation
- **E.** Empty/thin-data states, 768px pass, keyboard pass

Step A is first and is the only part with tests. If the medians are wrong, every
number in the final report is wrong, and nobody will catch it by looking at a chart.

## Done means

`tsc` clean · role-gated · every chart has a caption and an accessible table ·
no chart library added · medians correct and unit-tested · sample sizes shown ·
CSV carries no personal identifiers · empty and thin-data states present ·
usable at 768px · no console errors.

## Anti-patterns — I will reject these

Recharts, Chart.js, D3, or any charting dependency. Means where the contract says
medians. A metric with no research question behind it. Percentages without
denominators. Colour-only encoding. Fake or hardcoded numbers to make the demo look
healthy. Rounding that hides small sample sizes.

Start with step A.
