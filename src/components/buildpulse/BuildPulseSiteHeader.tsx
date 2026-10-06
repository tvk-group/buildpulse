"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
import {getBuildPulseLocale,setBuildPulseLocale} from "@/lib/buildpulse/localization";import {uiCopy} from "@/lib/buildpulse/ui-copy";

const groupDefs=[
 {label:"News",items:[["Latest","/archive"],["Local","/local"],["World","/world"],["Technology","/technology"],["Politics","/news/politics"],["Economy","/news/economy"],["AI","/news/ai"],["Blockchain","/news/blockchain"],["Security","/news/security"],["Science","/news/science"],["Health","/news/health"]]},
 {label:"Intelligence",items:[["Markets","/markets"],["Methodology","/methodology"]]},
 {label:"Community",items:[["Social","/social"],["Blogs","/blog"],["People","/people"],["Connections","/connections"]]},
 {label:"Culture",items:[["Sports","/sports"],["Culture News","/news/culture"],["Life","/news/life"],["Arts","/arts"],["Marketplace","/marketplace"]]},
 {label:"About",items:[["Account","/account"],["About BuildPulse","/about"],["Contribute","/contribute"],["Advertise","/advertise"]]},
] as const;
const langs=[["EN","English"],["DE","Deutsch"],["FR","Français"],["TR","Türkçe"],["ES","Español"],["IT","Italiano"],["PT","Português"],["RU","Русский"],["PL","Polski"],["NL","Nederlands"],["SV","Svenska"],["NO","Norsk"],["FI","Suomi"],["DA","Dansk"],["RO","Română"],["HU","Magyar"],["CS","Čeština"],["EL","Ελληνικά"],["BG","Български"],["UK","Українська"],["ZH","中文"],["JA","日本語"],["KO","한국어"],["AR","العربية"],["HI","हिन्दी"]];

export function BuildPulseSiteHeader(){
 const p=usePathname(),[open,setOpen]=useState(false),[locale,setLocale]=useState("EN"); const t=uiCopy(locale.toLowerCase()); const groups=groupDefs.map((g,gi)=>({...g,label:[t.news,t.intelligence,t.community,t.culture,t.about][gi],items:g.items.map(([n,h],ii)=>{const names=[[t.latest,t.local,t.world,t.technology,t.politics,t.economy],[t.markets,t.methodology],[t.social,t.blogs,t.people,t.connections],[t.sports,t.arts,t.marketplace],[t.account,t.aboutBp,t.contribute,t.advertise]][gi];return [names[ii]||n,h] as const})}));
 useEffect(()=>setOpen(false),[p]);
 useEffect(()=>setLocale(getBuildPulseLocale().toUpperCase()),[]);
 const choose=(v:string)=>{setLocale(v);setBuildPulseLocale(v);window.location.reload()};
 const active=(href:string)=>p===href.split("?")[0]||(href!=="/"&&p.startsWith(href.split("?")[0]+"/"));
 return <header className="sticky top-0 z-50 border-b border-black/15 bg-[#fbfaf6]/95 backdrop-blur">
  <div className="mx-auto max-w-[1440px] px-4 md:px-5">
   <div className="flex min-h-16 items-center gap-3">
    <Link href="/" aria-label="BuildPulse home" prefetch={false} onClick={(e)=>{if(p==="/"){e.preventDefault();window.location.assign("/")}}} className="mr-auto text-2xl font-black tracking-[-.06em] text-[#0b6b63]">BUILD<span className="font-light">PULSE</span></Link>
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
     {groups.map(g=><div key={g.label} className="group relative">
      <button className="rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-wide hover:bg-black/5 group-focus-within:bg-black/5" aria-haspopup="menu">{g.label} <span aria-hidden="true">⌄</span></button>
      <div className="invisible absolute left-0 top-full z-50 min-w-56 translate-y-1 rounded-xl border border-black/10 bg-[#fbfaf6] p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
       {g.items.map(([n,h])=><Link key={h} href={h} className={`block rounded-lg px-3 py-2.5 text-sm font-bold ${active(h)?"bg-[#0b6b63] text-white":"hover:bg-black/5"}`}>{n}</Link>)}
      </div>
     </div>)}
    </nav>
    <Link href="/subscriptions" className="hidden rounded-lg px-2 py-2 text-[11px] font-black uppercase hover:bg-black/5 xl:block">{t.subscriptions}</Link><Link href="/build-with-ai" className="hidden rounded-lg px-2 py-2 text-[11px] font-black uppercase hover:bg-black/5 xl:block">{t.buildAi}</Link><Link href="/account" className="hidden rounded-lg px-2 py-2 text-[11px] font-black uppercase hover:bg-black/5 md:block">{t.account}</Link><label className="sr-only" htmlFor="bp-language">{t.language}</label>
    <select id="bp-language" value={locale} onChange={e=>choose(e.target.value)} className="hidden rounded border border-black/20 bg-transparent px-2 py-2 text-xs font-bold sm:block" aria-label={t.language}>
     {langs.map(([code,n])=><option key={code} value={code}>{code} · {n}</option>)}
    </select>
    <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-black/20 lg:hidden" aria-expanded={open} aria-controls="bp-mobile-nav" aria-label={open?t.closeNav:t.openNav} onClick={()=>setOpen(v=>!v)}><span aria-hidden="true" className="text-xl leading-none">{open?"×":"☰"}</span></button>
   </div>
   {open&&<div id="bp-mobile-nav" className="border-t border-black/10 pb-5 pt-3 lg:hidden">
    <nav className="space-y-2" aria-label="Mobile">
     {groups.map(g=><details key={g.label} className="rounded-xl border border-black/10 bg-white/50" open={g.label==="News"}>
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black uppercase">{g.label}<span className="float-right">⌄</span></summary>
      <div className="grid grid-cols-2 gap-1 border-t border-black/10 p-2 sm:grid-cols-3">{g.items.map(([n,h])=><Link key={h} href={h} className={`rounded-lg px-3 py-3 text-sm font-bold ${active(h)?"bg-[#0b6b63] text-white":"hover:bg-black/5"}`}>{n}</Link>)}</div>
     </details>)}
    </nav>
    <div className="mt-3 sm:hidden"><label className="mb-1 block text-[10px] font-black uppercase tracking-widest" htmlFor="bp-language-mobile">{t.language}</label><select id="bp-language-mobile" value={locale} onChange={e=>choose(e.target.value)} className="w-full rounded border border-black/20 bg-transparent px-3 py-3 text-sm font-bold">{langs.map(([code,n])=><option key={code} value={code}>{code} · {n}</option>)}</select></div>
   </div>}
  </div>
 </header>
}