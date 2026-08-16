"use client";

import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Command, Files, LayoutTemplate, Search, ShieldCheck, Sparkles, SwatchBook, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { APPROVAL_LABELS, deadlineFor, NETWORKS } from "../lib/noctys";
import type { AppView, Task } from "../lib/types";

const commands:Array<{view:AppView;label:string;hint:string;keywords:string;icon:typeof Sparkles}>=[
  {view:"templates",label:"Créer un Pack Match",hint:"Studio · Templates",keywords:"pack match campagne",icon:Sparkles},
  {view:"sketchup",label:"Ouvrir Sketchup",hint:"Éditeur graphique",keywords:"canvas dessin",icon:LayoutTemplate},
  {view:"creations",label:"Voir Mes créations",hint:"Bibliothèque",keywords:"fichiers contenus",icon:Files},
  {view:"calendar",label:"Planifier une publication",hint:"Calendrier éditorial",keywords:"tache agenda date",icon:CalendarDays},
  {view:"brand",label:"Configurer le Brand Kit",hint:"Identité NOCTYS",keywords:"logo couleurs sponsors",icon:SwatchBook},
];

export function CommandPalette({onNavigate,onClose}:{onNavigate:(view:AppView)=>void;onClose:()=>void}){
  const [query,setQuery]=useState("");const searchRef=useRef<HTMLInputElement>(null);const filtered=commands.filter((item)=>`${item.label} ${item.keywords}`.toLowerCase().includes(query.toLowerCase()));useEffect(()=>searchRef.current?.focus(),[]);
  return <div className="overlay-backdrop command-backdrop" role="dialog" aria-modal="true" aria-label="Palette de commandes"><button className="modal-dismiss" onClick={onClose} aria-label="Fermer"/><section className="command-palette"><div className="command-search"><Search size={17}/><input ref={searchRef} value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Rechercher une action NOCTYS…"/><kbd>ESC</kbd></div><div className="command-results"><span>ACTIONS RAPIDES</span>{filtered.map(({view,label,hint,icon:Icon})=><button key={view} onClick={()=>{onNavigate(view);onClose()}}><i><Icon size={16}/></i><span><strong>{label}</strong><small>{hint}</small></span><Command size={12}/></button>)}{!filtered.length&&<div className="command-empty">Aucune action trouvée.</div>}</div><footer><span>↑↓ Naviguer</span><span>↵ Ouvrir</span><span>NOCTYS COMMAND</span></footer></section></div>;
}

export function NotificationCenter({tasks,onClose,onOpenCalendar}:{tasks:Task[];onClose:()=>void;onOpenCalendar:()=>void}){
  const [now]=useState(()=>Date.now());const items=useMemo(()=>buildNotifications(tasks,now),[tasks,now]);
  return <div className="notification-drawer-wrap" role="dialog" aria-modal="true" aria-label="Centre de notifications"><button className="modal-dismiss" onClick={onClose} aria-label="Fermer"/><aside className="notification-drawer"><header><div><span className="eyebrow">CENTRE DE CONTRÔLE</span><h2>Notifications</h2></div><button onClick={onClose} aria-label="Fermer"><X size={17}/></button></header><div className="notification-stats"><span><strong>{items.filter((item)=>item.level==="urgent").length}</strong> urgentes</span><span><strong>{tasks.filter((task)=>task.approvalStatus==="review").length}</strong> à valider</span></div><div className="notification-list">{items.map((item)=><article className={`notification-item ${item.level}`} key={item.id}><i>{item.level==="urgent"?<AlertTriangle size={14}/>:item.level==="success"?<CheckCircle2 size={14}/>:<Clock3 size={14}/>}</i><div><strong>{item.title}</strong><p>{item.detail}</p><small>{item.meta}</small></div></article>)}{!items.length&&<div className="notification-empty"><ShieldCheck size={30}/><strong>TOUT EST SOUS CONTRÔLE</strong><span>Aucune échéance critique.</span></div>}</div><button className="primary notification-cta" onClick={onOpenCalendar}><CalendarDays size={14}/> Ouvrir le calendrier</button></aside></div>;
}

function buildNotifications(tasks:Task[],now:number){
  return tasks.flatMap((task)=>{const deadline=deadlineFor(task.publishAt).getTime(),days=Math.ceil((deadline-now)/86_400_000),meta=`${NETWORKS[task.network].label} · ${APPROVAL_LABELS[task.approvalStatus]}`;const rows=[];
    if(task.approvalStatus==="review")rows.push({id:`review-${task.id}`,level:"review",title:`Validation requise — ${task.name}`,detail:"Le contenu attend une approbation avant planification.",meta});
    if(task.status!=="finie"&&days<=0)rows.push({id:`late-${task.id}`,level:"urgent",title:`Deadline atteinte — ${task.name}`,detail:"La deadline de production est dépassée ou arrive aujourd’hui.",meta});
    else if(task.status!=="finie"&&days<=3)rows.push({id:`soon-${task.id}`,level:"soon",title:`Échéance proche — ${task.name}`,detail:`Plus que ${days} jour${days>1?"s":""} avant la deadline.`,meta});
    if(task.approvalStatus==="published")rows.push({id:`published-${task.id}`,level:"success",title:`Publication finalisée — ${task.name}`,detail:"Le contenu est marqué comme publié.",meta});return rows;
  }).slice(0,12) as Array<{id:string;level:string;title:string;detail:string;meta:string}>;
}
