ALTER TABLE `tasks` ADD `approval_status` text DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE `tasks` ADD `updated_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `tasks` ADD `deleted_at` text;
--> statement-breakpoint
ALTER TABLE `creations` ADD `approval_status` text DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE `creations` ADD `deleted_at` text;
--> statement-breakpoint
CREATE INDEX `idx_tasks_deleted_at_publish_at` ON `tasks` (`deleted_at`,`publish_at`);
--> statement-breakpoint
CREATE INDEX `idx_creations_deleted_at_updated_at` ON `creations` (`deleted_at`,`updated_at`);
--> statement-breakpoint
CREATE TABLE `creation_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`creation_id` text NOT NULL,
	`version` integer NOT NULL,
	`title` text NOT NULL,
	`network` text NOT NULL,
	`kind` text NOT NULL,
	`template` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_creation_versions_creation_version` ON `creation_versions` (`creation_id`,`version`);
--> statement-breakpoint
CREATE TABLE `brand_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`primary_color` text NOT NULL,
	`background_color` text NOT NULL,
	`text_color` text NOT NULL,
	`muted_color` text NOT NULL,
	`headline_font` text NOT NULL,
	`body_font` text NOT NULL,
	`logo_url` text NOT NULL,
	`signature` text NOT NULL,
	`tone` text NOT NULL,
	`sponsors_json` text DEFAULT '[]' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `brand_settings` (`id`,`primary_color`,`background_color`,`text_color`,`muted_color`,`headline_font`,`body_font`,`logo_url`,`signature`,`tone`,`sponsors_json`,`updated_at`)
VALUES ('default','#9C58C2','#08070A','#F4F1F5','#A6A1A9','Michroma','Inter','/noctys-logo.webp','TEAM NOCTYS // ENTER THE NIGHT','Compétitif, nocturne, précis','[]','2026-08-16T00:00:00.000Z');
