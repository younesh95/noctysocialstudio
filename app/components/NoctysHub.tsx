"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check, Command, LoaderCircle, Menu, X } from "lucide-react";
import { Navigation } from "./Navigation";
import { EditorView, GeneratorView } from "./StudioViews";
import { TemplatesView } from "./TemplateBuilder";
import { SketchupView } from "./SketchupView";
import { CalendarView, CreationsView } from "./SpaceViews";
import { NETWORKS, STATUS_LABELS, VIEW_LABELS } from "../lib/noctys";
import type { AppView, Creation, ExternalTemplate, Task, TaskDraft, WorkStatus, WorkspaceData } from "../lib/types";

export function NoctysHub() {
  const [active, setActive] = useState<AppView>("templates");
  const [data, setData] = useState<WorkspaceData>({ tasks: [], creations: [], templates: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string>();
  const [openCreation, setOpenCreation] = useState<Creation>();
  const [editingCreation, setEditingCreation] = useState<Creation>();
  const [mobileNav, setMobileNav] = useState(false);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(undefined), 2600);
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

  const navigate = useCallback((view: AppView) => { setActive(view); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const onCreated = useCallback((creation: Creation) => setData((current) => ({ ...current, creations: [creation, ...current.creations.filter((item)=>item.id!==creation.id)] })), []);
  const onTemplateImported = useCallback((template: ExternalTemplate) => setData((current) => ({ ...current, templates: [template, ...current.templates.filter((item)=>item.id!==template.id)] })), []);
  const editCreation = useCallback((creation: Creation) => { setEditingCreation(creation); setOpenCreation(undefined); navigate("sketchup"); }, [navigate]);

  const deleteCreation = useCallback(async (creation: Creation) => {
    if (!window.confirm(`Supprimer définitivement « ${creation.title} » ?`)) return;
    try {
      const response=await fetch("/api/workspace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"delete_creation",id:creation.id})});
      if(!response.ok)throw new Error("Delete failed");
      setData((current)=>({...current,creations:current.creations.filter((item)=>item.id!==creation.id),tasks:current.tasks.map((task)=>task.creationId===creation.id?{...task,creationId:null}:task)}));
      setOpenCreation(undefined);if(editingCreation?.id===creation.id)setEditingCreation(undefined);notify("Création supprimée.");
    } catch { notify("La création n’a pas pu être supprimée."); }
  }, [editingCreation, notify]);

  const createTask = async (draft: TaskDraft) => {
    try {
      const response = await fetch("/api/workspace", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"task", ...draft, publishAt:new Date(draft.publishAt).toISOString() }) });
      if (!response.ok) throw new Error("Task creation failed");
      const payload = await response.json() as { task: Task; creation: Creation };
      setData((current)=>({tasks:[payload.task,...current.tasks],creations:[payload.creation,...current.creations]}));
      notify("Tâche créée et template ajouté à Mes créations.");
    } catch { notify("La tâche n’a pas pu être créée."); }
  };

  const updateStatus = async (id: string, status: WorkStatus) => {
    const previous = data;
    setData((current)=>({tasks:current.tasks.map((task)=>task.id===id?{...task,status}:task),creations:current.creations.map((creation)=>creation.taskId===id?{...creation,status}:creation)}));
    try {
      const response = await fetch("/api/workspace", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"status",id,status})});
      if(!response.ok) throw new Error("Update failed");
      notify(`Statut mis à jour : ${STATUS_LABELS[status]}.`);
    } catch { setData(previous); notify("Impossible de modifier le statut."); }
  };

  const view = () => {
    if (loading) return <div className="app-loader"><img src="/noctys-logo.webp" alt=""/><LoaderCircle className="spin"/><span>INITIALISATION DU HUB</span></div>;
    switch (active) {
      case "templates": return <TemplatesView onCreated={onCreated} onEdit={editCreation} notify={notify} templates={data.templates} onTemplateImported={onTemplateImported}/>;
      case "sketchup": return <SketchupView key={editingCreation?.id ?? "new-canvas"} creation={editingCreation} onSaved={(creation)=>{onCreated(creation);setEditingCreation(creation)}} onTemplateImported={onTemplateImported} notify={notify}/>;
      case "editor": return <EditorView onCreated={onCreated} notify={notify}/>;
      case "logos": return <GeneratorView mode="logo" onCreated={onCreated} notify={notify}/>;
      case "images": return <GeneratorView mode="image" onCreated={onCreated} notify={notify}/>;
      case "texts": return <GeneratorView mode="text" onCreated={onCreated} notify={notify}/>;
      case "creations": return <CreationsView creations={data.creations} onOpen={setOpenCreation} onEdit={editCreation} onDelete={deleteCreation}/>;
      case "calendar": return <CalendarView tasks={data.tasks} onCreate={createTask} onStatus={updateStatus}/>;
    }
  };

  const label = VIEW_LABELS[active];
  return (
    <main className="app-shell">
      <div className={`mobile-nav-wrap ${mobileNav?"open":""}`}><Navigation active={active} onNavigate={navigate}/></div>
      {mobileNav&&<button className="mobile-backdrop" aria-label="Fermer le menu" onClick={()=>setMobileNav(false)}/>} 
      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb"><button className="menu-button" onClick={()=>setMobileNav(true)} aria-label="Ouvrir le menu"><Menu size={18}/></button><span>{label.section.toUpperCase()}</span><b>/</b><strong>{label.title.toUpperCase()}</strong></div>
          <div className="top-actions"><button className="shortcut"><Command size={13}/> Raccourcis <kbd>⌘ K</kbd></button><button className="notification" aria-label="Notifications"><Bell size={15}/><i/></button><button className="avatar">N</button></div>
        </header>
        <div className="content">{view()}</div>
      </section>

      {toast&&<div className="toast"><Check size={15}/>{toast}</div>}
      {openCreation&&<div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Détail de la création"><button className="modal-dismiss" onClick={()=>setOpenCreation(undefined)} aria-label="Fermer le détail"/><div className="creation-modal">
        <button className="modal-close" onClick={()=>setOpenCreation(undefined)} aria-label="Fermer"><X size={18}/></button>
        <div className={`creation-detail-visual cover-${openCreation.template}`}><div className="cover-grid"/><img className={creationAsset(openCreation)?"imported-detail-art":""} src={creationAsset(openCreation)??"/noctys-logo.webp"} alt={creationAsset(openCreation)?"Template importé":"Logo NOCTYS"}/><span>{NETWORKS[openCreation.network].short}</span></div>
        <div className="creation-detail-copy"><span className="eyebrow">{NETWORKS[openCreation.network].label} · {openCreation.kind}</span><h2>{openCreation.title}</h2><div className={`status-pill status-${openCreation.status}`}>{STATUS_LABELS[openCreation.status]}</div><p>{readableBody(openCreation.body)}</p><div className="creation-modal-actions"><button className="primary" onClick={()=>editCreation(openCreation)}>Modifier dans Sketchup</button><button className="danger-button" onClick={()=>void deleteCreation(openCreation)}>Supprimer</button></div></div>
      </div></div>}
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
