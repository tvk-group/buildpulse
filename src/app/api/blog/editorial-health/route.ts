import {NextResponse} from "next/server";
import {buildPulseBloggers} from "@/lib/buildpulse/editorial-bloggers";
import {editorialArticles} from "@/lib/buildpulse/editorial-articles";
import {existsSync,statSync} from "node:fs";
import {join} from "node:path";
export const runtime="nodejs";
export const dynamic="force-dynamic";
/** Public non-sensitive health report for published editorial assets. */
export function GET(){
 const portraits=buildPulseBloggers.map(author=>{
 const path=join(process.cwd(),"public","blog","contributors",author.id+".webp");
 const exists=existsSync(path);
 return {author:author.id,photoReady:exists&&statSync(path).size>1024,articleCount:editorialArticles.filter(a=>a.authorId===author.id).length};
 });
 return NextResponse.json({ok:portraits.every(p=>p.photoReady),expectedPortraits:10,readyPortraits:portraits.filter(p=>p.photoReady).length,publishedEditorialArticles:editorialArticles.length,portraits},{status:portraits.every(p=>p.photoReady)?200:503,headers:{"Cache-Control":"no-store"}});
}
