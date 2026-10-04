import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {createHash} from "node:crypto";

function limiterActor(email:string){const h=Buffer.from(createHash("sha256").update("editorial-case:"+email).digest());h[6]=(h[6]&0x0f)|0x40;h[8]=(h[8]&0x3f)|0x80;const x=h.subarray(0,16).toString("hex");return `${x.slice(0,8)}-${x.slice(8,12)}-${x.slice(12,16)}-${x.slice(16,20)}-${x.slice(20,32)}`}
const emailOk=(v:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=254;
function targetOk(v:string){try{const u=new URL(v);return u.protocol==="https:"&&(u.hostname==="buildpulse.news"||u.hostname==="www.buildpulse.news")}catch{return false}}

export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>null);
 const requested=String(body?.type||""),target=String(body?.targetUrl||"").trim(),email=String(body?.email||"").trim().toLowerCase(),summary=String(body?.summary||"").trim(),evidence=String(body?.evidence||"").trim();
 const type=requested==="correction"?"correction_request":requested==="takedown"?"takedown_request":requested;
 if(!["correction_request","complaint","takedown_request"].includes(type)||!targetOk(target)||!emailOk(email)||summary.length<20||summary.length>4000||evidence.length>6000)return NextResponse.json({ok:false,error:"invalid_submission"},{status:400});
 const db=createAdminClient();if(!db)return NextResponse.json({ok:false,error:"service_unavailable"},{status:503});
 const {data:rateAllowed,error:rateError}=await db.rpc("buildpulse_consume_rate_limit",{p_actor_id:limiterActor(email),p_bucket:"editorial.case",p_limit:3,p_window_seconds:600});
 if(rateError)return NextResponse.json({ok:false,error:"rate_check_failed"},{status:503});
 if(rateAllowed!==true)return NextResponse.json({ok:false,error:"rate_limited"},{status:429});
 const details=evidence?summary+"\n\nSupporting evidence/context:\n"+evidence:summary;
 const {data,error}=await db.from("buildpulse_newsroom_cases").insert({case_type:type,source_url:target,reporter_email:email,details}).select("id,status,created_at").single();
 if(error)return NextResponse.json({ok:false,error:"submission_failed"},{status:500});
 return NextResponse.json({ok:true,case:data},{status:201});
}
