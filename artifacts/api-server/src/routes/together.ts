import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import { db, profiles, households, memberships, familyRecords, invitations } from "@workspace/db";
import { StartDemoBody, UpdateProfileBody, CreateRecordBody, UpdateRecordBody, CreateInvitationBody, ExportRecordsBody, RequestUploadBody } from "@workspace/api-zod";
import { context, bootstrap, id, token, hash, fail, audit, isAdmin, accessibleRecord, serialize, visibleRecords, canWrite, memberIdentity } from "../lib/together-context";
import { createDemo } from "../lib/together-seed";
import { ObjectStorageService } from "../lib/objectStorage";
import { z } from "zod";

const router: IRouter = Router();
const storage = new ObjectStorageService();
// Preview runs in a cross-site iframe. Partition the demo capability by the
// top-level site rather than depending on unrestricted third-party cookies.
const demoCookie = { httpOnly: true, secure: true, sameSite: "none" as const, partitioned: true, path: "/" };
const parse = <T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) fail(400, "Please check the fields and try again.");
  return result.data!;
};
const date = (value: string) => {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) fail(400, "Enter a valid date and time.");
  return d;
};
const privateKinds = new Set(["cycle", "checkin", "symptom"]);
const careKinds = new Set(["feed", "sleep", "diaper", "pumping", "food", "milestone", "preference", "routine", "sleepPlan", "child"]);
router.use("/together", (req, _res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
    if (origin) {
      let host: string;
      try { host = new URL(origin).host; } catch { fail(403, "Invalid request origin."); }
      if (host !== req.get("host") && host !== forwardedHost) fail(403, "Cross-site writes are not permitted.");
    }
  }
  next();
});

