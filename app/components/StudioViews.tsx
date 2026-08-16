"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  Layers3,
  LoaderCircle,
  FileJson,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import { NETWORKS } from "../lib/noctys";
import type { Creation, ExternalTemplate, Network } from "../lib/types";

interface StudioProps {
  onCreated: (creation: Creation) => void;
  notify: (message: string) => void;
}

export async function saveCreation(payload: Partial<Creation> & Pick<Creation, "title" | "network" | "kind" | "template" | "body">) {
  const response = await fetch("/api/workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "creation", ...payload }),
  });
  if (!response.ok) throw new Error("Sauvegarde impossible");
  const data = await response.json() as { creation: Creation };
  return data.creation;
}

function NetworkSelector({ value, onChange }: { value: Network; onChange: (network: Network) => void }) {
  return (
    <div className="network-pills" aria-label="Réseau social">
      {(Object.keys(NETWORKS) as Network[]).map((network) => (
        <button key={network} className={value === network ? "active" : ""} onClick={() => onChange(network)}>
          <span>{NETWORKS[network].short}</span>{NETWORKS[network].label}
        </button>
      ))}
    </div>
  );
}

interface TemplateStudioProps extends StudioProps {
  templates: ExternalTemplate[];
  onTemplateImported: (template: ExternalTemplate) => void;
}

