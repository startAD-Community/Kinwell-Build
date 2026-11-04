# Verification performed

## Passed

- `pnpm run typecheck`: shared libraries, API server, web application, sandbox and scripts.
- API and web managed workflows started successfully.
- Desktop public/demo view inspected at 1440×1000.
- Phone public/demo view inspected at 390×844.
- `node scripts/src/together-smoke.mjs`: **28 API checks passed** against disposable synthetic demo households:
  - Anonymous family-data access rejected.
  - Separate preconception, pregnancy and postpartum samples.
  - Parent check-in scope enforced as private.
  - Event creation, persistence and correction.
  - Medication instructions distinct from administrations.
  - Duplicate-administration warning and correction history.
  - Isolated caregiver-persona switching.
  - Caregiver cannot read or modify another adult's private check-in.
  - Medication creation requires permission.
  - Cross-household update and export isolation.
  - Explicit stage confirmation and support-task continuity after birth.
  - Discreet ICS event download.
  - Limited help-link preview, claim and completion.
  - Two-party administrator transfer without private-health-data exposure.

The first smoke-check attempt incorrectly combined a cleared cookie and a replacement cookie with the same name. The test harness was corrected to omit cleared cookies; no application privacy bypass was found.

The final transfer-withdraw/decline and ongoing-expiry edits passed the full typecheck. The 28-check run predates those final narrow edits and is not represented as covering them.

## Not verified in this first build

- Signed-in browser UI: screenshots use an unsigned browser and show the isolated demo.
- Real multi-user Clerk account onboarding/invitation/session lifecycle.
- Authenticated private upload/replace/download/delete and revoked-file access.
- Complete interactive mobile/desktop end-to-end journeys.
- Full accessibility and color-contrast audit.
- Live Google OAuth or two-way sync (not configured/implemented).
- Real notification delivery (no external provider configured).
- Clinical suitability, content eligibility, local urgent resources or official administrative rules.

No independent code review or full-product browser acceptance pass was run for the first build. The focused browser regression below does not replace these checks before using the application with real family health information.

## Embedded-preview session regression

After a reported preview-loading failure, a focused browser test passed:

- Anonymous direct access and reload: bootstrap 200.
- Real app embedded under a different HTTPS top-level site: automatic demo creation and bootstrap 200 after iframe reload.
- Synthetic task creation inside the iframe: same household and saved task after reload.
- Demo reset: a new isolated household.
- Demo caregiver-persona selection: Alex remained selected after iframe reload.
- Forced first demo-creation request failure: “Try again” issued a new request and recovered.
- Session cookie metadata confirmed HttpOnly, Secure, SameSite=None, and partitioned by top-level site. No token values were reported.

The browser could not explicitly be configured to block every unpartitioned third-party cookie. Real Clerk sign-in was not exercised by this regression.

## Family identity, profiles and appointment responsiveness

Full workspace typecheck passed after the schema/contract/UI changes; the web typecheck also passed after the final avatar fallback fix.

Focused anonymous-demo browser verification passed:

- Circle distinguishes Mother, Father and Helper from administrator/caregiver/helper access, with distinct SVG avatars, including after reload.
- “Care time” is visible while compatibility route and record identifiers remain unchanged.
- Profile name, custom family role, panda avatar and lavender color persist after saving/reloading and appear consistently in Settings, header and Circle.
- Changing a family-role label leaves access permissions and other members' identities unchanged.
- The Settings profile editor has no horizontal overflow at a 390px viewport.
- Question ticks update before a deliberately delayed two-second PATCH finishes, persist on reload, serialize rapid toggles per question, and roll back with an error toast on a simulated failed write without changing another question.
- The appointment-card checkbox exposes checkbox semantics and responds to keyboard Space.
- Participant selection responds immediately in the appointment editor and persists after Save/reload.

An initial test found a deterministic-avatar fallback crash for some member IDs. The unsigned hash-index fix and synchronous profile initialization were verified in the previously blocked profile flow. The full-product and real-account limitations above still apply.

## Kinwell guidance, periods and sleep update

- Full workspace typecheck passed; web typecheck passed again after final UI corrections.
- `node scripts/src/kinwell-periods-smoke.mjs`: **21 synthetic API checks passed**. Coverage includes private defaults, forged-sharing rejection, required consent, named read-only access, revocation, import duplicates/atomic validation, check-in isolation, cross-household rejection, editable/admin-only baby birth dates, future-date rejection, saved sleep duration and younger-baby training restrictions.
- Focused browser acceptance confirmed Kinwell branding, reassurance cards before coordination, expandable guide actions, manual period entry, actual file-chooser JSON import/mapping/preview/confirmation and persistence.
- Browser checks confirmed existing/imported period dates appear read-only for the chosen recipient, never enter that recipient's own estimate, and disappear after revocation.
- The completed-sleep dialog saved a 30-minute record, edited it to 35 minutes, and preserved the saved row after reload.
- Five/six-month demo presets updated Settings/Home/Care; Feeding & solids and the food list remained available. The browser did not add a food record.
- A previewed sleep routine, step completion and check-in saved. Initial testing found that Pause only opened reason chips; this was changed to pause immediately with an optional reason.
- A targeted follow-up confirmed immediate pause, paused-state persistence after reload, optional reason saving, resume and active-state persistence, with the same completed-step history.
- Explicit Yes/No collection notes saved and reopened correctly.
- Desktop Home and 390px Home/Care screenshots were inspected; no horizontal page overflow was found.
- Other stage variants were checked in the implementation, not exercised in this browser pass. Real signed-in multi-user and real-world Flo exports were not tested.
