---
name: Embedded preview verification
description: Why session persistence must be checked in an iframe, not just a top-level screenshot
---

For session-related preview bugs, verify a real cross-site iframe and a reload; a successful top-level screenshot is insufficient evidence.

**Why:** The demo rendered in top-level screenshots while the user's embedded preview lost the demo cookie immediately after creation. Browser cookie restrictions differ between these contexts.

**How to apply:** Keep authentication boundaries intact. Check persistence and retry recovery in the same embedding context as the user, including the top-level-site partition. Do not equate successful creation responses with a persisted session.
