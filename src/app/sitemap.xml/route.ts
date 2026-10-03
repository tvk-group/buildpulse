import {buildPulsePublicUrl} from "@/lib/buildpulse/public-origin";
import {listPublicEditions} from "@/lib/buildpulse/public-content";
const esc=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
export async function GET(){
 const data=await listPublicEditions({limit:1000});
 const base=buildPulsePublicUrl();
 const paths=["","/archive","/markets","/markets/crypto","/markets/exchanges","/markets/indices-metals","/markets/macro","/world","/technology","/people","/sports","/arts","/arts/visual","/arts/music","/arts/museums","/arts/design","/arts/showcase","/arts/contribute","/marketplace","/marketplace/sell","/marketplace/safety","/connections","/methodology","/about","/ai-editorial-system","/advertise","/contribute","/contributor-terms","/privacy","/terms","/cookies","/disclosure","/status"];
 const fixed=paths.map(path=>base+path);
 const urls=[...fixed.map(loc=>`<url><loc>${esc(loc)}</loc></url>`),...data.map(e=>`<url><loc>${esc(`${base}/archive/${encodeURIComponent(e.slug)}`)}</loc>${e.updated_at||e.published_at?`<lastmod>${new Date(e.updated_at||e.published_at!).toISOString()}</lastmod>`:""}</url>`)].join("");
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,{headers:{"content-type":"application/xml; charset=utf-8","cache-control":"public, max-age=300, s-maxage=300"}});
}