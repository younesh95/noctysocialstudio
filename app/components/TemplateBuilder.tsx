"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check, FileJson, LayoutTemplate, LoaderCircle, Maximize2, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { canvasBody, createCanvasDocument, customFormat } from "../lib/canvas";
import { NETWORKS, SOCIAL_FORMATS } from "../lib/noctys";
import type { BrandSettings, Creation, ExternalTemplate, Network, SocialFormat, Task } from "../lib/types";
import { saveCreation } from "./StudioViews";
import { MatchPackBuilder } from "./MatchPackBuilder";

interface Props {
  templates: ExternalTemplate[];
  onTemplateImported: (template: ExternalTemplate) => void;
  onCreated: (creation: Creation) => void;
  onEdit: (creation: Creation) => void;
  notify: (message: string) => void;
  brand: BrandSettings;
  onPackCreated: (tasks:Task[],creations:Creation[]) => void;
}

type Preset = "match"|"victory"|"roster"|"blank";

const PRESETS: Array<{id:Preset;name:string;description:string;tag:string}> = [
  {id:"match",name:"Match Night",description:"Affiche adversaire, date et BO3",tag:"PRÉREMPLI"},
  {id:"victory",name:"Victory",description:"Résultat et célébration premium",tag:"PRÉREMPLI"},
  {id:"roster",name:"Roster Reveal",description:"Présentation joueur ou équipe",tag:"PRÉREMPLI"},
  {id:"blank",name:"Canvas vierge",description:"Composition entièrement libre",tag:"PERSONNALISÉ"},
];

