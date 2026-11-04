# Kinwell — development setup and readiness

Kinwell is the user-selected product name. The existing artifact directory, API paths, database table names and session keys are retained for compatibility.

## Run

Use the existing API Server and web workflows (the web workflow retains the directory name `artifacts/together`). The application uses React/Vite, Express, Clerk, PostgreSQL/Drizzle, and private App Storage. It does not require an AI service or a payment account.

1. Install dependencies with `pnpm install`.
2. Provision Clerk and App Storage using the platform's setup tools. These are already configured in this development environment.
3. Set the environment variables listed in `.env.example` through Secrets; do not place credentials in source files.
4. Apply development schema changes with `pnpm --filter @workspace/db run push`.
5. Generate the API client after contract changes with `pnpm --filter @workspace/api-spec run codegen`.
6. Start the managed `artifacts/api-server: API Server` and `artifacts/together: web` workflows. They supply runtime ports and paths.

The public app offers isolated demonstration households. Each browser receives an opaque HttpOnly demo cookie; demo data is stored in PostgreSQL, not just browser storage. Preparing, pregnancy, and postpartum samples are separate households. Resetting or switching a demo creates a new isolated sample; it never deletes authenticated users' data. Demo sessions expire after seven days. Expired demo records currently require operator cleanup.

Real accounts authenticate through Clerk and receive their own empty household with onboarding. Do not enter real health information into a demo. Private uploads require a real authenticated family account.

## Permissions and administration

Memberships are checked on each API request, including expiry and revocation. Baby-care, routines, care time, tasks, appointments, medication, contacts and documents have explicit grants. Symptoms and check-ins remain author-private, even from household administrators. Period history is private by default; only its author may explicitly share existing and future dates with selected active family members. Recipients have read-only access, never receive this access merely by becoming an administrator, and lose server access when sharing is revoked. Previously downloaded copies cannot be recalled. Limited help links expose only the selected practical request.

Period import uses a user-requested Flo JSON export (or mapped CSV), reviewed locally in the browser. Only selected normalized period dates go to the API; the raw export is not stored. Flo does not publish a guaranteed JSON export schema; the importer needs explicit field mapping when the format differs. It is a one-time import, not a Flo account connection or live synchronization. Official export instructions: https://help.flo.health/hc/en-us/articles/360054973811-How-do-I-get-a-copy-of-my-data

Caregiver invitations require authentication and acceptance; links for limited practical help can be claimed without unrelated onboarding. There is no email/SMS delivery provider: users deliberately copy a secure invitation link.

Administrator transfer is a two-party process: the current administrator requests transfer to an active account and that recipient confirms it. The prior administrator becomes a co-administrator; private adult records do not change ownership. Co-administrator invitation/acceptance can designate a consenting backup administrator. Administration is an application role, not proof of legal guardianship.

If the original administrator is unavailable, recovery is an operator-controlled process requiring verified identity and authority. Automatic recovery/takeover is intentionally not implemented. Operators must not transfer access based only on inactivity, a check-in, or possession of a household identifier.

## Remaining external setup

### Google Calendar

The application explicitly reports **disconnected** and provides manual scheduling plus `.ics` downloads. This is a supported credential-unavailable fallback, not two-way synchronization.

Before enabling two-way sync, provision per-user Google OAuth, select a calendar with consent, keep refresh tokens server-side, persist stable event mappings and sync cursors, implement retries and conflict handling, and test Google-side changes. Do not connect one builder's personal calendar to all app users.

Official references consulted:
- https://developers.google.com/workspace/calendar/api/guides/sync
- https://developers.google.com/workspace/calendar/api/auth
- https://developers.google.com/workspace/calendar/api/v3/reference/events

Sync must be limited to app-managed events. Persist `nextSyncToken`, paginate changes including deletions, handle invalidated sync tokens with a fresh sync, and keep unrelated events untouched. Recommended conflict policy: detect differing versions and ask the user, rather than silently overwriting. No Google credentials are required for the current fallback.

### Clinical and local review

The library and demonstrations are visibly unreviewed prototype material. Linking to an official source is not a claim that a clinician reviewed the app. Fertility estimates, movement, sleep-training readiness, feeding, development, recovery and warning-sign content need qualified review before public health-related use. There is no medical chatbot, dose recommendation, diagnosis, emergency monitoring or dispatch.

The prototype locale is explicitly UK; users choose their own country/timezone. No country emergency number is guessed. Verify official local resources and local administrative rules before launch. Review metadata and eligibility must be maintained as content is approved.

### Notifications and offline

In-app activity is distinct from external delivery. No push/email/SMS delivery or native widget is claimed. Offline viewing is limited to deliberately saved essentials with a stale-data indication. Writes require connectivity; there is no silent offline queue. Clear device data on shared devices and sign-out.

## Retention and deletion

Leaving/removing personal data deletes author-private records, removes active household membership, and retains shared baby history and other caregivers' entries. Audit history and platform backups may retain prior information; this prototype does not promise immediate erasure from backups. A production retention policy and full data-subject request process need legal/security review. Deleting an application profile is separate from deleting the underlying authentication identity.

## Verification

See `docs/VERIFICATION.md` for the checks actually run. A running prototype, typecheck, or demo is not proof of public-launch safety. Full authenticated multi-user, cross-household, file-permission, accessibility and integration acceptance testing is required before real use.
