ALTER TYPE "public"."project_stage" ADD VALUE IF NOT EXISTS 'consultation';--> statement-breakpoint
ALTER TYPE "public"."project_stage" ADD VALUE IF NOT EXISTS 'sourcing';--> statement-breakpoint
ALTER TYPE "public"."project_stage" ADD VALUE IF NOT EXISTS 'closed';--> statement-breakpoint
ALTER TYPE "public"."stock_movement_type" ADD VALUE IF NOT EXISTS 'adjustment_increase';--> statement-breakpoint
ALTER TYPE "public"."stock_movement_type" ADD VALUE IF NOT EXISTS 'adjustment_decrease';