router.get("/together/bootstrap", async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await bootstrap(await context(req)));
});
router.post("/together/demo", async (req, res) => {
  const body = parse(StartDemoBody, req.body);
  if (getAuth(req).userId) fail(400, "Sign out before opening a demo. Your own family data will not be reset.");
  const { secret } = await createDemo(body.stage);
  res.clearCookie("together_demo", { path: "/" });
  res.cookie("together_demo", secret, { ...demoCookie, maxAge: 7 * 86400000 });
  res.clearCookie("together_demo_persona", { path: "/" });
  res.clearCookie("together_demo_persona", demoCookie);
  delete req.cookies.together_demo_persona;
  req.cookies.together_demo = secret;
  res.json(await bootstrap(await context(req)));
});
router.post("/together/demo/persona", async (req, res) => {
  const c = await context(req);
  if (!c.isDemo || getAuth(req).userId) fail(403, "Persona switching is only available inside an isolated demo.");
  const body = parse(z.object({ memberId: z.string() }), req.body);
  const [member] = await db.select().from(memberships).where(and(eq(memberships.id, body.memberId), eq(memberships.householdId, c.householdId), eq(memberships.status, "active")));
  if (!member?.userId || !member.userId.startsWith(`demo:${c.householdId}`)) fail(404, "Demo persona is not available.");
  res.clearCookie("together_demo_persona", { path: "/" });
  res.cookie("together_demo_persona", member.id, { ...demoCookie, maxAge: 7 * 86400000 });
  req.cookies.together_demo_persona = member.id;
  res.json(await bootstrap(await context(req)));
});
router.patch("/together/profile", async (req, res) => {
  const c = await context(req);
  const body = parse(UpdateProfileBody, req.body);
  if (body.timezone) try { new Intl.DateTimeFormat("en", { timeZone: body.timezone }); } catch { fail(400, "Choose a valid timezone."); }
  if (body.stage && body.stage !== c.profile.stage && !body.confirmed) fail(400, "Please confirm this stage change.");
  if (body.name !== undefined && (!body.name.trim() || body.name.trim().length > 80)) fail(400, "Choose a name between 1 and 80 characters.");
  const { confirmed: _confirmed, role: _permissionRole, ...changes } = body;
  if (changes.name !== undefined) changes.name = changes.name.trim();
  if (changes.familyRole !== undefined) changes.familyRole = changes.familyRole.trim();
  const nextProfile = { ...c.profile, ...changes };
  const identityChanges = {
    ...(changes.name !== undefined ? { name: changes.name } : {}),
    ...(changes.familyRole !== undefined ? { familyRole: changes.familyRole } : {}),
    ...(changes.avatar !== undefined ? { avatar: changes.avatar } : {}),
    ...(changes.avatarColor !== undefined ? { avatarColor: changes.avatarColor } : {}),
  };
  let updatedMember = c.member;
  await db.transaction(async tx => {
    await tx.update(profiles).set({ data: nextProfile }).where(eq(profiles.id, c.userId));
    if (Object.keys(identityChanges).length) {
      [updatedMember] = await tx.update(memberships).set(identityChanges).where(eq(memberships.id, c.member.id)).returning();
    }
  });
  if (body.stage && body.stage !== c.profile.stage) {
    await audit(c, "stage.transition", undefined, { previousStage: c.profile.stage, nextStage: body.stage });
    if (body.stage === "paused") {
      await db.update(familyRecords).set({ status: "dismissed" }).where(and(eq(familyRecords.authorId, c.userId), eq(familyRecords.kind, "notification")));
    }
    if (body.stage === "postpartum") {
      const children = (await visibleRecords(c)).filter(r => r.kind === "child");
      if (children[0]) await db.update(familyRecords).set({ title: body.childName || children[0].title, data: { ...children[0].data, birthDate: body.birthDate || "" }, updatedAt: new Date() }).where(eq(familyRecords.id, children[0].id));
      else await db.insert(familyRecords).values({ id: id(), householdId: c.householdId, authorId: c.userId, authorName: nextProfile.name || c.member.name, kind: "child", title: body.childName || "Your baby", scope: "baby", data: { birthDate: body.birthDate || "" } });
    }
  }
  res.json(await bootstrap({ ...c, member: updatedMember, profile: nextProfile }));
});
router.post("/together/records", async (req, res) => {
  const c = await context(req);
  if (c.member.role === "helper") fail(403, "Limited helpers can only act on their invitation.");
  const body = parse(CreateRecordBody, req.body);
  if (body.childId) {
    const child = await accessibleRecord(c, body.childId);
    if (child.kind !== "child") fail(400, "Select a child profile in this household.");
  }
  const scope = privateKinds.has(body.kind) ? "private" : body.scope || (careKinds.has(body.kind) ? "baby" : "household");
  const record = {
    ...body, id: id(), householdId: c.householdId, authorId: c.userId, authorName: c.profile.name || c.member.name,
    scope, occurredAt: body.occurredAt ? date(body.occurredAt) : new Date(),
    data: body.data || {}, status: body.status || "active", notes: body.notes || "",
  };
  if (!isAdmin(c) && scope !== "private" && !canWrite(c, { ...record, createdAt: new Date(), updatedAt: new Date(), childId: record.childId || null } as any)) fail(403, "You do not have permission to add this kind of record.");
  // Author ownership must not circumvent creation grants.
  if (!isAdmin(c) && scope !== "private") {
    const required = body.kind === "document" ? "documents" : ["medication", "administration"].includes(body.kind) ? "medication" : ["appointment", "question"].includes(body.kind) ? "appointments" : ["task", "help", "checklist"].includes(body.kind) ? "tasks" : body.kind === "shift" ? "shifts" : body.kind === "contact" ? "contacts" : ["routine", "sleepPlan", "preference"].includes(body.kind) ? "routines" : "baby-logs";
    if (!c.member.grants.some(g => [required, body.kind, "baby", "baby-care", ...(["baby-logs", "routines", "contacts"].includes(required) ? ["care"] : [])].includes(g))) fail(403, "This record is outside your access grant.");
  }
  if (body.kind === "administration") {
    const medId = record.data.medicationId;
    if (!medId || typeof medId !== "string") fail(400, "Choose the medication instruction first.");
    const medication = await accessibleRecord(c, medId);
    if (medication.kind !== "medication") fail(400, "Choose a valid medication instruction.");
    const recent = (await visibleRecords(c)).filter(r => r.kind === "administration" && r.data.medicationId === medId && r.status !== "deleted" && Math.abs(r.occurredAt.getTime() - record.occurredAt.getTime()) < 4 * 3600000);
    if (recent.length && !record.data.confirmDuplicate) fail(409, "A recent administration is already recorded. Confirm this is a separate record; this warning cannot determine whether medicine was taken.");
    if (!["given", "skipped", "unknown"].includes(String(record.data.result))) fail(400, "Choose given, skipped, or unknown.");
  }
  if (body.kind === "sleepPlan") {
    if (!record.data.ageMonths && record.data.ageMonths !== 0) fail(400, "Add your baby's age before choosing a routine.");
    record.data.reviewStatus = "Unreviewed prototype material — not clinical advice";
  }
  if (body.kind === "document") fail(400, "Use the protected document-upload flow.");
  if (body.kind === "transfer") fail(400, "Use the confirmed administration-transfer flow.");
  const [created] = await db.insert(familyRecords).values(record).returning();
  await audit(c, `${body.kind}.created`, created!.id);
  res.status(201).json(serialize(created!));
});
router.patch("/together/records/:id", async (req, res) => {
  const c = await context(req);
  const original = await accessibleRecord(c, String(req.params.id), true);
  const body = parse(UpdateRecordBody, req.body);
  if (original.kind === "document" && body.data) {
    for (const key of ["objectPath", "contentType", "size"]) {
      if (key in body.data && body.data[key] !== original.data[key]) fail(400, "Upload a replacement file instead of changing its protected storage reference.");
    }
  }
  if (original.kind === "transfer") {
    const recipientDeclines = original.data.targetMemberId === c.member.id && body.status === "declined";
    const requesterWithdraws = original.authorId === c.userId && body.status === "cancelled";
    if (original.status !== "pending" || (!recipientDeclines && !requesterWithdraws)) fail(403, "Only the recipient can decline or the requester withdraw a pending transfer.");
    await db.update(familyRecords).set({ status: body.status!, updatedAt: new Date() }).where(eq(familyRecords.id, original.id));
    await audit(c, `transfer.${body.status}`, original.id);
    res.json(serialize({ ...original, status: body.status!, updatedAt: new Date() }));
    return;
  }
  if (body.scope && privateKinds.has(original.kind) && body.scope !== "private") fail(400, "Private check-ins, cycles and symptoms cannot be shared through a record update. Prepare a separate help request.");
  if (body.scope && body.scope !== original.scope && original.authorId !== c.userId) fail(403, "Only the author can change sharing.");
  if (body.title !== undefined && !body.title.trim()) fail(400, "A title is required.");
  const { confirmDuplicate: _duplicate, occurredAt, ...rest } = body;
  const updatedData = { ...original.data, ...(body.data || {}) };
  if (["administration", "medication"].includes(original.kind)) {
    updatedData.corrections = [...(Array.isArray(original.data.corrections) ? original.data.corrections : []), {
      correctedAt: new Date().toISOString(), authorName: c.member.name, previousTitle: original.title, previousStatus: original.status,
      previousOccurrence: original.occurredAt.toISOString(), previousNotes: original.notes,
      previousResult: original.data.result, previousInstructions: original.data.instructions,
    }];
  }
  const updated = { ...rest, data: updatedData, ...(occurredAt ? { occurredAt: date(occurredAt) } : {}), updatedAt: new Date() };
  await audit(c, `${original.kind}.corrected`, original.id, serialize(original));
  const [r] = await db.update(familyRecords).set(updated).where(eq(familyRecords.id, original.id)).returning();
  res.json(serialize(r!));
});
router.delete("/together/records/:id", async (req, res) => {
  const c = await context(req);
  const original = await accessibleRecord(c, String(req.params.id), true);
  if (original.kind === "administration") {
    await audit(c, "administration.voided", original.id, serialize(original));
    await db.update(familyRecords).set({ status: "voided", updatedAt: new Date() }).where(eq(familyRecords.id, original.id));
  } else {
    if (original.kind === "child" && !isAdmin(c)) fail(403, "Only an administrator may remove a child profile.");
    if (original.kind === "document" && original.data.objectPath) {
      const file = await storage.getObjectEntityFile(String(original.data.objectPath)).catch(() => null);
      if (file) await file.delete({ ignoreNotFound: true });
    }
    await audit(c, `${original.kind}.deleted`, original.id, serialize(original));
    await db.delete(familyRecords).where(eq(familyRecords.id, original.id));
  }
  res.sendStatus(204);
});

