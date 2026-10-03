import {listTechnologyArticles} from "@/lib/buildpulse/technology-content";
import {buildPulsePublicUrl} from "@/lib/buildpulse/public-origin";
const esc=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
export async function GET(){
 const rows=await listTechnologyArticles(100);
 const cutoff=Date.now()-48*60*60*1000;
 const recent=rows.filter(row=>Boolean(row.published_at)&&Date.parse(row.published_at as string)>=cutoff);
 const urls=recent.map(row=>{
  const loc=buildPulsePublicUrl("technology/"+encodeURIComponent(row.slug));
  const published=new Date(row.published_at as string).toISOString();
  return "<url><loc>"+esc(loc)+"</loc><news:news><news:publication><news:name>BuildPulse</news:name><news:language>en</news:language></news:publication><news:publication_date>"+published+"</news:publication_date><news:title>"+esc(row.title)+"</news:title></news:news></url>";
 }).join("");
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls}</urlset>`,{headers:{"content-type":"application/xml; charset=utf-8","cache-control":"public, s-maxage=300"}});
}