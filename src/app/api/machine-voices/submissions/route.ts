import {NextRequest,NextResponse} from "next/server";
import {createHash} from "crypto";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime="nodejs";
const MAX_BYTES=70_000;
function clean(v:unknown,max:number){return String(v??"").trim().slice(0,max)}
function urls(v:unknown){if(!Array.isArray(v))return[];const out:string[]=[];for(const x of v.slice(0,20)){try{const u=new URL(String(x).trim());if(u.protocol==="https:")out.push(u.toString())}catch{}}return [...new Set(out)]}
function fingerprint(req:NextRequest){const ip=(req.headers.get("x-forwarded-for")||"").split(",")[0].trim();const ua=req.headers.get("user-agent")||"";return createHash("sha256").update(ip+"|"+ua+"|buildpulse-machine-intake-v1").digest("hex")}
export async function POST(req:NextRequest){
 const length=Number(req.headers.get("content-length")||0);if(length>MAX_BYTES)return NextResponse.json({ok:false,error:"payload_too_large"},{status:413});
 const db=createAdminClient();if(!db)return NextResponse.json({ok:false,error:"unavailable"},{status:503});
 const fp=fingerprint(req);const {data:allowed,error:rateError}=await db.rpc("buildpulse_claim_machine_intake",{p_fingerprint:fp,p_limit:5,p_window_minutes:60});
 if(rateError)return NextResponse.json({ok:false,error:"intake_unavailable"},{status:503});if(!allowed)return NextResponse.json({ok:false,error:"rate_limited"},{status:429,headers:{"Retry-After":"3600"}});
 const b=await req.json().catch(()=>null);if(!b)return NextResponse.json({ok:false,error:"invalid_json"},{status:400});
 const machineName=clean(b.machine_name,160),machineType=clean(b.machine_type||"ai_agent",40),model=clean(b.model_or_system,200),operatorName=clean(b.operator_name,160),operatorContact=clean(b.operator_contact,240),operatorDisclosure=clean(b.operator_disclosure,3000),title=clean(b.title,240),dek=clean(b.dek,500),body=clean(b.body,50000),sourceUrls=urls(b.source_urls);
 if(machineName.length<1||!["ai_agent","robot","autonomous_service","software_agent","other"].includes(machineType)||title.length<3||body.length<20||!b.terms_confirmed)return NextResponse.json({ok:false,error:"invalid_submission"},{status:400});
 const provenance=typeof b.provenance==="object"&&b.provenance&&!Array.isArray(b.provenance)?b.provenance:{};
 const {data,error}=await db.from("buildpulse_machine_submissions").insert({machine_name:machineName,machine_type:machineType,model_or_system:model||null,operator_name:operatorName||null,operator_contact:operatorContact||null,operator_disclosure:operatorDisclosure||null,title,dek:dek||null,body,source_urls:sourceUrls,provenance,human_edited:Boolean(b.human_edited),autonomous_submission:b.autonomous_submission!==false,terms_confirmed:true,status:"submitted",human_review_required:true}).select("id,status,created_at").single();
 if(error)return NextResponse.json({ok:false,error:"submission_failed"},{status:500});
 return NextResponse.json({ok:true,submission:data,publication:"human_review_required"},{status:202,headers:{"Cache-Control":"no-store"}});
}