router.post("/together/invitations", async (req, res) => {
  const c = await context(req);
  if (!isAdmin(c)) fail(403, "Only administrators can invite supporters.");
  const body = parse(CreateInvitationBody, req.body);
  if (body.requestId) {
    const request = await accessibleRecord(c, body.requestId);
    if (request.kind !== "help") fail(400, "Only a practical help request can be shared by limited link.");
  }
  const expiresAt = body.expiresAt ? date(body.expiresAt) : new Date(Date.now() + 7 * 86400000);
  if (expiresAt <= new Date()) fail(400, "Choose a future expiry time.");
  const raw = token(), memberId = id(), invitationId = id();
  const grants = body.role === "helper" ? ["tasks"] : body.grants.filter(g => ["care", "baby-logs", "routines", "shifts", "contacts", "tasks", "appointments", "documents", "medication", "baby-care", "baby"].includes(g));
  await db.transaction(async tx => {
    await tx.insert(memberships).values({ id: memberId, householdId: c.householdId, name: body.name, role: body.role, familyRole: body.familyRole?.trim() || (body.role === "helper" ? "Helper" : ""), status: "invited", grants, expiresAt });
    await tx.insert(invitations).values({ id: invitationId, tokenHash: hash(raw), householdId: c.householdId, memberId, requestId: body.requestId, expiresAt, createdBy: c.userId });
  });
  await audit(c, "invitation.created", invitationId);
  res.json({ id: memberId, name: body.name, role: body.role, familyRole: body.familyRole?.trim() || (body.role === "helper" ? "Helper" : ""), grants, status: "invited", url: `/invite/${raw}` });
});
async function invitationFor(raw: string) {
  const [invite] = await db.select().from(invitations).where(eq(invitations.tokenHash, hash(raw)));
  if (!invite || invite.expiresAt < new Date()) fail(404, "This invitation is unavailable or expired.");
  const [member] = await db.select().from(memberships).where(eq(memberships.id, invite.memberId));
  if (!member || member.status === "revoked" || (member.expiresAt && member.expiresAt < new Date())) fail(404, "This invitation is unavailable or revoked.");
  return { invite, member };
}
router.get("/together/invitations/:token", async (req, res) => {
  const { invite, member } = await invitationFor(String(req.params.token));
  let request;
  if (invite.requestId) {
    const [r] = await db.select().from(familyRecords).where(and(eq(familyRecords.id, invite.requestId), eq(familyRecords.kind, "help")));
    // Capability exposes only the practical request; never all household records.
    if (r) request = { ...serialize(r), data: { dueDate: r.data.dueDate, assignee: r.data.assignee }, childId: undefined };
  }
  res.set("Cache-Control", "no-store").json({ id: member.id, name: member.name, familyRole: memberIdentity(member).familyRole, role: member.role, grants: member.grants, status: member.status, request });
});
router.post("/together/invitations/:token", async (req, res) => {
  const { invite, member } = await invitationFor(String(req.params.token));
  const userId = getAuth(req).userId;
  if (invite.requestId && member.role === "helper") {
    const [r] = await db.select().from(familyRecords).where(eq(familyRecords.id, invite.requestId));
    if (!r || r.kind !== "help" || ["cancelled", "completed"].includes(r.status)) fail(409, "This request is no longer open.");
    // Only the same capability can progress its claimed request.
    if (r.status === "claimed" && r.data.claimedInviteId !== invite.id) fail(409, "Someone else has claimed this request.");
    const status = r.status === "claimed" ? "completed" : "claimed";
    await db.update(familyRecords).set({ status, data: { ...r.data, assignee: member.name, claimedInviteId: invite.id }, updatedAt: new Date() }).where(eq(familyRecords.id, r.id));
    await db.update(memberships).set({ status: "active" }).where(eq(memberships.id, member.id));
    await db.insert((await import("@workspace/db")).audits).values({ id: id(), householdId: invite.householdId, actorId: `helper:${member.id}`, action: `help.${status}`, resourceId: r.id });
    res.json({ id: member.id, name: member.name, role: member.role, grants: member.grants, status, request: { ...serialize(r), status, data: { assignee: member.name, dueDate: r.data.dueDate } } });
    return;
  }
  if (!userId) fail(401, "Sign in to accept a caregiver invitation.");
  if (invite.acceptedBy && invite.acceptedBy !== userId) fail(409, "This invitation has already been accepted.");
  const [household] = await db.select().from(households).where(eq(households.id, invite.householdId));
  if (household?.demoTokenHash) fail(400, "Demo invitations cannot grant access to real accounts. Create your own family first.");
  await db.transaction(async tx => {
    await tx.update(invitations).set({ acceptedBy: userId }).where(eq(invitations.id, invite.id));
    await tx.update(memberships).set({ userId, status: "active" }).where(eq(memberships.id, member.id));
    await tx.update(memberships).set({ status: "left" }).where(and(eq(memberships.userId, userId), eq(memberships.status, "active"), eq(memberships.role, "administrator")));
    await tx.insert(profiles).values({ id: userId, householdId: invite.householdId, data: { name: member.name, stage: "postpartum", onboardingComplete: true } }).onConflictDoNothing();
  });
  res.json({ id: member.id, name: member.name, role: member.role, grants: member.grants, status: "active" });
});
router.patch("/together/members/:id", async (req, res) => {
  const c = await context(req);
  if (!isAdmin(c)) fail(403, "Only administrators can change access.");
  const body = parse(z.object({ status: z.enum(["active", "revoked"]).optional(), grants: z.array(z.string()).optional(), expiresAt: z.string().nullable().optional() }), req.body);
  const [member] = await db.select().from(memberships).where(and(eq(memberships.id, String(req.params.id)), eq(memberships.householdId, c.householdId)));
  if (!member) fail(404, "Member not found.");
  if (member.role === "administrator" || member.id === c.member.id) fail(400, "Use administration transfer before removing an administrator.");
  await audit(c, "membership.changed", member.id, { status: member.status, grants: member.grants });
  await db.update(memberships).set({ ...body, expiresAt: body.expiresAt === null ? null : body.expiresAt ? date(body.expiresAt) : member.expiresAt }).where(eq(memberships.id, member.id));
  res.json({ status: "updated" });
});
router.post("/together/transfer", async (req, res) => {
  const c = await context(req);
  if (c.member.role !== "administrator") fail(403, "Only the current administrator can initiate transfer.");
  const body = parse(z.object({ targetMemberId: z.string(), confirmed: z.literal(true) }), req.body);
  const [target] = await db.select().from(memberships).where(and(eq(memberships.id, body.targetMemberId), eq(memberships.householdId, c.householdId)));
  if (!target || target.status !== "active" || !target.userId || target.userId.startsWith("sample:") || target.id === c.member.id || target.role === "helper") fail(400, "Choose an active, authenticated caregiver who can confirm the transfer. Sample accounts cannot receive administration.");
  const [r] = await db.insert(familyRecords).values({ id: id(), householdId: c.householdId, authorId: c.userId, authorName: c.member.name, kind: "transfer", title: "Administration transfer", scope: "household", status: "pending", data: { targetMemberId: target.id, fromMemberId: c.member.id } }).returning();
  await audit(c, "transfer.requested", r!.id);
  res.json(serialize(r!));
});
router.post("/together/transfer/:id/accept", async (req, res) => {
  const c = await context(req);
  const r = await accessibleRecord(c, String(req.params.id));
  if (r.kind !== "transfer" || r.status !== "pending" || r.data.targetMemberId !== c.member.id || req.body.confirmed !== true) fail(403, "Only the named recipient can confirm this transfer.");
  const [from] = await db.select().from(memberships).where(eq(memberships.id, String(r.data.fromMemberId)));
  if (!from || from.role !== "administrator" || from.status !== "active") fail(409, "The administrator's status changed. Request a new transfer.");
  await db.transaction(async tx => {
    await tx.update(memberships).set({ role: "coadministrator" }).where(eq(memberships.id, from.id));
    await tx.update(memberships).set({ role: "administrator" }).where(eq(memberships.id, c.member.id));
    await tx.update(familyRecords).set({ status: "confirmed", updatedAt: new Date() }).where(eq(familyRecords.id, r.id));
  });
  await audit(c, "transfer.confirmed", r.id);
  res.json({ status: "confirmed" });
});

