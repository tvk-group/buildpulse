import Link from "next/link";
export function BuildPulseFooterInvite({surface="footer",product="buildpulse"}:{surface?:string;product?:string}){
 const href=`/buildpulse/intelligence?source=${encodeURIComponent(surface)}&product=${encodeURIComponent(product)}`;
 return <div className="rounded-xl border border-slate-700/40 p-4"><p className="text-xs font-black tracking-[.14em]">TVK BUILDPULSE</p><p className="mt-1 text-sm opacity-75">Global Technology & Digital Intelligence.</p><Link href={href} className="mt-2 inline-block text-sm font-bold underline">Receive BuildPulse →</Link></div>
}
