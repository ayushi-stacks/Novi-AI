CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `display_name` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `connected_accounts` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `provider` text NOT NULL,
  `provider_account_id` text,
  `display_name` text,
  `email` text,
  `status` text NOT NULL,
  `scopes` text,
  `encrypted_access_token` text,
  `encrypted_refresh_token` text,
  `token_expires_at` text,
  `sync_cursor` text,
  `last_synced_at` text,
  `error_message` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_connected_accounts_user_provider` ON `connected_accounts` (`user_id`,`provider`);
--> statement-breakpoint
CREATE INDEX `idx_connected_accounts_status` ON `connected_accounts` (`status`);
--> statement-breakpoint
CREATE TABLE `sync_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `account_id` text,
  `provider` text NOT NULL,
  `kind` text NOT NULL,
  `status` text DEFAULT 'queued' NOT NULL,
  `total` integer DEFAULT 0 NOT NULL,
  `processed` integer DEFAULT 0 NOT NULL,
  `cursor` text,
  `error_message` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`account_id`) REFERENCES `connected_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sync_jobs_user_status` ON `sync_jobs` (`user_id`,`status`);
--> statement-breakpoint
CREATE TABLE `entities` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `type` text NOT NULL,
  `title` text NOT NULL,
  `summary` text,
  `body` text,
  `provider` text,
  `provider_id` text,
  `source_url` text,
  `source_updated_at` text,
  `sync_metadata` text,
  `confidence` real DEFAULT 1 NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_entities_user_source` ON `entities` (`user_id`,`provider`,`provider_id`);
--> statement-breakpoint
CREATE INDEX `idx_entities_user_type` ON `entities` (`user_id`,`type`);
--> statement-breakpoint
CREATE INDEX `idx_entities_title` ON `entities` (`title`);
--> statement-breakpoint
CREATE TABLE `relationships` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `from_entity_id` text NOT NULL,
  `to_entity_id` text NOT NULL,
  `type` text NOT NULL,
  `confidence` real NOT NULL,
  `evidence` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`from_entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`to_entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_relationships_unique` ON `relationships` (`user_id`,`from_entity_id`,`to_entity_id`,`type`);
--> statement-breakpoint
CREATE TABLE `search_index` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `entity_id` text NOT NULL,
  `provider` text,
  `content` text NOT NULL,
  `embedding_ref` text,
  `metadata` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_search_index_entity` ON `search_index` (`entity_id`);
--> statement-breakpoint
CREATE TABLE `action_history` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `provider` text NOT NULL,
  `action_type` text NOT NULL,
  `status` text NOT NULL,
  `payload` text NOT NULL,
  `result` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_action_history_user_status` ON `action_history` (`user_id`,`status`);
--> statement-breakpoint
PRAGMA optimize;
