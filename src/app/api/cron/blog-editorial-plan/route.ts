import {NextRequest,NextResponse} from "next/server";
import {dailyEditorialPlan} from "@/lib/buildpulse/editorial-schedule";
export const dynamic="force-dynamic";
export function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET?.trim();
 if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
 const date=new Date().toISOString().slice(0,10);
 return NextResponse.json({ok:true,date,assignments:dailyEditorialPlan(date),publication:"not_enabled",note:"Editorial planning only; verified source gathering, human review and authorized publishing are required."});
}
