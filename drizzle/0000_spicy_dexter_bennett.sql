CREATE TYPE "public"."allocation_status" AS ENUM('suggested', 'reserved', 'packed', 'sold', 'returned', 'damaged', 'missing', 'transferred', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."app_role" AS ENUM('owner', 'developer');--> statement-breakpoint
CREATE TYPE "public"."event_stage" AS ENUM('draft', 'planning', 'packing', 'ready', 'active', 'reconciliation', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."inventory_kind" AS ENUM('material', 'finished_piece', 'packaging', 'supply');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('studio', 'storage', 'event', 'consignment', 'client', 'other');--> statement-breakpoint
CREATE TYPE "public"."project_stage" AS ENUM('inquiry', 'design', 'approved', 'production', 'quality_control', 'ready', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('receipt', 'reserve', 'release', 'transfer', 'consume', 'sale', 'return', 'adjustment', 'damage', 'loss');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('not_started', 'in_progress', 'blocked', 'complete');--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "app_role" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_pieces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"collection" text,
	"metal_type" text,
	"karat" text,
	"stone_summary" text,
	"retail_price_cents" bigint,
	"cost_cents" bigint,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"instagram_handle" text,
	"preferences" text,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_budget_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"planned_amount_cents" bigint NOT NULL,
	"actual_expense_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_inventory_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"inventory_lot_id" uuid NOT NULL,
	"source_location_id" uuid NOT NULL,
	"planned_quantity" numeric(18, 4) NOT NULL,
	"opening_quantity" numeric(18, 4),
	"closing_quantity" numeric(18, 4),
	"status" "allocation_status" DEFAULT 'suggested' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "task_status" DEFAULT 'not_started' NOT NULL,
	"due_at" timestamp with time zone,
	"assignee_id" uuid,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"stage" "event_stage" DEFAULT 'draft' NOT NULL,
	"organizer" text,
	"venue" text,
	"location_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"revenue_target_cents" bigint,
	"budget_cents" bigint,
	"studio_buffer_percent" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"kind" "inventory_kind" NOT NULL,
	"catalog_piece_id" uuid,
	"description" text NOT NULL,
	"unit" text NOT NULL,
	"initial_quantity" numeric(18, 4) NOT NULL,
	"unit_cost_cents" bigint,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "location_type" NOT NULL,
	"address" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_calculations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"client_id" uuid,
	"project_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calculation_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"currency" text DEFAULT 'PHP' NOT NULL,
	"inputs" jsonb NOT NULL,
	"cost_lines" jsonb NOT NULL,
	"total_cost_cents" bigint NOT NULL,
	"suggested_price_cents" bigint NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_number" text NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"stage" "project_stage" DEFAULT 'inquiry' NOT NULL,
	"target_date" timestamp with time zone,
	"brief" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reply_template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"body" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reply_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_lot_id" uuid NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"quantity" numeric(18, 4) NOT NULL,
	"from_location_id" uuid,
	"to_location_id" uuid,
	"project_id" uuid,
	"event_id" uuid,
	"reason" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_id_app_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_budget_lines" ADD CONSTRAINT "event_budget_lines_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_inventory_allocations" ADD CONSTRAINT "event_inventory_allocations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_inventory_allocations" ADD CONSTRAINT "event_inventory_allocations_inventory_lot_id_inventory_lots_id_fk" FOREIGN KEY ("inventory_lot_id") REFERENCES "public"."inventory_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_inventory_allocations" ADD CONSTRAINT "event_inventory_allocations_source_location_id_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tasks" ADD CONSTRAINT "event_tasks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tasks" ADD CONSTRAINT "event_tasks_assignee_id_app_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_catalog_piece_id_catalog_pieces_id_fk" FOREIGN KEY ("catalog_piece_id") REFERENCES "public"."catalog_pieces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_calculations" ADD CONSTRAINT "pricing_calculations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_calculations" ADD CONSTRAINT "pricing_calculations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_calculations" ADD CONSTRAINT "pricing_calculations_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_calculation_id_pricing_calculations_id_fk" FOREIGN KEY ("calculation_id") REFERENCES "public"."pricing_calculations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_template_versions" ADD CONSTRAINT "reply_template_versions_template_id_reply_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."reply_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_template_versions" ADD CONSTRAINT "reply_template_versions_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_lot_id_inventory_lots_id_fk" FOREIGN KEY ("inventory_lot_id") REFERENCES "public"."inventory_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_entity_idx" ON "activity_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activity_created_idx" ON "activity_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_auth_user_id_unique" ON "app_users" USING btree ("auth_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_email_unique" ON "app_users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_pieces_sku_unique" ON "catalog_pieces" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "catalog_pieces_name_idx" ON "catalog_pieces" USING btree ("name");--> statement-breakpoint
CREATE INDEX "clients_name_idx" ON "clients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "clients_email_idx" ON "clients" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "event_inventory_allocation_unique" ON "event_inventory_allocations" USING btree ("event_id","inventory_lot_id","source_location_id");--> statement-breakpoint
CREATE INDEX "event_inventory_lot_idx" ON "event_inventory_allocations" USING btree ("inventory_lot_id");--> statement-breakpoint
CREATE INDEX "event_tasks_event_idx" ON "event_tasks" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "events_dates_idx" ON "events" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_lots_code_unique" ON "inventory_lots" USING btree ("code");--> statement-breakpoint
CREATE INDEX "inventory_lots_piece_idx" ON "inventory_lots" USING btree ("catalog_piece_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pricing_versions_number_unique" ON "pricing_versions" USING btree ("calculation_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_number_unique" ON "projects" USING btree ("project_number");--> statement-breakpoint
CREATE INDEX "projects_client_idx" ON "projects" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reply_template_versions_number_unique" ON "reply_template_versions" USING btree ("template_id","version");--> statement-breakpoint
CREATE INDEX "stock_movements_lot_time_idx" ON "stock_movements" USING btree ("inventory_lot_id","occurred_at");