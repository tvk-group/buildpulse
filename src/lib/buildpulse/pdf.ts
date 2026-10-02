import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET="buildpulse-editions";

function plainText(html:string){
  return html
    .replace(/<\s*br\s*\/?>/gi,"\n")
    .replace(/<\/(p|div|li|h[1-6]|section|article)>/gi,"\n")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">")
    .replace(/&quot;/gi,'"').replace(/&#39;/gi,"'")
    .replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
}
function wrap(text:string,width=86){
  const out:string[]=[];
  for(const paragraph of text.split(/\n/)){
    const words=paragraph.trim().split(/\s+/).filter(Boolean);
    if(!words.length){out.push("");continue}
    let line="";
    for(const word of words){
      if(!line){line=word;continue}
      if((line+" "+word).length<=width)line+=" "+word;
      else{out.push(line);line=word}
    }
    if(line)out.push(line);
  }
  return out;
}
function pdfEscape(value:string){return value.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)")}
export function renderBuildPulsePdf(input:{subject:string;editionType:string;slug:string;revision:number;html:string;publishedAt?:string|null}){
  const sourceText=plainText(input.html);
  const header=[input.subject.toUpperCase(),`BuildPulse ${input.editionType} | ${input.slug} | revision ${input.revision}`,input.publishedAt?`Published: ${input.publishedAt}`:"",""].filter(Boolean);
  const lines=[...header,...wrap(sourceText)];
  if(lines.some(line=>Array.from(line).some(ch=>(ch.codePointAt(0)??0)>126)))throw new Error("BuildPulse archival PDF requires an embedded Unicode font for this revision");
  const pageLines=50;
  const pages:Array<string[]>=[];for(let i=0;i<lines.length;i+=pageLines)pages.push(lines.slice(i,i+pageLines));
  if(!pages.length)pages.push(["BuildPulse"]);
  const objects:string[]=[];
  objects[1]="<< /Type /Catalog /Pages 2 0 R >>";
  const kids=pages.map((_,i)=>`${4+i*2} 0 R`).join(" ");
  objects[2]=`<< /Type /Pages /Count ${pages.length} /Kids [ ${kids} ] >>`;
  objects[3]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  pages.forEach((page,i)=>{
    const pageId=4+i*2,contentId=pageId+1;
    const stream=["BT","/F1 10 Tf","50 790 Td","14 TL",...page.map(line=>`(${pdfEscape(line)}) Tj T*`),"ET"].join("\n");
    objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId]=`<< /Length ${Buffer.byteLength(stream,"ascii")} >>\nstream\n${stream}\nendstream`;
  });
  let pdf="%PDF-1.4\n%BuildPulse\n";const offsets:number[]=[0];
  for(let i=1;i<objects.length;i++){offsets[i]=Buffer.byteLength(pdf,"ascii");pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`}
  const xref=Buffer.byteLength(pdf,"ascii");pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
  pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf,"ascii");
}

export async function ensureBuildPulseEditionPdf(editionId:string){
  const admin=createAdminClient();if(!admin)throw new Error("Supabase admin unavailable");
  const {data:e,error}=await admin.from("buildpulse_editions").select("id,slug,subject,edition_type,revision_number,founder_review_status,founder_approved_revision,body_html,pdf_path,pdf_sha256,pdf_revision,published_at,sent_at").eq("id",editionId).single();
  if(error||!e)throw new Error("Edition not found");
  if(e.founder_review_status!=="approved"||e.founder_approved_revision!==e.revision_number)throw new Error("Current edition revision is not founder-approved");
  if(!e.body_html)throw new Error("Edition body is missing");
  if(e.pdf_path&&e.pdf_revision===e.revision_number){if(!e.pdf_sha256)throw new Error("Existing edition PDF is missing its checksum");return {path:e.pdf_path,sha256:e.pdf_sha256,idempotent:true};}

  const bytes=renderBuildPulsePdf({subject:e.subject,editionType:e.edition_type,slug:e.slug,revision:e.revision_number,html:e.body_html,publishedAt:e.published_at??e.sent_at});
  const sha256=createHash("sha256").update(bytes).digest("hex");
  const path=`${e.slug}/r${e.revision_number}-${sha256.slice(0,16)}.pdf`;
  const {error:uploadError}=await admin.storage.from(BUCKET).upload(path,bytes,{contentType:"application/pdf",upsert:false,cacheControl:"31536000"});
  if(uploadError)throw new Error("Edition PDF storage failed");
  const {data:publicUrl}=admin.storage.from(BUCKET).getPublicUrl(path);
  const now=new Date().toISOString();
  const {error:updateError}=await admin.from("buildpulse_editions").update({pdf_path:path,pdf_sha256:sha256,pdf_revision:e.revision_number,pdf_generated_at:now,pdf_byte_size:bytes.length,pdf_content_type:"application/pdf",pdf_storage_bucket:BUCKET,updated_at:now}).eq("id",editionId).eq("revision_number",e.revision_number).eq("founder_approved_revision",e.revision_number);
  if(updateError)throw new Error("Edition PDF metadata persistence failed");
  return {path,sha256,idempotent:false};
}
