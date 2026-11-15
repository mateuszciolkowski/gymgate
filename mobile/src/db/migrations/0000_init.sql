CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`muscle_groups` text NOT NULL,
	`description` text,
	`creator_user_id` text,
	`photos` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outbox` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`op_id` text NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`state` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_op_id_unique` ON `outbox` (`op_id`);--> statement-breakpoint
CREATE INDEX `outbox_entity_idx` ON `outbox` (`entity`,`entity_id`);--> statement-breakpoint
CREATE TABLE `pending_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`note` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pending_notes_exercise_uq` ON `pending_notes` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `plan_items` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order_in_plan` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plan_items_plan_exercise_uq` ON `plan_items` (`plan_id`,`exercise_id`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`creator_user_id` text,
	`is_public` integer NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`phone` text,
	`is_admin` integer DEFAULT false NOT NULL,
	`active_workout_id` text
);
--> statement-breakpoint
CREATE TABLE `sync_issues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`op_id` text NOT NULL,
	`type` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`payload` text NOT NULL,
	`code` text,
	`error` text NOT NULL,
	`current` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`cursor` text,
	`initial_pull_at` text,
	`clock_offset_ms` integer DEFAULT 0 NOT NULL,
	`last_sync_at` text
);
--> statement-breakpoint
CREATE TABLE `workout_items` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order_in_workout` integer NOT NULL,
	`notes` text,
	`previous_note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workout_items_workout_idx` ON `workout_items` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workout_items_exercise_idx` ON `workout_items` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`weight` text NOT NULL,
	`repetitions` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workout_sets_item_idx` ON `workout_sets` (`item_id`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workout_date` text NOT NULL,
	`status` text NOT NULL,
	`workout_name` text,
	`gym_name` text,
	`location` text,
	`workout_notes` text,
	`duration_seconds` integer,
	`workout_plan_id` text,
	`skipped_plan_exercise_ids` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workouts_status_idx` ON `workouts` (`status`);--> statement-breakpoint
CREATE INDEX `workouts_plan_idx` ON `workouts` (`workout_plan_id`);