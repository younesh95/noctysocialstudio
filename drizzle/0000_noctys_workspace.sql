CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`network` text NOT NULL,
	`publish_at` text NOT NULL,
	`status` text DEFAULT 'debute' NOT NULL,
	`creation_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_publish_at` ON `tasks` (`publish_at`);
--> statement-breakpoint
CREATE INDEX `idx_tasks_status_publish_at` ON `tasks` (`status`,`publish_at`);
--> statement-breakpoint
CREATE TABLE `creations` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`network` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'debute' NOT NULL,
	`publish_at` text,
	`template` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`task_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_creations_publish_at` ON `creations` (`publish_at`);
--> statement-breakpoint
CREATE INDEX `idx_creations_task_id` ON `creations` (`task_id`);
