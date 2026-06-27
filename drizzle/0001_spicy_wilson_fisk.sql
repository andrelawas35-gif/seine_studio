ALTER TABLE "event_budget_lines" ADD CONSTRAINT "event_budget_line_amount_nonnegative" CHECK ("event_budget_lines"."planned_amount_cents" >= 0);--> statement-breakpoint
ALTER TABLE "event_inventory_allocations" ADD CONSTRAINT "event_allocation_planned_quantity_positive" CHECK ("event_inventory_allocations"."planned_quantity" > 0);--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_valid_date_range" CHECK ("events"."ends_at" >= "events"."starts_at");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_buffer_range" CHECK ("events"."studio_buffer_percent" between 0 and 100);--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_revenue_target_nonnegative" CHECK ("events"."revenue_target_cents" is null or "events"."revenue_target_cents" >= 0);--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_budget_nonnegative" CHECK ("events"."budget_cents" is null or "events"."budget_cents" >= 0);--> statement-breakpoint
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_initial_quantity_positive" CHECK ("inventory_lots"."initial_quantity" > 0);--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_version_positive" CHECK ("pricing_versions"."version" > 0);--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_total_cost_nonnegative" CHECK ("pricing_versions"."total_cost_cents" >= 0);--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_suggested_price_nonnegative" CHECK ("pricing_versions"."suggested_price_cents" >= 0);--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_quantity_positive" CHECK ("stock_movements"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_location_present" CHECK ("stock_movements"."from_location_id" is not null or "stock_movements"."to_location_id" is not null);