"use client";
import {useState} from "react";
type Props={id:string;name:string;width?:number;height?:number;className?:string;priority?:boolean};
/** Prefer the original photorealistic portrait asset; retain existing asset until binary upload is complete. */
export function ContributorPortrait({id,name,width=320,height=320,className="",priority=false}:Props){
 const [fallback,setFallback]=useState(false);
 return <img src={`/blog/contributors/${id}.${fallback?"svg":"webp"}`} alt={`${name} — fictional AI-generated editorial contributor portrait`} width={width} height={height} loading={priority?"eager":"lazy"} decoding="async" className={className} onError={()=>{if(!fallback)setFallback(true)}}/>;
}
