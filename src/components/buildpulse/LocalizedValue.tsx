"use client";import {formatLocalCurrency,formatLocalDate,formatLocalNumber} from "@/lib/buildpulse/localization";
export function LocalizedDate({value,dateOnly=false}:{value:string|number|Date;dateOnly?:boolean}){return <time dateTime={new Date(value).toISOString()}>{formatLocalDate(value,dateOnly?{dateStyle:"medium"}:{dateStyle:"medium",timeStyle:"short"})}</time>}
export function LocalizedCurrency({value,currency}:{value:number|string;currency:string}){return <span>{formatLocalCurrency(Number(value),currency,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>}
export function LocalizedNumber({value}:{value:number|string}){return <span>{formatLocalNumber(Number(value))}</span>}
