CREATE TYPE "public"."certificate_status" AS ENUM('draft', 'issued', 'revoked', 'reissued');--> statement-breakpoint
CREATE TYPE "public"."repair_status" AS ENUM('received', 'assessed', 'awaiting_approval', 'in_service', 'waiting_for_parts', 'quality_check', 'ready', 'released', 'cancelled');--> statement-breakpoint
CREATE TABLE "certificate_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"reason" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_number" text NOT NULL,
	"catalog_piece_id" uuid,
	"client_id" uuid,
	"status" "certificate_status" DEFAULT 'draft' NOT NULL,
	"piece_name" text NOT NULL,
	"metal_type" text,
	"karat" text,
	"stone_specifications" text,
	"weight_grams" numeric(10, 3),
	"dimensions" text,
	"completion_date" timestamp with time zone,
	"care_guidance" text,
	"signatory" text,
	"verification_code" text NOT NULL,
	"revoked_reason" text,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"daily_reminder" boolean DEFAULT false NOT NULL,
	"reminder_hour" integer DEFAULT 9 NOT NULL,
	"last_reminded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_reminder_hour_range" CHECK ("push_subscriptions"."reminder_hour" between 0 and 23)
);
--> statement-breakpoint
CREATE TABLE "repair_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repair_ticket_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"summary" text NOT NULL,
	"from_status" "repair_status",
	"to_status" "repair_status",
	"from_location_id" uuid,
	"to_location_id" uuid,
	"actor_id" uuid NOT NULL,
	"notes" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" text NOT NULL,
	"client_id" uuid NOT NULL,
	"catalog_piece_id" uuid,
	"piece_description" text NOT NULL,
	"identifying_marks" text,
	"photos_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"received_condition" text,
	"included_accessories" text,
	"requested_work" text NOT NULL,
	"estimate_cents" bigint,
	"deposit_cents" bigint DEFAULT 0 NOT NULL,
	"promised_date" timestamp with time zone,
	"status" "repair_status" DEFAULT 'received' NOT NULL,
	"current_location_id" uuid,
	"release_acknowledgment" text,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repair_tickets_estimate_nonnegative" CHECK ("repair_tickets"."estimate_cents" is null or "repair_tickets"."estimate_cents" >= 0),
	CONSTRAINT "repair_tickets_deposit_nonnegative" CHECK ("repair_tickets"."deposit_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "instagram_handle" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "certificate_revisions" ADD CONSTRAINT "certificate_revisions_certificate_id_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_revisions" ADD CONSTRAINT "certificate_revisions_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_catalog_piece_id_catalog_pieces_id_fk" FOREIGN KEY ("catalog_piece_id") REFERENCES "public"."catalog_pieces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_events" ADD CONSTRAINT "repair_events_repair_ticket_id_repair_tickets_id_fk" FOREIGN KEY ("repair_ticket_id") REFERENCES "public"."repair_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_events" ADD CONSTRAINT "repair_events_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_events" ADD CONSTRAINT "repair_events_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_events" ADD CONSTRAINT "repair_events_actor_id_app_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_catalog_piece_id_catalog_pieces_id_fk" FOREIGN KEY ("catalog_piece_id") REFERENCES "public"."catalog_pieces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_current_location_id_locations_id_fk" FOREIGN KEY ("current_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "certificate_revisions_version_unique" ON "certificate_revisions" USING btree ("certificate_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_number_unique" ON "certificates" USING btree ("certificate_number");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_verification_unique" ON "certificates" USING btree ("verification_code");--> statement-breakpoint
CREATE INDEX "certificates_piece_idx" ON "certificates" USING btree ("catalog_piece_id");--> statement-breakpoint
CREATE INDEX "certificates_client_idx" ON "certificates" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unique" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "repair_events_ticket_idx" ON "repair_events" USING btree ("repair_ticket_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repair_tickets_number_unique" ON "repair_tickets" USING btree ("ticket_number");--> statement-breakpoint
CREATE INDEX "repair_tickets_status_idx" ON "repair_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "repair_tickets_client_idx" ON "repair_tickets" USING btree ("client_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_instagram_idx" ON "events" USING btree ("instagram_handle");--> statement-breakpoint
CREATE INDEX "projects_event_idx" ON "projects" USING btree ("event_id");