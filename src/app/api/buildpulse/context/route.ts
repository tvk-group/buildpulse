import {NextRequest,NextResponse} from "next/server";
export const dynamic="force-dynamic";
function decodeHeader(value:string|null,max=80){let v=(value||"").trim();try{v=decodeURIComponent(v)}catch{}try{if(/%[0-9a-f]{2}/i.test(v))v=decodeURIComponent(v)}catch{}return v.replace(/[\u0000-\u001f\u007f]/g,"").slice(0,max)}
function countryLanguage(country:string){const map:Record<string,string>={DE:"de",TR:"tr",FR:"fr",ES:"es",IT:"it",PT:"pt",NL:"nl",PL:"pl",RO:"ro",GR:"el",CN:"zh",JP:"ja",KR:"ko",IN:"hi"};return map[country]||"en"}
export async function GET(req:NextRequest){
 const country=decodeHeader(req.headers.get("x-vercel-ip-country"),2).toUpperCase(),region=decodeHeader(req.headers.get("x-vercel-ip-country-region")),city=decodeHeader(req.headers.get("x-vercel-ip-city")),timezone=decodeHeader(req.headers.get("x-vercel-ip-timezone")),acceptLanguage=decodeHeader(req.headers.get("accept-language"),160);
 const rawLocale=(acceptLanguage.split(",")[0]||"").split("-")[0].toLowerCase();const localeHint=/^[a-z]{2}$/.test(rawLocale)?rawLocale:countryLanguage(country);
 return NextResponse.json({country,region,city,timezone,localeHint,source:country?"request-geo":"browser-fallback",precision:"coarse",ipStored:false},{headers:{"cache-control":"private, no-store","vary":"Accept-Language"}});
}