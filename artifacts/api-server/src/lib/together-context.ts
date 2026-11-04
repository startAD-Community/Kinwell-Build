import { randomUUID, randomBytes, createHash } from "node:crypto";
import type { Request } from "express";
import { getAuth } from "@clerk/express";
import { db, households, profiles, memberships, familyRecords, audits, type FamilyRecordRow, type MembershipRow } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export const id = () => randomUUID();
export const token = () => randomBytes(32).toString("hex");
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export function fail(status: number, message: string): never { throw Object.assign(new Error(message), { status }); }
export type Context = { userId: string; householdId: string; member: MembershipRow; profile: Record<string, any>; isDemo: boolean; periodSharingAuthors: Set<string> };
export async function audit(c: Context, action: string, resourceId?: string, previous?: unknown) {
  await db.insert(audits).values({ id: id(), householdId: c.householdId, actorId: c.userId, action, resourceId, previous });
}
export function isAdmin(c: Context) { return ["administrator", "coadministrator"].includes(c.member.role); }
export function memberIdentity(m: MembershipRow) {
  const choices = ["bunny", "bear", "fox", "cat", "panda", "koala", "owl", "penguin"];
  const colors = ["sage", "peach", "sky", "lavender", "butter"];
  const n = [...m.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return { familyRole: m.familyRole || (m.role === "helper" ? "Helper" : ""), avatar: m.avatar || choices[n % choices.length], avatarColor: m.avatarColor || colors[n % colors.length] };
}
export function canRead(c: Context, r: FamilyRecordRow) {
  if (r.householdId !== c.householdId) return false;
  if (r.kind === "cycle") return r.authorId === c.userId || (c.member.role !== "helper" && c.periodSharingAuthors.has(r.authorId) && Array.isArray(r.data.periodSharedWith) && r.data.periodSharedWith.includes(c.member.id));
  if (["checkin", "symptom"].includes(r.kind) || r.scope === "private") return r.authorId === c.userId;
  if (r.kind === "transfer") return isAdmin(c) || r.data.targetMemberId === c.member.id;
  if (r.authorId === c.userId || isAdmin(c)) return true;
  const grant = r.kind === "document" ? "documents" : ["administration", "medication"].includes(r.kind) ? "medication" : ["task", "help", "checklist"].includes(r.kind) ? "tasks" : r.kind === "shift" ? "shifts" : ["appointment", "question"].includes(r.kind) ? "appointments" : r.kind === "contact" ? "contacts" : ["routine", "sleepPlan", "preference"].includes(r.kind) ? "routines" : "baby-logs";
  return c.member.grants.some(g => [grant, r.kind, "baby-care", "baby", ...(["baby-logs", "routines", "contacts"].includes(grant) ? ["care"] : [])].includes(g));
}
export function canWrite(c: Context, r: FamilyRecordRow) {
  if (r.kind === "cycle") return r.householdId === c.householdId && r.authorId === c.userId && c.member.role !== "helper";
  return canRead(c, r) && c.member.role !== "helper";
}
export async function context(req: Request): Promise<Context> {
  const authId = getAuth(req).userId;
  let userId = authId;
  let householdId: string | undefined;
  let isDemo = false;
  if (!authId) {
    const cookie = req.cookies?.together_demo;
    if (!cookie || typeof cookie !== "string") fail(401, "Sign in or open an isolated demo.");
    const [household] = await db.select().from(households).where(eq(households.demoTokenHash, hash(cookie)));
    if (!household || !household.demoExpiresAt || household.demoExpiresAt < new Date()) fail(401, "This demo has expired. Open a fresh demo.");
    householdId = household.id;
    userId = `demo:${household.id}`;
    if (typeof req.cookies?.together_demo_persona === "string") {
      const [persona] = await db.select().from(memberships).where(and(eq(memberships.id, req.cookies.together_demo_persona), eq(memberships.householdId, household.id), eq(memberships.status, "active")));
      if (persona?.userId) userId = persona.userId;
    }
    isDemo = true;
  }
  if (!userId) fail(401, "Sign in required.");
  let [member] = await db.select().from(memberships).where(and(eq(memberships.userId, userId), eq(memberships.status, "active")));
  if (!member && authId) {
    const existing = await db.select().from(profiles).where(eq(profiles.id, authId));
    if (existing.length) fail(403, "Your household access has ended. Contact the household administrator.");
    const hid = id();
    await db.transaction(async tx => {
      await tx.insert(households).values({ id: hid, name: "Your family" });
      await tx.insert(profiles).values({ id: authId, householdId: hid, data: { name: "You", stage: "pregnancy", country: "", timezone: "UTC", onboardingComplete: false, priorities: [], logCategories: ["feed", "sleep", "diaper"] } });
      await tx.insert(memberships).values({ id: id(), householdId: hid, userId: authId, name: "You", role: "administrator", grants: ["care", "tasks", "appointments", "documents", "medication"] });
    });
    [member] = await db.select().from(memberships).where(and(eq(memberships.userId, authId), eq(memberships.status, "active")));
  }
  if (!member || (member.expiresAt && member.expiresAt < new Date())) fail(403, "Your access has expired or was revoked.");
  householdId = member.householdId;
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  // Re-check current author consent on each request, not only record snapshots:
  // a concurrent save/import must not re-enable access after revocation.
  const authors = await db.select({ userId: memberships.userId, status: memberships.status, expiresAt: memberships.expiresAt, data: profiles.data }).from(memberships).innerJoin(profiles, eq(profiles.id, memberships.userId)).where(eq(memberships.householdId, householdId));
  const periodSharingAuthors = new Set(authors.filter(a => a.userId && a.status === "active" && (!a.expiresAt || a.expiresAt > new Date()) && Array.isArray(a.data.periodSharingMemberIds) && a.data.periodSharingMemberIds.includes(member.id)).map(a => a.userId!));
  return { userId, householdId, member, profile: profile?.data ?? { name: member.name, stage: "postpartum", onboardingComplete: true }, isDemo, periodSharingAuthors };
}
export function serialize(r: FamilyRecordRow) {
  const { householdId: _h, ...record } = r;
  return { ...record, childId: record.childId ?? undefined, occurredAt: r.occurredAt.toISOString(), createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
}
export async function visibleRecords(c: Context) {
  return (await db.select().from(familyRecords).where(eq(familyRecords.householdId, c.householdId))).filter(r => canRead(c, r));
}
export async function bootstrap(c: Context) {
  const members = await db.select().from(memberships).where(eq(memberships.householdId, c.householdId));
  return {
    profile: { ...c.profile, ...memberIdentity(c.member), name: c.member.name, role: c.member.role, memberId: c.member.id, id: c.userId, householdId: c.householdId, isDemo: c.isDemo },
    records: (await visibleRecords(c)).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).map(serialize),
    members: members.map(m => ({ id: m.id, name: m.name, ...memberIdentity(m), canSeeYourPeriods: m.userId === c.userId || (m.role !== "helper" && m.status === "active" && (!m.expiresAt || m.expiresAt > new Date()) && Array.isArray(c.profile.periodSharingMemberIds) && c.profile.periodSharingMemberIds.includes(m.id)), role: m.role, status: m.expiresAt && m.expiresAt < new Date() ? "expired" : m.status, grants: m.grants, expiresAt: m.expiresAt?.toISOString() })),
    serverTime: new Date().toISOString(),
    calendarStatus: "disconnected",
  };
}
export async function accessibleRecord(c: Context, recordId: string, write = false) {
  const [r] = await db.select().from(familyRecords).where(eq(familyRecords.id, recordId));
  if (!r || !(write ? canWrite(c, r) : canRead(c, r))) fail(404, "Record not found or not available to you.");
  return r;
}
