"use client";
import {FormEvent,useState} from "react";
import {createClient} from "@/utils/supabase/client";

function safeNext(value:string){return value.startsWith("/")&&!value.startsWith("//")?value:"/workforce"}

export default function BuildPulseAuthForm({nextPath}:{nextPath:string}){
  const supabase=useMemo(()=>createClient(),[]);
  const [mode,setMode]=useState<"password"|"magic">("password");
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMessage("");
    const supabase=createClient();\n    const fd=new FormData(e.currentTarget),email=String(fd.get("email")??"").trim(),password=String(fd.get("password")??"");
    const next=safeNext(nextPath);
    if(mode==="magic"){
      const redirectTo=new URL("/auth/callback",window.location.origin);redirectTo.searchParams.set("next",next);
      const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo.toString(),shouldCreateUser:false}});
      setMessage(error?.message??"Magic sign-in link sent. Check your company mailbox.");
    }else{
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error)setMessage(error.message);
      else window.location.assign(next);
    }
    setBusy(false);
  }

  return <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
    <div className="flex rounded-xl bg-slate-100 p-1">
      <button type="button" onClick={()=>setMode("password")} className={"flex-1 rounded-lg px-3 py-2 text-sm font-bold "+(mode==="password"?"bg-white shadow":"text-slate-500")}>Password</button>
      <button type="button" onClick={()=>setMode("magic")} className={"flex-1 rounded-lg px-3 py-2 text-sm font-bold "+(mode==="magic"?"bg-white shadow":"text-slate-500")}>Magic link</button>
    </div>
    <form onSubmit={submit} className="mt-6 grid gap-4">
      <label className="text-sm font-bold">Work email<input required type="email" name="email" autoComplete="email" className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"/></label>
      {mode==="password"?<label className="text-sm font-bold">Password<input required type="password" name="password" autoComplete="current-password" className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"/></label>:null}
      <button disabled={busy} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-50">{busy?"Signing in…":mode==="password"?"Sign in securely":"Send magic link"}</button>
      {message?<p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{message}</p>:null}
    </form>
    <p className="mt-5 text-xs leading-5 text-slate-500">Workforce access is invitation-only. Authentication alone does not grant a role; inactive or unassigned accounts remain blocked.</p>
  </div>
}
