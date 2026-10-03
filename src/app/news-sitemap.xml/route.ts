import {listTechnologyArticles} from "@/lib/buildpulse/technology-content";
import {buildPulsePublicUrl} from "@/lib/buildpulse/public-origin";
const esc=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
export async function GET(){
 const rows=await listTechnologyArticles(100);
 const cutoff=Date.now()-48*60*60*1000;
 const urls=rows.filter((x:any)=>x.published_at&&Date.parse(x.published_at)>=cutoff).map((x:any)=>`<url><loc>${esc(buildPulsePublicUrl(`technology/${encodeURIComponent(x.slug)}`))}</loc><news:news><news:publication><news:name>BuildPulse</news:name><news:language>en</news:language></news:publication><news:publication_date>${new Date(x.published_at).toISOString()}</news:publication_date><news:title>${esc(x.title)}</news:title></news:news></url>`).join("");
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls}</urlset>`,{headers:{"content-type":"application/xml; charset=utf-8","cache-control":"public, s-maxage=300"}});
}