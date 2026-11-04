// Upgrade only known synthetic demo identities; never infer real users' roles.
import { db, households, memberships, profiles, familyRecords } from "../src/index";
import { eq, and } from "drizzle-orm";

const demos = await db.select().from(households);
let changed = 0;
for (const h of demos.filter(h => h.demoTokenHash)) {
  const members = await db.select().from(memberships).where(eq(memberships.householdId, h.id));
  await db.update(familyRecords).set({ notes: "Offered care time. Acceptance is not verification of physical supervision." }).where(and(eq(familyRecords.householdId, h.id), eq(familyRecords.notes, "Offered care shift. Acceptance is not verification of physical supervision.")));
  const checklists = await db.select().from(familyRecords).where(and(eq(familyRecords.householdId, h.id), eq(familyRecords.kind, "checklist")));
  for (const record of checklists) {
    if (!Array.isArray(record.data.items) || !record.data.items.some((item: any) => item.text === "Agree care shifts for returning to work")) continue;
    await db.update(familyRecords).set({ data: { ...record.data, items: record.data.items.map((item: any) => item.text === "Agree care shifts for returning to work" ? { ...item, text: "Agree shared care time for returning to work" } : item) } }).where(eq(familyRecords.id, record.id));
  }
  for (const m of members) {
    if (m.familyRole) continue;
    const known = m.userId === `demo:${h.id}` ? { familyRole: "Mother", avatar: "bunny", avatarColor: "peach" }
      : m.userId === `demo:${h.id}:alex` ? { familyRole: "Father", avatar: "bear", avatarColor: "sky" }
      : m.name === "Sam" && m.role === "helper" && !m.userId ? { familyRole: "Helper", avatar: "fox", avatarColor: "butter" } : null;
    if (!known) continue;
    const [p] = m.userId ? await db.select().from(profiles).where(eq(profiles.id, m.userId)) : [];
    await db.update(memberships).set({
      ...known,
      ...(p?.data.avatar ? { avatar: p.data.avatar, avatarColor: p.data.avatarColor || known.avatarColor } : {}),
    }).where(and(eq(memberships.id, m.id), eq(memberships.familyRole, "")));
    changed++;
  }
}
console.log(`Updated ${changed} synthetic demo profiles. Real-user roles were not changed.`);
process.exit(0);
