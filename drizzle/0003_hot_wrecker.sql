CREATE TYPE "public"."expense_category" AS ENUM('materials', 'stones', 'findings', 'packaging', 'labor', 'shipping', 'rent', 'utilities', 'marketing', 'travel', 'tools', 'professional_fees', 'other_opex');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'cash', 'card', 'gcash', 'maya', 'other');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted');--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid,
	"project_id" uuid,
	"event_id" uuid,
	"category" "expense_category" NOT NULL,
	"description" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"method" "payment_method",
	"receipt_url" text,
	"incurred_at" timestamp with time zone NOT NULL,
	"is_cogs" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_positive" CHECK ("expenses"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" text NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"quote_id" uuid,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'PHP' NOT NULL,
	"subtotal_cents" bigint NOT NULL,
	"discount_cents" bigint DEFAULT 0 NOT NULL,
	"tax_cents" bigint DEFAULT 0 NOT NULL,
	"total_cents" bigint NOT NULL,
	"paid_cents" bigint DEFAULT 0 NOT NULL,
	"deposit_percent" integer,
	"due_date" timestamp with time zone,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"notes" text,
	"line_items_snapshot" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_total_nonnegative" CHECK ("invoices"."total_cents" >= 0),
	CONSTRAINT "invoices_paid_nonnegative" CHECK ("invoices"."paid_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	"method" "payment_method" NOT NULL,
	"external_reference" text,
	"fees_cents" bigint DEFAULT 0 NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "quote_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_number" text NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"pricing_version_id" uuid,
	"status" "quote_status" DEFAULT 'draft' NOT NULL,
	"deposit_percent" integer,
	"terms" text,
	"valid_until" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"category" text,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_pricing_version_id_pricing_versions_id_fk" FOREIGN KEY ("pricing_version_id") REFERENCES "public"."pricing_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_supplier_idx" ON "expenses" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "expenses_project_idx" ON "expenses" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_unique" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_client_idx" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_invoice_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_versions_number_unique" ON "quote_versions" USING btree ("quote_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_number_unique" ON "quotes" USING btree ("quote_number");--> statement-breakpoint
CREATE INDEX "quotes_client_idx" ON "quotes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "quotes_project_idx" ON "quotes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "suppliers_name_idx" ON "suppliers" USING btree ("name");