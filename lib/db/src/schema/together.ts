import { pgTable, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const households = pgTable("together_households", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  demoTokenHash: text("demo_token_hash").unique(),
  demoExpiresAt: timestamp("demo_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const profiles = pgTable("together_profiles", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull().references(() => households.id),
  data: jsonb("data").$type<Record<string, any>>().notNull().default({}),
});
export const memberships = pgTable("together_memberships", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull().references(() => households.id),
  userId: text("user_id"),
  name: text("name").notNull(),
  role: text("role").notNull(),
  familyRole: text("family_role").notNull().default(""),
  avatar: text("avatar").notNull().default(""),
  avatarColor: text("avatar_color").notNull().default(""),
  status: text("status").notNull().default("active"),
  grants: jsonb("grants").$type<string[]>().notNull().default([]),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});
export const familyRecords = pgTable("together_records", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull().references(() => households.id),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("active"),
  scope: text("scope").notNull().default("baby"),
  childId: text("child_id"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  data: jsonb("data").$type<Record<string, any>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("together_records_household").on(t.householdId)]);
export const invitations = pgTable("together_invitations", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  householdId: text("household_id").notNull().references(() => households.id),
  memberId: text("member_id").notNull().references(() => memberships.id),
  requestId: text("request_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedBy: text("accepted_by"),
  createdBy: text("created_by").notNull(),
});
export const audits = pgTable("together_audits", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull(),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  resourceId: text("resource_id"),
  previous: jsonb("previous"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertFamilyRecordSchema = createInsertSchema(familyRecords);
export type FamilyRecordRow = typeof familyRecords.$inferSelect;
export type MembershipRow = typeof memberships.$inferSelect;
