-- Vanspire OS — full schema baseline (generated from db/schema.ts on 2026-10-05
-- with `drizzle-kit generate`, plus the RLS statements drizzle does not emit).
-- Rebuilds an empty database. Existing databases were migrated by hand; see
-- db/MIGRATIONS.md. New changes go in db/sql/NNN_description.sql after this file.

-- The app connects as the table owner (bypasses RLS), so no policies are needed;
-- RLS exists only to lock out the public anon key. See CLAUDE.md.

CREATE TYPE "public"."integration_provider" AS ENUM('whatsapp', 'email', 'razorpay');CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'partial', 'paid', 'void');CREATE TYPE "public"."lead_source" AS ENUM('whatsapp', 'instagram', 'call', 'website', 'walk_in', 'referral', 'other');CREATE TYPE "public"."lead_stage" AS ENUM('new', 'contacted', 'quoted', 'booked', 'lost');CREATE TYPE "public"."notification_kind" AS ENUM('follow_up_due', 'stale_lead', 'service_due', 'low_stock', 'system', 'invoice_overdue');CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'upi', 'bank_transfer', 'other');CREATE TYPE "public"."quotation_status" AS ENUM('draft', 'sent', 'accepted', 'declined');CREATE TYPE "public"."stock_movement_type" AS ENUM('restock', 'usage', 'adjustment');CREATE TYPE "public"."vehicle_status" AS ENUM('available', 'rented', 'maintenance', 'retired');CREATE TYPE "public"."whatsapp_message_kind" AS ENUM('vehicle_received', 'ready_for_pickup', 'service_reminder', 'campaign', 'manual', 'invoice_reminder', 'staff_alert');CREATE TYPE "public"."whatsapp_message_status" AS ENUM('sent', 'failed', 'skipped', 'delivered', 'read');CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_name" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by" uuid,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"audience_count" integer NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"vehicle_number" text,
	"notes" text,
	"last_service_at" timestamp with time zone,
	"next_service_due_at" timestamp with time zone,
	"last_reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"status" text NOT NULL,
	"provider_message_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"phone_number_id" text,
	"access_token_encrypted" text,
	"secondary_secret_encrypted" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"connected_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"hsn_sac" text,
	"stock_item_id" uuid,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid,
	"lead_id" uuid,
	"quotation_id" uuid,
	"number" text NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"notes" text,
	"gst_enabled" boolean DEFAULT false NOT NULL,
	"gst_rate" integer DEFAULT 0 NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"last_reminder_sent_at" timestamp with time zone,
	"payment_link_id" text,
	"payment_link_url" text,
	"payment_link_amount" numeric(12, 2),
	"place_of_supply" text,
	"customer_gstin" text,
	"inter_state" boolean DEFAULT false NOT NULL,
	"public_token" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "lead_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"author_id" uuid,
	"kind" text DEFAULT 'note' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "lead_stage_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"from_stage" "lead_stage",
	"to_stage" "lead_stage" NOT NULL,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid,
	"assigned_to" uuid,
	"vehicle_id" uuid,
	"tracking_link_id" uuid,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"interest" text NOT NULL,
	"source" "lead_source" DEFAULT 'other' NOT NULL,
	"stage" "lead_stage" DEFAULT 'new' NOT NULL,
	"follow_up_at" timestamp with time zone,
	"rental_start" date,
	"rental_end" date,
	"public_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"source_type" text,
	"source_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "org_sites" (
	"org_id" uuid PRIMARY KEY NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"headline" text,
	"tagline" text,
	"about" text,
	"phone" text,
	"whatsapp_number" text,
	"address" text,
	"map_url" text,
	"hours" text,
	"hero_image_url" text,
	"accent" text DEFAULT 'green' NOT NULL,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"service_interval_days" integer DEFAULT 30 NOT NULL,
	"reminder_message" text,
	"stale_lead_days" integer DEFAULT 5 NOT NULL,
	"quotation_counter" integer DEFAULT 0 NOT NULL,
	"invoice_counter" integer DEFAULT 0 NOT NULL,
	"default_gst_rate" integer DEFAULT 18 NOT NULL,
	"onboarding_dismissed_at" timestamp with time zone,
	"invoice_reminder_days" integer DEFAULT 7 NOT NULL,
	"invoice_reminder_whatsapp" boolean DEFAULT false NOT NULL,
	"legal_name" text,
	"gstin" text,
	"billing_address" text,
	"state_code" text,
	"logo_url" text,
	"invoice_terms" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" "payment_method" DEFAULT 'cash' NOT NULL,
	"notes" text,
	"recorded_by" uuid,
	"provider_payment_id" text,
	"online" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"phone" text,
	"muted_notification_kinds" text[] DEFAULT '{}' NOT NULL,
	"alert_channels" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "quotation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"description" text NOT NULL,
	"hsn_sac" text,
	"stock_item_id" uuid,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"lead_id" uuid,
	"customer_id" uuid,
	"number" text NOT NULL,
	"status" "quotation_status" DEFAULT 'draft' NOT NULL,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"notes" text,
	"gst_enabled" boolean DEFAULT false NOT NULL,
	"gst_rate" integer DEFAULT 0 NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"place_of_supply" text,
	"customer_gstin" text,
	"inter_state" boolean DEFAULT false NOT NULL,
	"responded_at" timestamp with time zone,
	"customer_response" text,
	"public_token" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
