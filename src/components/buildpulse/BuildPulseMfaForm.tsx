"use client";
import {FormEvent,useEffect,useState} from "react";
import {createClient} from "@/utils/supabase/client";

type Factor={id:string;friendly_name?:string|null;status?:string};
function safeNext(value:string){return value.startsWith("/")&&!value.startsWith("//")?value:"/workforce"}

export default function BuildPulseMfaForm({nextPath}:{nextPath:string}){
  const supabase=useMemo(()=>createClient(),[]);
  const [factor,setFactor]=useState<Factor|null>(null);
  const [enroll,setEnroll]=useState<{id:string;qr:string;secret:string}|null>(null);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("Checking MFA…");

  useEffect(()=>{void (async()=>{
    const aal=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal.data?.currentLevel==="aal2"){window.location.replace(safeNext(nextPath));return}
    const factors=await supabase.auth.mfa.listFactors();
    if(factors.error){setMessage(factors.error.message);return}
    const existing=(factors.data?.totp??[]).find((x:any)=>x.status==="verified")??factors.data?.totp?.[0]??null;
    if(existing){setFactor(existing);setMessage("Enter the 6-digit code from your authenticator app.");return}
    const created=await supabase.auth.mfa.enroll({factorType:"totp",friendlyName:"BuildPulse Workforce"});
    if(created.error){setMessage(created.error.message);return}
    setEnroll({id:created.data.id,qr:created.data.totp.qr_code,secret:created.data.totp.secret});
    setMessage("Scan the QR code, then enter the 6-digit code to complete enrollment.");
  })()},[nextPath]);

  async function verify(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const supabase=createClient();const fd=new FormData(e.currentTarget),code=String(fd.get("code")??"").trim();
    const factorId=factor?.id??enroll?.id;if(!factorId||!/^[0-9]{6,8}$/.test(code)){setMessage("Enter a valid authenticator code.");return}
    setBusy(true);setMessage("Verifying…");
    const result=await supabase.auth.mfa.challengeAndVerify({factorId,code});
    if(result.error){setMessage(result.error.message);setBusy(false);return}
    const aal=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal.data?.currentLevel!=="aal2"){setMessage("MFA verification did not upgrade this session. Please try again.");setBusy(false);return}
    window.location.assign(safeNext(nextPath));
  }

  return <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[.16em] text-emerald-700">Second factor required</p>
    <h2 className="mt-2 text-2xl font-black">Verify workforce access</h2>
    {enroll?<div className="mt-5 rounded-2xl border bg-slate-50 p-4">
      <img src={enroll.qr} alt="TOTP enrollment QR code" className="mx-auto h-48 w-48"/>
      <p className="mt-3 text-xs text-slate-600">If scanning is unavailable, enter this secret in your authenticator:</p>
      <code className="mt-2 block break-all rounded bg-white p-2 text-xs">{enroll.secret}</code>
    </div>:null}
    <p className="mt-5 text-sm leading-6 text-slate-600">{message}</p>
    {(factor||enroll)?<form onSubmit={verify} className="mt-4 grid gap-3">
      <label className="text-sm font-bold">Authenticator code<input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" className="mt-1 w-full rounded-xl border px-4 py-3 text-lg tracking-[.3em]"/></label>
      <button disabled={busy} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-50">{busy?"Verifying…":"Verify and continue"}</button>
    </form>:null}
  </div>
}
