import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {createAdminClient} from "@/lib/supabase/admin";
import {requireBuildPulseAdmin} from "@/lib/buildpulse/admin-auth";
const schema=z.object({articleId:z.string().uuid(),action:z.enum(["publish","reject"])});
export async function POST(req:NextRequest){
 const auth=await requireBuildPulseAdmin();if(!auth.ok)return NextResponse.json({ok:false},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({ok:false,error:"invalid_request"},{status:400});
 const db=createAdminClient();if(!db)return NextResponse.json({ok:false},{status:503});
 const fn=parsed.data.action==="publish"?"buildpulse_publish_technology_article":"buildpulse_reject_technology_article";
 const {data,error}=await (db.rpc as any)(fn,{p_article_id:parsed.data.articleId,p_reviewer:auth.email});
 if(error)return NextResponse.json({ok:false,error:error.message},{status:409});
 return NextResponse.json({ok:Boolean(data),state:parsed.data.action==="publish"?"published":"rejected"});
}