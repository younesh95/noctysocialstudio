import { readCreationPayload, renderCreationCanvas } from "./canvas";
import type { Creation } from "./types";

export async function exportCreationsPdf(creations: Creation[]) {
  const pages: Array<{width:number;height:number;jpeg:Uint8Array}> = [];
  for (const creation of creations) {
    const canvas=await renderCreationCanvas(creation);
    const blob=await canvasBlob(canvas,"image/jpeg",.9);
    pages.push({width:canvas.width,height:canvas.height,jpeg:new Uint8Array(await blob.arrayBuffer())});
  }
  downloadBlob(buildPdf(pages),`noctys-publications-${dateStamp()}.pdf`);
}

export async function exportCreationsZip(creations: Creation[]) {
  const files:Array<{name:string;data:Uint8Array}> = [];
  for (const [index,creation] of creations.entries()) {
    const base=`${String(index+1).padStart(2,"0")}-${safeName(creation.title)}`;
    const canvas=await renderCreationCanvas(creation);
    const image=await canvasBlob(canvas,"image/png");
    files.push({name:`${base}.png`,data:new Uint8Array(await image.arrayBuffer())});
    if(creation.kind==="texte"){const payload=readCreationPayload(creation.body);files.push({name:`${base}.txt`,data:new TextEncoder().encode(payload.result||creation.body)})}
  }
  files.push({name:"manifest-noctys.json",data:new TextEncoder().encode(JSON.stringify({exportedAt:new Date().toISOString(),count:creations.length,creations:creations.map(({id,title,network,kind,publishAt})=>({id,title,network,kind,publishAt}))},null,2))});
  downloadBlob(buildZip(files),`noctys-publications-${dateStamp()}.zip`);
}

function buildPdf(pages:Array<{width:number;height:number;jpeg:Uint8Array}>) {
  const objects:Uint8Array[]=[];
  const pageRefs=pages.map((_,index)=>3+index*3);
  objects.push(bytes("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.push(bytes(`<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs.map((ref)=>`${ref} 0 R`).join(" ")}] >>`));
  pages.forEach((page,index)=>{
    const pageRef=3+index*3,imageRef=pageRef+1,contentRef=pageRef+2;
    const scale=Math.min(1,1440/Math.max(page.width,page.height));const width=Math.round(page.width*scale),height=Math.round(page.height*scale);
    objects.push(bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im${index} ${imageRef} 0 R >> >> /Contents ${contentRef} 0 R >>`));
    objects.push(concat([bytes(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`),page.jpeg,bytes("\nendstream")]));
    const commands=`q\n${width} 0 0 ${height} 0 0 cm\n/Im${index} Do\nQ`;
    objects.push(bytes(`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`));
  });
  const chunks:Uint8Array[]=[bytes("%PDF-1.4\n%NOCTYS\n")];const offsets=[0];let position=chunks[0].length;
  objects.forEach((object,index)=>{offsets.push(position);const chunk=concat([bytes(`${index+1} 0 obj\n`),object,bytes("\nendobj\n")]);chunks.push(chunk);position+=chunk.length});
  const xref=position;let table=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let index=1;index<=objects.length;index++)table+=`${String(offsets[index]).padStart(10,"0")} 00000 n \n`;
  chunks.push(bytes(`${table}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return new Blob(chunks,{type:"application/pdf"});
}

function buildZip(files:Array<{name:string;data:Uint8Array}>) {
  const local:Uint8Array[]=[];const central:Uint8Array[]=[];let offset=0;const {time,date}=dosDate(new Date());
  for(const file of files){const name=bytes(file.name);const crc=crc32(file.data);const header=new Uint8Array(30);const view=new DataView(header.buffer);view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(10,time,true);view.setUint16(12,date,true);view.setUint32(14,crc,true);view.setUint32(18,file.data.length,true);view.setUint32(22,file.data.length,true);view.setUint16(26,name.length,true);local.push(header,name,file.data);
    const record=new Uint8Array(46);const centralView=new DataView(record.buffer);centralView.setUint32(0,0x02014b50,true);centralView.setUint16(4,20,true);centralView.setUint16(6,20,true);centralView.setUint16(12,time,true);centralView.setUint16(14,date,true);centralView.setUint32(16,crc,true);centralView.setUint32(20,file.data.length,true);centralView.setUint32(24,file.data.length,true);centralView.setUint16(28,name.length,true);centralView.setUint32(42,offset,true);central.push(record,name);offset+=header.length+name.length+file.data.length}
  const centralSize=central.reduce((total,item)=>total+item.length,0);const end=new Uint8Array(22);const endView=new DataView(end.buffer);endView.setUint32(0,0x06054b50,true);endView.setUint16(8,files.length,true);endView.setUint16(10,files.length,true);endView.setUint32(12,centralSize,true);endView.setUint32(16,offset,true);
  return new Blob([...local,...central,end],{type:"application/zip"});
}

function crc32(data:Uint8Array){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return(crc^0xffffffff)>>>0}
function dosDate(value:Date){return{time:(value.getHours()<<11)|(value.getMinutes()<<5)|(value.getSeconds()>>1),date:((value.getFullYear()-1980)<<9)|((value.getMonth()+1)<<5)|value.getDate()}}
function canvasBlob(canvas:HTMLCanvasElement,type:string,quality?:number){return new Promise<Blob>((resolve,reject)=>canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error("Export impossible")),type,quality))}
function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=name;anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}
function safeName(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"creation"}
function dateStamp(){return new Date().toISOString().slice(0,10)}
function bytes(value:string){return new TextEncoder().encode(value)}
function concat(items:Uint8Array[]){const result=new Uint8Array(items.reduce((total,item)=>total+item.length,0));let offset=0;for(const item of items){result.set(item,offset);offset+=item.length}return result}
