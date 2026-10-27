-- Creating conversations must pass the protected buildpulse_social_create_conversation
-- RPC, which rate-limits creation and validates the peer's messaging preferences.
-- Direct client INSERT bypasses those checks; existing RPC uses a private
-- SECURITY DEFINER implementation with service-side write permissions.
REVOKE INSERT ON TABLE public.buildpulse_social_conversations FROM anon, authenticated;
