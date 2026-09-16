import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Every table (except organizations) carries orgId — this is a multi-tenant
// app where one row = one rental/service business. All queries must filter
// by orgId; see lib/auth.ts `requireOrg()`.

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Mirrors a subset of Supabase's auth.users, one row per staff member.
// id matches the Supabase auth user id (not a separate generated key).
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    role: text("role", { enum: ["owner", "staff"] }).notNull().default("staff"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("profiles_org_idx").on(table.orgId)],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    vehicleNumber: text("vehicle_number"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("customers_org_idx").on(table.orgId)],
);

export const leadSourceEnum = pgEnum("lead_source", [
  "whatsapp",
  "instagram",
  "call",
  "website",
  "walk_in",
  "referral",
  "other",
]);

export const leadStageEnum = pgEnum("lead_stage", [
  "new",
  "contacted",
  "quoted",
  "booked",
  "lost",
]);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    assignedTo: uuid("assigned_to").references(() => profiles.id, { onDelete: "set null" }),
    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    interest: text("interest").notNull(),
    source: leadSourceEnum("source").notNull().default("other"),
    stage: leadStageEnum("stage").notNull().default("new"),
    followUpAt: timestamp("follow_up_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("leads_org_idx").on(table.orgId),
    index("leads_org_stage_idx").on(table.orgId, table.stage),
  ],
);

export const leadActivities = pgTable(
  "lead_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => profiles.id, { onDelete: "set null" }),
    kind: text("kind", { enum: ["note", "stage_change", "call", "whatsapp"] })
      .notNull()
      .default("note"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("lead_activities_lead_idx").on(table.leadId)],
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  profiles: many(profiles),
  customers: many(customers),
  leads: many(leads),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  organization: one(organizations, { fields: [profiles.orgId], references: [organizations.id] }),
  assignedLeads: many(leads),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  organization: one(organizations, { fields: [customers.orgId], references: [organizations.id] }),
  leads: many(leads),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  organization: one(organizations, { fields: [leads.orgId], references: [organizations.id] }),
  customer: one(customers, { fields: [leads.customerId], references: [customers.id] }),
  assignee: one(profiles, { fields: [leads.assignedTo], references: [profiles.id] }),
  activities: many(leadActivities),
}));

export const leadActivitiesRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, { fields: [leadActivities.leadId], references: [leads.id] }),
  author: one(profiles, { fields: [leadActivities.authorId], references: [profiles.id] }),
}));
