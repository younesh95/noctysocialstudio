import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["image", "texte"] }).notNull(),
  network: text("network", { enum: ["instagram", "x", "tiktok", "facebook"] }).notNull(),
  publishAt: text("publish_at").notNull(),
  status: text("status", { enum: ["debute", "en_cours", "finie"] }).notNull().default("debute"),
  creationId: text("creation_id"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_tasks_publish_at").on(table.publishAt),
  index("idx_tasks_status_publish_at").on(table.status, table.publishAt),
]);

export const creations = sqliteTable("creations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  network: text("network", { enum: ["instagram", "x", "tiktok", "facebook"] }).notNull(),
  kind: text("kind", { enum: ["image", "texte"] }).notNull(),
  status: text("status", { enum: ["debute", "en_cours", "finie"] }).notNull().default("debute"),
  publishAt: text("publish_at"),
  template: text("template").notNull(),
  body: text("body").notNull().default(""),
  taskId: text("task_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_creations_publish_at").on(table.publishAt),
  index("idx_creations_task_id").on(table.taskId),
]);

export const importedTemplates = sqliteTable("imported_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  network: text("network", { enum: ["instagram", "x", "tiktok", "facebook"] }).notNull(),
  kind: text("kind", { enum: ["image", "texte"] }).notNull().default("image"),
  sourceType: text("source_type", { enum: ["json", "image"] }).notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  assetKey: text("asset_key"),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  configJson: text("config_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_imported_templates_network_created_at").on(table.network, table.createdAt),
]);
