"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Check, Command, LoaderCircle, Menu, X } from "lucide-react";
import { Navigation } from "./Navigation";
import { EditorView, GeneratorView } from "./StudioViews";
import { TemplatesView } from "./TemplateBuilder";
import { SketchupView } from "./SketchupView";
import { CalendarView, CreationsView } from "./SpaceViews";
import { BrandKitView } from "./BrandKitView";
import { CommandPalette, NotificationCenter } from "./ProductivityOverlays";
import { preflightCreation } from "../lib/preflight";
import { APPROVAL_LABELS, NETWORKS, STATUS_LABELS, VIEW_LABELS } from "../lib/noctys";
import type { ApprovalStatus, AppView, BrandSettings, Creation, ExternalTemplate, Task, TaskDraft, WorkStatus, WorkspaceData } from "../lib/types";

const DEFAULT_BRAND:BrandSettings={primaryColor:"#9C58C2",backgroundColor:"#08070A",textColor:"#F4F1F5",mutedColor:"#A6A1A9",headlineFont:"Michroma",bodyFont:"Inter",logoUrl:"/noctys-logo.webp",signature:"TEAM NOCTYS // ENTER THE NIGHT",tone:"Compétitif, nocturne, précis",sponsors:[],updatedAt:new Date(0).toISOString()};

