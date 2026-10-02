import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import StoryReviewActions from "@/components/buildpulse/StoryReviewActions";

export const dynamic="force-dynamic";
type QueueRow={id:string;title:string;summary:string|null;canonical_url:string;published_at:string|null;verification_state:string;editorial_score:number|null;source_name:string};

export default async function Page({searchParams}:{searchParams:Promise<{page?:string;source?:string}>}){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/advertiser");
  const params=await searchParams,source=(params.source??"").trim().slice(0,120);
  const page=Math.max(1,Number.parseInt(params.page??"1",10)||1);
  const {data,error}=await supabase.functions.invoke("buildpulse-editorial-admin",{body:{action:"queue",page,source}});
  if(!error&&data?.error==="admin_required")redirect("/");
  const stories=(Array.isArray(data?.stories)?data.stories:[]) as QueueRow[];
  const total=Number(data?.total??0),pages=Math.max(1,Number(data?.pages??1));

  return <main className="min-h-screen bg-slate-100 text-slate-950"><div className="mx-auto max-w-6xl px-6 py-12">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black tracking-[.2em] text-slate-500">BUILD PULSE // EDITORIAL CONTROL</p><h1 className="mt-3 text-4xl font-black">Story review queue</h1><p className="mt-3 text-slate-600">Authenticated provenance review · {total} awaiting review · page {Math.min(page,pages)} of {pages}.</p></div><div className="flex gap-4"><Link className="font-bold underline" href="/admin/advertising">Advertising control</Link><Link className="font-bold underline" href="/status">Launch control →</Link></div></div>
    {error||!data?.ok?<p className="mt-8 rounded-xl bg-red-50 p-4 text-red-800">Queue could not be loaded.</p>:null}
    <form className="mt-8 flex flex-wrap gap-3 rounded-2xl border bg-white p-4"><input name="source" defaultValue={source} placeholder="Filter by exact source name" className="min-w-72 flex-1 rounded-lg border px-4 py-2"/><button className="rounded-lg bg-slate-950 px-5 py-2 font-bold text-white">Filter queue</button>{source?<Link href="?" className="px-3 py-2 font-bold underline">Clear</Link>:null}</form>
    <div className="mt-5 space-y-5">{stories.map(s=><article key={s.id} className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><span>{s.source_name||"Source"}</span><span>•</span><span>{s.verification_state}</span>{s.published_at?<><span>•</span><span>{new Date(s.published_at).toLocaleString("en-GB",{timeZone:"UTC"})} UTC</span></>:null}{s.editorial_score!=null?<><span>•</span><span>Score {s.editorial_score}</span></>:null}</div>
      <h2 className="mt-3 text-2xl font-black">{s.title}</h2>{s.summary?<p className="mt-3 leading-7 text-slate-600">{s.summary}</p>:null}
      <a href={s.canonical_url} target="_blank" rel="noreferrer" className="mt-4 inline-block break-all text-sm font-bold underline">Open canonical source ↗</a>
      <StoryReviewActions id={s.id} canonicalUrl={s.canonical_url}/>
    </article>)}
    {!error&&data?.ok&&!stories.length?<div className="rounded-2xl border bg-white p-8 text-slate-600">No stories are awaiting review.</div>:null}</div>
    <nav className="mt-8 flex items-center justify-between">{page>1?<Link className="font-bold underline" href={`?page=${page-1}${source?`&source=${encodeURIComponent(source)}`:""}`}>← Previous</Link>:<span/>}{page<pages?<Link className="font-bold underline" href={`?page=${page+1}${source?`&source=${encodeURIComponent(source)}`:""}`}>Next →</Link>:<span/>}</nav>
  </div></main>
}
