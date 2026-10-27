-- Default-deny future postgres-created public tables and sequences.
-- New browser-facing objects must declare explicit GRANT and RLS policies in
-- their migration; server-side service_role defaults are left unchanged.
-- Existing tables, functions and materialized data are not modified.
-- Supabase-managed supabase_admin defaults are not modified.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
