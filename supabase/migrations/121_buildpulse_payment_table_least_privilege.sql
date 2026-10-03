-- Remove inherited broad grants from payment state tables.
-- Payment quotes/events are server-written; authenticated owners retain read-only access through RLS.
revoke all on table public.buildpulse_ad_payment_events from anon, authenticated;
revoke all on table public.buildpulse_ad_payment_quotes from anon, authenticated;
grant select on table public.buildpulse_ad_payment_events to authenticated;
grant select on table public.buildpulse_ad_payment_quotes to authenticated;

-- Advertising orders are never anonymous. Creation is handled by authenticated application paths;
-- direct table access remains read-only for authenticated owners.
revoke all on table public.buildpulse_ad_orders from anon;
