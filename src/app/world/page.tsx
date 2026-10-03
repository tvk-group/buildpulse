import {listVerifiedStories} from "@/lib/buildpulse/public-content";

export const dynamic="force-dynamic";
export const metadata={title:"World",description:"Source-verified global developments from the BuildPulse review pipeline.",alternates:{canonical:"/world"},openGraph:{url:"/world"}};

export default async function World(){
  const stories=await listVerifiedStories({limit:12,sinceHours:72});
  return <main className="mx-auto max-w-[1440px] px-5 py-12">
    <p className="text-xs font-black uppercase tracking-[.16em] text-[#0b6b63]">World desk · verified feed</p>
    <h1 className="mt-3 text-5xl font-black tracking-tight">Latest global developments</h1>
    <p className="mt-4 max-w-3xl text-[#53606b]">Only stories that have passed BuildPulse source and provenance review appear here. Political coverage is reporting, not endorsement or prediction.</p>
    {stories.length?<div className="mt-10 grid gap-px bg-black/15 lg:grid-cols-3">{stories.map(s=><article className="bg-[#fbfaf6] p-6" key={s.id}>
      <p className="text-[10px] font-black uppercase tracking-widest">{s.category||"World"} · {s.publishedAt?new Date(s.publishedAt).toLocaleDateString("en-GB"):"Verified"}</p>
      <h2 className="mt-4 text-2xl font-black leading-tight">{s.title}</h2>
      {s.summary?<p className="mt-4 text-sm leading-6 text-[#53606b]">{s.summary}</p>:null}
      <a className="mt-6 inline-block text-xs font-black text-[#0b6b63]" href={s.canonicalSourceUrl} rel="noopener noreferrer" target="_blank">SOURCE: {s.sourceName.toUpperCase()} ↗</a>
    </article>)}</div>:<section className="mt-10 rounded-2xl border border-black/10 bg-white p-8"><p className="text-xs font-black uppercase tracking-widest text-slate-500">Verification gate active</p><h2 className="mt-3 text-2xl font-black">No World stories are currently eligible for public display.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Ingestion is running, but a story appears here only after source evidence and reviewer provenance are recorded. Stale or unverified headlines are not used as filler.</p><a href="/methodology" className="mt-5 inline-block text-sm font-black text-[#0b6b63]">READ THE METHODOLOGY →</a></section>}
  </main>
}
