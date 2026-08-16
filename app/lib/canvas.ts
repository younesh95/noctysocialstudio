import { SOCIAL_FORMATS } from "./noctys";
import type { CanvasDocument, CanvasElement, Creation, CreationPayload, Network, SocialFormat } from "./types";

const PURPLE = "#9C58C2";

export function createCanvasDocument(format: SocialFormat, preset: "match"|"victory"|"roster"|"blank", title = "MATCH NIGHT", subtitle = "NOCTYS · CS2"): CanvasDocument {
  const { width, height } = format;
  if (preset === "blank") return { version:1,width,height,background:"#08070A",formatId:format.id,elements:[] };
  const portrait = height > width;
  const headline = preset === "victory" ? "VICTORY" : preset === "roster" ? "ROSTER 2026" : title;
  return {
    version:1,width,height,background:"#08070A",formatId:format.id,
    elements:[
      element({ type:"shape",name:"Halo violet",x:width*.08,y:height*.08,width:width*.84,height:height*.84,fill:"#24132D",radius:Math.min(width,height)*.08,opacity:.92 }),
      element({ type:"shape",name:"Ligne d’accent",x:width*.08,y:height*.12,width:Math.max(12,width*.014),height:height*.7,fill:PURPLE,radius:8 }),
      element({ type:"image",name:"Logo NOCTYS",x:portrait?width*.25:width*.08,y:portrait?height*.17:height*.22,width:portrait?width*.5:height*.48,height:portrait?width*.5:height*.48,src:"/noctys-logo.webp" }),
      element({ type:"text",name:"Titre",x:width*.1,y:portrait?height*.58:height*.18,width:width*.8,height:height*.18,text:headline,fill:"#F4F1F5",fontSize:Math.round(Math.min(width,height)*(portrait?.095:.105)),fontWeight:700,align:portrait?"center":"right" }),
      element({ type:"text",name:"Sous-titre",x:width*.1,y:portrait?height*.72:height*.72,width:width*.8,height:height*.08,text:subtitle,fill:PURPLE,fontSize:Math.round(Math.min(width,height)*.033),fontWeight:700,align:portrait?"center":"right" }),
      element({ type:"text",name:"Signature",x:width*.1,y:height*.88,width:width*.8,height:height*.05,text:"TEAM NOCTYS  //  ENTER THE NIGHT",fill:"#A6A1A9",fontSize:Math.round(Math.min(width,height)*.018),fontWeight:600,align:"center" }),
    ],
  };
}

export function customFormat(network: Network, width: number, height: number): SocialFormat {
  return { id:`${network}-custom-${width}x${height}`,label:"Format personnalisé",usage:"Dimensions libres",width,height,ratio:ratioLabel(width,height) };
}

export function defaultFormat(network: Network) { return SOCIAL_FORMATS[network][0]; }

export function documentFromCreation(creation?: Creation): CanvasDocument {
  if (!creation) return createCanvasDocument(defaultFormat("instagram"),"blank");
  const payload = readCreationPayload(creation.body);
  if (payload.canvas) return structuredClone(payload.canvas);
  const format = defaultFormat(creation.network);
  const document = createCanvasDocument(format, creation.kind === "texte" ? "blank" : "match", creation.title, payload.opponent || "NOCTYS · CS2");
  if (creation.kind === "texte") {
    document.elements.push(element({type:"text",name:"Publication",x:format.width*.1,y:format.height*.18,width:format.width*.8,height:format.height*.64,text:payload.result || creation.body,fill:"#F4F1F5",fontSize:48,fontWeight:600,align:"left"}));
  }
  if (payload.assetUrl) document.elements.unshift(element({type:"image",name:"Visuel source",x:0,y:0,width:format.width,height:format.height,src:payload.assetUrl,opacity:.72}));
  return document;
}

export function readCreationPayload(body: string): CreationPayload {
  try { return JSON.parse(body) as CreationPayload; } catch { return { result: body }; }
}

export async function drawCanvasDocument(canvas: HTMLCanvasElement, document: CanvasDocument, selectedId?: string) {
  canvas.width = document.width; canvas.height = document.height;
  const context = canvas.getContext("2d"); if (!context) return;
  context.fillStyle = document.background; context.fillRect(0,0,document.width,document.height);
  for (const item of document.elements) await drawElement(context,item);
  if (selectedId) {
    const selected = document.elements.find((item)=>item.id===selectedId);
    if (selected) { context.save();context.strokeStyle="#C77BE8";context.lineWidth=Math.max(2,document.width/500);context.setLineDash([12,8]);context.strokeRect(selected.x,selected.y,selected.width,selected.height);context.restore(); }
  }
}

export async function renderCreationCanvas(creation: Creation) {
  const document = documentFromCreation(creation);
  const canvas = window.document.createElement("canvas");
  await drawCanvasDocument(canvas,document);
  return canvas;
}

export function canvasBody(document: CanvasDocument, extra: CreationPayload = {}) { return JSON.stringify({ ...extra, canvas:document, formatId:document.formatId }); }

export function element(input: Partial<CanvasElement> & Pick<CanvasElement,"type"|"name">): CanvasElement {
  return { id:crypto.randomUUID(),x:80,y:80,width:320,height:120,rotation:0,opacity:1,...input };
}

export function ratioLabel(width:number,height:number) {
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a; const divisor=gcd(width,height);
  return `${Math.round(width/divisor)}:${Math.round(height/divisor)}`;
}

async function drawElement(context: CanvasRenderingContext2D, item: CanvasElement) {
  context.save(); context.globalAlpha=item.opacity; context.translate(item.x+item.width/2,item.y+item.height/2); context.rotate(item.rotation*Math.PI/180); context.translate(-item.width/2,-item.height/2);
  if (item.type === "shape") {
    context.fillStyle=item.fill||PURPLE; roundedRect(context,0,0,item.width,item.height,item.radius||0); context.fill();
  } else if (item.type === "image" && item.src) {
    try { const image=await loadImage(item.src); context.drawImage(image,0,0,item.width,item.height); } catch { context.fillStyle="#201823";context.fillRect(0,0,item.width,item.height); }
  } else if (item.type === "text") {
    const size=item.fontSize||42; context.fillStyle=item.fill||"#FFFFFF";context.font=`${item.fontWeight||600} ${size}px Arial, sans-serif`;context.textAlign=item.align||"left";context.textBaseline="top";
    const anchor=item.align==="center"?item.width/2:item.align==="right"?item.width:0; wrapText(context,item.text||"Texte",anchor,0,item.width,size*1.16,item.height);
  }
  context.restore();
}

function roundedRect(context:CanvasRenderingContext2D,x:number,y:number,width:number,height:number,radius:number){const r=Math.min(radius,width/2,height/2);context.beginPath();context.roundRect(x,y,width,height,r)}
function wrapText(context:CanvasRenderingContext2D,text:string,x:number,y:number,maxWidth:number,lineHeight:number,maxHeight:number){let line="",lineY=y;for(const word of text.split(/\s+/)){const test=line?`${line} ${word}`:word;if(context.measureText(test).width>maxWidth&&line){context.fillText(line,x,lineY);line=word;lineY+=lineHeight;if(lineY+lineHeight>maxHeight)break}else line=test}if(lineY+lineHeight<=maxHeight)context.fillText(line,x,lineY)}
function loadImage(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.crossOrigin="anonymous";image.onload=()=>resolve(image);image.onerror=reject;image.src=src})}
