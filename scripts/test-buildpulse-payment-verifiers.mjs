import fs from "node:fs";
const source=fs.readFileSync(new URL("../supabase/functions/buildpulse-payment/index.ts",import.meta.url),"utf8");
const required=[
  'async function verifySolana',
  'async function verifyTron',
  'async function verifyCardano',
  'function railReleaseReady',
  'if(def.asset==="SUI")return false',
  'if(def.asset==="USDT"&&def.network==="Base")return false',
  'if(asset==="SOL")return verifySolana',
  'if(asset==="TRX")return verifyTron',
  'if(asset==="ADA")return verifyCardano',
  'assertRailReleaseReady(asset,rail.network)'
];
for(const needle of required)if(!source.includes(needle))throw new Error("payment verifier invariant missing: "+needle);
if(source.includes('const supported=new Set(["ETH","BTC","USDC","USDT","XRP"])'))throw new Error("legacy fixed payment capability allowlist returned");
console.log("BuildPulse payment verifier invariants OK");
