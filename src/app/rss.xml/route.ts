import {listVerifiedStories} from "@/lib/buildpulse/public-content";
const esc=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const isHttpUrl=(value:string)=>value.startsWith("https://")||value.startsWith("http://");
export async function GET(){
 const rows=await listVerifiedStories({limit:50,sinceHours:168});
 const items=rows.filter(x=>x.publicationState!=="withheld"&&isHttpUrl(x.canonicalSourceUrl)).map(x=>`<item><title>${esc(x.title)}</title><link>${esc(x.canonicalSourceUrl)}</link><guid isPermaLink="true">${esc(x.canonicalSourceUrl)}</guid><pubDate>${new Date(x.publishedAt??x.verifiedAt).toUTCString()}</pubDate><description>${esc(x.summary??"")}</description><source url="${esc(x.canonicalSourceUrl)}">${esc(x.sourceName)}</source></item>`).join("");
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>BuildPulse</title><link>https://buildpulse.news</link><description>Global Technology &amp; Digital Intelligence</description><language>en</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`,{headers:{"content-type":"application/rss+xml; charset=utf-8","cache-control":"public, s-maxage=300"}});
}