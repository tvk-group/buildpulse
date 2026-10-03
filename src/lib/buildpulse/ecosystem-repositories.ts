export const TVK_PUBLIC_REPOSITORIES=[
"energiemind-dapp","archive-tvk-site","entelekron-OSAIC","entelekron-smartcontracts","entelekron-validator","entelelink","tvk-assets","tvk-docs","tvk-compliance","tvk-group-website","EnteleKRON","entelekron-portal","enteleclos","alvina-app","tvk-labs-technologies","sovra-network","eKRON","AlviKRON","MineKron","SoviKRON","kron.entelekron.org","puriKRON","restoKRON","puppykron-site","puppykron-token","SOVRA-protocol-token","Cerebthra","avasante","chronoseal","graphvault","q-presencee","entelescan","entelevault","sentientsignals","tvk-id","ava-sentient-site","tvk-cyberlab","cognethra","syntherra","warpkron","enm-network","LoNDoN-the-secret-of-women","restokron-token","entelewallet-site","enteleledger","alvinaflow","alvinaworld","entelekron-token","restokron-network","restokron-app","tvk-network","infrasphere-network","TVK-Infrastructure-Energy-Systems","energiemind-main","energiemind-shop","energiemind-org","energiemind.network","energiemind.io","entelewallet-app","entelekron-chain","Preflightaudit","opsline","entelepay","entelepoint","tvk-orbital","entelecard","webkron","enteleexchange","enteleexchange-api","enteleexchange-docs","enteleexchange-status","osoix","wallet-address-creation","cesal","entelekron-financial-infrastructure","entelebank","tvk-wallet-platform","tvk-wallet-site","aerospace","asodi","enteleagent","enteleagent-app","entelerobot","entelerobot-app","entelequant","buildpulse"
] as const;

const normalize=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]+/g,"");
export function repositoryContext(query:string){
 const q=query.toLowerCase(),n=normalize(query);
 const broad=/\b(repos?|repositories|projects?|products?|ecosystem|everything|all)\b/i.test(query);
 const matches=TVK_PUBLIC_REPOSITORIES.filter(r=>broad||n.includes(normalize(r))||normalize(r).includes(n)).slice(0,broad?80:12);
 if(!matches.length)return "";
 return "TVK GROUP PUBLIC REPOSITORY REGISTRY:\nThe following repository names are inventory evidence only; do not infer launch status, capabilities, audits, partnerships or production readiness from a repository name.\n"+matches.map(r=>"- tvk-group/"+r).join("\n");
}
