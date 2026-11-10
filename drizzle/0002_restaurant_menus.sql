-- Older rows use the chef account as their primary key. New menus have their
-- own storage key and explicitly record the owning chef in this column.
ALTER TABLE ghar_kitchens ADD COLUMN chef_id TEXT;
--> statement-breakpoint
ALTER TABLE ghar_kitchens ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
