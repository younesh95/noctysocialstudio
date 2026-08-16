import { env } from "cloudflare:workers";
import type { ContentKind, Creation, ExternalTemplate, ExternalTemplateConfig, Network, Task, TemplateSource, WorkStatus } from "../app/lib/types";

interface TaskRow {
  id: string; name: string; kind: ContentKind; network: Network; publish_at: string;
  status: WorkStatus; creation_id: string | null; created_at: string;
}
interface CreationRow {
  id: string; title: string; network: Network; kind: ContentKind; status: WorkStatus;
  publish_at: string | null; template: string; body: string; task_id: string | null;
  created_at: string; updated_at: string;
}
export interface ImportedTemplateRow {
  id: string; name: string; network: Network; kind: ContentKind; source_type: TemplateSource;
  file_name: string; mime_type: string; asset_key: string | null; width: number; height: number;
  config_json: string; created_at: string; updated_at: string;
}

export function getWorkspaceDb() {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

export async function ensureWorkspaceSchema() {
  const db = getWorkspaceDb();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('image','texte')),
      network TEXT NOT NULL CHECK(network IN ('instagram','x','tiktok','facebook')),
      publish_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'debute' CHECK(status IN ('debute','en_cours','finie')),
      creation_id TEXT,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS creations (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      network TEXT NOT NULL CHECK(network IN ('instagram','x','tiktok','facebook')),
      kind TEXT NOT NULL CHECK(kind IN ('image','texte')),
      status TEXT NOT NULL DEFAULT 'debute' CHECK(status IN ('debute','en_cours','finie')),
      publish_at TEXT,
      template TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      task_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_tasks_publish_at ON tasks(publish_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_tasks_status_publish_at ON tasks(status, publish_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_creations_publish_at ON creations(publish_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_creations_task_id ON creations(task_id)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS imported_templates (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      network TEXT NOT NULL CHECK(network IN ('instagram','x','tiktok','facebook')),
      kind TEXT NOT NULL DEFAULT 'image' CHECK(kind IN ('image','texte')),
      source_type TEXT NOT NULL CHECK(source_type IN ('json','image')),
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      asset_key TEXT,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      config_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_imported_templates_network_created_at ON imported_templates(network, created_at)"),
  ]);
  await db.prepare("PRAGMA optimize").run();
}

export async function seedDemoIfEmpty() {
  const db = getWorkspaceDb();
  const count = await db.prepare("SELECT COUNT(*) AS total FROM tasks").first<{ total: number }>();
  if ((count?.total ?? 0) > 0) return;
  const taskId = crypto.randomUUID();
  const creationId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const publishAt = new Date(Date.now() + 2 * 86_400_000);
  publishAt.setHours(21, 0, 0, 0);
  await db.batch([
    db.prepare("INSERT INTO tasks (id,name,kind,network,publish_at,status,creation_id,created_at) VALUES (?,?,?,?,?,?,?,?)")
      .bind(taskId,"MATCH NIGHT — NOCTYS vs ORION","image","instagram",publishAt.toISOString(),"en_cours",creationId,createdAt),
    db.prepare("INSERT INTO creations (id,title,network,kind,status,publish_at,template,body,task_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .bind(creationId,"MATCH NIGHT — NOCTYS vs ORION","instagram","image","en_cours",publishAt.toISOString(),"match-night",JSON.stringify({title:"MATCH NIGHT",opponent:"ORION ESPORT"}),taskId,createdAt,createdAt),
  ]);
}

export async function listWorkspace() {
  const db = getWorkspaceDb();
  const [taskRows, creationRows, templateRows] = await db.batch<TaskRow | CreationRow | ImportedTemplateRow>([
    db.prepare("SELECT * FROM tasks ORDER BY publish_at ASC, created_at DESC"),
    db.prepare("SELECT * FROM creations ORDER BY COALESCE(publish_at, updated_at) DESC, updated_at DESC"),
    db.prepare("SELECT * FROM imported_templates ORDER BY created_at DESC"),
  ]);
  return {
    tasks: (taskRows.results as TaskRow[]).map(toTask),
    creations: (creationRows.results as CreationRow[]).map(toCreation),
    templates: (templateRows.results as ImportedTemplateRow[]).map(toExternalTemplate),
  };
}

export async function getImportedTemplateRow(id: string) {
  return getWorkspaceDb().prepare("SELECT * FROM imported_templates WHERE id=?").bind(id).first<ImportedTemplateRow>();
}

export const toTask = (row: TaskRow): Task => ({ id:row.id,name:row.name,kind:row.kind,network:row.network,publishAt:row.publish_at,status:row.status,creationId:row.creation_id,createdAt:row.created_at });
export const toCreation = (row: CreationRow): Creation => ({ id:row.id,title:row.title,network:row.network,kind:row.kind,status:row.status,publishAt:row.publish_at,template:row.template,body:row.body,taskId:row.task_id,createdAt:row.created_at,updatedAt:row.updated_at });
export const toExternalTemplate = (row: ImportedTemplateRow): ExternalTemplate => ({
  id:row.id,name:row.name,network:row.network,kind:row.kind,sourceType:row.source_type,fileName:row.file_name,mimeType:row.mime_type,
  assetUrl:row.asset_key?`/api/templates/${row.id}/asset`:null,width:row.width,height:row.height,config:parseTemplateConfig(row.config_json),createdAt:row.created_at,updatedAt:row.updated_at,
});

function parseTemplateConfig(value: string): ExternalTemplateConfig {
  try { return JSON.parse(value) as ExternalTemplateConfig; } catch { return {}; }
}