CREATE TABLE "stock_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"cost_price" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"stock_item_id" uuid NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "tracking_link_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"tracking_link_id" uuid NOT NULL,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "tracking_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"channel" text DEFAULT 'influencer' NOT NULL,
	"partner_name" text,
	"commission_type" text DEFAULT 'none' NOT NULL,
	"commission_value" numeric(10, 2),
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"registration_number" text NOT NULL,
	"make" text,
	"model" text,
	"category" text,
	"status" "vehicle_status" DEFAULT 'available' NOT NULL,
	"daily_rate" numeric(10, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid,
	"lead_id" uuid,
	"campaign_id" uuid,
	"kind" "whatsapp_message_kind" NOT NULL,
	"to_phone" text NOT NULL,
	"body" text NOT NULL,
	"status" "whatsapp_message_status" NOT NULL,
	"provider_message_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "customers" ADD CONSTRAINT "customers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "integrations" ADD CONSTRAINT "integrations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_stock_item_id_stock_items_id_fk" FOREIGN KEY ("stock_item_id") REFERENCES "public"."stock_items"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "invoices" ADD CONSTRAINT "invoices_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "lead_stage_changes" ADD CONSTRAINT "lead_stage_changes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "lead_stage_changes" ADD CONSTRAINT "lead_stage_changes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "lead_stage_changes" ADD CONSTRAINT "lead_stage_changes_changed_by_profiles_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "leads" ADD CONSTRAINT "leads_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_profiles_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "leads" ADD CONSTRAINT "leads_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "leads" ADD CONSTRAINT "leads_tracking_link_id_tracking_links_id_fk" FOREIGN KEY ("tracking_link_id") REFERENCES "public"."tracking_links"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "notifications" ADD CONSTRAINT "notifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "org_sites" ADD CONSTRAINT "org_sites_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "payments" ADD CONSTRAINT "payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_profiles_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "profiles" ADD CONSTRAINT "profiles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_stock_item_id_stock_items_id_fk" FOREIGN KEY ("stock_item_id") REFERENCES "public"."stock_items"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "quotations" ADD CONSTRAINT "quotations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "quotations" ADD CONSTRAINT "quotations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stock_item_id_stock_items_id_fk" FOREIGN KEY ("stock_item_id") REFERENCES "public"."stock_items"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "tracking_link_clicks" ADD CONSTRAINT "tracking_link_clicks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "tracking_link_clicks" ADD CONSTRAINT "tracking_link_clicks_tracking_link_id_tracking_links_id_fk" FOREIGN KEY ("tracking_link_id") REFERENCES "public"."tracking_links"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;CREATE INDEX "audit_log_org_created_idx" ON "audit_log" USING btree ("org_id","created_at" DESC NULLS LAST);CREATE INDEX "campaigns_org_idx" ON "campaigns" USING btree ("org_id");CREATE INDEX "customers_org_idx" ON "customers" USING btree ("org_id");CREATE INDEX "customers_org_due_idx" ON "customers" USING btree ("org_id","next_service_due_at");CREATE INDEX "email_messages_org_idx" ON "email_messages" USING btree ("org_id");CREATE UNIQUE INDEX "integrations_org_provider_idx" ON "integrations" USING btree ("org_id","provider");CREATE INDEX "integrations_phone_number_id_idx" ON "integrations" USING btree ("phone_number_id");CREATE INDEX "invoice_items_invoice_idx" ON "invoice_items" USING btree ("invoice_id");CREATE INDEX "invoices_org_idx" ON "invoices" USING btree ("org_id");CREATE INDEX "invoices_customer_idx" ON "invoices" USING btree ("customer_id");CREATE UNIQUE INDEX "invoices_org_number_idx" ON "invoices" USING btree ("org_id","number");CREATE UNIQUE INDEX "invoices_public_token_idx" ON "invoices" USING btree ("public_token");CREATE INDEX "lead_activities_lead_idx" ON "lead_activities" USING btree ("lead_id");CREATE INDEX "lead_stage_changes_lead_idx" ON "lead_stage_changes" USING btree ("lead_id","changed_at");CREATE INDEX "lead_stage_changes_org_idx" ON "lead_stage_changes" USING btree ("org_id","changed_at");CREATE INDEX "leads_org_idx" ON "leads" USING btree ("org_id");CREATE INDEX "leads_org_stage_idx" ON "leads" USING btree ("org_id","stage");CREATE UNIQUE INDEX "leads_public_token_idx" ON "leads" USING btree ("public_token");CREATE INDEX "leads_vehicle_idx" ON "leads" USING btree ("vehicle_id") WHERE "leads"."vehicle_id" IS NOT NULL;CREATE INDEX "notifications_profile_unread_idx" ON "notifications" USING btree ("profile_id","read_at");CREATE INDEX "notifications_source_idx" ON "notifications" USING btree ("source_type","source_id","kind");CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");CREATE INDEX "payments_invoice_idx" ON "payments" USING btree ("invoice_id");CREATE UNIQUE INDEX "payments_provider_payment_id_idx" ON "payments" USING btree ("provider_payment_id") WHERE "payments"."provider_payment_id" IS NOT NULL;CREATE INDEX "profiles_org_idx" ON "profiles" USING btree ("org_id");CREATE INDEX "quotation_items_quotation_idx" ON "quotation_items" USING btree ("quotation_id");CREATE INDEX "quotations_org_idx" ON "quotations" USING btree ("org_id");CREATE UNIQUE INDEX "quotations_org_number_idx" ON "quotations" USING btree ("org_id","number");CREATE UNIQUE INDEX "quotations_public_token_idx" ON "quotations" USING btree ("public_token");CREATE INDEX "stock_items_org_idx" ON "stock_items" USING btree ("org_id");CREATE INDEX "stock_movements_item_idx" ON "stock_movements" USING btree ("stock_item_id");CREATE INDEX "tracking_link_clicks_link_idx" ON "tracking_link_clicks" USING btree ("tracking_link_id","clicked_at");CREATE UNIQUE INDEX "tracking_links_org_code_idx" ON "tracking_links" USING btree ("org_id","code");CREATE INDEX "vehicles_org_idx" ON "vehicles" USING btree ("org_id");CREATE UNIQUE INDEX "vehicles_org_reg_idx" ON "vehicles" USING btree ("org_id","registration_number");CREATE INDEX "whatsapp_messages_org_idx" ON "whatsapp_messages" USING btree ("org_id");CREATE INDEX "whatsapp_messages_customer_idx" ON "whatsapp_messages" USING btree ("customer_id");CREATE INDEX "whatsapp_messages_provider_id_idx" ON "whatsapp_messages" USING btree ("provider_message_id");

-- ===== Row level security =====

ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_stage_changes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quotation_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quotations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tracking_link_clicks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tracking_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "whatsapp_messages" ENABLE ROW LEVEL SECURITY;
