import { readCreationPayload } from "./canvas";
import { SOCIAL_FORMATS } from "./noctys";
import type { Creation } from "./types";

export type PreflightLevel="pass"|"warning"|"error";
export interface PreflightCheck{key:string;label:string;detail:string;level:PreflightLevel}

export function preflightCreation(creation:Creation):PreflightCheck[]{
  const payload=readCreationPayload(creation.body),document=payload.canvas;
  if(creation.kind==="texte"){
    const length=(payload.result||creation.body).trim().length;
    return [
      {key:"copy",label:"Texte présent",detail:length?`${length} caractères prêts`:`Ajoutez le texte de la publication`,level:length?"pass":"error"},
      {key:"approval",label:"Validation éditoriale",detail:creation.approvalStatus==="approved"||creation.approvalStatus==="scheduled"||creation.approvalStatus==="published"?"Contenu approuvé":"Demandez une validation avant planification",level:creation.approvalStatus==="draft"?"warning":"pass"},
    ];
  }
  if(!document)return[{key:"canvas",label:"Canvas exploitable",detail:"Ouvrez la création dans Sketchup pour finaliser sa composition",level:"warning"}];
  const formats=SOCIAL_FORMATS[creation.network],formatOk=formats.some((item)=>item.width===document.width&&item.height===document.height);
  const logo=document.elements.some((item)=>item.type==="image"&&(item.name.toLowerCase().includes("logo")||item.src?.includes("noctys-logo")));
  const overflow=document.elements.some((item)=>item.x<0||item.y<0||item.x+item.width>document.width||item.y+item.height>document.height);
  const text=document.elements.filter((item)=>item.type==="text"&&item.text?.trim()).length;
  return [
    {key:"format",label:"Format réseau",detail:formatOk?`${document.width} × ${document.height} conforme`:`Format personnalisé ${document.width} × ${document.height}`,level:formatOk?"pass":"warning"},
    {key:"logo",label:"Logo NOCTYS",detail:logo?"Logo officiel détecté":"Ajoutez le logo du Brand Kit",level:logo?"pass":"error"},
    {key:"bounds",label:"Zone de sécurité",detail:overflow?"Un élément dépasse du canvas":"Tous les éléments sont dans le canvas",level:overflow?"error":"pass"},
    {key:"text",label:"Contenu éditorial",detail:text?`${text} bloc${text>1?"s":""} texte détecté${text>1?"s":""}`:"Ajoutez un titre ou une légende",level:text?"pass":"warning"},
  ];
}

export function preflightScore(creation:Creation){const checks=preflightCreation(creation);return Math.round(checks.filter((item)=>item.level==="pass").length/checks.length*100)}
