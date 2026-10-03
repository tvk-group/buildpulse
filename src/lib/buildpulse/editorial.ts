export const BUILDPULSE_SECTIONS = [
  "lead","markets","ai","blockchain","security","digital-economy","research","technology","watchlist"
] as const;

export type BuildPulseSection=(typeof BUILDPULSE_SECTIONS)[number];

export const BUILDPULSE_EDITORIAL_POLICY = {
  brand:"TVK BuildPulse",
  strapline:"Global Technology & Digital Intelligence",
  provider:"brevo",
  database:"supabase",
  rules:[
    "Never invent prices, statistics, partnerships, audits, certifications, releases or corporate milestones.",
    "Preserve source provenance for factual assertions.",
    "Separate sourced facts from analysis and forward-looking interpretation.",
    "Require approved internal evidence for any affiliated-company corporate claim.",
    "Do not send marketing email to suppressed, unsubscribed, pending, or unverified-consent contacts.",
    "Prefer primary sources, regulators and original research over aggregators.",
    "Deduplicate syndicated stories before editorial ranking."
  ]
} as const;

export function editorialScore(input:{trustTier:number;freshness:number;impact:number;originality:number;corroboration:number}) {
  const clamp=(n:number)=>Math.max(0,Math.min(100,n));
  const trust=clamp((6-input.trustTier)*20);
  return Number((trust*.30+clamp(input.freshness)*.20+clamp(input.impact)*.25+clamp(input.originality)*.10+clamp(input.corroboration)*.15).toFixed(2));
}
