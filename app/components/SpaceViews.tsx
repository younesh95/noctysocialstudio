"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  FileArchive,
  FileDown,
  Filter,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Plus,
  Pencil,
  Search,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { deadlineFor, formatDate, googleCalendarUrl, NETWORKS, priorityFor, STATUS_LABELS } from "../lib/noctys";
import { exportCreationsPdf, exportCreationsZip } from "../lib/exports";
import type { ContentKind, Creation, Network, Task, TaskDraft, WorkStatus } from "../lib/types";

interface CreationsProps {
  creations: Creation[];
  onOpen: (creation: Creation) => void;
  onEdit: (creation: Creation) => void;
  onDelete: (creation: Creation) => Promise<void>;
}

export function CreationsView({ creations, onOpen, onEdit, onDelete }: CreationsProps) {
  const [query, setQuery] = useState("");
  const [network, setNetwork] = useState<Network | "all">("all");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting,setExporting]=useState<"pdf"|"zip">();
  const filtered = creations.filter((item) => (network === "all" || item.network === network) && item.title.toLowerCase().includes(query.toLowerCase()));
  const chosen=creations.filter((item)=>selected.has(item.id));
  const toggle=(id:string)=>setSelected((current)=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next});
  const toggleAll=()=>setSelected((current)=>filtered.every((item)=>current.has(item.id))?new Set():new Set([...current,...filtered.map((item)=>item.id)]));
  const runExport=async(type:"pdf"|"zip")=>{const items=chosen.length?chosen:filtered;if(!items.length)return;setExporting(type);try{if(type==="pdf")await exportCreationsPdf(items);else await exportCreationsZip(items)}catch{window.alert("L’export n’a pas pu être généré. Réessayez après avoir enregistré les créations.")}finally{setExporting(undefined)}};

  return (
    <div className="view-stack fade-in">
      <section className="section-heading creation-heading">
        <div><span className="eyebrow">BIBLIOTHÈQUE — 06</span><h1>MES<br/><em>CRÉATIONS.</em></h1></div>
        <div className="metric-row"><span><strong>{creations.length}</strong> créations</span><span><strong>{creations.filter((c)=>c.status==="en_cours").length}</strong> en cours</span><span><strong>{creations.filter((c)=>c.status==="finie").length}</strong> terminées</span></div>
      </section>

      <div className="library-toolbar">
        <label className="search-box"><Search size={15}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Rechercher une création…"/></label>
        <div className="filter-row"><Filter size={14}/><select value={network} onChange={(event)=>setNetwork(event.target.value as Network|"all")}><option value="all">Tous les réseaux</option>{(Object.keys(NETWORKS) as Network[]).map((item)=><option key={item} value={item}>{NETWORKS[item].label}</option>)}</select></div>
        <div className="layout-toggle"><button className={layout==="grid"?"active":""} onClick={()=>setLayout("grid")} aria-label="Affichage en grille"><LayoutGrid size={15}/></button><button className={layout==="list"?"active":""} onClick={()=>setLayout("list")} aria-label="Affichage en liste"><List size={15}/></button></div>
        <button className="select-all-button" onClick={toggleAll}>{filtered.length&&filtered.every((item)=>selected.has(item.id))?<CheckSquare size={14}/>:<Square size={14}/>} Tout sélectionner</button>
      </div>

      <div className="bulk-export"><div><strong>{chosen.length||filtered.length}</strong><span>{chosen.length?"création(s) sélectionnée(s)":"création(s) visible(s)"} · choisissez un export</span></div><button onClick={()=>void runExport("pdf")} disabled={Boolean(exporting)}>{exporting==="pdf"?<Clock3 size={14}/>:<FileDown size={14}/>} PDF multipage</button><button onClick={()=>void runExport("zip")} disabled={Boolean(exporting)}>{exporting==="zip"?<Clock3 size={14}/>:<FileArchive size={14}/>} Pack ZIP</button></div>

      {filtered.length ? <section className={`creation-grid ${layout}`}>
        {filtered.map((creation) => (
          <article className={`creation-card ${selected.has(creation.id)?"is-selected":""}`} key={creation.id}>
            <button className="creation-select" onClick={()=>toggle(creation.id)} aria-label={`Sélectionner ${creation.title}`}>{selected.has(creation.id)?<CheckSquare size={16}/>:<Square size={16}/>}</button>
            <button className="creation-card-main" onClick={() => onOpen(creation)}>
            <div className={`creation-cover cover-${creation.template}`}>
              <div className="cover-grid"/>
              <span className="network-badge">{NETWORKS[creation.network].short}</span>
              {creation.kind === "image" ? <img className={creationAsset(creation)?"imported-creation-art":""} src={creationAsset(creation)??"/noctys-logo.webp"} alt=""/> : <FileText size={34}/>} 
              <strong>{creation.template.startsWith("external:") ? "TEMPLATE IMPORTÉ" : creation.template.startsWith("ai-") ? "AI CONCEPT" : creation.template === "match-night" ? "MATCH NIGHT" : "NOCTYS COPY"}</strong>
            </div>
            <div className="creation-info">
              <div><span className={`status-pill status-${creation.status}`}>{STATUS_LABELS[creation.status]}</span><span className="creation-date">{creation.publishAt ? formatDate(creation.publishAt) : "Brouillon"}</span></div>
              <h3>{creation.title}</h3><p>{NETWORKS[creation.network].label} · {creation.kind}</p>
              <span className="open-creation">Ouvrir <ArrowUpRight size={13}/></span>
            </div>
            </button>
            <div className="creation-card-actions"><button onClick={()=>onEdit(creation)}><Pencil size={13}/> Modifier</button><button className="delete" onClick={()=>void onDelete(creation)}><Trash2 size={13}/> Supprimer</button></div>
          </article>
        ))}
      </section> : <div className="empty-library"><Search size={28}/><strong>AUCUNE CRÉATION TROUVÉE</strong><span>Modifiez vos filtres ou démarrez un nouveau template.</span></div>}
    </div>
  );
}

