-- Prevent bypass of server-side automation publishing/rate-limit/moderation guards.
-- Existing browser SELECT policies remain in place. The BuildPulse social
-- publishing endpoint uses service_role after authenticated authorization.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.buildpulse_social_posts
FROM anon, authenticated;

-- Ownership, conversation kind and encryption configuration are immutable to
-- direct clients. Conversation creation uses the verified membership RPC.
REVOKE UPDATE ON TABLE public.buildpulse_social_conversations
FROM anon, authenticated;
GRANT UPDATE (title, updated_at)
ON TABLE public.buildpulse_social_conversations TO authenticated;