export function TemplatesView({ onCreated, notify, templates, onTemplateImported }: TemplateStudioProps) {
  const [network, setNetwork] = useState<Network>("instagram");
  const [title, setTitle] = useState("MATCH NIGHT");
  const [opponent, setOpponent] = useState("ORION ESPORT");
  const [draftId, setDraftId] = useState<string>();
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<ExternalTemplate>();
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      try {
        const creation = await saveCreation({
          id: draftId,
          title: `${title} — ${opponent}`,
          network,
          kind: "image",
          status: "debute",
          publishAt: null,
          template: activeTemplate ? `external:${activeTemplate.id}` : "match-night",
          body: JSON.stringify({ title, opponent, externalTemplateId: activeTemplate?.id, assetUrl: activeTemplate?.assetUrl }),
        });
        setDraftId(creation.id);
        setDirty(false);
        onCreated(creation);
      } catch {
        notify("La sauvegarde automatique a échoué.");
      } finally {
        setSaving(false);
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [activeTemplate, dirty, draftId, network, onCreated, opponent, notify, title]);

  const edit = (update: () => void) => { update(); setDirty(true); };

  const chooseTemplate = (template: ExternalTemplate) => {
    setActiveTemplate(template);
    setNetwork(template.network);
    setTitle(template.config.headline || template.name.toUpperCase());
    setDraftId(undefined);
    setDirty(true);
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("network", network);
      form.append("name", file.name.replace(/\.[^.]+$/, ""));
      if (file.type.startsWith("image/")) {
        const dimensions = await imageDimensions(file);
        form.append("width", String(dimensions.width));
        form.append("height", String(dimensions.height));
      }
      const response = await fetch("/api/templates", { method: "POST", body: form });
      const data = await response.json() as { template?: ExternalTemplate; error?: string };
      if (!response.ok || !data.template) throw new Error(data.error || "Import impossible");
      onTemplateImported(data.template);
      chooseTemplate(data.template);
      notify(`Template « ${data.template.name} » importé et prêt à modifier.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Le template n’a pas pu être importé.");
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div className="view-stack fade-in">
      <section className="intro compact-intro">
        <div><span className="eyebrow">NOCTYS CONTENT SYSTEM — 01</span><h1>FORMAT DE<br/><em>COMBAT.</em></h1></div>
        <p>Créez des visuels cohérents, calibrés pour chaque réseau. Toute modification démarre une création sauvegardée.</p>
      </section>

      <section className={`template-import ${dragging ? "is-dragging" : ""}`} onDragOver={(event)=>{event.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={(event)=>{event.preventDefault();setDragging(false);void importFile(event.dataTransfer.files[0])}}>
        <input ref={fileInput} className="template-file-input" type="file" accept=".json,application/json,image/png,image/jpeg,image/webp" onChange={(event)=>void importFile(event.target.files?.[0])}/>
        <div className="import-icon"><UploadCloud size={21}/></div>
        <div className="import-copy"><span className="eyebrow">IMPORT DIRECT</span><strong>Ajoutez votre propre template</strong><small>PNG, JPG, WebP jusqu’à 8 Mo ou manifeste NOCTYS JSON jusqu’à 1 Mo.</small></div>
        <div className="import-security"><ShieldCheck size={14}/><span>Fichiers validés<br/>stockage privé</span></div>
        <button className="secondary-button import-button" onClick={()=>fileInput.current?.click()} disabled={importing}>{importing?<LoaderCircle className="spin" size={14}/>:<UploadCloud size={14}/>} {importing?"Import…":"Choisir un fichier"}</button>
      </section>

      {templates.length > 0 && <section className="external-templates">
        <div className="external-heading"><div><span className="eyebrow">BIBLIOTHÈQUE EXTERNE</span><h2>Templates importés</h2></div><span>{templates.length} disponible{templates.length>1?"s":""}</span></div>
        <div className="external-template-grid">{templates.map((template)=><button key={template.id} className={`external-template-card ${activeTemplate?.id===template.id?"active":""}`} onClick={()=>chooseTemplate(template)}>
          <div className="external-thumb">{template.assetUrl?<img src={template.assetUrl} alt=""/>:<FileJson size={24}/>}<span>{NETWORKS[template.network].short}</span></div>
          <div><strong>{template.name}</strong><small>{template.width} × {template.height} · {template.sourceType.toUpperCase()}</small></div><ArrowRight size={14}/>
        </button>)}</div>
      </section>}

      <section className="format-grid" aria-label="Formats sociaux">
        {(Object.keys(NETWORKS) as Network[]).map((key) => {
          const format = NETWORKS[key];
          return (
            <button className={`format-card ${network === key && !activeTemplate ? "is-active" : ""}`} key={key} onClick={() => edit(() => { setNetwork(key); setActiveTemplate(undefined); setDraftId(undefined); })}>
              <span className="format-mark">{format.short}</span>
              <span className="format-copy"><strong>{format.label}</strong><small>{format.format}</small></span>
              <span className="format-size">{format.size}</span><span className="format-arrow">↗</span>
            </button>
          );
        })}
      </section>

      <section className="editor-preview">
        <div className="editor-heading">
          <div><span className="eyebrow">APERÇU EN DIRECT</span><h2>Match Announcement</h2></div>
          <div className="save-state">{saving ? <><LoaderCircle className="spin" size={13}/> Sauvegarde…</> : draftId ? <><Check size={13}/> Enregistré dans Mes créations</> : "Modifiez pour commencer"}</div>
        </div>
        <div className="stage">
          <div className={`poster poster-${network} ${activeTemplate ? "poster-imported" : ""}`} style={activeTemplate?.config.accent ? { borderColor: activeTemplate.config.accent } : undefined}>
            {activeTemplate?.assetUrl && <img className="imported-template-art" src={activeTemplate.assetUrl} alt={`Fond du template ${activeTemplate.name}`}/>}<div className="poster-grid" /><span className="poster-kicker">{activeTemplate ? "TEMPLATE IMPORTÉ · NOCTYS" : "MATCH OFFICIEL · CS2"}</span>
            {!activeTemplate?.assetUrl && <img src="/noctys-logo.webp" alt="Logo NOCTYS sur le template" />}
            <div className="poster-title"><small>NOCTYS</small><strong style={activeTemplate?.config.accent ? { color: activeTemplate.config.accent } : undefined}>VS</strong><small>{opponent.split(" ")[0]}</small></div>
            <div className="poster-meta"><span>18.08.26</span><b>21:00 CET</b><span>BO3</span></div>
          </div>
          <aside className="quick-panel">
            <span className="eyebrow">PARAMÈTRES RAPIDES</span>
            <label>Titre<input value={title} onChange={(event) => edit(() => setTitle(event.target.value))} /></label>
            <label>Adversaire<input value={opponent} onChange={(event) => edit(() => setOpponent(event.target.value))} /></label>
            <div className="color-label">Couleur d’accent<span className="swatches"><button className="purple" aria-label="Violet NOCTYS"/><button className="silver" aria-label="Argent lunaire"/><button className="obsidian" aria-label="Noir obsidienne"/></span></div>
            <div className="brand-rule"><Layers3 size={15}/><div><strong>{activeTemplate?"TEMPLATE EXTERNE CONTRÔLÉ":"CHARTE VERROUILLÉE"}</strong><small>{activeTemplate?`${activeTemplate.fileName} · ${activeTemplate.width} × ${activeTemplate.height}`:"70% obsidienne · 15% graphite · 10% violet · 5% argent."}</small></div></div>
          </aside>
        </div>
      </section>
    </div>
  );
}

export function EditorView({ onCreated, notify }: StudioProps) {
  const [network, setNetwork] = useState<Network>("x");
  const [tone, setTone] = useState("Compétitif");
  const [text, setText] = useState("La nuit tombe sur le serveur. NOCTYS affronte ORION ce mardi à 21h pour un BO3 décisif.\n\nPrêts à entrer dans l’ombre ? 🌙\n\n#NOCTYS #CS2 #Esport");
  const [saving, setSaving] = useState(false);
  const limit = network === "x" ? 280 : network === "instagram" ? 2200 : 5000;

  const save = async () => {
    setSaving(true);
    try {
      const creation = await saveCreation({ title: "Publication Match Night", network, kind: "texte", status: "debute", publishAt: null, template: "social-copy", body: text });
      onCreated(creation); notify("Texte ajouté à Mes créations.");
    } catch { notify("Impossible d’enregistrer ce texte."); }
    finally { setSaving(false); }
  };

  return (
    <div className="view-stack fade-in">
      <section className="section-heading"><div><span className="eyebrow">ÉDITEUR SOCIAL — 02</span><h1>ÉCRIRE AVEC<br/><em>IMPACT.</em></h1></div><p>Un espace de rédaction pensé pour respecter les codes de chaque réseau sans diluer la voix NOCTYS.</p></section>
      <NetworkSelector value={network} onChange={setNetwork}/>
      <section className="copy-editor">
        <div className="writing-pane">
          <div className="pane-bar"><span>BROUILLON · MATCH NIGHT</span><div className="tone-switch">{["Premium","Compétitif","Mystérieux"].map((item)=><button key={item} className={tone===item?"active":""} onClick={()=>setTone(item)}>{item}</button>)}</div></div>
          <textarea value={text} onChange={(event)=>setText(event.target.value)} aria-label="Texte de la publication"/>
          <div className="writing-foot"><span className={text.length > limit ? "over" : ""}>{text.length} / {limit}</span><button className="primary" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="spin" size={14}/> : <Save size={14}/>} Enregistrer</button></div>
        </div>
        <div className="social-preview">
          <div className="social-head"><img src="/noctys-logo.webp" alt=""/><div><strong>TEAM NOCTYS</strong><span>@teamnoctys · maintenant</span></div></div>
          <p>{text}</p><div className="preview-media"><img src="/noctys-logo.webp" alt="Visuel de publication NOCTYS"/><span>MATCH NIGHT</span></div>
          <div className="social-actions"><span>♡ 128</span><span>↗ 34</span><span>◯ 12</span></div>
        </div>
      </section>
    </div>
  );
}

type GeneratorMode = "logo" | "image" | "text";
type GeneratorProvider = "chatgpt" | "gemini";

interface IntegrationStatus {
  chatgpt: { configured: boolean; textModel: string; imageModel: string };
  gemini: { configured: boolean; textModel: string; imageModel: string };
}

const generatorCopy: Record<GeneratorMode, { eyebrow: string; heading: string; accent: string; placeholder: string; chips: string[] }> = {
  logo: { eyebrow: "LABORATOIRE DE MARQUE — 03", heading: "FORGER UNE", accent: "IDENTITÉ.", placeholder: "Ex. Monogramme N minimal, lignes tranchées, lisible à 32 px…", chips: ["Monogramme N", "Mascotte flat", "Badge tournoi"] },
  image: { eyebrow: "IMAGERIE ASSISTÉE — 04", heading: "CRÉER LA", accent: "SCÈNE.", placeholder: "Ex. Arène CS2 nocturne, écran LED violet, fumée graphite…", chips: ["Match night", "Victoire", "Roster reveal"] },
  text: { eyebrow: "COPYWRITING ASSISTÉ — 05", heading: "TROUVER LES", accent: "MOTS JUSTES.", placeholder: "Ex. Annonce d’un match BO3 contre ORION mardi à 21h…", chips: ["Annonce de match", "Résultat", "Recrutement"] },
};

export function GeneratorView({ mode, onCreated, notify }: StudioProps & { mode: GeneratorMode }) {
  const copy = generatorCopy[mode];
  const [provider, setProvider] = useState<GeneratorProvider>("chatgpt");
  const [prompt, setPrompt] = useState(copy.placeholder.replace("Ex. ", ""));
  const [result, setResult] = useState<string>();
  const [assetUrl, setAssetUrl] = useState<string>();
  const [source, setSource] = useState<"api"|"demo">("demo");
  const [model, setModel] = useState<string>();
  const [integrations, setIntegrations] = useState<IntegrationStatus>();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/integrations", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<IntegrationStatus> : undefined)
      .then((data) => { if (active && data) setIntegrations(data); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const generate = async () => {
    setLoading(true); setResult(undefined); setAssetUrl(undefined);
    try {
      const response = await fetch("/api/generate", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ provider, mode, prompt }) });
      const data = await response.json() as { result?: string; assetUrl?: string; source?: "api"|"demo"; model?: string; error?: string };
      if (!response.ok || !data.result) throw new Error(data.error);
      setResult(data.result); setAssetUrl(data.assetUrl); setSource(data.source || "demo"); setModel(data.model);
      if (data.source === "demo") notify(`Ajoutez une clé ${provider === "chatgpt" ? "OpenAI" : "Gemini"} côté serveur pour activer la génération réelle.`);
    } catch (error) { notify(error instanceof Error && error.message ? error.message : "Le générateur n’est pas disponible pour le moment."); }
    finally { setLoading(false); }
  };

  const save = async () => {
    if (!result) return;
    try {
      const body = assetUrl ? JSON.stringify({ result, assetUrl, provider, model }) : result;
      const creation = await saveCreation({ title: `${mode === "text" ? "Texte" : mode === "logo" ? "Logo" : "Image"} généré`, network:"instagram", kind:mode === "text"?"texte":"image", status:"debute", publishAt:null, template:`ai-${mode}`, body });
      onCreated(creation); notify("Concept ajouté à Mes créations.");
    } catch { notify("Sauvegarde impossible."); }
  };

  return (
    <div className="view-stack fade-in">
      <section className="section-heading"><div><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.heading}<br/><em>{copy.accent}</em></h1></div><p>Décrivez votre intention. Le générateur applique la palette, le ton et les interdits de la charte NOCTYS.</p></section>
      <section className="generator-layout">
        <div className="prompt-console">
          <div className="provider-row"><span>MODÈLE</span><div><button className={provider==="chatgpt"?"active":""} onClick={()=>setProvider("chatgpt")}><Sparkles size={13}/> ChatGPT {integrations?.chatgpt.configured&&<i className="provider-live" aria-label="Connecté"/>}</button><button className={provider==="gemini"?"active":""} onClick={()=>setProvider("gemini")}><WandSparkles size={13}/> Gemini {integrations?.gemini.configured&&<i className="provider-live" aria-label="Connecté"/>}</button></div></div>
          <label>VOTRE BRIEF<textarea value={prompt} onChange={(event)=>setPrompt(event.target.value)} placeholder={copy.placeholder}/></label>
          <div className="prompt-chips">{copy.chips.map((chip)=><button key={chip} onClick={()=>setPrompt(chip)}>{chip}</button>)}</div>
          <div className="console-foot"><span><span className={integrations?.[provider].configured?"live-dot":"demo-dot"}/> {integrations?.[provider].configured?`Connecté · ${mode === "text" ? integrations[provider].textModel : integrations[provider].imageModel}`:"Mode démo · clé serveur requise"}</span><button className="primary generate-button" onClick={generate} disabled={loading||prompt.trim().length<4}>{loading?<LoaderCircle className="spin" size={15}/>:<WandSparkles size={15}/>} Générer <ArrowRight size={14}/></button></div>
        </div>
        <div className={`generation-result ${!result ? "empty" : ""}`}>
          {!result && !loading && <div><div className="result-orb">{mode === "text" ? <PenLineIcon/> : mode === "image" ? <ImageIcon/> : <Layers3/>}</div><strong>VOTRE CRÉATION APPARAÎTRA ICI</strong><span>La direction artistique NOCTYS est appliquée automatiquement.</span></div>}
          {loading && <div><LoaderCircle className="spin result-loader"/><strong>CONCEPTION EN COURS</strong><span>Analyse du brief et application de la charte…</span></div>}
          {result && <div className="result-content">
            {mode !== "text" && <div className={`concept-visual concept-${mode} ${assetUrl?"generated-art":""}`}><div className="concept-lines"/><img src={assetUrl || "/noctys-logo.webp"} alt={assetUrl?`Création ${mode} générée`:"Aperçu du concept NOCTYS"}/><span>{mode === "logo" ? "N / 01" : "NOCTYS // VISUAL"}</span></div>}
            <span className="eyebrow">PROPOSITION · {provider.toUpperCase()} · {source === "api" ? "LIVE" : "DÉMO"}</span><p>{result}</p>
            <div className="result-actions"><button onClick={()=>{navigator.clipboard.writeText(result);setCopied(true);window.setTimeout(()=>setCopied(false),1200)}}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?"Copié":"Copier"}</button>{assetUrl&&<a href={assetUrl} download={`noctys-${mode}.png`}><Download size={14}/> Télécharger</a>}<button onClick={save}><Save size={14}/> Mes créations</button></div>
          </div>}
        </div>
      </section>
    </div>
  );
}

function PenLineIcon(){ return <Send size={23}/>; }

function imageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { resolve({ width: image.naturalWidth, height: image.naturalHeight }); URL.revokeObjectURL(url); };
    image.onerror = () => { reject(new Error("L’image est illisible.")); URL.revokeObjectURL(url); };
    image.src = url;
  });
}
