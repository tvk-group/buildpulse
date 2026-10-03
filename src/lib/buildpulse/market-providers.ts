type Quote={symbol:string;price:number;currency?:string;timestamp:string;provider:string;realtime:boolean};
const env=(n:string)=>process.env[n]?.trim();
async function json(url:string,headers?:Record<string,string>){const c=new AbortController(),t=setTimeout(()=>c.abort(),8000);try{const r=await fetch(url,{headers,signal:c.signal,cache:"no-store"});if(!r.ok)throw new Error("market_provider_"+r.status);return await r.json()}finally{clearTimeout(t)}}

export async function twelveDataQuote(symbol:string):Promise<Quote|null>{const key=env("TWELVE_DATA_API_KEY");if(!key)return null;const d=await json("https://api.twelvedata.com/quote?symbol="+encodeURIComponent(symbol),{Authorization:"apikey "+key});const p=Number(d.close??d.price);if(!Number.isFinite(p))return null;return{symbol:String(d.symbol??symbol),price:p,currency:d.currency,timestamp:new Date().toISOString(),provider:"Twelve Data",realtime:true}}

export async function finnhubQuote(symbol:string):Promise<Quote|null>{const key=env("FINNHUB_API_KEY");if(!key)return null;const d=await json("https://finnhub.io/api/v1/quote?symbol="+encodeURIComponent(symbol),{"X-Finnhub-Token":key});const p=Number(d.c);if(!Number.isFinite(p)||p<=0)return null;return{symbol,price:p,timestamp:d.t?new Date(Number(d.t)*1000).toISOString():new Date().toISOString(),provider:"Finnhub",realtime:true}}

export async function marketQuote(symbol:string){for(const fn of [twelveDataQuote,finnhubQuote]){try{const q=await fn(symbol);if(q)return q}catch(e){console.warn("buildpulse_market_provider_failure",{provider:fn.name,symbol,error:e instanceof Error?e.message:"unknown"})}}return null}

export async function fredLatest(seriesId:string){const key=env("FRED_API_KEY");if(!key)return null;const u=new URL("https://api.stlouisfed.org/fred/series/observations");u.searchParams.set("series_id",seriesId);u.searchParams.set("api_key",key);u.searchParams.set("file_type","json");u.searchParams.set("sort_order","desc");u.searchParams.set("limit","1");const d=await json(u.toString());const x=d.observations?.[0],v=Number(x?.value);return Number.isFinite(v)?{seriesId,value:v,date:x.date,provider:"FRED",retrievedAt:new Date().toISOString()}:null}
