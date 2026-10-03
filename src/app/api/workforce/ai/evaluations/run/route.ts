import {NextRequest,NextResponse} from "next/server";
import {requireBuildPulseWorkforce} from "@/lib/buildpulse/workforce-auth";
import {runBuildPulseAiEvaluations} from "@/lib/buildpulse/ai-evaluations";

export async function POST(req:NextRequest){
 const auth=await requireBuildPulseWorkforce(["founder","admin","engineering"]);
 if(!auth.ok)return NextResponse.json({ok:false,error:auth.reason},{status:auth.reason==="mfa_required"?403:401});
 const body=await req.json().catch(()=>null);
 const promptKey=typeof body?.promptKey==="string"?body.promptKey.trim():"";
 if(!/^[a-z0-9][a-z0-9-]{1,80}$/.test(promptKey))return NextResponse.json({ok:false,error:"invalid_prompt_key"},{status:400});
 try{return NextResponse.json({ok:true,...await runBuildPulseAiEvaluations(promptKey,auth.userId)})}
 catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"evaluation_failed"},{status:500})}
}
