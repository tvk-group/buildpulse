import { buildPulsePublicUrl } from "@/lib/buildpulse/public-origin";
export function GET(){
 const body=["User-agent: *","Allow: /","Disallow: /account","Disallow: /admin","Disallow: /advertiser","Disallow: /auth","Disallow: /contribute","Disallow: /preferences","Disallow: /review","Disallow: /workforce","Disallow: /api/","",`Sitemap: ${buildPulsePublicUrl("sitemap.xml")}`,`Host: ${buildPulsePublicUrl().replace(/^https?:\/\//,"")}`,""].join("\n");
 return new Response(body,{headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"public, max-age=3600"}});
}
