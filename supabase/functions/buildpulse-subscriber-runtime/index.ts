import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

const H={"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type"};
const TOPICS=new Set(["ai","blockchain","crypto","security","digital-economy","entelekron"]);
function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:H})}
function b64urlEncode(bytes:Uint8Array){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function b64urlDecode(s:string){s=s.replace(/-/g,"+").replace(/_/g,"/");s+="=".repeat((4-s.length%4)%4);const raw=atob(s);return new Uint8Array([...raw].map(c=>c.charCodeAt(0)))}
async function sha256(value:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function hmac(secret:string,message:string){
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return b64urlEncode(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message))));
}
function ct(a:string,b:string){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
async function secret(admin:any){
 const {data,error}=await admin.from("buildpulse_private_settings").select("value").eq("key","subscriber_preference_secret").maybeSingle();
 if(error||!data?.value)throw new Error("preference_secret_unavailable");return data.value as string;
}
async function mint(admin:any,email:string,ttlDays=45){
 const s=await secret(admin),payload={v:"bp-pref-v2",e:email.trim().toLowerCase(),x:Math.floor(Date.now()/1000)+ttlDays*86400};
 const enc=b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
 return enc+"."+await hmac(s,"bp-pref-v2."+enc);
}
async function verify(admin:any,token:string){
 const parts=token.split(".");if(parts.length!==2)return null;
 const s=await secret(admin),expected=await hmac(s,"bp-pref-v2."+parts[0]);if(!ct(expected,parts[1]))return null;
 try{const p=JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0])));if(p?.v!=="bp-pref-v2"||typeof p?.e!=="string"||typeof p?.x!=="number"||p.x<Math.floor(Date.now()/1000))return null;return {email:p.e.toLowerCase(),expiresAt:p.x}}catch{return null}
}
async function consent(admin:any,input:{email:string;subscriberId?:string|null;action:string;surface?:string|null;product?:string|null;path?:string|null;metadata?:Record<string,unknown>}){
 await admin.from("buildpulse_consent_events").insert({subscriber_id:input.subscriberId??null,email_hash:await sha256(input.email),action:input.action,surface:input.surface??null,product:input.product??null,path:input.path??null,metadata:input.metadata??{}});
}
function validEmail(v:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=320}
function validTimeZone(v:string){if(!v||v.length>64)return false;try{new Intl.DateTimeFormat("en-US",{timeZone:v}).format();return true}catch{return false}}
function cleanTopics(v:unknown){return Array.isArray(v)?[...new Set(v.filter(x=>typeof x==="string"&&TOPICS.has(x)))].slice(0,6):[]}
async function subscribe(admin:any,body:any){
 const email=String(body.email??"").trim().toLowerCase();if(!validEmail(email)||body.consent!==true)throw new Error("invalid_request");
 const cadence=["daily","weekly","both"].includes(body.cadence)?body.cadence:"weekly",topics=cleanTopics(body.topics),deliveryTimezone=String(body.deliveryTimezone??"UTC");
 if(!topics.length||!validTimeZone(deliveryTimezone))throw new Error("invalid_request");
 const {data:blocked}=await admin.from("email_marketing_unsubscribes").select("id").ilike("email",email).maybeSingle();if(blocked)throw new Error("suppressed");
 const now=new Date().toISOString(),patch={
   email,locale:String(body.locale??"en").slice(0,10),cadence,topics,delivery_timezone:deliveryTimezone,status:"active",consent_basis:"explicit",
   consent_source:["buildpulse_web","ecosystem_prompt","account_preferences","transactional_email"].includes(body.consentSource)?body.consentSource:"buildpulse_web",
   consent_at:now,acquisition_surface:typeof body.surface==="string"?body.surface.slice(0,80):null,
   acquisition_product:typeof body.product==="string"?body.product.slice(0,80):"buildpulse",
   acquisition_path:typeof body.path==="string"?body.path.slice(0,300):null,updated_at:now
 };
 const {data:existing,error:lookup}=await admin.from("buildpulse_subscribers").select("id").ilike("email",email).maybeSingle();if(lookup)throw lookup;
 let subscriber:any;
 if(existing){const r=await admin.from("buildpulse_subscribers").update(patch).eq("id",existing.id).select("id").single();if(r.error)throw r.error;subscriber=r.data}
 else{const r=await admin.from("buildpulse_subscribers").insert(patch).select("id").single();if(r.error){
   const raced=await admin.from("buildpulse_subscribers").select("id").ilike("email",email).maybeSingle();if(!raced.data)throw r.error;
   const u=await admin.from("buildpulse_subscribers").update(patch).eq("id",raced.data.id).select("id").single();if(u.error)throw u.error;subscriber=u.data;
 }else subscriber=r.data}
 await consent(admin,{email,subscriberId:subscriber.id,action:"subscribe",surface:patch.acquisition_surface,product:patch.acquisition_product,path:patch.acquisition_path,metadata:{consentSource:patch.consent_source,cadence}});
 return {ok:true,subscriberId:subscriber.id,deliverySync:"pending_domain_verification"};
}
async function resolve(admin:any,token:string){
 const v=await verify(admin,token);if(!v)throw new Error("invalid_or_expired_token");
 const {data,error}=await admin.from("buildpulse_subscribers").select("locale,cadence,topics,delivery_timezone,status").ilike("email",v.email).maybeSingle();
 if(error||!data)throw new Error("not_found");return {ok:true,email:v.email,preferences:data};
}
async function updatePreferences(admin:any,body:any){
 const v=await verify(admin,String(body.token??""));if(!v)throw new Error("invalid_or_expired_token");
 const cadence=String(body.cadence??""),topics=cleanTopics(body.topics),locale=String(body.locale??"").slice(0,10),deliveryTimezone=String(body.deliveryTimezone??"UTC");
 if(!["daily","weekly","both"].includes(cadence)||!topics.length||locale.length<2||!validTimeZone(deliveryTimezone))throw new Error("invalid_request");
 const {data:s}=await admin.from("buildpulse_subscribers").select("id,status").ilike("email",v.email).maybeSingle();if(!s||s.status!=="active")throw new Error("not_found");
 const {error}=await admin.from("buildpulse_subscribers").update({locale,cadence,topics,delivery_timezone:deliveryTimezone,updated_at:new Date().toISOString()}).eq("id",s.id);if(error)throw error;
 await consent(admin,{email:v.email,subscriberId:s.id,action:"preferences_changed",surface:"preference_center",product:"buildpulse",metadata:{locale,cadence,topics,deliveryTimezone}});
 return {ok:true};
}
async function unsubscribe(admin:any,body:any,req:Request){
 const v=await verify(admin,String(body.token??""));if(!v)throw new Error("invalid_or_expired_token");
 const {data:s}=await admin.from("buildpulse_subscribers").select("id").ilike("email",v.email).maybeSingle();
 const now=new Date().toISOString();
 if(s)await admin.from("buildpulse_subscribers").update({status:"unsubscribed",updated_at:now}).eq("id",s.id);
 const {data:existing}=await admin.from("email_marketing_unsubscribes").select("id").ilike("email",v.email).maybeSingle();
 if(!existing)await admin.from("email_marketing_unsubscribes").insert({email:v.email,source:"buildpulse_preference_link",user_agent:req.headers.get("user-agent"),ip_address:(req.headers.get("x-forwarded-for")??"").split(",")[0].trim()||null,unsubscribed_at:now});
 await consent(admin,{email:v.email,subscriberId:s?.id??null,action:"unsubscribe",surface:"preference_center",product:"buildpulse"});
 return {ok:true};
}
async function mintForAdmin(admin:any,body:any,req:Request){
 const auth=req.headers.get("Authorization")??"";if(!auth.startsWith("Bearer "))throw new Error("admin_required");
 const url=Deno.env.get("SUPABASE_URL")??"",anon=Deno.env.get("SUPABASE_ANON_KEY")??"";
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}}=await userClient.auth.getUser();if(!user)throw new Error("admin_required");
 const {data:role}=await admin.from("role_assignments").select("id").eq("user_id",user.id).eq("role","admin").is("revoked_at",null).maybeSingle();if(!role)throw new Error("admin_required");
 const email=String(body.email??"").trim().toLowerCase();if(!validEmail(email))throw new Error("invalid_request");
 return {ok:true,token:await mint(admin,email,Number(body.ttlDays)||45)};
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:H});
 if(req.method!=="POST")return reply({ok:false,error:"method_not_allowed"},405);
 try{
   const url=Deno.env.get("SUPABASE_URL")??"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";if(!url||!service)return reply({ok:false,error:"service_not_configured"},503);
   const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
   const body=await req.json().catch(()=>null);if(!body||typeof body!=="object")return reply({ok:false,error:"invalid_request"},400);
   const action=String(body.action??"");
   if(action==="subscribe")return reply(await subscribe(admin,body));
   if(action==="resolve")return reply(await resolve(admin,String(body.token??"")));
   if(action==="preferences")return reply(await updatePreferences(admin,body));
   if(action==="unsubscribe")return reply(await unsubscribe(admin,body,req));
   if(action==="mintAdmin")return reply(await mintForAdmin(admin,body,req));
   return reply({ok:false,error:"unsupported_action"},400);
 }catch(error){
   const message=error instanceof Error?error.message:"subscriber_operation_failed";
   const status=message==="suppressed"||message==="already_unsubscribed"?409:message==="invalid_or_expired_token"?401:message==="not_found"?404:message==="admin_required"?403:["invalid_request"].includes(message)?400:500;
   return reply({ok:false,error:message},status);
 }
});