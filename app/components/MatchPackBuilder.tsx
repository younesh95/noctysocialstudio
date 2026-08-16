"use client";

import { CalendarClock, Check, LoaderCircle, PackagePlus, ShieldCheck, Swords } from "lucide-react";
import { useState } from "react";
import { NETWORKS } from "../lib/noctys";
import type { BrandSettings, CampaignDraft, Creation, Network, Task } from "../lib/types";

interface Props{brand:BrandSettings;onCreated:(tasks:Task[],creations:Creation[])=>void;notify:(message:string)=>void}
const allNetworks=Object.keys(NETWORKS) as Network[];

export function MatchPackBuilder({brand,onCreated,notify}:Props){
  const [open,setOpen]=useState(false),[saving,setSaving]=useState(false);
  const [draft,setDraft]=useState<CampaignDraft>(()=>({opponent:"ORION ESPORT",competition:"NOCTYS LEAGUE",bestOf:"BO3",matchAt:futureDate(),sponsors:brand.sponsors.join(" · "),networks:[...allNetworks]}));
  const toggle=(network:Network)=>setDraft((current)=>({...current,networks:current.networks.includes(network)?current.networks.filter((item)=>item!==network):[...current.networks,network]}));
  const create=async(event:React.FormEvent)=>{event.preventDefault();if(!draft.networks.length){notify("Sélectionnez au moins un réseau.");return}setSaving(true);try{const response=await fetch("/api/workspace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"campaign_pack",...draft,matchAt:new Date(draft.matchAt).toISOString()})});const data=await response.json() as {tasks?:Task[];creations?:Creation[];error?:string};if(!response.ok||!data.tasks||!data.creations)throw new Error(data.error||"Pack impossible");onCreated(data.tasks,data.creations);setOpen(false);notify(`Pack Match créé : ${data.creations.length} formats prêts à valider.`)}catch(error){notify(error instanceof Error?error.message:"Le Pack Match n’a pas pu être créé.")}finally{setSaving(false)}};
  return <section className={`match-pack ${open?"is-open":""}`}>
    <div className="match-pack-lead"><span><Swords size={21}/></span><div><small>ASSISTANT ESPORT</small><strong>PACK MATCH MULTIRÉSEAUX</strong><p>Une saisie, quatre créations calibrées et planifiées.</p></div></div>
    {!open?<div className="match-pack-summary"><div>{allNetworks.map((network)=><i key={network}>{NETWORKS[network].short}</i>)}</div><span><ShieldCheck size={13}/> Brand Kit appliqué</span><button className="primary" onClick={()=>setOpen(true)}><PackagePlus size={14}/> Créer un Pack Match</button></div>:
    <form className="match-pack-form" onSubmit={create}><div className="pack-fields"><label>Adversaire<input required value={draft.opponent} onChange={(event)=>setDraft({...draft,opponent:event.target.value})}/></label><label>Compétition<input required value={draft.competition} onChange={(event)=>setDraft({...draft,competition:event.target.value})}/></label><label>Format<select value={draft.bestOf} onChange={(event)=>setDraft({...draft,bestOf:event.target.value})}><option>BO1</option><option>BO3</option><option>BO5</option></select></label><label>Date du match<input required type="datetime-local" value={draft.matchAt} onChange={(event)=>setDraft({...draft,matchAt:event.target.value})}/></label><label className="pack-sponsors">Sponsors / partenaires<input value={draft.sponsors} onChange={(event)=>setDraft({...draft,sponsors:event.target.value})} placeholder="Optionnel"/></label></div><div className="pack-networks"><span>RÉSEAUX À PRODUIRE</span>{allNetworks.map((network)=><button type="button" key={network} className={draft.networks.includes(network)?"active":""} onClick={()=>toggle(network)}><i>{NETWORKS[network].short}</i><span>{NETWORKS[network].label}</span>{draft.networks.includes(network)&&<Check size={13}/>}</button>)}</div><div className="pack-actions"><span><CalendarClock size={13}/> Publication liée au calendrier</span><button type="button" onClick={()=>setOpen(false)}>Annuler</button><button className="primary" disabled={saving}>{saving?<LoaderCircle className="spin" size={14}/>:<PackagePlus size={14}/>} Générer {draft.networks.length} format{draft.networks.length>1?"s":""}</button></div></form>}
  </section>
}

function futureDate(){const date=new Date(Date.now()+3*86_400_000);date.setHours(21,0,0,0);const local=new Date(date.getTime()-date.getTimezoneOffset()*60_000);return local.toISOString().slice(0,16)}
