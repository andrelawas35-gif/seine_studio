ALTER TABLE "catalog_pieces" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "catalog_piece_id" uuid;--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_catalog_piece_id_catalog_pieces_id_fk" FOREIGN KEY ("catalog_piece_id") REFERENCES "public"."catalog_pieces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_tickets" ADD CONSTRAINT "repair_tickets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certificates_project_idx" ON "certificates" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "invoices_event_idx" ON "invoices" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "projects_catalog_piece_idx" ON "projects" USING btree ("catalog_piece_id");--> statement-breakpoint
CREATE INDEX "repair_tickets_project_idx" ON "repair_tickets" USING btree ("project_id");