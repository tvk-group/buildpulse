import {NextRequest,NextResponse} from "next/server";
export const dynamic="force-dynamic";
function clean(value:string|null,max=80){return (value||"").trim().slice(0,max)}
function countryLanguage(country:string){const map:Record<string,string>={DE:"de",TR:"tr",FR:"fr",ES:"es",IT:"it",PT:"pt",NL:"nl",PL:"pl",RO:"ro",GR:"el",CN:"zh",JP:"ja",KR:"ko",IN:"hi"};return map[country]||"en"}
export async function GET(req:NextRequest){
 const country=clean(req.headers.get("x-vercel-ip-country"),2).toUpperCase(),region=clean(req.headers.get("x-vercel-ip-country-region")),city=clean(req.headers.get("x-vercel-ip-city")),timezone=clean(req.headers.get("x-vercel-ip-timezone")),acceptLanguage=clean(req.headers.get("accept-language"),160);
 const localeHint=(acceptLanguage.split(",")[0]||"").split("-")[0].toLowerCase()||countryLanguage(country);
 return NextResponse.json({country,region,city,timezone,localeHint,source:country?"request-geo":"browser-fallback",precision:"coarse",ipStored:false},{headers:{"cache-control":"private, no-store","vary":"Accept-Language"}});
}
