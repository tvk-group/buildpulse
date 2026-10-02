import { buildPulsePublicUrl } from "@/lib/buildpulse/public-origin";
export function GET(){
 const body=["User-agent: *","Allow: /","Disallow: /advertiser","Disallow: /preferences","Disallow: /review","Disallow: /api/","",`Sitemap: ${buildPulsePublicUrl("sitemap.xml")}`,`Host: ${buildPulsePublicUrl().replace(/^https?:\/\//,"")}`,""].join("\n");
 return new Response(body,{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"public, max-age=3600"}});
}