interface CalendarProps {
  tasks: Task[];
  onCreate: (draft: TaskDraft) => Promise<void>;
  onStatus: (id: string, status: WorkStatus) => Promise<void>;
}

const WEEKDAYS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

export function CalendarView({ tasks, onCreate, onStatus }: CalendarProps) {
  const base = new Date();
  const [month, setMonth] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [now] = useState(() => Date.now());
  const [draft, setDraft] = useState<TaskDraft>({ name:"", kind:"image", network:"instagram", publishAt:"" });
  const days = useMemo(() => buildMonth(month), [month]);
  const upcoming = [...tasks].filter((task)=>new Date(task.publishAt)>=new Date(now-86_400_000)).sort((a,b)=>a.publishAt.localeCompare(b.publishAt)).slice(0,5);

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { await onCreate(draft); setModal(false); setDraft({ name:"", kind:"image", network:"instagram", publishAt:"" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="view-stack calendar-view fade-in">
      <section className="calendar-heading">
        <div><span className="eyebrow">PLANIFICATION — 07</span><h1>CALENDRIER<br/><em>ÉDITORIAL.</em></h1></div>
        <div className="calendar-actions"><a className="secondary-button" href={upcoming[0] ? googleCalendarUrl(upcoming[0]) : "https://calendar.google.com"} target="_blank" rel="noreferrer"><CalendarCheck size={15}/> Google Agenda <ExternalLink size={12}/></a><button className="primary" onClick={()=>setModal(true)}><Plus size={15}/> Nouvelle tâche</button></div>
      </section>

      <div className="calendar-layout">
        <section className="calendar-panel">
          <div className="month-bar"><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} aria-label="Mois précédent"><ChevronLeft size={17}/></button><h2>{new Intl.DateTimeFormat("fr-FR",{month:"long",year:"numeric"}).format(month)}</h2><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} aria-label="Mois suivant"><ChevronRight size={17}/></button></div>
          <div className="weekdays">{WEEKDAYS.map((day)=><span key={day}>{day}</span>)}</div>
          <div className="month-grid">{days.map(({ date, current },index)=>{
            const dayTasks = tasks.filter((task)=>sameDay(new Date(task.publishAt),date));
            const today = sameDay(date,new Date());
            return <div key={index} className={`day-cell ${current?"":"muted"} ${today?"today":""}`}><span className="day-number">{date.getDate()}</span><div className="day-tasks">{dayTasks.slice(0,3).map((task)=><span key={task.id} className={`calendar-task status-${task.status}`} title={task.name}><i/>{task.name}</span>)}{dayTasks.length>3&&<small>+{dayTasks.length-3} autres</small>}</div></div>;
          })}</div>
        </section>

        <aside className="agenda-panel">
          <div className="agenda-title"><div><span className="eyebrow">À VENIR</span><h2>Prochaines publications</h2></div><span>{upcoming.length}</span></div>
          <div className="agenda-list">{upcoming.map((task)=>{const priority=priorityFor(task);return <article className="agenda-card" key={task.id}>
            <div className="agenda-top"><span className={`priority priority-${priority.key}`}>{priority.label}</span><span className="network-token">{NETWORKS[task.network].short}</span></div>
            <h3>{task.name}</h3><div className="agenda-meta"><span><CalendarDays size={12}/>{formatDate(task.publishAt,{day:"2-digit",month:"short"})}</span><span><Clock3 size={12}/>{new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit"}).format(new Date(task.publishAt))}</span></div>
            <div className="deadline-line"><span>Deadline</span><strong>{formatDate(deadlineFor(task.publishAt).toISOString(),{day:"2-digit",month:"short"})}</strong></div>
            <div className="agenda-foot"><select className={`status-select status-${task.status}`} value={task.status} onChange={(event)=>onStatus(task.id,event.target.value as WorkStatus)}>{(Object.keys(STATUS_LABELS) as WorkStatus[]).map((status)=><option value={status} key={status}>{STATUS_LABELS[status]}</option>)}</select><a href={googleCalendarUrl(task)} target="_blank" rel="noreferrer" aria-label="Ajouter à Google Agenda"><ExternalLink size={14}/></a></div>
          </article>})}{!upcoming.length&&<div className="agenda-empty"><CalendarDays size={25}/><span>Aucune publication planifiée.</span></div>}</div>
        </aside>
      </div>

      {modal && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Créer une tâche"><button type="button" className="modal-dismiss" onClick={()=>setModal(false)} aria-label="Fermer la fenêtre"/><form className="task-modal" onSubmit={create}>
        <div className="modal-head"><div><span className="eyebrow">NOUVELLE PUBLICATION</span><h2>Créer une tâche</h2></div><button type="button" onClick={()=>setModal(false)} aria-label="Fermer"><X size={18}/></button></div>
        <label>Nom de la tâche<input required value={draft.name} onChange={(event)=>setDraft({...draft,name:event.target.value})} placeholder="Ex. Annonce NOCTYS vs ORION"/></label>
        <div className="form-row"><label>Type<select value={draft.kind} onChange={(event)=>setDraft({...draft,kind:event.target.value as ContentKind})}><option value="image">Image</option><option value="texte">Texte</option></select></label><label>Réseau<select value={draft.network} onChange={(event)=>setDraft({...draft,network:event.target.value as Network})}>{(Object.keys(NETWORKS) as Network[]).map((network)=><option value={network} key={network}>{NETWORKS[network].label}</option>)}</select></label></div>
        <label>Date de publication<input required type="datetime-local" value={draft.publishAt} onChange={(event)=>setDraft({...draft,publishAt:event.target.value})}/></label>
        <div className="task-rule"><ImageIcon size={16}/><div><strong>Template prérempli automatiquement</strong><span>Une création {NETWORKS[draft.network].size} sera ajoutée à Mes créations, au statut Débuté.</span></div></div>
        {draft.publishAt&&<div className="deadline-preview"><span>DEADLINE DE PRODUCTION</span><strong>{formatDate(deadlineFor(draft.publishAt).toISOString(),{weekday:"long",day:"numeric",month:"long"})}</strong></div>}
        <button className="primary modal-submit" disabled={saving}>{saving?"Création…":"Créer la tâche"}<Plus size={15}/></button>
      </form></div>}
    </div>
  );
}

function sameDay(a: Date,b: Date){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}

function creationAsset(creation: Creation) {
  try { const parsed = JSON.parse(creation.body) as { assetUrl?: unknown }; return typeof parsed.assetUrl === "string" ? parsed.assetUrl : null; }
  catch { return null; }
}

function buildMonth(month: Date){
  const first = new Date(month.getFullYear(),month.getMonth(),1);
  const offset = (first.getDay()+6)%7;
  const start = new Date(month.getFullYear(),month.getMonth(),1-offset);
  return Array.from({length:42},(_,index)=>{const date=new Date(start);date.setDate(start.getDate()+index);return{date,current:date.getMonth()===month.getMonth()}});
}
