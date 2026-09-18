import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Every table (except organizations) carries orgId — this is a multi-tenant
// app where one row = one rental/service business. All queries must filter
// by orgId; see lib/auth.ts `requireOrg()`.

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    // Public URL segment for the slot-booking page: /book/[slug]. Generated
    // from the org name at creation time (see db/seed.ts).
    slug: text("slug").notNull(),
    // Days after a service/rental before a retention reminder goes out.
    // Customers without their own override use this.
    serviceIntervalDays: integer("service_interval_days").notNull().default(30),
    // Custom WhatsApp copy for the retention reminder cron. Falls back to a
    // generic message (see lib/whatsapp/templates.ts) when unset.
    reminderMessage: text("reminder_message"),
    // A lead with no activity/update for this many days (stage not
    // booked/lost) gets an in-app "stale lead" nudge from the daily cron.
    staleLeadDays: integer("stale_lead_days").notNull().default(5),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("organizations_slug_idx").on(table.slug)],
);

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
    // Retention tracking. nextServiceDueAt is set on conversion/completion
    // (lastServiceAt + org.serviceIntervalDays) and rolled forward by the
    // reminder cron each time a reminder fires, so it never re-fires same-day.
    lastServiceAt: timestamp("last_service_at", { withTimezone: true }),
    nextServiceDueAt: timestamp("next_service_due_at", { withTimezone: true }),
    lastReminderSentAt: timestamp("last_reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customers_org_idx").on(table.orgId),
    index("customers_org_due_idx").on(table.orgId, table.nextServiceDueAt),
  ],
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
    // Unlisted public token for the customer-facing status page (/status/[token]).
    // Not a secret in the security sense — just unguessable enough that only
    // someone with the link (the customer it was sent to) can view it.
    publicToken: text("public_token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("leads_org_idx").on(table.orgId),
    index("leads_org_stage_idx").on(table.orgId, table.stage),
    uniqueIndex("leads_public_token_idx").on(table.publicToken),
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

export const whatsappMessageKindEnum = pgEnum("whatsapp_message_kind", [
  "vehicle_received",
  "ready_for_pickup",
  "service_reminder",
  "campaign",
  "manual",
]);

export const whatsappMessageStatusEnum = pgEnum("whatsapp_message_status", [
  "sent",
  "failed",
  "skipped",
]);

// Audit log of every outbound WhatsApp message — sent for real once
// WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID are configured (see
// lib/whatsapp/), logged here either way so retention activity is visible
// even in the console-fallback (dev) mode.
export const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    kind: whatsappMessageKindEnum("kind").notNull(),
    toPhone: text("to_phone").notNull(),
    body: text("body").notNull(),
    status: whatsappMessageStatusEnum("status").notNull(),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("whatsapp_messages_org_idx").on(table.orgId),
    index("whatsapp_messages_customer_idx").on(table.customerId),
  ],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    message: text("message").notNull(),
    audienceCount: integer("audience_count").notNull(),
    sentCount: integer("sent_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("campaigns_org_idx").on(table.orgId)],
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

export const whatsappMessagesRelations = relations(whatsappMessages, ({ one }) => ({
  organization: one(organizations, { fields: [whatsappMessages.orgId], references: [organizations.id] }),
  customer: one(customers, { fields: [whatsappMessages.customerId], references: [customers.id] }),
  lead: one(leads, { fields: [whatsappMessages.leadId], references: [leads.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  organization: one(organizations, { fields: [campaigns.orgId], references: [organizations.id] }),
  creator: one(profiles, { fields: [campaigns.createdBy], references: [profiles.id] }),
}));

export const notificationKindEnum = pgEnum("notification_kind", [
  "follow_up_due",
  "stale_lead",
  "service_due",
  "system",
]);

// In-app task reminders, populated by the daily cron (app/api/cron/daily).
// sourceType/sourceId (e.g. "lead" + leads.id) let the cron avoid creating
// duplicate notifications for the same underlying condition on every run.
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    kind: notificationKindEnum("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    sourceType: text("source_type"),
    sourceId: uuid("source_id"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_profile_unread_idx").on(table.profileId, table.readAt),
    index("notifications_source_idx").on(table.sourceType, table.sourceId, table.kind),
  ],
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  organization: one(organizations, { fields: [notifications.orgId], references: [organizations.id] }),
  profile: one(profiles, { fields: [notifications.profileId], references: [profiles.id] }),
}));

export const integrationProviderEnum = pgEnum("integration_provider", ["whatsapp"]);

// Per-org third-party integration credentials, entered through the
// Integrations page (app/(app)/integrations) instead of environment
// variables — so a business owner can connect their own account without
// anyone touching code or Vercel settings. accessTokenEncrypted is
// encrypted at rest (see lib/crypto.ts) and never sent back to the client
// in plaintext once saved. lib/whatsapp/ checks here first, then falls
// back to WHATSAPP_PHONE_NUMBER_ID/WHATSAPP_ACCESS_TOKEN env vars if unset.
export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull(),
    phoneNumberId: text("phone_number_id"),
    accessTokenEncrypted: text("access_token_encrypted"),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("integrations_org_provider_idx").on(table.orgId, table.provider)],
);

export const integrationsRelations = relations(integrations, ({ one }) => ({
  organization: one(organizations, { fields: [integrations.orgId], references: [organizations.id] }),
}));