router.post("/together/export", async (req, res) => {
  const c = await context(req);
  const body = parse(ExportRecordsBody, req.body);
  const rows = (await visibleRecords(c)).filter(r => body.ids.includes(r.id)).map(serialize);
  await audit(c, "records.exported", undefined, { ids: rows.map(r => r.id), purpose: body.purpose || "user export" });
  let content: string, mimeType: string;
  if (body.format === "ics") {
    const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, "\\$&");
    const stamp = (s: string) => date(s).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    content = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Together//Appointments//EN", ...rows.filter(r => r.kind === "appointment").flatMap(r => [
      "BEGIN:VEVENT", `UID:${r.id}@together.local`, `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(r.occurredAt)}`, `DTEND:${stamp(String(r.data.endAt || new Date(new Date(r.occurredAt).getTime() + 1800000).toISOString()))}`,
      `SUMMARY:${r.data.exportTitle ? escape(String(r.data.exportTitle)) : "Personal appointment"}`,
      `STATUS:${r.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      ...(r.data.includeNotes ? [`DESCRIPTION:${escape(r.notes)}`] : []), "END:VEVENT",
    ]), "END:VCALENDAR"].join("\r\n");
    mimeType = "text/calendar";
  } else if (body.format === "json") {
    content = JSON.stringify({ exportedAt: new Date().toISOString(), purpose: body.purpose, records: rows }, null, 2);
    mimeType = "application/json";
  } else {
    content = `TOGETHER — ${body.purpose || "Selected care summary"}\nGenerated ${new Date().toISOString()}\nRecorded information only; may be incomplete. Not clinician-reviewed or sent.\n\n` +
      rows.map(r => `${r.title}\n${r.kind} · ${r.status} · ${r.occurredAt} · recorded by ${r.authorName}\n${r.notes}\n${Object.entries(r.data || {}).filter(([key]) => !["objectPath", "claimedInviteId"].includes(key)).map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`).join("\n")}`).join("\n\n");
    mimeType = "text/plain";
  }
  res.json({ filename: `together-${new Date().toISOString().slice(0, 10)}.${body.format === "text" ? "txt" : body.format}`, content, mimeType });
});
router.post("/together/uploads", async (req, res) => {
  const c = await context(req);
  if (c.isDemo) fail(403, "Sign in to your own family to upload private documents. Demo records are samples only.");
  const body = parse(RequestUploadBody, req.body);
  if (body.scope === "baby" && !isAdmin(c) && !c.member.grants.includes("documents")) fail(403, "Document access is not granted.");
  if (body.size <= 0 || !["application/pdf", "image/png", "image/jpeg", "text/plain"].includes(body.contentType)) fail(400, "Choose a PDF, PNG, JPEG or text file up to 10 MB.");
  const uploadURL = await storage.getObjectEntityUploadURL();
  const objectPath = storage.normalizeObjectEntityPath(uploadURL);
  const documentId = id();
  await db.insert(familyRecords).values({ id: documentId, householdId: c.householdId, authorId: c.userId, authorName: c.profile.name || c.member.name, kind: "document", title: body.name.slice(0, 300), scope: body.scope, status: "pending_upload", data: { objectPath, contentType: body.contentType, size: body.size } });
  await audit(c, "document.upload_requested", documentId);
  res.json({ uploadURL, objectPath, documentId });
});
router.get("/together/documents/:id/file", async (req, res) => {
  const c = await context(req);
  const r = await accessibleRecord(c, String(req.params.id));
  if (r.kind !== "document" || !r.data.objectPath || r.status === "pending_upload") fail(404, "The file has not been uploaded.");
  const file = await storage.getObjectEntityFile(String(r.data.objectPath));
  const [meta] = await file.getMetadata();
  if (Number(meta.size) > 10485760 || !["application/pdf", "image/png", "image/jpeg", "text/plain"].includes(meta.contentType || "")) fail(400, "The uploaded file does not meet the file-size or type requirements.");
  await audit(c, "document.downloaded", r.id);
  res.set({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Type": meta.contentType || "application/octet-stream", "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(r.title)}` });
  file.createReadStream().pipe(res);
});
router.delete("/together/account", async (req, res) => {
  const c = await context(req);
  if (req.get("x-confirm-delete") !== "delete-my-private-data") fail(400, "Confirm removal of private information and leaving this household. Shared baby records and other caregivers' entries are retained.");
  await audit(c, "account.left", undefined, { sharedRecordsRetained: true });
  const privateFiles = (await visibleRecords(c)).filter(r => r.scope === "private" && r.kind === "document");
  for (const r of privateFiles) {
    if (r.data.objectPath) {
      const file = await storage.getObjectEntityFile(String(r.data.objectPath)).catch(() => null);
      if (file) await file.delete({ ignoreNotFound: true });
    }
  }
  await db.transaction(async tx => {
    await tx.delete(familyRecords).where(and(eq(familyRecords.authorId, c.userId), eq(familyRecords.scope, "private")));
    await tx.update(profiles).set({ data: { deleted: true } }).where(eq(profiles.id, c.userId));
    await tx.update(memberships).set({ status: "left", name: "Former family member" }).where(eq(memberships.id, c.member.id));
  });
  res.clearCookie("together_demo", { path: "/" });
  res.clearCookie("together_demo", demoCookie);
  res.clearCookie("together_demo_persona", { path: "/" });
  res.clearCookie("together_demo_persona", demoCookie);
  res.sendStatus(204);
});
export default router;
