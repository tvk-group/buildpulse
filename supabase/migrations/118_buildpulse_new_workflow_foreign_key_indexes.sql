create index if not exists idx_bp_newsroom_cases_reviewed_by on public.buildpulse_newsroom_cases(reviewed_by);
create index if not exists idx_bp_stories_publication_control_by on public.buildpulse_stories(publication_control_by);
create index if not exists idx_bp_workforce_invites_accepted_by on public.buildpulse_workforce_invitations(accepted_by);
