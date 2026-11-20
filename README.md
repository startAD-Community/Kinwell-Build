# Kinwell

Kinwell is an open-source MVP that helps first-time parents understand what may
be happening now, prepare for what comes next, and coordinate care—from
preconception through pregnancy and early parenthood.

## What it does

- Stage- and age-relevant guidance with expandable explanations and practical actions.
- Baby-care logging, including sleep, feeds, nappies and first foods.
- Optional sleep-support plans with check-ins and pause/resume controls.
- Private period tracking, reviewed file-based Flo export import, and explicit
  read-only sharing with chosen family members.
- Family care time, tasks, appointments, questions, contacts and documents.
- Isolated sample families, demo-user switching and editable baby-age presets.
- A clearly labelled simulated Google Calendar connection and fictional imported
  appointment. It does not access Google or provide live synchronization.

## Demo and safety boundaries

This is a prototype, not medical advice or an emergency service. Health-related
guidance and sleep plans have **not been clinically reviewed**. Estimates and
age-based content are not diagnoses or guarantees. Use fictional information
when trying the demo; further clinical, privacy, security and accessibility
review is needed before real-family use.

The initial content uses UK examples. Local resources and administrative
requirements must be verified for the user's country. No live Google Calendar
sync, background notification delivery or full offline editing is claimed.

## Technology

TypeScript monorepo using pnpm, React/Vite, Express, PostgreSQL/Drizzle, Clerk
authentication and private file storage.

The user-facing name is Kinwell. Some internal directories, API routes and
database identifiers retain the original working name `together` for compatibility.

## Development

1. Install Node.js 24 and pnpm.
2. Run `pnpm install`.
3. Configure your own database, authentication and storage services. The
   `.env.example` file lists configuration names, not working credentials.
4. Follow [the setup guide](docs/SETUP.md) for database setup and the managed
   Replit workflows.
5. Run `pnpm run typecheck` to check the workspace.

The repository contains code, not a copy of the deployed database, user uploads
or service credentials. Publishing the code does not provision those services.

## Documentation

- [Setup and readiness](docs/SETUP.md)
- [Feature coverage](docs/FEATURES.md)
- [Verification and known limits](docs/VERIFICATION.md)

## License

The project code is available under the [MIT License](LICENSE).
Dependencies and third-party materials remain subject to their respective licenses.
