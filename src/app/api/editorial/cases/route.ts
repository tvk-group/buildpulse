import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";

const emailOk=(v:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=254;
function targetOk(v:string){try{const u=new URL(v);return u.protocol==="https:"&&(u.hostname==="buildpulse.news"||u.hostname==="www.buildpulse.news")}catch{return false}}

export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>null);
 const type=String(body?.type||""),target=String(body?.targetUrl||"").trim(),email=String(body?.email||"").trim().toLowerCase(),summary=String(body?.summary||"").trim(),evidence=String(body?.evidence||"").trim();
 if(!["correction","complaint","takedown"].includes(type)||!targetOk(target)||!emailOk(email)||summary.length<20||summary.length>4000||evidence.length>8000)return NextResponse.json({ok:false,error:"invalid_submission"},{status:400});
 const db=createAdminClient();if(!db)return NextResponse.json({ok:false,error:"service_unavailable"},{status:503});
 const since=new Date(Date.now()-10*60_000).toISOString();
 const {count}=await db.from("buildpulse_editorial_cases").select("id",{count:"exact",head:true}).eq("contact_email",email).gte("created_at",since);
 if((count??0)>=3)return NextResponse.json({ok:false,error:"rate_limited"},{status:429});
 const {data,error}=await db.from("buildpulse_editorial_cases").insert({case_type:type,target_url:target,contact_email:email,summary,evidence:evidence||null}).select("id,status,created_at").single();
 if(error)return NextResponse.json({ok:false,error:"submission_failed"},{status:500});
 return NextResponse.json({ok:true,case:data},{status:201});
}
