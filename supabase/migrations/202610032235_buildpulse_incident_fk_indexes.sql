create index if not exists idx_buildpulse_incident_events_actor_user on public.buildpulse_incident_events(actor_user_id);
create index if not exists idx_buildpulse_incidents_acknowledged_by on public.buildpulse_incidents(acknowledged_by);
create index if not exists idx_buildpulse_incidents_owner_user on public.buildpulse_incidents(owner_user_id);