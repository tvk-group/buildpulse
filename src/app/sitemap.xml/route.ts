import {buildPulsePublicUrl} from "@/lib/buildpulse/public-origin";
import {listPublicEditions} from "@/lib/buildpulse/public-content";
const esc=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
export async function GET(){
 const data=await listPublicEditions({limit:1000});
 const base=buildPulsePublicUrl();
 const fixed=[base,`${base}/archive`,`${base}/about`,`${base}/ai-editorial-system`,`${base}/methodology`,`${base}/advertise`,`${base}/privacy`,`${base}/terms`,`${base}/disclosure`];
 const urls=[...fixed.map(loc=>`<url><loc>${esc(loc)}</loc></url>`),...data.map(e=>`<url><loc>${esc(`${base}/archive/${encodeURIComponent(e.slug)}`)}</loc>${e.updated_at||e.published_at?`<lastmod>${new Date(e.updated_at||e.published_at!).toISOString()}</lastmod>`:""}</url>`)].join("");
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,{headers:{"content-type":"application/xml; charset=utf-8","cache-control":"public, max-age=300, s-maxage=300"}});
}
