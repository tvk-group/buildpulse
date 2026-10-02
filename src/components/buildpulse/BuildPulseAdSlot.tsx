import { createAdminClient } from "@/lib/supabase/admin";

type Props={placement:"homepage"|"archive"|"edition_top"|"edition_inline"|"edition_footer"|"newsletter";className?:string};

export async function BuildPulseAdSlot({placement,className=""}:Props){
  const admin=createAdminClient();if(!admin)return null;
  const {data:products,error:productError}=await admin.from("buildpulse_ad_products").select("id,width_px,height_px").eq("placement",placement).eq("active",true);
  if(productError||!products?.length)return null;
  const now=new Date().toISOString();
  const {data,error}=await admin.from("buildpulse_ad_orders")
    .select("id,headline,copy_text,destination_url,product_id,starts_at,ends_at")
    .eq("status","active").in("product_id",products.map(product=>product.id))
    .lte("starts_at",now).gte("ends_at",now).order("created_at",{ascending:true}).limit(1).maybeSingle();
  if(error||!data)return null;
  const product=products.find(item=>item.id===data.product_id);
  return <aside className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`} aria-label="Advertisement">
    <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Advertisement</span>{product?.width_px&&product?.height_px?<span className="text-[10px] text-slate-400">{product.width_px} × {product.height_px}</span>:null}</div>
    {product?.width_px&&product?.height_px?<img src={`/api/buildpulse/ads/creative/${encodeURIComponent(data.id)}`} alt={data.headline||"Sponsor creative"} width={product.width_px} height={product.height_px} className="mt-3 h-auto w-full rounded-xl object-cover"/>:null}\n    {data.headline?<h3 className="mt-3 text-lg font-black">{data.headline}</h3>:null}
    {data.copy_text?<p className="mt-2 text-sm leading-6 text-slate-600">{data.copy_text}</p>:null}
    <img alt="" aria-hidden="true" width="1" height="1" src={`/api/buildpulse/ads/impression?order=${encodeURIComponent(data.id)}`} className="absolute h-px w-px opacity-0"/><a className="mt-4 inline-flex font-bold underline" href={`/api/buildpulse/ads/click?order=${encodeURIComponent(data.id)}`} rel="sponsored noopener noreferrer" target="_blank">Visit sponsor →</a>
  </aside>
}
