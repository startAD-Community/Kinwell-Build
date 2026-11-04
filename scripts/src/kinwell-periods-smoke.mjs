// Synthetic demo households only. Never use real family health information.
import assert from "node:assert/strict";
const base = "http://localhost:80/api/together";
let count = 0;
async function call(path, method = "GET", body, cookie = "") {
  const res = await fetch(base + path, { method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, cookie: res.headers.getSetCookie().map(s => s.split(";")[0]).filter(s => !s.endsWith("=")).join("; ") };
}
function check(ok, label) { assert.ok(ok, label); console.log("PASS", label); count++; }
const demo = await call("/demo", "POST", { stage: "postpartum" });
const owner = demo.cookie;
const alex = demo.data.members.find(m => m.name === "Alex");
const child = demo.data.records.find(r => r.kind === "child");
const period = await call("/records", "POST", { kind: "cycle", title: "Period", scope: "household", data: { startDate: "2025-09-01", endDate: "2025-09-05", periodSharedWith: [alex.id] } }, owner);
check(period.status === 201 && period.data.scope === "private" && period.data.data.periodSharedWith.length === 0, "Manual dates private; caller cannot forge sharing");
const persona = await call("/demo/persona", "POST", { memberId: alex.id }, owner);
const reader = `${owner}; ${persona.cookie}`;
check(!(await call("/bootstrap", "GET", null, reader)).data.records.some(r => r.id === period.data.id), "Partner cannot see periods by default");
check((await call("/profile", "PATCH", { periodSharingMemberIds: [alex.id] }, owner)).status === 400, "New sharing requires explicit confirmation");
const shared = await call("/profile", "PATCH", { periodSharingMemberIds: [alex.id], confirmPeriodSharing: true }, owner);
check(shared.status === 200 && shared.data.members.find(m => m.id === alex.id).canSeeYourPeriods, "Clear per-person sharing state returned");
check((await call("/bootstrap", "GET", null, reader)).data.records.some(r => r.id === period.data.id), "Chosen partner can read existing period");
check((await call("/records/" + period.data.id, "PATCH", { title: "Not mine" }, reader)).status === 404, "Shared periods are read only");
check((await call("/records/" + period.data.id, "DELETE", null, reader)).status === 404, "Recipient cannot delete period");
const imported = await call("/cycles/import", "POST", { confirmed: true, entries: [{ startDate: "2025-08-01", endDate: "2025-08-04" }, { startDate: "2025-08-01" }, { startDate: "2025-09-01" }] }, owner);
check(imported.status === 200 && imported.data.imported === 1 && imported.data.skipped === 2, "Import saves dates and skips file/existing duplicates");
const visible = await call("/bootstrap", "GET", null, reader);
check(visible.data.records.some(r => r.kind === "cycle" && r.data.startDate === "2025-08-01"), "Future imports follow chosen visibility");
const before = visible.data.records.filter(r => r.kind === "cycle").length;
check((await call("/cycles/import", "POST", { confirmed: true, entries: [{ startDate: "2025-07-01" }, { startDate: "2025-02-30" }] }, owner)).status === 400, "Invalid calendar dates reject entire import");
check((await call("/bootstrap", "GET", null, reader)).data.records.filter(r => r.kind === "cycle").length === before, "Invalid import writes nothing");
const checkin = await call("/records", "POST", { kind: "checkin", title: "Private wellbeing", scope: "household" }, owner);
check(!(await call("/bootstrap", "GET", null, reader)).data.records.some(r => r.id === checkin.data.id), "Period sharing does not expose check-ins");
check((await call("/profile", "PATCH", { periodSharingMemberIds: [] }, owner)).status === 200, "Owner can revoke without extra consent");
check(!(await call("/bootstrap", "GET", null, reader)).data.records.some(r => r.kind === "cycle"), "Revocation immediately hides existing/imported periods");
const other = await call("/demo", "POST", { stage: "preconception" });
check((await call("/profile", "PATCH", { periodSharingMemberIds: [other.data.members[0].id], confirmPeriodSharing: true }, owner)).status === 400, "Cross-household recipients rejected");
const dob = await call("/records/" + child.id, "PATCH", { data: { birthDate: "2026-05-01" } }, owner);
check(dob.status === 200 && dob.data.data.birthDate === "2026-05-01", "Baby birth date editable without stage transition");
check((await call("/records/" + child.id, "PATCH", { data: { birthDate: "2099-01-01" } }, owner)).status === 400, "Future birth dates rejected");
check((await call("/records/" + child.id, "PATCH", { data: { birthDate: "2025-01-01" } }, reader)).status === 403, "Caregiver cannot change baby age without administrator access");
const sleep = await call("/records", "POST", { kind: "sleep", title: "Recorded sleep", childId: child.id, data: { startAt: "2026-01-01T10:00:00Z", endAt: "2026-01-01T10:42:00Z" } }, owner);
check(sleep.status === 201 && sleep.data.data.duration === 42 && sleep.data.childId === child.id, "Sleep records save selected baby and actual duration");
check((await call("/records", "POST", { kind: "sleepPlan", title: "Routine", childId: child.id, data: { ageMonths: 2, approach: "gradual" } }, owner)).status === 400, "Training approach cannot bypass younger-baby eligibility");
const routine = await call("/records", "POST", { kind: "sleepPlan", title: "Gentle routine", childId: child.id, data: { ageMonths: 2, approach: "routine", steps: [{ text: "Dim lights", done: false }] } }, owner);
check(routine.status === 201, "Gentle routine remains available for younger baby");
console.log(`${count} Kinwell API checks passed`);
