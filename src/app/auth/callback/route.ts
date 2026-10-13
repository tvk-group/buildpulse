import {NextRequest,NextResponse} from "next/server";
import {cookies} from "next/headers";
import {createClient} from "@/utils/supabase/server";

function safeNext(value:string|null){return value?.startsWith("/")&&!value.startsWith("//")&&!value.includes("\\")&&!/[\r\n]/.test(value)?value:"/account"}

export async function GET(request:NextRequest){
  const url=new URL(request.url),code=url.searchParams.get("code"),next=safeNext(url.searchParams.get("next"));
  const denied=(reason:string)=>NextResponse.redirect(new URL(`/auth?error=${reason}`,url.origin));
  if(!code)return denied("missing_code");
  try{
    const supabase=createClient(await cookies());
    const {error}=await supabase.auth.exchangeCodeForSession(code);
    if(error)return denied("invalid_link");
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)return denied("invalid_session");
    return NextResponse.redirect(new URL(next,url.origin));
  }catch{
    return denied("service_unavailable");
  }
}
