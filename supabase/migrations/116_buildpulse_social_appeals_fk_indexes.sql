-- Cover Social appeal foreign keys used by moderation joins and referential actions.
create index if not exists idx_buildpulse_social_appeals_post
  on public.buildpulse_social_appeals(post_id);
create index if not exists idx_buildpulse_social_appeals_safety_action
  on public.buildpulse_social_appeals(safety_action_id);
create index if not exists idx_buildpulse_social_appeals_reviewed_by
  on public.buildpulse_social_appeals(reviewed_by);
