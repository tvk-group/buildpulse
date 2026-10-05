-- Cover finance entity foreign keys reported by the production database advisor.
create index if not exists idx_buildpulse_close_snapshots_entity on public.buildpulse_close_snapshots(entity_id);
create index if not exists idx_buildpulse_stripe_fee_evidence_entity on public.buildpulse_stripe_fee_evidence(entity_id);
