# Proposal brief — decision-relevant compression

Source: `ITDMA3_Eduvos_IT_SupportHub_Research_Proposal_Final2.docx` (~38k chars).
This is the ~10% of it that changes build decisions. Open the original only for
citation wording or the literature review.

## The claim we must be able to defend

Campus IT support at Eduvos runs through fragmented channels (email, WhatsApp,
walk-ins, phone). That produces incomplete issue descriptions, duplicate requests,
inconsistent escalation, delayed feedback, no visibility for the user, and no data
for service improvement. A purpose-built ticketing app fixes this **only if people
actually use it** — so ease of use is a functional requirement, not polish.

## Research objectives → what the software must therefore do

| Objective | Build consequence |
|---|---|
| Identify functional + non-functional requirements across all user roles | Role-aware UI; each role's view is distinct and justified |
| Analyse weaknesses of informal reporting (completeness, transparency, prioritisation) | Guided ticket form that *forces structure* informal channels lack |
| Design roles, workflows, architecture, data, privacy controls | Explicit ticket lifecycle; typed data model; POPIA-aware fields |
| Evaluate usability, usefulness, ease of use, ticket completeness | Every screen must survive a timed task test with a real student |

## Evaluation instruments — the app is graded against these

- **SUS** (Brooke 1996) — 0–100 usability score after real interaction.
- **TAM** (Davis 1989) — perceived usefulness + perceived ease of use → intention to use.
- **DeLone & McLean (2003)** — system quality, information quality, service quality,
  use, user satisfaction, net benefits.
- **ISO/IEC 25010** — functional suitability, usability, reliability, security,
  maintainability, performance efficiency.
- **Ticket completeness** — did the submitted ticket carry category, location,
  description, urgency, screenshot?

**Design implication:** confusing navigation, unlabelled controls, invisible system
status, and dead ends cost measurable marks. Every state change needs visible feedback.

## Usability test tasks (participants will literally do these)

1. Log in.
2. Submit a Wi-Fi issue with category, urgency, location, description.
3. Attach a screenshot.
4. Check the status of an existing ticket.
5. Read and respond to a technician's update.
6. Submit satisfaction feedback after resolution.

**These six tasks are the acceptance criteria for the first front-end slice.**
If a task can't be completed end-to-end on a phone, the slice isn't done.

## Roles and what each one needs

- **Student / lecturer / staff** — report fast, track status, get notified, comment,
  search knowledge base, give feedback. Mobile-first, low friction.
- **Technician** — assign, update status, set priority, escalate, see full diagnostic
  detail, spot recurring problems.
- **Manager** — ticket volumes, response times, frequent categories, satisfaction.

Priority order for building: **student first** (largest population, drives SUS/TAM
data), technician second, manager last.

## Architecture stated in the proposal (stay consistent with it)

Client app → backend API → **relational** database, plus an auth layer and secure
file storage for screenshots. Role-based access control separating students, staff,
technicians, administrators. Security: institutional SSO where available, input
validation, audit logs, least privilege, encrypted connections, data minimisation.
QA: unit tests on core functions, integration tests on workflows, usability testing,
security review, acceptance testing against user stories.

> The front end is currently built against MSW mocks that imitate this API exactly,
> so the real backend can be swapped in without touching UI code.

## Comparative advantage we must visibly deliver

Against **fragmented channels**: one workflow recording every request, owner, status,
timestamp, update, resolution.
Against **generic helpdesk tools**: lightweight, campus-specific categories,
mobile-first, focused dashboards — not enterprise sprawl.
Against **spreadsheets**: automated status updates, notifications, searchable history.
Against **unstructured messages**: guided forms that capture device, location, urgency.

## Constraints

- Prototype, not production. Scope honestly; don't oversell in UI copy.
- POPIA (Act 4 of 2013) governs personal information. Simulated data in testing.
- 30–60 participants. Ethics approval precedes data collection.
- Submission: 16 June 2026.
