CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO public.buildpulse_private_settings(key,value,updated_at)
SELECT 'subscriber_preference_secret', encode(gen_random_bytes(32),'hex'), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.buildpulse_private_settings WHERE key='subscriber_preference_secret'
);

COMMENT ON TABLE public.buildpulse_private_settings IS
'Server-only BuildPulse runtime settings, including payment and subscriber-link signing material. No browser role has a policy.';
