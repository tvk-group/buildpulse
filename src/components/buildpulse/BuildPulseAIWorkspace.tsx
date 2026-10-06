"use client";
import {useEffect,useRef,useState} from "react";
import type {FormEvent} from "react";

type Message={role:"user"|"assistant";content:string};

const starters=["Explain a technical concept","Draft a project plan","Help me debug code","Summarize an idea"];

export function BuildPulseAIWorkspace(){
 const [expanded,setExpanded]=useState(false),[messages,setMessages]=useState<Message[]>([]),[input,setInput]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[learning,setLearning]=useState(false),[learnerId,setLearnerId]=useState("");
 const end=useRef<HTMLDivElement>(null),inputRef=useRef<HTMLTextAreaElement>(null),expandButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{try{
  const saved=localStorage.getItem("buildpulse-ai-chat");if(saved){const parsed=JSON.parse(saved);if(Array.isArray(parsed))setMessages(parsed.slice(-16))}
  setLearning(localStorage.getItem("buildpulse-ai-sovra-learning")==="on");
  let id=localStorage.getItem("buildpulse-ai-learner-id")||"";
  if(id.length<16){id=crypto.randomUUID?crypto.randomUUID():"bp-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);localStorage.setItem("buildpulse-ai-learner-id",id)}
  setLearnerId(id);
 }catch{}},[]);
 useEffect(()=>{try{localStorage.setItem("buildpulse-ai-chat",JSON.stringify(messages.slice(-16)))}catch{}},[messages]);
 useEffect(()=>{if(expanded){document.body.style.overflow="hidden";requestAnimationFrame(()=>inputRef.current?.focus())}else document.body.style.overflow="";return()=>{document.body.style.overflow=""}},[expanded]);
 useEffect(()=>end.current?.scrollIntoView({behavior:"smooth"}),[messages,busy]);
 async function send(e?:FormEvent){e?.preventDefault();const q=input.trim();if(!q||busy)return;const next=[...messages,{role:"user" as const,content:q}];setMessages(next);setInput("");setBusy(true);setError("");
  const locale=document.documentElement.lang||navigator.language||"en";
  try{const r=await fetch("/api/ai/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({messages:next,learning:{enabled:learning,visitorId:learnerId,locale}})});const d=await r.json();if(!r.ok)throw new Error(d.error||"AI request failed.");setMessages(v=>[...v,{role:"assistant",content:d.content}]);}
  catch(x){setError(x instanceof Error?x.message:"AI request failed.");}finally{setBusy(false)}
 }
 const panel=<div id="buildpulse-ai-panel" role={expanded?"dialog":undefined} aria-modal={expanded?"true":undefined} aria-label="BuildPulse AI workspace" className={expanded?"flex h-full flex-col":"flex flex-col"}>
   <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 md:px-7">
    <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#0b6b63]">BuildPulse AI · TVK Labs</p><h3 className="mt-1 text-xl font-black tracking-tight">Build with AI</h3></div>
    <div className="flex flex-wrap items-center justify-end gap-2"><button onClick={()=>{const next=!learning;setLearning(next);try{localStorage.setItem("buildpulse-ai-sovra-learning",next?"on":"off")}catch{}}} aria-pressed={learning} className={learning?"rounded-full border border-[#0b6b63] bg-[#dff3ec] px-3 py-2 text-[10px] font-black uppercase text-[#0b6b63]":"rounded-full border border-black/15 px-3 py-2 text-[10px] font-black uppercase"}>SOVRA Learn {learning?"ON":"OFF"}</button>{messages.length>0&&<button onClick={()=>{setMessages([]);setError("");try{localStorage.removeItem("buildpulse-ai-chat")}catch{}}} className="rounded-full border border-black/15 px-3 py-2 text-[10px] font-black uppercase">New</button>}<button ref={expanded?undefined:expandButton} aria-expanded={expanded} aria-controls="buildpulse-ai-panel" onClick={()=>{if(expanded){setExpanded(false);requestAnimationFrame(()=>expandButton.current?.focus())}else setExpanded(true)}} className="rounded-full bg-[#17202a] px-4 py-2 text-[10px] font-black uppercase text-white">{expanded?"Collapse":"Expand ↗"}</button></div>
   </div>
   <div className={expanded?"flex-1 overflow-y-auto px-5 py-5 md:px-7":"px-5 py-4 md:px-7"}>
    {!expanded?<div className="mx-auto max-w-3xl py-1"><h4 className="text-xl font-black tracking-[-.03em]">Ask BuildPulse AI</h4><p className="mt-1 text-sm text-[#53606b]">{messages.length?"Conversation saved. Expand to continue.":"Questions, writing, reasoning, planning and code."}</p></div>:messages.length===0?<div className={expanded?"mx-auto max-w-3xl py-5 md:py-10":"mx-auto max-w-3xl py-1"}><h4 className={expanded?"text-3xl font-black tracking-[-.04em] md:text-5xl":"text-xl font-black tracking-[-.03em]"}>{expanded?"What do you want to build?":"Ask BuildPulse AI"}</h4><p className={expanded?"mt-3 max-w-xl leading-7 text-[#53606b]":"mt-1 text-sm text-[#53606b]"}>{expanded?"Ask questions, develop ideas, write, reason, plan or code inside BuildPulse.":"Questions, writing, reasoning, planning and code."}</p>{expanded&&<div className="mt-7 grid gap-2 sm:grid-cols-2">{starters.map(s=><button key={s} onClick={()=>setInput(s+": ")} className="border border-black/15 bg-white/60 p-4 text-left text-sm font-bold hover:border-[#0b6b63]">{s} →</button>)}</div>}</div>:
    <div className="mx-auto max-w-3xl space-y-4">{messages.map((m,i)=><div key={i} className={m.role==="user"?"ml-auto max-w-[85%] rounded-2xl bg-[#17202a] px-4 py-3 text-sm leading-6 text-white":"max-w-[92%] border-l-2 border-[#0b6b63] bg-[#eef4f1] px-4 py-3 text-sm leading-6 whitespace-pre-wrap"}>{m.content}</div>)}{busy&&<div className="text-sm font-bold text-[#0b6b63]">Thinking…</div>}<div ref={end}/></div>}
   </div>
   <form onSubmit={send} className={expanded?"border-t border-black/10 bg-[#fbfaf6] p-4 md:px-7":"border-t border-black/10 bg-[#fbfaf6] p-3 md:px-7"}><div className="mx-auto flex max-w-3xl gap-2"><textarea ref={inputRef} aria-label="Message BuildPulse AI" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} rows={expanded?2:1} placeholder="Message BuildPulse AI…" className={expanded?"min-h-14 flex-1 resize-none rounded-xl border border-black/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#0b6b63]":"h-11 min-h-11 flex-1 resize-none rounded-xl border border-black/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#0b6b63]"}/><button disabled={busy||!input.trim()} className="rounded-xl bg-[#0b6b63] px-5 text-sm font-black text-white disabled:opacity-40">Send</button></div>{error&&<p role="alert" className="mx-auto mt-2 max-w-3xl text-xs font-bold text-red-700">{error}</p>}{expanded&&<p className="mx-auto mt-2 max-w-3xl text-[10px] text-[#65717c]">AI can make mistakes. Verify important information. When SOVRA Learn is ON, this BuildPulse AI conversation may be pseudonymously stored in the SOVRA AI learning system to improve language, reasoning and product quality.</p>}</form>
  </div>;
 return <>{expanded&&<div className="fixed inset-0 z-[100] bg-[#fbfaf6]">{panel}</div>}<section className="mx-auto max-w-[1440px] px-5 py-6 md:px-10"><div className="overflow-hidden border border-[#17202a]/15 bg-[#f1f5f2]">{!expanded&&panel}</div></section></>;
}