export function TemplatesView({ templates, onTemplateImported, onCreated, onEdit, notify, brand, onPackCreated }: Props) {
  const [network,setNetwork]=useState<Network>("instagram");
  const [formatId,setFormatId]=useState(SOCIAL_FORMATS.instagram[0].id);
  const [custom,setCustom]=useState(false);
  const [width,setWidth]=useState(1080);
  const [height,setHeight]=useState(1080);
  const [preset,setPreset]=useState<Preset>("match");
  const [title,setTitle]=useState("MATCH NIGHT");
  const [subtitle,setSubtitle]=useState("NOCTYS VS ORION · 21:00 CET");
  const [activeExternal,setActiveExternal]=useState<ExternalTemplate>();
  const [importing,setImporting]=useState(false);
  const [saving,setSaving]=useState(false);
  const [dragging,setDragging]=useState(false);
  const fileInput=useRef<HTMLInputElement>(null);
  const formats=SOCIAL_FORMATS[network];
  const selectedFormat=useMemo<SocialFormat>(()=>custom?customFormat(network,width,height):formats.find((item)=>item.id===formatId)||formats[0],[custom,formatId,formats,height,network,width]);

  const changeNetwork=(value:Network)=>{setNetwork(value);setFormatId(SOCIAL_FORMATS[value][0].id);setCustom(false);setActiveExternal(undefined)};

  const create = async () => {
    setSaving(true);
    try {
      const document=createCanvasDocument(selectedFormat,preset,title,subtitle,brand);
      if(activeExternal?.assetUrl) document.elements.unshift({id:crypto.randomUUID(),type:"image",name:"Template importé",x:0,y:0,width:document.width,height:document.height,rotation:0,opacity:.72,src:activeExternal.assetUrl});
      const creation=await saveCreation({title:title||"Création NOCTYS",network,kind:"image",status:"debute",publishAt:null,template:activeExternal?`external:${activeExternal.id}`:`canvas:${preset}`,body:canvasBody(document,{title,assetUrl:activeExternal?.assetUrl||undefined})});
      onCreated(creation);onEdit(creation);notify("Template créé et ouvert dans Sketchup.");
    } catch { notify("Le template n’a pas pu être créé."); }
    finally { setSaving(false); }
  };

  const importFile=async(file?:File)=>{
    if(!file)return;setImporting(true);
    try{const form=new FormData();form.append("file",file);form.append("network",network);form.append("name",file.name.replace(/\.[^.]+$/,""));if(file.type.startsWith("image/")){const dimensions=await imageDimensions(file);form.append("width",String(dimensions.width));form.append("height",String(dimensions.height))}const response=await fetch("/api/templates",{method:"POST",body:form});const data=await response.json() as {template?:ExternalTemplate;error?:string};if(!response.ok||!data.template)throw new Error(data.error||"Import impossible");onTemplateImported(data.template);setActiveExternal(data.template);setNetwork(data.template.network);setWidth(data.template.width);setHeight(data.template.height);setCustom(true);notify(`Template « ${data.template.name} » importé.`)}catch(error){notify(error instanceof Error?error.message:"Import impossible.")}finally{setImporting(false);if(fileInput.current)fileInput.current.value=""}
  };

  return <div className="view-stack fade-in template-builder">
    <section className="intro compact-intro"><div><span className="eyebrow">NOCTYS CONTENT SYSTEM — 01</span><h1>CHOISIR LE<br/><em>BON FORMAT.</em></h1></div><p>Partez d’une composition préremplie ou d’un canvas vierge, aux dimensions adaptées à chaque réseau.</p></section>

    <MatchPackBuilder brand={brand} onCreated={onPackCreated} notify={notify}/>

    <section className="builder-block"><div className="builder-step"><span>01</span><div><strong>Réseau</strong><small>Choisissez la destination de la publication</small></div></div><div className="network-pills builder-networks">{(Object.keys(NETWORKS) as Network[]).map((item)=><button key={item} className={network===item?"active":""} onClick={()=>changeNetwork(item)}><span>{NETWORKS[item].short}</span>{NETWORKS[item].label}</button>)}</div></section>

    <section className="builder-block"><div className="builder-step"><span>02</span><div><strong>Taille & ratio</strong><small>Formats recommandés et dimensions libres</small></div></div><div className="ratio-grid">{formats.map((format)=><button key={format.id} className={!custom&&selectedFormat.id===format.id?"active":""} onClick={()=>{setCustom(false);setFormatId(format.id);setActiveExternal(undefined)}}><i style={{aspectRatio:`${format.width}/${format.height}`}}/><div><strong>{format.label}</strong><small>{format.width} × {format.height} · {format.ratio}</small><em>{format.usage}</em></div>{format.recommended&&<span>RECOMMANDÉ</span>}</button>)}<button className={`custom-ratio-card ${custom?"active":""}`} onClick={()=>{setCustom(true);setActiveExternal(undefined)}}><Maximize2 size={18}/><div><strong>Dimensions personnalisées</strong><small>De 256 à 4096 px</small><em>Ratio calculé automatiquement</em></div></button></div>{custom&&<div className="custom-dimensions"><label>Largeur<input type="number" min="256" max="4096" value={width} onChange={(event)=>setWidth(clamp(Number(event.target.value)))}/><span>px</span></label><b>×</b><label>Hauteur<input type="number" min="256" max="4096" value={height} onChange={(event)=>setHeight(clamp(Number(event.target.value)))}/><span>px</span></label><div><strong>{selectedFormat.ratio}</strong><small>Ratio personnalisé</small></div></div>}</section>

    <section className="builder-block"><div className="builder-step"><span>03</span><div><strong>Point de départ</strong><small>Prérempli par NOCTYS ou création libre</small></div></div><div className="preset-grid">{PRESETS.map((item)=><button key={item.id} className={preset===item.id?"active":""} onClick={()=>setPreset(item.id)}><div className={`preset-art preset-${item.id}`}><span>{item.id==="blank"?"+":item.id==="victory"?"W":item.id==="roster"?"R":"VS"}</span></div><div><em>{item.tag}</em><strong>{item.name}</strong><small>{item.description}</small></div>{preset===item.id&&<Check size={15}/>}</button>)}</div><div className="builder-copy"><label>Titre<input value={title} onChange={(event)=>setTitle(event.target.value)} maxLength={80}/></label><label>Sous-titre<input value={subtitle} onChange={(event)=>setSubtitle(event.target.value)} maxLength={120}/></label></div></section>

    <section className={`template-import ${dragging?"is-dragging":""}`} onDragOver={(event)=>{event.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={(event)=>{event.preventDefault();setDragging(false);void importFile(event.dataTransfer.files[0])}}><input ref={fileInput} className="template-file-input" type="file" accept=".json,application/json,image/png,image/jpeg,image/webp" onChange={(event)=>void importFile(event.target.files?.[0])}/><div className="import-icon"><UploadCloud size={21}/></div><div className="import-copy"><span className="eyebrow">OU IMPORTER</span><strong>Utiliser un template externe</strong><small>PNG, JPG, WebP ou manifeste NOCTYS JSON.</small></div><div className="import-security"><ShieldCheck size={14}/><span>Stockage<br/>privé</span></div><button className="secondary-button import-button" onClick={()=>fileInput.current?.click()} disabled={importing}>{importing?<LoaderCircle className="spin" size={14}/>:<UploadCloud size={14}/>} Choisir</button></section>

    {templates.length>0&&<section className="external-templates"><div className="external-heading"><div><span className="eyebrow">BIBLIOTHÈQUE EXTERNE</span><h2>Templates importés</h2></div><span>{templates.length} disponible{templates.length>1?"s":""}</span></div><div className="external-template-grid">{templates.map((template)=><button key={template.id} className={`external-template-card ${activeExternal?.id===template.id?"active":""}`} onClick={()=>{setActiveExternal(template);setNetwork(template.network);setWidth(template.width);setHeight(template.height);setCustom(true);setTitle(template.config.headline||template.name.toUpperCase())}}><div className="external-thumb">{template.assetUrl?<img src={template.assetUrl} alt=""/>:<FileJson size={24}/>}<span>{NETWORKS[template.network].short}</span></div><div><strong>{template.name}</strong><small>{template.width} × {template.height}</small></div><ArrowRight size={14}/></button>)}</div></section>}

    <section className="builder-summary"><div className="summary-preview" style={{aspectRatio:`${selectedFormat.width}/${selectedFormat.height}`}}><LayoutTemplate size={28}/><span>{selectedFormat.ratio}</span></div><div><span className="eyebrow">PRÊT À CRÉER</span><h2>{NETWORKS[network].label} · {selectedFormat.label}</h2><p>{selectedFormat.width} × {selectedFormat.height} px · {preset==="blank"?"Canvas vierge":PRESETS.find((item)=>item.id===preset)?.name}</p></div><button className="primary" onClick={create} disabled={saving}>{saving?<LoaderCircle className="spin" size={15}/>:<Sparkles size={15}/>} Créer dans Sketchup <ArrowRight size={15}/></button></section>
  </div>;
}

function clamp(value:number){return Number.isFinite(value)?Math.min(4096,Math.max(256,Math.round(value))):1080}
function imageDimensions(file:File){return new Promise<{width:number;height:number}>((resolve,reject)=>{const url=URL.createObjectURL(file);const image=new Image();image.onload=()=>{resolve({width:image.naturalWidth,height:image.naturalHeight});URL.revokeObjectURL(url)};image.onerror=()=>{reject(new Error("L’image est illisible."));URL.revokeObjectURL(url)};image.src=url})}
