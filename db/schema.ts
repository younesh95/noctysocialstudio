import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["image", "texte"] }).notNull(),
  network: text("network", { enum: ["instagram", "x", "tiktok", "facebook"] }).notNull(),
  publishAt: text("publish_at").notNull(),
  status: text("status", { enum: ["debute", "en_cours", "finie"] }).notNull().default("debute"),
  approvalStatus: text("approval_status", { enum: ["draft", "review", "approved", "scheduled", "published"] }).notNull().default("draft"),
  creationId: text("creation_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull().default(""),
  deletedAt: text("deleted_at"),
}, (table) => [
  index("idx_tasks_publish_at").on(table.publishAt),
  index("idx_tasks_status_publish_at").on(table.status, table.publishAt),
  index("idx_tasks_deleted_at_publish_at").on(table.deletedAt, table.publishAt),
]);

export const creations = sqliteTable("creations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  network: text("network", { enum: ["instagram", "x", "tiktok", "facebook"] }).notNull(),
  kind: text("kind", { enum: ["image", "texte"] }).notNull(),
  status: text("status", { enum: ["debute", "en_cours", "finie"] }).notNull().default("debute"),
  approvalStatus: text("approval_status", { enum: ["draft", "review", "approved", "scheduled", "published"] }).notNull().default("draft"),
  publishAt: text("publish_at"),
  template: text("template").notNull(),
  body: text("body").notNull().default(""),
  taskId: text("task_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
}, (table) => [
  index("idx_creations_publish_at").on(table.publishAt),
  index("idx_creations_task_id").on(table.taskId),
  index("idx_creations_deleted_at_updated_at").on(table.deletedAt, table.updatedAt),
]);

export const creationVersions = sqliteTable("creation_versions", {
  id: text("id").primaryKey(),
  creationId: text("creation_id").notNull(),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  network: text("network", { enum: ["instagram", "x", "tiktok", "facebook"] }).notNull(),
  kind: text("kind", { enum: ["image", "texte"] }).notNull(),
  template: text("template").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_creation_versions_creation_version").on(table.creationId, table.version)]);

export const brandSettings = sqliteTable("brand_settings", {
  id: text("id").primaryKey(),
  primaryColor: text("primary_color").notNull(),
  backgroundColor: text("background_color").notNull(),
  textColor: text("text_color").notNull(),
  mutedColor: text("muted_color").notNull(),
  headlineFont: text("headline_font").notNull(),
  bodyFont: text("body_font").notNull(),
  logoUrl: text("logo_url").notNull(),
  signature: text("signature").notNull(),
  tone: text("tone").notNull(),
  sponsorsJson: text("sponsors_json").notNull().default("[]"),
  updatedAt: text("updated_at").notNull(),
});

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
