# Kinwell — frontend

A quiet companion for first-time parents and their support circle. React + Vite, wouter, TanStack Query, Tailwind v4, Clerk (cookie auth).

## Feature checklist (brief section 8)
- [x] 8.1 Onboarding: stage, dates with "not sure", country, timezone, priorities; confirmed stage transitions incl. sensitive pause (Settings)
- [x] 8.2 Home: finite feed (~5 cards) ending in "You're caught up", Explore more, now/next, need chips, weekly priorities
- [x] 8.3 Persistent Log and Get help on every screen; low-energy mode; dim theme; large targets
- [x] 8.4 Care / You: check-in, cycle estimate, checklists, symptoms, library, saved items
- [x] 8.5 Care / Baby: timeline, feeding, sleep, sleep-plan wizard, what works, solids, milestones, multiple children
- [x] 8.6 Medication with duplicate-dose warning and server correction history
- [x] 8.7 Circle: invite links, grants, expiry, revoke/restore, two-sided admin transfer
- [x] 8.8 Tasks, 8.9 help requests (preview + confirm, limited link), 8.10 care/rest shifts (offer, accept, request change)
- [x] 8.11 Handover, 8.12 childcare pack + return-to-work checklist, 8.13 selective export (text/JSON/ICS)
- [x] 8.14 Appointments (CRUD, timezone, questions, visit notes, next steps to task/follow-up, .ics), questions
- [x] 8.15 Documents (upload/rename/replace/delete/download; blocked in demo), 8.16 contacts, 8.17 admin timeline (UK sample)
- [x] 8.18 Privacy: device clear, export, account deletion; public demo with persona switcher (demo only)

## Honest limitations
- Content is **not clinically reviewed**; admin items are an unverified UK sample.
- **No Google Calendar sync** — .ics downloads only, which don't update.
- **No external delivery** — no email, SMS or push; invite links are shared manually; notifications are in-app.
- **No offline writes** — saves need a connection; only read-only "offline essentials" are cached on device.
- Demo invitations can't create real caregiver accounts; uploads are disabled in the demo.
