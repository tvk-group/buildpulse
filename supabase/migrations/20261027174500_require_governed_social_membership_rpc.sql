-- Membership and role assignment are validated in protected RPC implementations.
-- Direct client INSERT bypasses managed invitation/authorization checks.
-- Existing authenticated member SELECT and service-role/backend operations
-- are unchanged; public RPC wrappers remain executable by authenticated users.
REVOKE INSERT ON TABLE public.buildpulse_social_members FROM anon, authenticated;
