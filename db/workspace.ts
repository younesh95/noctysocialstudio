import { env } from "cloudflare:workers";
import type { ApprovalStatus, BrandSettings, ContentKind, Creation, CreationVersion, ExternalTemplate, ExternalTemplateConfig, Network, Task, TemplateSource, WorkStatus } from "../app/lib/types";

interface TaskRow {
  id: string; name: string; kind: ContentKind; network: Network; publish_at: string;
  status: WorkStatus; approval_status: ApprovalStatus; creation_id: string | null; created_at: string; updated_at: string; deleted_at: string | null;
}
interface CreationRow {
  id: string; title: string; network: Network; kind: ContentKind; status: WorkStatus;
  approval_status: ApprovalStatus; publish_at: string | null; template: string; body: string; task_id: string | null;
  created_at: string; updated_at: string; deleted_at: string | null; version_count: number;
}
interface CreationVersionRow { id:string; creation_id:string; version:number; title:string; network:Network; kind:ContentKind; template:string; body:string; created_at:string }
interface BrandRow { primary_color:string; background_color:string; text_color:string; muted_color:string; headline_font:string; body_font:string; logo_url:string; signature:string; tone:string; sponsors_json:string; updated_at:string }
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
      approval_status TEXT NOT NULL DEFAULT 'draft' CHECK(approval_status IN ('draft','review','approved','scheduled','published')),
      creation_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT '',
      deleted_at TEXT
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS creations (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      network TEXT NOT NULL CHECK(network IN ('instagram','x','tiktok','facebook')),
      kind TEXT NOT NULL CHECK(kind IN ('image','texte')),
      status TEXT NOT NULL DEFAULT 'debute' CHECK(status IN ('debute','en_cours','finie')),
      approval_status TEXT NOT NULL DEFAULT 'draft' CHECK(approval_status IN ('draft','review','approved','scheduled','published')),
      publish_at TEXT,
      template TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      task_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
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
    db.prepare(`CREATE TABLE IF NOT EXISTS creation_versions (
      id TEXT PRIMARY KEY NOT NULL,
      creation_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      title TEXT NOT NULL,
      network TEXT NOT NULL,
      kind TEXT NOT NULL,
      template TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_creation_versions_creation_version ON creation_versions(creation_id, version)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS brand_settings (
      id TEXT PRIMARY KEY NOT NULL,
      primary_color TEXT NOT NULL,
      background_color TEXT NOT NULL,
      text_color TEXT NOT NULL,
      muted_color TEXT NOT NULL,
      headline_font TEXT NOT NULL,
      body_font TEXT NOT NULL,
      logo_url TEXT NOT NULL,
      signature TEXT NOT NULL,
      tone TEXT NOT NULL,
      sponsors_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
  ]);
  await ensureColumn("tasks","approval_status","TEXT NOT NULL DEFAULT 'draft'");
  await ensureColumn("tasks","updated_at","TEXT NOT NULL DEFAULT ''");
  await ensureColumn("tasks","deleted_at","TEXT");
  await ensureColumn("creations","approval_status","TEXT NOT NULL DEFAULT 'draft'");
  await ensureColumn("creations","deleted_at","TEXT");
  await db.batch([
    db.prepare("CREATE INDEX IF NOT EXISTS idx_creations_deleted_at_updated_at ON creations(deleted_at, updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at_publish_at ON tasks(deleted_at, publish_at)"),
  ]);
  const now=new Date().toISOString();
  await db.prepare(`INSERT OR IGNORE INTO brand_settings (id,primary_color,background_color,text_color,muted_color,headline_font,body_font,logo_url,signature,tone,sponsors_json,updated_at)
    VALUES ('default','#9C58C2','#08070A','#F4F1F5','#A6A1A9','Michroma','Inter','/noctys-logo.webp','TEAM NOCTYS // ENTER THE NIGHT','Compétitif, nocturne, précis','[]',?)`).bind(now).run();
  await db.prepare("PRAGMA optimize").run();
}

async function ensureColumn(table:string,column:string,definition:string){
  const db=getWorkspaceDb();
  const info=await db.prepare(`PRAGMA table_info(${table})`).all<{name:string}>();
  if(!info.results.some((item:{name:string})=>item.name===column))await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
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
  const [taskRows, creationRows, templateRows, trashRows, brandRows] = await db.batch<TaskRow | CreationRow | ImportedTemplateRow | BrandRow>([
    db.prepare("SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY publish_at ASC, created_at DESC"),
    db.prepare(`SELECT creations.*,(SELECT COUNT(*) FROM creation_versions WHERE creation_id=creations.id) AS version_count
      FROM creations WHERE deleted_at IS NULL ORDER BY COALESCE(publish_at, updated_at) DESC, updated_at DESC`),
    db.prepare("SELECT * FROM imported_templates ORDER BY created_at DESC"),
    db.prepare(`SELECT creations.*,(SELECT COUNT(*) FROM creation_versions WHERE creation_id=creations.id) AS version_count
      FROM creations WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`),
    db.prepare("SELECT * FROM brand_settings WHERE id='default'"),
  ]);
  const brand=(brandRows.results as BrandRow[])[0];
  return {
    tasks: (taskRows.results as TaskRow[]).map(toTask),
    creations: (creationRows.results as CreationRow[]).map(toCreation),
    templates: (templateRows.results as ImportedTemplateRow[]).map(toExternalTemplate),
    trash: (trashRows.results as CreationRow[]).map(toCreation),
    brand: toBrandSettings(brand),
  };
}

export async function getImportedTemplateRow(id: string) {
  return getWorkspaceDb().prepare("SELECT * FROM imported_templates WHERE id=?").bind(id).first<ImportedTemplateRow>();
}

export const toTask = (row: TaskRow): Task => ({ id:row.id,name:row.name,kind:row.kind,network:row.network,publishAt:row.publish_at,status:row.status,approvalStatus:row.approval_status||"draft",creationId:row.creation_id,createdAt:row.created_at,updatedAt:row.updated_at||row.created_at });
export const toCreation = (row: CreationRow): Creation => ({ id:row.id,title:row.title,network:row.network,kind:row.kind,status:row.status,approvalStatus:row.approval_status||"draft",publishAt:row.publish_at,template:row.template,body:row.body,taskId:row.task_id,createdAt:row.created_at,updatedAt:row.updated_at,deletedAt:row.deleted_at,versionCount:Number(row.version_count||0) });
export const toCreationVersion = (row:CreationVersionRow):CreationVersion => ({id:row.id,creationId:row.creation_id,version:row.version,title:row.title,network:row.network,kind:row.kind,template:row.template,body:row.body,createdAt:row.created_at});
export const toExternalTemplate = (row: ImportedTemplateRow): ExternalTemplate => ({
  id:row.id,name:row.name,network:row.network,kind:row.kind,sourceType:row.source_type,fileName:row.file_name,mimeType:row.mime_type,
  assetUrl:row.asset_key?`/api/templates/${row.id}/asset`:null,width:row.width,height:row.height,config:parseTemplateConfig(row.config_json),createdAt:row.created_at,updatedAt:row.updated_at,
});

function parseTemplateConfig(value: string): ExternalTemplateConfig {
  try { return JSON.parse(value) as ExternalTemplateConfig; } catch { return {}; }
}

export function toBrandSettings(row?:BrandRow):BrandSettings{
  return {primaryColor:row?.primary_color||"#9C58C2",backgroundColor:row?.background_color||"#08070A",textColor:row?.text_color||"#F4F1F5",mutedColor:row?.muted_color||"#A6A1A9",headlineFont:row?.headline_font||"Michroma",bodyFont:row?.body_font||"Inter",logoUrl:row?.logo_url||"/noctys-logo.webp",signature:row?.signature||"TEAM NOCTYS // ENTER THE NIGHT",tone:row?.tone||"Compétitif, nocturne, précis",sponsors:parseSponsors(row?.sponsors_json),updatedAt:row?.updated_at||new Date(0).toISOString()};
}
function parseSponsors(value?:string){try{const parsed=JSON.parse(value||"[]");return Array.isArray(parsed)?parsed.filter((item):item is string=>typeof item==="string"):[]}catch{return[]}}
