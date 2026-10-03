import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import BuildPulseAuthForm from "@/components/buildpulse/BuildPulseAuthForm";
import {createClientSafe} from "@/utils/supabase/server";

export const metadata={title:"Secure Sign In",description:"Sign in to authorized BuildPulse workspaces.",robots:{index:false,follow:false},alternates:{canonical:"/auth"}};

function safeNext(value:string|undefined){return value?.startsWith("/")&&!value.startsWith("//")?value:"/workforce"}

export default async function AuthPage({searchParams}:{searchParams:Promise<{next?:string}>}){
  const params=await searchParams,next=safeNext(params.next);
  const supabase=createClientSafe(await cookies());
  if(supabase){const {data:{user}}=await supabase.auth.getUser();if(user)redirect(next)}
  return <main className="min-h-[72vh] bg-slate-50 px-5 py-16"><div className="mx-auto max-w-5xl">
    <div className="mx-auto mb-8 max-w-xl text-center"><p className="text-xs font-black uppercase tracking-[.18em] text-[#0b6b63]">BuildPulse Secure Access</p><h1 className="mt-3 text-4xl font-black tracking-tight">Sign in to your authorized workspace.</h1><p className="mt-4 text-slate-600">Personal workforce accounts only. Access is role-scoped, revocable and auditable.</p></div>
    <BuildPulseAuthForm nextPath={next}/>
  </div></main>
}
