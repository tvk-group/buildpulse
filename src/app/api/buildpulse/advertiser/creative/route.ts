import {createHash,randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

const BUCKET="buildpulse-ad-creatives";
const MIME=new Set(["image/png","image/jpeg","image/webp"]);
function dimensions(bytes:Buffer,mime:string):{width:number;height:number}|null{
 if(mime==="image/png"&&bytes.length>=24&&bytes.subarray(1,4).toString("ascii")==="PNG")return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
 if(mime==="image/jpeg"&&bytes.length>4){let i=2;while(i+9<bytes.length){if(bytes[i]!==0xff){i++;continue}const marker=bytes[i+1];if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return {height:bytes.readUInt16BE(i+5),width:bytes.readUInt16BE(i+7)};if(i+4>bytes.length)break;const len=bytes.readUInt16BE(i+2);if(len<2)break;i+=2+len}}
 if(mime==="image/webp"&&bytes.length>=30&&bytes.subarray(0,4).toString("ascii")==="RIFF"&&bytes.subarray(8,12).toString("ascii")==="WEBP"&&bytes.subarray(12,16).toString("ascii")==="VP8X"){return {width:1+bytes.readUIntLE(24,3),height:1+bytes.readUIntLE(27,3)}}
 return null;
}
export async function POST(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
 const form=await request.formData().catch(()=>null);if(!form)return NextResponse.json({error:"Invalid upload"},{status:400});
 const orderId=String(form.get("orderId")??"");const file=form.get("file");
 if(!/^[0-9a-f-]{36}$/i.test(orderId)||!(file instanceof File))return NextResponse.json({error:"Order and creative file are required"},{status:400});
 if(!MIME.has(file.type)||file.size<1||file.size>5*1024*1024)return NextResponse.json({error:"Creative must be PNG, JPEG or WebP and no larger than 5 MB"},{status:400});
 const {data:order}=await supabase.from("buildpulse_ad_orders").select("id,status").eq("id",orderId).eq("user_id",user.id).in("status",["draft","awaiting_payment","payment_detected","review"]).maybeSingle();
 if(!order)return NextResponse.json({error:"Campaign cannot accept creatives"},{status:403});
 const bytes=Buffer.from(await file.arrayBuffer());const size=dimensions(bytes,file.type);if(!size||size.width<1||size.height<1||size.width>4096||size.height>4096)return NextResponse.json({error:"Creative image dimensions could not be validated"},{status:400});const sha256=createHash("sha256").update(bytes).digest("hex");
 const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";const path=`${user.id}/${orderId}/${randomUUID()}-${sha256.slice(0,16)}.${ext}`;
 const {error:uploadError}=await supabase.storage.from(BUCKET).upload(path,bytes,{contentType:file.type,upsert:false,cacheControl:"31536000"});
 if(uploadError)return NextResponse.json({error:"Creative storage failed"},{status:500});
 const {data:creative,error}=await supabase.from("buildpulse_ad_creatives").insert({order_id:orderId,storage_path:path,mime_type:file.type,byte_size:bytes.length,width_px:size.width,height_px:size.height,sha256,review_state:"pending"}).select("id,review_state,mime_type,byte_size").single();
 if(error||!creative){await supabase.storage.from(BUCKET).remove([path]);return NextResponse.json({error:"Creative metadata could not be saved"},{status:500})}
 return NextResponse.json({ok:true,creative});
}
