import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import BuildPulseMfaForm from "@/components/buildpulse/BuildPulseMfaForm";
import {createClientSafe} from "@/utils/supabase/server";

export const metadata={title:"MFA Verification",description:"Verify strong authentication for BuildPulse workforce access.",robots:{index:false,follow:false},alternates:{canonical:"/auth/mfa"}};
function safeNext(value:string|undefined){return value?.startsWith("/")&&!value.startsWith("//")?value:"/workforce"}

export default async function MfaPage({searchParams}:{searchParams:Promise<{next?:string}>}){
  const params=await searchParams,next=safeNext(params.next);
  const supabase=createClientSafe(await cookies());
  if(!supabase)redirect("/auth?next="+encodeURIComponent(next));
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/auth?next="+encodeURIComponent(next));
  const aal=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if(aal.data?.currentLevel==="aal2")redirect(next);
  return <main className="min-h-[72vh] bg-slate-50 px-5 py-16"><div className="mx-auto max-w-5xl">
    <div className="mx-auto mb-8 max-w-xl text-center"><p className="text-xs font-black uppercase tracking-[.18em] text-[#0b6b63]">BuildPulse Workforce Security</p><h1 className="mt-3 text-4xl font-black tracking-tight">Strong authentication required.</h1><p className="mt-4 text-slate-600">Your workforce role requires a verified second factor before access to protected operations.</p></div>
    <BuildPulseMfaForm nextPath={next}/>
  </div></main>
}
