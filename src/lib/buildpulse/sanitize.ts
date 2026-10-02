const DANGEROUS_BLOCK=/<(script|iframe|object|embed|form|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const DANGEROUS_TAG=/<\/?(?:script|iframe|object|embed|form|input|button|textarea|select|option|meta|base|link|style|svg|math)[^>]*>/gi;
const EVENTS=/\s+on[a-z][a-z0-9_-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const STYLE=/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const URL_ATTR=/\s+(href|src)\s*=\s*(["'])(.*?)\2/gi;
export function sanitizeBuildPulseHtml(html:string){
 return html.replace(DANGEROUS_BLOCK,"").replace(DANGEROUS_TAG,"").replace(EVENTS,"").replace(STYLE,"").replace(URL_ATTR,(_m,a,q,v)=>{const value=String(v).trim();if(value.startsWith("#")||/^(https?:|mailto:)/i.test(value))return ` ${a}=${q}${value}${q}`;return ` ${a}=${q}#${q}`;});
}
