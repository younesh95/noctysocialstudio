import { env } from "cloudflare:workers";
import type { ContentKind, Creation, Network, Task, WorkStatus } from "../app/lib/types";

interface TaskRow {
  id: string; name: string; kind: ContentKind; network: Network; publish_at: string;
  status: WorkStatus; creation_id: string | null; created_at: string;
}
interface CreationRow {
  id: string; title: string; network: Network; kind: ContentKind; status: WorkStatus;
  publish_at: string | null; template: string; body: string; task_id: string | null;
  created_at: string; updated_at: string;
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
  const [taskRows, creationRows] = await db.batch<TaskRow | CreationRow>([
    db.prepare("SELECT * FROM tasks ORDER BY publish_at ASC, created_at DESC"),
    db.prepare("SELECT * FROM creations ORDER BY COALESCE(publish_at, updated_at) DESC, updated_at DESC"),
  ]);
  return {
    tasks: (taskRows.results as TaskRow[]).map(toTask),
    creations: (creationRows.results as CreationRow[]).map(toCreation),
  };
}

export const toTask = (row: TaskRow): Task => ({ id:row.id,name:row.name,kind:row.kind,network:row.network,publishAt:row.publish_at,status:row.status,creationId:row.creation_id,createdAt:row.created_at });
export const toCreation = (row: CreationRow): Creation => ({ id:row.id,title:row.title,network:row.network,kind:row.kind,status:row.status,publishAt:row.publish_at,template:row.template,body:row.body,taskId:row.task_id,createdAt:row.created_at,updatedAt:row.updated_at });
