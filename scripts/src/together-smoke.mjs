// API-only checks against isolated synthetic demo households. No real-user data.
import assert from "node:assert/strict";
const base = "http://localhost:80/api/together";
let passed = 0;
async function call(path = "", method = "GET", body, cookie = "") {
  const response = await fetch(base + path, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, data, cookies: response.headers.getSetCookie().map(s => s.split(";")[0]).filter(s => !s.endsWith("=")).join("; ") };
}
function check(value, label) { assert.ok(value, label); passed++; console.log("PASS", label); }
check((await call("/bootstrap")).status === 401, "Anonymous family data denied");
const d = await call("/demo", "POST", { stage: "postpartum" });
check(d.status === 200, "Postpartum demo created");
const cookie = d.cookies, b = d.data;
const alex = b.members.find(m => m.name === "Alex");
check(b.records.some(r => r.kind === "feed"), "Postpartum seeded records available");
const privateLog = await call("/records", "POST", { kind: "checkin", title: "Mixed", scope: "household", data: { feeling: "Mixed" } }, cookie);
check(privateLog.data.scope === "private", "Check-in privacy enforced on server");
const feed = await call("/records", "POST", { kind: "feed", title: "Smoke feed", data: { amount: 60, unit: "ml" }, occurredAt: "2026-11-01T02:10:00Z" }, cookie);
check(feed.status === 201, "Care event created with occurrence time");
check((await call("/bootstrap", "GET", null, cookie)).data.records.some(r => r.id === feed.data.id), "Saved care event persists on reload");
check((await call("/records/" + feed.data.id, "PATCH", { title: "Corrected feed", data: { amount: 70, unit: "ml" } }, cookie)).data.data.amount === 70, "Care event corrected");
const med = await call("/records", "POST", { kind: "medication", title: "Clinician-provided instructions", data: { instructions: "Follow your clinician instructions; no dose calculated" } }, cookie);
const administration = await call("/records", "POST", { kind: "administration", title: "Recorded administration", data: { medicationId: med.data.id, result: "given" } }, cookie);
check(administration.status === 201, "Medication administration separate from instruction");
check((await call("/records", "POST", { kind: "administration", title: "Possible duplicate", data: { medicationId: med.data.id, result: "given" } }, cookie)).status === 409, "Potential duplicate medication requires confirmation");
check((await call("/records/" + administration.data.id, "PATCH", { data: { result: "unknown" }, notes: "Corrected uncertainty" }, cookie)).data.data.corrections.length === 1, "Medication correction history preserved");
const sw = await call("/demo/persona", "POST", { memberId: alex.id }, cookie);
const alexCookie = cookie + "; " + sw.cookies;
check(sw.status === 200 && sw.data.profile.name === "Alex", "Demo caregiver context selected");
const ab = await call("/bootstrap", "GET", null, alexCookie);
check(!ab.data.records.some(r => r.id === privateLog.data.id), "Caregiver cannot see parent private check-in");
check((await call("/records/" + privateLog.data.id, "PATCH", { title: "Not allowed" }, alexCookie)).status === 404, "Caregiver cannot modify parent private check-in");
check((await call("/records", "POST", { kind: "medication", title: "Not permitted" }, alexCookie)).status === 403, "Medication write requires explicit grant");
const other = await call("/demo", "POST", { stage: "preconception" });
check(other.status === 200 && other.data.records.some(r => r.kind === "cycle"), "Preconception journey seeded");
check((await call("/records/" + feed.data.id, "PATCH", { title: "Cross-household write" }, other.cookies)).status === 404, "Cross-household write denied");
const exp = await call("/export", "POST", { ids: [feed.data.id], format: "json" }, other.cookies);
check(JSON.parse(exp.data.content).records.length === 0, "Cross-household export excludes inaccessible data");
const pregnancy = await call("/demo", "POST", { stage: "pregnancy" });
check(pregnancy.status === 200 && pregnancy.data.profile.stage === "pregnancy", "Pregnancy journey seeded");
check((await call("/profile", "PATCH", { stage: "pregnancy" }, cookie)).status === 400, "Stage change requires explicit confirmation");
const transition = await call("/profile", "PATCH", { stage: "postpartum", confirmed: true, childName: "Noah" }, pregnancy.cookies);
check(transition.status === 200 && transition.data.records.some(r => r.kind === "task"), "Confirmed birth preserves support tasks");
const appt = b.records.find(r => r.kind === "appointment");
const ics = await call("/export", "POST", { ids: [appt.id], format: "ics" }, cookie);
check(ics.data.content.includes("BEGIN:VEVENT") && ics.data.content.includes("SUMMARY:Personal appointment"), "Calendar fallback downloads discreet event");
const help = await call("/records", "POST", { kind: "help", title: "A meal", notes: "A simple dinner", status: "open", scope: "household" }, cookie);
const inv = await call("/invitations", "POST", { name: "Helper", role: "helper", grants: ["tasks"], requestId: help.data.id }, cookie);
check(inv.status === 200, "Scoped practical-help invitation created");
const invToken = inv.data.url.split("/").pop();
const preview = await call("/invitations/" + invToken);
check(preview.status === 200 && preview.data.request.id === help.data.id && !preview.data.records, "Limited link shows only selected help request");
check((await call("/invitations/" + invToken, "POST")).data.status === "claimed", "Limited helper claims request");
check((await call("/invitations/" + invToken, "POST")).data.status === "completed", "Claim and completion remain distinct states");
const transfer = await call("/transfer", "POST", { targetMemberId: alex.id, confirmed: true }, cookie);
check(transfer.status === 200 && transfer.data.status === "pending", "Admin transfer awaits recipient consent");
check((await call("/transfer/" + transfer.data.id + "/accept", "POST", { confirmed: true }, alexCookie)).status === 200, "Recipient confirms administration transfer");
const after = await call("/bootstrap", "GET", null, alexCookie);
check(after.data.profile.role === "administrator" && !after.data.records.some(r => r.id === privateLog.data.id), "Transfer does not expose former administrator private health data");
console.log(`${passed} API smoke checks passed`);
