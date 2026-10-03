create index if not exists idx_bp_connections_safety_reviewed_by
on public.buildpulse_user_safety_actions(reviewed_by)
where reviewed_by is not null;
