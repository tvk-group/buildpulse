import {NextRequest,NextResponse} from "next/server";import {z} from "zod";import {verifyBuildPulsePreferenceToken} from "@/lib/buildpulse/preference-token";
const schema=z.object({token:z.string().min(20)});
export async function POST(req:NextRequest){const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({ok:false,error:"signed_preference_token_required"},{status:400});const v=verifyBuildPulsePreferenceToken(p.data.token);return v?NextResponse.json({ok:true,email:v.email}):NextResponse.json({ok:false,error:"invalid_or_expired_token"},{status:401})}
