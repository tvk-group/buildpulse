"use client";
import {useEffect} from "react";
export const BUILDPULSE_LOCALES=["en","de","tr","fr","es","it","pt","nl","pl","ro","el","ar","zh","ja","ko","hi"] as const;
export type BuildPulseLocale=typeof BUILDPULSE_LOCALES[number];
const KEY="buildpulse.locale",TZ="buildpulse.timeZone";
export function normalizeBuildPulseLocale(input?:string|null):BuildPulseLocale{const x=(input||"en").toLowerCase().replace("_","-"),base=x.split("-")[0];return (BUILDPULSE_LOCALES as readonly string[]).includes(base)?base as BuildPulseLocale:"en"}
export function getDeviceLocale(){if(typeof navigator==="undefined")return "en" as BuildPulseLocale;return normalizeBuildPulseLocale(navigator.languages?.[0]||navigator.language)}
export function getDeviceTimeZone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC"}catch{return"UTC"}}
export function setBuildPulseLocale(locale:string){const l=normalizeBuildPulseLocale(locale);try{localStorage.setItem(KEY,l)}catch{};document.cookie=`bp_locale=${encodeURIComponent(l)}; Path=/; Max-Age=31536000; SameSite=Lax`;document.documentElement.lang=l;document.documentElement.dir=["ar"].includes(l)?"rtl":"ltr";window.dispatchEvent(new CustomEvent("buildpulse:locale",{detail:{locale:l}}))}
export function getBuildPulseLocale(){try{return normalizeBuildPulseLocale(localStorage.getItem(KEY)||getDeviceLocale())}catch{return getDeviceLocale()}}
export function BuildPulseLocalization(){useEffect(()=>{const locale=getBuildPulseLocale(),timeZone=getDeviceTimeZone();setBuildPulseLocale(locale);try{localStorage.setItem(TZ,timeZone)}catch{};document.cookie=`bp_timezone=${encodeURIComponent(timeZone)}; Path=/; Max-Age=31536000; SameSite=Lax`},[]);return null}
export function formatLocalDate(value:string|number|Date,opts:Intl.DateTimeFormatOptions={dateStyle:"medium",timeStyle:"short"}){const locale=typeof window!=="undefined"?getBuildPulseLocale():"en";return new Intl.DateTimeFormat(locale,{...opts,timeZone:typeof window!=="undefined"?getDeviceTimeZone():undefined}).format(new Date(value))}
export function formatLocalNumber(value:number,opts:Intl.NumberFormatOptions={}){const locale=typeof window!=="undefined"?getBuildPulseLocale():"en";return new Intl.NumberFormat(locale,opts).format(value)}
