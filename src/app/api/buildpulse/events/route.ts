import { NextRequest,NextResponse } from "next/server"; import { z } from "zod"; import { recordBuildPulseConsentEvent } from "@/lib/buildpulse/consent-events";
const schema=z.object({action:z.enum(["invite_shown","invite_dismissed"]),surface:z.string().max(80).optional(),product:z.string().max(80).optional(),path:z.string().max(300).optional()});
export async function POST(req:NextRequest){const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({ok:false},{status:400});await recordBuildPulseConsentEvent(p.data);return NextResponse.json({ok:true})}
