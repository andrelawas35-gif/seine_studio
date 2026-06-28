CREATE TYPE "public"."cost_type" AS ENUM('material', 'labor', 'design', 'packaging', 'outsourced', 'overhead', 'other', 'stones_gemstones', 'metal_findings', 'finishing_plating', 'setting_engraving');--> statement-breakpoint
CREATE TABLE "consignment_count_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consignment_count_id" uuid NOT NULL,
	"inventory_lot_id" uuid NOT NULL,
	"counted_quantity" numeric(18, 4) NOT NULL,
	"expected_quantity" numeric(18, 4),
	"discrepancy_note" text,
	CONSTRAINT "consignment_count_items_quantity_nonnegative" CHECK ("consignment_count_items"."counted_quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "consignment_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consignment_id" uuid NOT NULL,
	"counted_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cost_type" "cost_type" NOT NULL,
	"description" text NOT NULL,
	"unit" text NOT NULL,
	"unit_cost_cents" bigint NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cost_catalog_unit_cost_nonnegative" CHECK ("cost_catalog"."unit_cost_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "event_price_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"catalog_piece_id" uuid NOT NULL,
	"price_cents" bigint NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_price_list_price_nonnegative" CHECK ("event_price_list"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "consignment_count_items" ADD CONSTRAINT "consignment_count_items_consignment_count_id_consignment_counts_id_fk" FOREIGN KEY ("consignment_count_id") REFERENCES "public"."consignment_counts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_count_items" ADD CONSTRAINT "consignment_count_items_inventory_lot_id_inventory_lots_id_fk" FOREIGN KEY ("inventory_lot_id") REFERENCES "public"."inventory_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_counts" ADD CONSTRAINT "consignment_counts_consignment_id_consignments_id_fk" FOREIGN KEY ("consignment_id") REFERENCES "public"."consignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_counts" ADD CONSTRAINT "consignment_counts_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignments" ADD CONSTRAINT "consignments_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_catalog" ADD CONSTRAINT "cost_catalog_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_price_list" ADD CONSTRAINT "event_price_list_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_price_list" ADD CONSTRAINT "event_price_list_catalog_piece_id_catalog_pieces_id_fk" FOREIGN KEY ("catalog_piece_id") REFERENCES "public"."catalog_pieces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_app_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "consignment_count_items_unique" ON "consignment_count_items" USING btree ("consignment_count_id","inventory_lot_id");--> statement-breakpoint
CREATE INDEX "consignment_counts_consignment_time_idx" ON "consignment_counts" USING btree ("consignment_id","counted_at");--> statement-breakpoint
CREATE INDEX "consignments_name_idx" ON "consignments" USING btree ("name");--> statement-breakpoint
CREATE INDEX "cost_catalog_type_idx" ON "cost_catalog" USING btree ("cost_type");--> statement-breakpoint
CREATE UNIQUE INDEX "event_price_list_unique" ON "event_price_list" USING btree ("event_id","catalog_piece_id");--> statement-breakpoint
CREATE INDEX "event_price_list_event_idx" ON "event_price_list" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settings_key_unique" ON "settings" USING btree ("key");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_xor" CHECK (("projects"."client_id" is not null and "projects"."event_id" is null) or ("projects"."client_id" is null and "projects"."event_id" is not null));