import {NextRequest,NextResponse} from "next/server";
import {cookies} from "next/headers";
import {createClient} from "@/utils/supabase/server";

function safeNext(value:string|null){return value?.startsWith("/")&&!value.startsWith("//")?value:"/workforce"}

export async function GET(request:NextRequest){
  const url=new URL(request.url),code=url.searchParams.get("code"),next=safeNext(url.searchParams.get("next"));
  if(!code)return NextResponse.redirect(new URL("/auth?error=missing_code",url.origin));
  try{
    const supabase=createClient(await cookies());
    const {error}=await supabase.auth.exchangeCodeForSession(code);
    if(error)return NextResponse.redirect(new URL("/auth?error=invalid_link",url.origin));
    return NextResponse.redirect(new URL(next,url.origin));
  }catch{
    return NextResponse.redirect(new URL("/auth?error=service_unavailable",url.origin));
  }
}
