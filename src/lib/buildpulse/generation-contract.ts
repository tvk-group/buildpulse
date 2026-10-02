export const BUILDPULSE_GENERATION_CONTRACT={
 factuality:"Only verified database stories may be used as factual inputs.",
 attribution:"Preserve source URLs and never convert analysis or forecasts into facts.",
 corporate:"TVK and EnteleKRON claims require verified internal evidence before publication.",
 financial:"Never create price targets, guaranteed returns, investment recommendations or fabricated market statistics.",
 subject:"Subject lines may summarize the strongest verified story but must not exaggerate beyond its evidence.",
 corrections:"Material factual errors require correction records rather than silent historical rewriting."
} as const;
export function buildEditorialPrompt(stories:Array<{title:string;summary?:string|null;canonical_url:string}>){return ["You are drafting TVK BuildPulse. Follow this immutable contract:",...Object.values(BUILDPULSE_GENERATION_CONTRACT),...stories.map((s,i)=>`SOURCE ${i+1}: ${s.title}\n${s.summary??""}\n${s.canonical_url}`)].join("\n\n")}
