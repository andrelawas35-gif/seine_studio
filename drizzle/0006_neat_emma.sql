ALTER TABLE "events" ADD COLUMN "instagram_handle" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_event_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_event_idx" ON "projects" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "events_instagram_idx" ON "events" USING btree ("instagram_handle");
