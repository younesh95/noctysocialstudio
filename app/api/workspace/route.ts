import { ensureWorkspaceSchema, getWorkspaceDb, listWorkspace, seedDemoIfEmpty, toCreation, toTask } from "../../../db/workspace";
import type { ContentKind, Network, WorkStatus } from "../../lib/types";

const networks: Network[] = ["instagram","x","tiktok","facebook"];
const kinds: ContentKind[] = ["image","texte"];
const statuses: WorkStatus[] = ["debute","en_cours","finie"];

export async function GET() {
  try {
    await ensureWorkspaceSchema();
    await seedDemoIfEmpty();
    return Response.json(await listWorkspace());
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureWorkspaceSchema();
    const payload = await request.json() as Record<string, unknown>;
    const db = getWorkspaceDb();
    if (payload.action === "task") {
      const name = clean(payload.name), kind = payload.kind as ContentKind, network = payload.network as Network, publishAt = clean(payload.publishAt);
      if (!name || !kinds.includes(kind) || !networks.includes(network) || !isDate(publishAt)) return Response.json({error:"Données de tâche invalides"},{status:400});
      const id=crypto.randomUUID(),creationId=crypto.randomUUID(),createdAt=new Date().toISOString();
      const template = kind === "texte" ? "social-copy" : `social-${network}`;
      const body = kind === "texte" ? `Publication ${name} — ${network}` : JSON.stringify({title:name,network});
      await db.batch([
        db.prepare("INSERT INTO tasks (id,name,kind,network,publish_at,status,creation_id,created_at) VALUES (?,?,?,?,?,'debute',?,?)").bind(id,name,kind,network,publishAt,creationId,createdAt),
        db.prepare("INSERT INTO creations (id,title,network,kind,status,publish_at,template,body,task_id,created_at,updated_at) VALUES (?,?,?,?,'debute',?,?,?,?,?,?)").bind(creationId,name,network,kind,publishAt,template,body,id,createdAt,createdAt),
      ]);
      const taskRow=await db.prepare("SELECT * FROM tasks WHERE id=?").bind(id).first<Parameters<typeof toTask>[0]>();
      const creationRow=await db.prepare("SELECT * FROM creations WHERE id=?").bind(creationId).first<Parameters<typeof toCreation>[0]>();
      return Response.json({task:toTask(taskRow!),creation:toCreation(creationRow!)},{status:201});
    }
    if (payload.action === "creation") {
      const id=clean(payload.id)||crypto.randomUUID(),title=clean(payload.title),network=payload.network as Network,kind=payload.kind as ContentKind,template=clean(payload.template),body=clean(payload.body);
      if(!title||!networks.includes(network)||!kinds.includes(kind)||!template)return Response.json({error:"Création invalide"},{status:400});
      const now=new Date().toISOString(),status=statuses.includes(payload.status as WorkStatus)?payload.status as WorkStatus:"debute",publishAt=isDate(clean(payload.publishAt))?clean(payload.publishAt):null;
      await db.prepare(`INSERT INTO creations (id,title,network,kind,status,publish_at,template,body,task_id,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,NULL,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,network=excluded.network,kind=excluded.kind,status=excluded.status,publish_at=excluded.publish_at,template=excluded.template,body=excluded.body,updated_at=excluded.updated_at`)
        .bind(id,title,network,kind,status,publishAt,template,body,now,now).run();
      const row=await db.prepare("SELECT * FROM creations WHERE id=?").bind(id).first<Parameters<typeof toCreation>[0]>();
      return Response.json({creation:toCreation(row!)},{status:201});
    }
    if(payload.action === "status"){
      const id=clean(payload.id),status=payload.status as WorkStatus;
      if(!id||!statuses.includes(status))return Response.json({error:"Statut invalide"},{status:400});
      await db.batch([db.prepare("UPDATE tasks SET status=? WHERE id=?").bind(status,id),db.prepare("UPDATE creations SET status=?,updated_at=? WHERE task_id=?").bind(status,new Date().toISOString(),id)]);
      return Response.json({ok:true});
    }
    return Response.json({error:"Action inconnue"},{status:400});
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

function clean(value:unknown){return typeof value==="string"?value.trim():""}
function isDate(value:string){return Boolean(value)&&!Number.isNaN(new Date(value).getTime())}
function message(error:unknown){return error instanceof Error?error.message:"Erreur inattendue"}
