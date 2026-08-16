CREATE TABLE `imported_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`network` text NOT NULL,
	`kind` text DEFAULT 'image' NOT NULL,
	`source_type` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`asset_key` text,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`config_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_imported_templates_network_created_at` ON `imported_templates` (`network`,`created_at`);
