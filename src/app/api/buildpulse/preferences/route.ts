import {NextRequest,NextResponse} from "next/server";
import {callBuildPulseSubscriberRuntime} from "@/lib/buildpulse/subscriber-runtime";
export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>null);
 const result=await callBuildPulseSubscriberRuntime({...(body&&typeof body==="object"?body:{}),action:"resolve"});
 if(!result.ok)return NextResponse.json(result.body,{status:result.status});
 return NextResponse.json({ok:true,email:result.body.email});
}