export function NoctysHub() {
  const [active, setActive] = useState<AppView>("templates");
  const [data, setData] = useState<WorkspaceData>({ tasks: [], creations: [], templates: [], trash:[], brand:DEFAULT_BRAND });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string>();
  const [openCreation, setOpenCreation] = useState<Creation>();
  const [editingCreation, setEditingCreation] = useState<Creation>();
  const [mobileNav, setMobileNav] = useState(false);
  const [commandOpen,setCommandOpen]=useState(false);
  const [notificationsOpen,setNotificationsOpen]=useState(false);
  const [lastTrashed,setLastTrashed]=useState<Creation>();
  const [now]=useState(()=>Date.now());

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {setToast(undefined);setLastTrashed(undefined)}, 3600);
  }, []);

  const loadWorkspace = useCallback(async () => {
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      if (!response.ok) throw new Error("Workspace unavailable");
      setData(await response.json() as WorkspaceData);
    } catch {
      notify("Impossible de charger l’espace. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWorkspace(), 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace]);
  useEffect(()=>{const handler=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setCommandOpen((open)=>!open)}if(event.key==="Escape"){setCommandOpen(false);setNotificationsOpen(false)}};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler)},[]);

  const navigate = useCallback((view: AppView) => { setActive(view); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const onCreated = useCallback((creation: Creation) => setData((current) => ({ ...current, creations: [creation, ...current.creations.filter((item)=>item.id!==creation.id)] })), []);
  const onTemplateImported = useCallback((template: ExternalTemplate) => setData((current) => ({ ...current, templates: [template, ...current.templates.filter((item)=>item.id!==template.id)] })), []);
  const onPackCreated=useCallback((tasks:Task[],creations:Creation[])=>setData((current)=>({...current,tasks:[...tasks,...current.tasks],creations:[...creations,...current.creations]})),[]);
  const editCreation = useCallback((creation: Creation) => { setEditingCreation(creation); setOpenCreation(undefined); navigate("sketchup"); }, [navigate]);

  const deleteCreation = useCallback(async (creation: Creation) => {
    try {
      const response=await fetch("/api/workspace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"trash_creation",id:creation.id})});
      if(!response.ok)throw new Error("Delete failed");
      const trashed={...creation,deletedAt:new Date().toISOString()};
      setData((current)=>({...current,creations:current.creations.filter((item)=>item.id!==creation.id),trash:[trashed,...current.trash],tasks:current.tasks.map((task)=>task.creationId===creation.id?{...task,creationId:null}:task)}));
      setLastTrashed(trashed);setOpenCreation(undefined);if(editingCreation?.id===creation.id)setEditingCreation(undefined);notify("Création déplacée dans la corbeille.");
    } catch { notify("La création n’a pas pu être déplacée."); }
  }, [editingCreation, notify]);

  const restoreCreation=useCallback(async(creation:Creation)=>{try{const response=await fetch("/api/workspace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"restore_creation",id:creation.id})});const payload=await response.json() as {creation?:Creation;task?:Task|null};if(!response.ok||!payload.creation)throw new Error();setData((current)=>({...current,trash:current.trash.filter((item)=>item.id!==creation.id),creations:[payload.creation!,...current.creations],tasks:payload.task?[payload.task,...current.tasks.filter((task)=>task.id!==payload.task!.id)]:current.tasks.map((task)=>task.id===payload.creation!.taskId?{...task,creationId:payload.creation!.id}:task)}));setLastTrashed(undefined);notify("Création restaurée.")}catch{notify("La restauration a échoué.")}},[notify]);
  const purgeCreation=useCallback(async(creation:Creation)=>{if(!window.confirm(`Effacer définitivement « ${creation.title} » et son historique ?`))return;try{const response=await fetch("/api/workspace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"purge_creation",id:creation.id})});if(!response.ok)throw new Error();setData((current)=>({...current,trash:current.trash.filter((item)=>item.id!==creation.id)}));notify("Création effacée définitivement.")}catch{notify("La suppression définitive a échoué.")}},[notify]);

  const createTask = async (draft: TaskDraft) => {
    try {
      const response = await fetch("/api/workspace", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"task", ...draft, publishAt:new Date(draft.publishAt).toISOString() }) });
      if (!response.ok) throw new Error("Task creation failed");
      const payload = await response.json() as { task: Task; creation: Creation };
      setData((current)=>({...current,tasks:[payload.task,...current.tasks],creations:[payload.creation,...current.creations]}));
      notify("Tâche créée et template ajouté à Mes créations.");
    } catch { notify("La tâche n’a pas pu être créée."); }
  };

  const updateStatus = async (id: string, status: WorkStatus) => {
    const previous = data;
    setData((current)=>({...current,tasks:current.tasks.map((task)=>task.id===id?{...task,status}:task),creations:current.creations.map((creation)=>creation.taskId===id?{...creation,status}:creation)}));
    try {
      const response = await fetch("/api/workspace", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"status",id,status})});
      if(!response.ok) throw new Error("Update failed");
      notify(`Statut mis à jour : ${STATUS_LABELS[status]}.`);
    } catch { setData(previous); notify("Impossible de modifier le statut."); }
  };

  const updateApproval=async(item:Task|Creation,approvalStatus:ApprovalStatus)=>{const isTask="creationId" in item,scope=isTask?"task":"creation",id=isTask?item.id:(item.taskId||item.id);try{const response=await fetch("/api/workspace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"approval",id,scope:isTask||item.taskId?"task":scope,approvalStatus})});if(!response.ok)throw new Error();setData((current)=>({...current,tasks:current.tasks.map((task)=>task.id===id?{...task,approvalStatus}:task),creations:current.creations.map((creation)=>creation.id===item.id||creation.taskId===id?{...creation,approvalStatus}:creation)}));notify(`Validation : ${APPROVAL_LABELS[approvalStatus]}.`)}catch{notify("La validation n’a pas pu être mise à jour.")}};

  const updateTask=async(task:Task,draft:TaskDraft)=>{try{const publishAt=new Date(draft.publishAt).toISOString();const response=await fetch("/api/workspace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"task_update",id:task.id,...draft,publishAt})});const payload=await response.json() as {task?:Task};if(!response.ok||!payload.task)throw new Error();setData((current)=>({...current,tasks:current.tasks.map((item)=>item.id===task.id?payload.task!:item),creations:current.creations.map((creation)=>creation.taskId===task.id?{...creation,title:draft.name,kind:draft.kind,network:draft.network,publishAt}:creation)}));notify("Publication mise à jour.")}catch{notify("La publication n’a pas pu être modifiée.")}};
  const deleteTask=async(task:Task)=>{if(!window.confirm(`Déplacer « ${task.name} » et sa création dans la corbeille ?`))return;try{const response=await fetch("/api/workspace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"delete_task",id:task.id})});if(!response.ok)throw new Error();setData((current)=>{const related=current.creations.filter((creation)=>creation.taskId===task.id).map((creation)=>({...creation,deletedAt:new Date().toISOString()}));return{...current,tasks:current.tasks.filter((item)=>item.id!==task.id),creations:current.creations.filter((creation)=>creation.taskId!==task.id),trash:[...related,...current.trash]}});notify("Tâche déplacée dans la corbeille.")}catch{notify("La tâche n’a pas pu être supprimée.")}};
  const duplicateTask=async(task:Task)=>{try{const response=await fetch("/api/workspace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"task_duplicate",id:task.id})});const payload=await response.json() as {task?:Task;creation?:Creation};if(!response.ok||!payload.task||!payload.creation)throw new Error();setData((current)=>({...current,tasks:[payload.task!,...current.tasks],creations:[payload.creation!,...current.creations]}));notify("Publication dupliquée au lendemain.")}catch{notify("La duplication a échoué.")}};

  const view = () => {
    if (loading) return <div className="app-loader"><img src="/noctys-logo.webp" alt=""/><LoaderCircle className="spin"/><span>INITIALISATION DU HUB</span></div>;
    switch (active) {
      case "templates": return <TemplatesView onCreated={onCreated} onEdit={editCreation} notify={notify} templates={data.templates} onTemplateImported={onTemplateImported} brand={data.brand??DEFAULT_BRAND} onPackCreated={onPackCreated}/>;
      case "sketchup": return <SketchupView key={editingCreation?.id ?? "new-canvas"} creation={editingCreation} onSaved={(creation)=>{onCreated(creation);setEditingCreation(creation)}} onTemplateImported={onTemplateImported} notify={notify} brand={data.brand??DEFAULT_BRAND}/>;
      case "editor": return <EditorView onCreated={onCreated} notify={notify}/>;
      case "logos": return <GeneratorView mode="logo" onCreated={onCreated} notify={notify}/>;
      case "images": return <GeneratorView mode="image" onCreated={onCreated} notify={notify}/>;
      case "texts": return <GeneratorView mode="text" onCreated={onCreated} notify={notify}/>;
      case "brand": return <BrandKitView key={(data.brand??DEFAULT_BRAND).updatedAt} brand={data.brand??DEFAULT_BRAND} onSaved={(brand)=>setData((current)=>({...current,brand}))} notify={notify}/>;
      case "creations": return <CreationsView creations={data.creations} trash={data.trash} onOpen={setOpenCreation} onEdit={editCreation} onDelete={deleteCreation} onRestore={restoreCreation} onPurge={purgeCreation} onApproval={updateApproval} onVersionRestored={onCreated}/>;
      case "calendar": return <CalendarView tasks={data.tasks} onCreate={createTask} onStatus={updateStatus} onUpdate={updateTask} onDelete={deleteTask} onDuplicate={duplicateTask} onApproval={updateApproval}/>;
    }
  };

  const label = VIEW_LABELS[active];
  const alertCount=useMemo(()=>data.tasks.filter((task)=>task.approvalStatus==="review"||(task.status!=="finie"&&new Date(task.publishAt).getTime()-now<4*86_400_000)).length,[data.tasks,now]);
  const openChecks=openCreation?preflightCreation(openCreation):[];
  return (
    <main className="app-shell">
      <div className={`mobile-nav-wrap ${mobileNav?"open":""}`}><Navigation active={active} onNavigate={navigate}/></div>
      {mobileNav&&<button className="mobile-backdrop" aria-label="Fermer le menu" onClick={()=>setMobileNav(false)}/>} 
      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb"><button className="menu-button" onClick={()=>setMobileNav(true)} aria-label="Ouvrir le menu"><Menu size={18}/></button><span>{label.section.toUpperCase()}</span><b>/</b><strong>{label.title.toUpperCase()}</strong></div>
          <div className="top-actions"><button className="shortcut" onClick={()=>setCommandOpen(true)}><Command size={13}/> Raccourcis <kbd>⌘ K</kbd></button><button className="notification" onClick={()=>setNotificationsOpen(true)} aria-label={`${alertCount} notifications`}><Bell size={15}/>{alertCount>0&&<i/>}</button><button className="avatar" onClick={()=>navigate("brand")} aria-label="Ouvrir le Brand Kit">N</button></div>
        </header>
        <div className="content">{view()}</div>
      </section>

      {toast&&<div className="toast"><Check size={15}/>{toast}{lastTrashed&&<button onClick={()=>void restoreCreation(lastTrashed)}>Annuler</button>}</div>}
      {openCreation&&<div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Détail de la création"><button className="modal-dismiss" onClick={()=>setOpenCreation(undefined)} aria-label="Fermer le détail"/><div className="creation-modal">
        <button className="modal-close" onClick={()=>setOpenCreation(undefined)} aria-label="Fermer"><X size={18}/></button>
        <div className={`creation-detail-visual cover-${openCreation.template}`}><div className="cover-grid"/><img className={creationAsset(openCreation)?"imported-detail-art":""} src={creationAsset(openCreation)??"/noctys-logo.webp"} alt={creationAsset(openCreation)?"Template importé":"Logo NOCTYS"}/><span>{NETWORKS[openCreation.network].short}</span></div>
        <div className="creation-detail-copy"><span className="eyebrow">{NETWORKS[openCreation.network].label} · {openCreation.kind}</span><h2>{openCreation.title}</h2><div className="detail-pills"><div className={`status-pill status-${openCreation.status}`}>{STATUS_LABELS[openCreation.status]}</div><div className={`approval-pill approval-${openCreation.approvalStatus}`}>{APPROVAL_LABELS[openCreation.approvalStatus]}</div></div><p>{readableBody(openCreation.body)}</p><div className="preflight-panel"><div><span className="eyebrow">CONTRÔLE AVANT PUBLICATION</span><strong>{openChecks.filter((item)=>item.level==="pass").length}/{openChecks.length} vérifications réussies</strong></div>{openChecks.map((check)=><span className={`preflight-${check.level}`} key={check.key}><i>{check.level==="pass"?"✓":"!"}</i><span><strong>{check.label}</strong><small>{check.detail}</small></span></span>)}</div><div className="creation-modal-actions"><button className="primary" onClick={()=>editCreation(openCreation)}>Modifier dans Sketchup</button><button className="danger-button" onClick={()=>void deleteCreation(openCreation)}>Mettre à la corbeille</button></div></div>
      </div></div>}
      {commandOpen&&<CommandPalette onNavigate={navigate} onClose={()=>setCommandOpen(false)}/>}
      {notificationsOpen&&<NotificationCenter tasks={data.tasks} onClose={()=>setNotificationsOpen(false)} onOpenCalendar={()=>{setNotificationsOpen(false);navigate("calendar")}}/>}
    </main>
  );
}

function readableBody(body: string) {
  try {
    const parsed = JSON.parse(body) as { title?: string; opponent?: string; result?: string };
    return parsed.result || `${parsed.title ?? "Création NOCTYS"}${parsed.opponent ? ` · ${parsed.opponent}` : ""}`;
  } catch { return body; }
}

function creationAsset(creation: Creation) {
  try { const parsed = JSON.parse(creation.body) as { assetUrl?: unknown }; return typeof parsed.assetUrl === "string" ? parsed.assetUrl : null; }
  catch { return null; }
}
