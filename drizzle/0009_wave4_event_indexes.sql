-- Wave 4: Performance indexes for event-linked queries
-- Adds indexes for expenses.event_id and stock_movements.event_id
-- to support event finance dashboards and traceability queries.

CREATE INDEX "expenses_event_idx" ON "expenses" USING btree ("event_id");--> statement-breakpoint

CREATE INDEX "stock_movements_event_idx" ON "stock_movements" USING btree ("event_id");--> statement-breakpoint
