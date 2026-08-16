import { ensureWorkspaceSchema, getWorkspaceDb, listWorkspace, seedDemoIfEmpty, toBrandSettings, toCreation, toCreationVersion, toTask } from "../../../db/workspace";
import { canvasBody, createCanvasDocument, defaultFormat } from "../../lib/canvas";
import type { ApprovalStatus, BrandSettings, ContentKind, Network, WorkStatus } from "../../lib/types";

const networks: Network[] = ["instagram","x","tiktok","facebook"];
const kinds: ContentKind[] = ["image","texte"];
const statuses: WorkStatus[] = ["debute","en_cours","finie"];
const approvals: ApprovalStatus[] = ["draft","review","approved","scheduled","published"];

export async function GET(request:Request) {
  try {
    await ensureWorkspaceSchema();
    const versionsFor=new URL(request.url).searchParams.get("versionsFor");
    if(versionsFor){
      const rows=await getWorkspaceDb().prepare("SELECT * FROM creation_versions WHERE creation_id=? ORDER BY version DESC").bind(versionsFor).all<Parameters<typeof toCreationVersion>[0]>();
      return Response.json({versions:rows.results.map(toCreationVersion)});
    }
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
      const name=clean(payload.name),kind=payload.kind as ContentKind,network=payload.network as Network,publishAt=clean(payload.publishAt);
      if(!name||!kinds.includes(kind)||!networks.includes(network)||!isDate(publishAt))return invalid("Données de tâche invalides");
      const result=await createTask({name,kind,network,publishAt});
      return Response.json(result,{status:201});
    }

    if(payload.action==="campaign_pack"){
      const opponent=clean(payload.opponent),competition=clean(payload.competition),bestOf=clean(payload.bestOf)||"BO3",matchAt=clean(payload.matchAt),sponsors=clean(payload.sponsors);
      const selected=Array.isArray(payload.networks)?payload.networks.filter((item):item is Network=>networks.includes(item as Network)):[];
      if(!opponent||!competition||!isDate(matchAt)||!selected.length)return invalid("Pack Match incomplet");
      const brandRow=await db.prepare("SELECT * FROM brand_settings WHERE id='default'").first<Parameters<typeof toBrandSettings>[0]>();
      const brand=toBrandSettings(brandRow);
      const createdTasks=[];const createdCreations=[];
      for(const network of selected){
        const date=new Date(matchAt);const time=new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Paris"}).format(date);
        const title=`MATCH NIGHT — NOCTYS vs ${opponent.toUpperCase()}`;
        const subtitle=`${competition.toUpperCase()} · ${bestOf.toUpperCase()} · ${time} CET${sponsors?` · ${sponsors.toUpperCase()}`:""}`;
        const document=createCanvasDocument(defaultFormat(network),"match","MATCH NIGHT",subtitle,brand);
        const body=canvasBody(document,{title:"MATCH NIGHT",opponent,formatId:document.formatId});
        const result=await createTask({name:title,kind:"image",network,publishAt:matchAt,template:`campaign:${competition.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,body,approvalStatus:"review"});
        createdTasks.push(result.task);createdCreations.push(result.creation);
      }
      return Response.json({tasks:createdTasks,creations:createdCreations},{status:201});
    }

    if (payload.action === "creation") {
      const id=clean(payload.id)||crypto.randomUUID(),title=clean(payload.title),network=payload.network as Network,kind=payload.kind as ContentKind,template=clean(payload.template),body=clean(payload.body);
      if(!title||!networks.includes(network)||!kinds.includes(kind)||!template)return invalid("Création invalide");
      const now=new Date().toISOString(),status=statuses.includes(payload.status as WorkStatus)?payload.status as WorkStatus:"debute",approval=approvals.includes(payload.approvalStatus as ApprovalStatus)?payload.approvalStatus as ApprovalStatus:"draft",publishAt=isDate(clean(payload.publishAt))?clean(payload.publishAt):null;
      await db.prepare(`INSERT INTO creations (id,title,network,kind,status,approval_status,publish_at,template,body,task_id,created_at,updated_at,deleted_at)
        VALUES (?,?,?,?,?,?,?,?,?,NULL,?,?,NULL) ON CONFLICT(id) DO UPDATE SET title=excluded.title,network=excluded.network,kind=excluded.kind,status=excluded.status,approval_status=excluded.approval_status,publish_at=excluded.publish_at,template=excluded.template,body=excluded.body,updated_at=excluded.updated_at,deleted_at=NULL`)
        .bind(id,title,network,kind,status,approval,publishAt,template,body,now,now).run();
      await saveVersion(id);
      return Response.json({creation:await selectCreation(id)},{status:201});
    }

    if(payload.action === "status"){
      const id=clean(payload.id),status=payload.status as WorkStatus;
      if(!id||!statuses.includes(status))return invalid("Statut invalide");
      await db.batch([db.prepare("UPDATE tasks SET status=?,updated_at=? WHERE id=?").bind(status,new Date().toISOString(),id),db.prepare("UPDATE creations SET status=?,updated_at=? WHERE task_id=?").bind(status,new Date().toISOString(),id)]);
      return Response.json({ok:true});
    }

    if(payload.action==="approval"){
      const id=clean(payload.id),approval=payload.approvalStatus as ApprovalStatus,scope=payload.scope==="creation"?"creation":"task",now=new Date().toISOString();
      if(!id||!approvals.includes(approval))return invalid("Validation invalide");
      if(scope==="task")await db.batch([db.prepare("UPDATE tasks SET approval_status=?,updated_at=? WHERE id=?").bind(approval,now,id),db.prepare("UPDATE creations SET approval_status=?,updated_at=? WHERE task_id=?").bind(approval,now,id)]);
      else await db.prepare("UPDATE creations SET approval_status=?,updated_at=? WHERE id=?").bind(approval,now,id).run();
      return Response.json({ok:true});
    }

    if(payload.action==="task_update"){
      const id=clean(payload.id),name=clean(payload.name),network=payload.network as Network,kind=payload.kind as ContentKind,publishAt=clean(payload.publishAt);
      if(!id||!name||!networks.includes(network)||!kinds.includes(kind)||!isDate(publishAt))return invalid("Tâche invalide");
      const now=new Date().toISOString();
      await db.batch([db.prepare("UPDATE tasks SET name=?,kind=?,network=?,publish_at=?,updated_at=? WHERE id=?").bind(name,kind,network,publishAt,now,id),db.prepare("UPDATE creations SET title=?,kind=?,network=?,publish_at=?,updated_at=? WHERE task_id=?").bind(name,kind,network,publishAt,now,id)]);
      const row=await db.prepare("SELECT * FROM tasks WHERE id=?").bind(id).first<Parameters<typeof toTask>[0]>();
      return Response.json({task:toTask(row!)});
    }

    if(payload.action==="task_duplicate"){
      const id=clean(payload.id);const row=await db.prepare("SELECT * FROM tasks WHERE id=? AND deleted_at IS NULL").bind(id).first<Parameters<typeof toTask>[0]>();
      if(!row)return Response.json({error:"Tâche introuvable"},{status:404});
      const source=row.creation_id?await db.prepare("SELECT * FROM creations WHERE id=?").bind(row.creation_id).first<{template:string;body:string}>():null;
      const copyDate=new Date(row.publish_at);copyDate.setDate(copyDate.getDate()+1);
      const result=await createTask({name:`Copie — ${row.name}`,kind:row.kind,network:row.network,publishAt:copyDate.toISOString(),template:source?.template,body:source?.body});
      return Response.json(result,{status:201});
    }

    if(payload.action==="delete_task"){
      const id=clean(payload.id),now=new Date().toISOString();if(!id)return invalid("Tâche invalide");
      await db.batch([db.prepare("UPDATE tasks SET deleted_at=?,updated_at=? WHERE id=?").bind(now,now,id),db.prepare("UPDATE creations SET deleted_at=?,updated_at=? WHERE task_id=?").bind(now,now,id)]);
      return Response.json({ok:true});
    }

    if(payload.action==="delete_creation"||payload.action==="trash_creation"){
      const id=clean(payload.id),now=new Date().toISOString();if(!id)return invalid("Création invalide");
      const row=await db.prepare("SELECT task_id FROM creations WHERE id=?").bind(id).first<{task_id:string|null}>();if(!row)return Response.json({error:"Création introuvable"},{status:404});
      await db.batch([db.prepare("UPDATE creations SET deleted_at=?,updated_at=? WHERE id=?").bind(now,now,id),db.prepare("UPDATE tasks SET creation_id=NULL,updated_at=? WHERE creation_id=?").bind(now,id)]);
      return Response.json({ok:true,taskId:row.task_id});
    }

    if(payload.action==="restore_creation"){
      const id=clean(payload.id),now=new Date().toISOString();if(!id)return invalid("Création invalide");
      const row=await db.prepare("SELECT task_id FROM creations WHERE id=?").bind(id).first<{task_id:string|null}>();if(!row)return Response.json({error:"Création introuvable"},{status:404});
      await db.batch([db.prepare("UPDATE creations SET deleted_at=NULL,updated_at=? WHERE id=?").bind(now,id),db.prepare("UPDATE tasks SET creation_id=?,deleted_at=NULL,updated_at=? WHERE id=?").bind(id,now,row.task_id)]);
      const taskRow=row.task_id?await db.prepare("SELECT * FROM tasks WHERE id=?").bind(row.task_id).first<Parameters<typeof toTask>[0]>():null;
      return Response.json({creation:await selectCreation(id),task:taskRow?toTask(taskRow):null});
    }

    if(payload.action==="purge_creation"){
      const id=clean(payload.id);if(!id)return invalid("Création invalide");
      await db.batch([db.prepare("UPDATE tasks SET creation_id=NULL WHERE creation_id=?").bind(id),db.prepare("DELETE FROM creation_versions WHERE creation_id=?").bind(id),db.prepare("DELETE FROM creations WHERE id=?").bind(id)]);
      return Response.json({ok:true});
    }

    if(payload.action==="restore_version"){
      const id=clean(payload.id),version=Number(payload.version);if(!id||!Number.isInteger(version))return invalid("Version invalide");
      const snapshot=await db.prepare("SELECT * FROM creation_versions WHERE creation_id=? AND version=?").bind(id,version).first<{title:string;network:Network;kind:ContentKind;template:string;body:string}>();
      if(!snapshot)return Response.json({error:"Version introuvable"},{status:404});
      await db.prepare("UPDATE creations SET title=?,network=?,kind=?,template=?,body=?,updated_at=?,deleted_at=NULL WHERE id=?").bind(snapshot.title,snapshot.network,snapshot.kind,snapshot.template,snapshot.body,new Date().toISOString(),id).run();
      await saveVersion(id);
      return Response.json({creation:await selectCreation(id)});
    }

    if(payload.action==="brand_update"){
      const current=toBrandSettings(await db.prepare("SELECT * FROM brand_settings WHERE id='default'").first<Parameters<typeof toBrandSettings>[0]>());
      const brand:BrandSettings={...current,primaryColor:hex(payload.primaryColor,current.primaryColor),backgroundColor:hex(payload.backgroundColor,current.backgroundColor),textColor:hex(payload.textColor,current.textColor),mutedColor:hex(payload.mutedColor,current.mutedColor),signature:clean(payload.signature)||current.signature,tone:clean(payload.tone)||current.tone,sponsors:Array.isArray(payload.sponsors)?payload.sponsors.filter((item):item is string=>typeof item==="string"&&Boolean(item.trim())).map((item)=>item.trim()).slice(0,12):current.sponsors,updatedAt:new Date().toISOString()};
      await db.prepare(`UPDATE brand_settings SET primary_color=?,background_color=?,text_color=?,muted_color=?,signature=?,tone=?,sponsors_json=?,updated_at=? WHERE id='default'`).bind(brand.primaryColor,brand.backgroundColor,brand.textColor,brand.mutedColor,brand.signature,brand.tone,JSON.stringify(brand.sponsors),brand.updatedAt).run();
      return Response.json({brand});
    }

    return Response.json({error:"Action inconnue"},{status:400});
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

async function createTask(input:{name:string;kind:ContentKind;network:Network;publishAt:string;template?:string;body?:string;approvalStatus?:ApprovalStatus}){
  const db=getWorkspaceDb(),id=crypto.randomUUID(),creationId=crypto.randomUUID(),now=new Date().toISOString(),approval=input.approvalStatus||"draft";
  const template=input.template||(input.kind==="texte"?"social-copy":`social-${input.network}`);
  const body=input.body||(input.kind==="texte"?`Publication ${input.name} — ${input.network}`:canvasBody(createCanvasDocument(defaultFormat(input.network),"match",input.name,"NOCTYS · PUBLICATION PLANIFIÉE"),{title:input.name}));
  await db.batch([
    db.prepare("INSERT INTO tasks (id,name,kind,network,publish_at,status,approval_status,creation_id,created_at,updated_at,deleted_at) VALUES (?,?,?,?,?,'debute',?,?,?, ?,NULL)").bind(id,input.name,input.kind,input.network,input.publishAt,approval,creationId,now,now),
    db.prepare("INSERT INTO creations (id,title,network,kind,status,approval_status,publish_at,template,body,task_id,created_at,updated_at,deleted_at) VALUES (?,?,?,?,'debute',?,?,?,?,?,?,?,NULL)").bind(creationId,input.name,input.network,input.kind,approval,input.publishAt,template,body,id,now,now),
  ]);
  await saveVersion(creationId);
  const taskRow=await db.prepare("SELECT * FROM tasks WHERE id=?").bind(id).first<Parameters<typeof toTask>[0]>();
  return {task:toTask(taskRow!),creation:await selectCreation(creationId)};
}

async function saveVersion(creationId:string){
  const db=getWorkspaceDb();
  const row=await db.prepare("SELECT title,network,kind,template,body FROM creations WHERE id=?").bind(creationId).first<{title:string;network:Network;kind:ContentKind;template:string;body:string}>();if(!row)return;
  const count=await db.prepare("SELECT COALESCE(MAX(version),0)+1 AS next FROM creation_versions WHERE creation_id=?").bind(creationId).first<{next:number}>();
  await db.prepare("INSERT INTO creation_versions (id,creation_id,version,title,network,kind,template,body,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),creationId,count?.next||1,row.title,row.network,row.kind,row.template,row.body,new Date().toISOString()).run();
}
async function selectCreation(id:string){const row=await getWorkspaceDb().prepare(`SELECT creations.*,(SELECT COUNT(*) FROM creation_versions WHERE creation_id=creations.id) AS version_count FROM creations WHERE id=?`).bind(id).first<Parameters<typeof toCreation>[0]>();if(!row)throw new Error("Création introuvable");return toCreation(row)}
function clean(value:unknown){return typeof value==="string"?value.trim():""}
function isDate(value:string){return Boolean(value)&&!Number.isNaN(new Date(value).getTime())}
function hex(value:unknown,fallback:string){const candidate=clean(value).toUpperCase();return /^#[0-9A-F]{6}$/.test(candidate)?candidate:fallback}
function invalid(error:string){return Response.json({error},{status:400})}
function message(error:unknown){return error instanceof Error?error.message:"Erreur inattendue"}
