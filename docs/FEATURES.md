# Approved feature coverage

This maps section 8 of the supplied brief to runnable screens. A checked software flow is not a clinical approval or an integration claim.

| Brief | Screens and minimum flow |
|---|---|
| 8.1 Weekly priorities and feed | Home: finite expandable “what may be happening” cards before coordination; practical optional actions, priorities and low-energy mode |
| 8.2 Preconception | Care → You: preparation checklists, Periods & cycle available at every stage, uncertain estimates, appointment questions and sample library |
| 8.3 Pregnancy | Pregnancy demo/onboarding; Care → You/Baby: development/body-change samples, optional symptoms, preparation, appointments and first-weeks checklist |
| 8.4 Parent recovery/wellbeing | Care → You: private optional feeling/need check-in; needs prepare a separately confirmed help request; recovery library |
| 8.5 Sleep support/training | Care → Baby → Sleep training & routines: prominent topic, eligibility/preferences wizard, previewed sample plans, current step, check-ins, pause/resume/adjust/end; editable completed-sleep dialog and saved rows |
| 8.6 Rest and care shifts | Circle → Care time: offered/accepted care windows, responsible person and times, explicit change requests; connected handover |
| 8.7 Feeding/solids | Care and Log: nursing/bottle/pump records with units; feeding preferences; foods offered and observed reactions; sample solids education |
| 8.8 Everyday care | Care timeline, optional diaper logging, sample text demonstrations/transcripts, play and development library, milestones |
| 8.9 What works profile | Care → Baby: editable family settling/feeding/comfort preferences with author/update times |
| 8.10 Appointments/Calendar | Plan → Appointments: create/edit/cancel, timezone, participants; discreet downloadable ICS. Explicit demo Google connection adds one private fictional appointment, repeat sync without duplicates, persistent status and disconnect. Real Google two-way sync is **not connected/implemented** |
| 8.11 Questions/follow-through | Plan: suggested/typed/optional browser-voice questions, appointment agenda, selected-record visit export, visit notes and next steps → task/follow-up |
| 8.12 Medication | Care: recorded clinician instructions, administrations given/skipped/unknown, duplicate warning requiring confirmation, correction history; no dose calculation |
| 8.13 Health/documents | Plan: authenticated/scoped private App Storage uploads (PDF/image/text), label, replace, delete, view/download; no EHR/official-record verification |
| 8.14 Responsibilities/help | Together: task ownership/status/dates; help-request preview and recipients; limited request links with separate claim/complete states; manual link sharing |
| 8.15 Handover/continuity | Together → Handover/Circle: record timestamps, missing/stale labels, selective download, temporary/revocable grants, two-party administration transfer; co-administrator invitation/consent |
| 8.16 Childcare pack | Together → Childcare: reuse preferences/logs/contacts, choose sections, preview/export, packing and return-to-work checklist |
| 8.17 Administrative timeline | Plan: editable country-labelled sample checklist, official-source references and unreviewed status; user deadlines |
| 8.18 Get help | Persistent Get help: saved contacts and official-resource routes; prominent no-emergency-monitoring/dispatch boundary; no guessed local emergency numbers |

## Cross-cutting

- All stages can be selected; stage changes require confirmation and keep care/support history.
- Server-enforced adult-private records remain private across caregiver access and administration transfer.
- Period dates alone can be author-shared, after confirmation, to named read-only recipients; private check-ins and symptoms are not included. Circle explicitly reports each person's period visibility.
- Flo export import is a one-time, locally reviewed JSON/CSV mapping. Only selected normalized dates are sent; there is no direct Flo sync or raw-export storage.
- Selected-child birth dates are editable in Settings by family administrators; demo age presets use the same record-saving path. Age changes do not remove Solids or existing logs/plans.
- Collection permission offers explicit Yes/No and an unrecorded state; it is a family note, not proof of legal authorization.
- Real authentication, relational persistence, private file storage and isolated demo personas.
- Settings: country/timezone, feeding approach, selected quick logs, quiet hours, dim/low-energy modes, device-data clear, personal-data removal.
- Offline essentials are explicitly selected read-only cached text. Writes require connectivity. This is not a full offline PWA.

## External/review-dependent

- Google OAuth and actual two-way event synchronization.
- Qualified clinical review and verified country-specific content/resources.
- Reviewed demonstration videos (prototype provides labelled text demonstrations).
- External email/SMS/push delivery and native widgets are not offered.
- Unavailable-owner recovery requires an identity-verified support process, not automatic takeover.

## Verification still required before real use

Real signed-in multi-user flows, authenticated upload lifecycle and revocation, accessibility/contrast audit, and complete desktop/mobile interactive acceptance testing. API smoke checks and visual screenshots do not substitute for these.
