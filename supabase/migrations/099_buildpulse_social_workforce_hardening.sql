-- BuildPulse Social + workforce hardening after production schema reconciliation.

-- Retire unused browser-callable SECURITY DEFINER role helper.
REVOKE ALL ON FUNCTION public.buildpulse_has_role(text[]) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.buildpulse_has_role(text[]);

-- Social profiles.
ALTER TABLE public.buildpulse_social_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buildpulse_social_profiles FROM anon, authenticated;
GRANT SELECT ON public.buildpulse_social_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.buildpulse_social_profiles TO authenticated;

DROP POLICY IF EXISTS bp_social_profiles_public_read ON public.buildpulse_social_profiles;
CREATE POLICY bp_social_profiles_public_read ON public.buildpulse_social_profiles
FOR SELECT TO anon, authenticated
USING (discoverable = TRUE OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS bp_social_profiles_own_insert ON public.buildpulse_social_profiles;
CREATE POLICY bp_social_profiles_own_insert ON public.buildpulse_social_profiles
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS bp_social_profiles_own_update ON public.buildpulse_social_profiles;
CREATE POLICY bp_social_profiles_own_update ON public.buildpulse_social_profiles
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS bp_social_profiles_own_delete ON public.buildpulse_social_profiles;
CREATE POLICY bp_social_profiles_own_delete ON public.buildpulse_social_profiles
FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Follows.
ALTER TABLE public.buildpulse_social_follows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buildpulse_social_follows FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.buildpulse_social_follows TO authenticated;

DROP POLICY IF EXISTS bp_social_follows_party_read ON public.buildpulse_social_follows;
CREATE POLICY bp_social_follows_party_read ON public.buildpulse_social_follows
FOR SELECT TO authenticated
USING (follower_id = (SELECT auth.uid()) OR following_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS bp_social_follows_own_insert ON public.buildpulse_social_follows;
CREATE POLICY bp_social_follows_own_insert ON public.buildpulse_social_follows
FOR INSERT TO authenticated
WITH CHECK (follower_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS bp_social_follows_own_delete ON public.buildpulse_social_follows;
CREATE POLICY bp_social_follows_own_delete ON public.buildpulse_social_follows
FOR DELETE TO authenticated
USING (follower_id = (SELECT auth.uid()));

-- Posts.
ALTER TABLE public.buildpulse_social_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buildpulse_social_posts FROM anon, authenticated;
GRANT SELECT ON public.buildpulse_social_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.buildpulse_social_posts TO authenticated;

DROP POLICY IF EXISTS bp_social_posts_read ON public.buildpulse_social_posts;
CREATE POLICY bp_social_posts_read ON public.buildpulse_social_posts
FOR SELECT TO anon, authenticated
USING (
  author_id = (SELECT auth.uid())
  OR (
    status = 'published'
    AND (
      visibility = 'public'
      OR (
        visibility = 'followers'
        AND EXISTS (
          SELECT 1 FROM public.buildpulse_social_follows f
          WHERE f.follower_id = (SELECT auth.uid())
            AND f.following_id = author_id
        )
      )
    )
  )
);

DROP POLICY IF EXISTS bp_social_posts_own_insert ON public.buildpulse_social_posts;
CREATE POLICY bp_social_posts_own_insert ON public.buildpulse_social_posts
FOR INSERT TO authenticated
WITH CHECK (author_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS bp_social_posts_own_update ON public.buildpulse_social_posts;
CREATE POLICY bp_social_posts_own_update ON public.buildpulse_social_posts
FOR UPDATE TO authenticated
USING (author_id = (SELECT auth.uid()))
WITH CHECK (author_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS bp_social_posts_own_delete ON public.buildpulse_social_posts;
CREATE POLICY bp_social_posts_own_delete ON public.buildpulse_social_posts
FOR DELETE TO authenticated
USING (author_id = (SELECT auth.uid()));

-- Conversations and membership.
ALTER TABLE public.buildpulse_social_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildpulse_social_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buildpulse_social_conversations FROM anon, authenticated;
REVOKE ALL ON public.buildpulse_social_members FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.buildpulse_social_conversations TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.buildpulse_social_members TO authenticated;

DROP POLICY IF EXISTS bp_social_conversations_member_read ON public.buildpulse_social_conversations;
CREATE POLICY bp_social_conversations_member_read ON public.buildpulse_social_conversations
FOR SELECT TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.buildpulse_social_members m
    WHERE m.conversation_id = id AND m.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS bp_social_conversations_own_insert ON public.buildpulse_social_conversations;
CREATE POLICY bp_social_conversations_own_insert ON public.buildpulse_social_conversations
FOR INSERT TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS bp_social_conversations_owner_update ON public.buildpulse_social_conversations;
CREATE POLICY bp_social_conversations_owner_update ON public.buildpulse_social_conversations
FOR UPDATE TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.buildpulse_social_members m
    WHERE m.conversation_id = id
      AND m.user_id = (SELECT auth.uid())
      AND m.role = 'owner'
  )
)
WITH CHECK (
  created_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.buildpulse_social_members m
    WHERE m.conversation_id = id
      AND m.user_id = (SELECT auth.uid())
      AND m.role = 'owner'
  )
);

DROP POLICY IF EXISTS bp_social_members_member_read ON public.buildpulse_social_members;
CREATE POLICY bp_social_members_member_read ON public.buildpulse_social_members
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.buildpulse_social_members me
    WHERE me.conversation_id = conversation_id
      AND me.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS bp_social_members_self_insert ON public.buildpulse_social_members;
CREATE POLICY bp_social_members_self_insert ON public.buildpulse_social_members
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS bp_social_members_self_delete ON public.buildpulse_social_members;
CREATE POLICY bp_social_members_self_delete ON public.buildpulse_social_members
FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Ciphertext messages.
ALTER TABLE public.buildpulse_social_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buildpulse_social_messages FROM anon, authenticated;
GRANT SELECT, INSERT ON public.buildpulse_social_messages TO authenticated;

DROP POLICY IF EXISTS bp_social_messages_member_read ON public.buildpulse_social_messages;
CREATE POLICY bp_social_messages_member_read ON public.buildpulse_social_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.buildpulse_social_members m
    WHERE m.conversation_id = conversation_id
      AND m.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS bp_social_messages_member_insert ON public.buildpulse_social_messages;
CREATE POLICY bp_social_messages_member_insert ON public.buildpulse_social_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.buildpulse_social_members m
    WHERE m.conversation_id = conversation_id
      AND m.user_id = (SELECT auth.uid())
  )
);

-- Agent/robot delegated permissions.
ALTER TABLE public.buildpulse_social_agent_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buildpulse_social_agent_permissions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buildpulse_social_agent_permissions TO authenticated;

DROP POLICY IF EXISTS bp_social_agent_permissions_controller ON public.buildpulse_social_agent_permissions;
CREATE POLICY bp_social_agent_permissions_controller ON public.buildpulse_social_agent_permissions
FOR ALL TO authenticated
USING (controller_user_id = (SELECT auth.uid()))
WITH CHECK (controller_user_id = (SELECT auth.uid()));

-- Native ad campaigns and creatives.
ALTER TABLE public.buildpulse_social_ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildpulse_social_ad_creatives ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buildpulse_social_ad_campaigns FROM anon, authenticated;
REVOKE ALL ON public.buildpulse_social_ad_creatives FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.buildpulse_social_ad_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.buildpulse_social_ad_creatives TO authenticated;

DROP POLICY IF EXISTS bp_social_ad_campaigns_owner_read ON public.buildpulse_social_ad_campaigns;
CREATE POLICY bp_social_ad_campaigns_owner_read ON public.buildpulse_social_ad_campaigns
FOR SELECT TO authenticated
USING (advertiser_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS bp_social_ad_campaigns_owner_insert ON public.buildpulse_social_ad_campaigns;
CREATE POLICY bp_social_ad_campaigns_owner_insert ON public.buildpulse_social_ad_campaigns
FOR INSERT TO authenticated
WITH CHECK (advertiser_user_id = (SELECT auth.uid()) AND status = 'draft');

DROP POLICY IF EXISTS bp_social_ad_campaigns_owner_update ON public.buildpulse_social_ad_campaigns;
CREATE POLICY bp_social_ad_campaigns_owner_update ON public.buildpulse_social_ad_campaigns
FOR UPDATE TO authenticated
USING (advertiser_user_id = (SELECT auth.uid()) AND status IN ('draft','submitted','paused'))
WITH CHECK (advertiser_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS bp_social_ad_creatives_owner_read ON public.buildpulse_social_ad_creatives;
CREATE POLICY bp_social_ad_creatives_owner_read ON public.buildpulse_social_ad_creatives
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.buildpulse_social_ad_campaigns c
    WHERE c.id = campaign_id AND c.advertiser_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS bp_social_ad_creatives_owner_insert ON public.buildpulse_social_ad_creatives;
CREATE POLICY bp_social_ad_creatives_owner_insert ON public.buildpulse_social_ad_creatives
FOR INSERT TO authenticated
WITH CHECK (
  moderation_status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.buildpulse_social_ad_campaigns c
    WHERE c.id = campaign_id
      AND c.advertiser_user_id = (SELECT auth.uid())
      AND c.status IN ('draft','submitted')
  )
);

DROP POLICY IF EXISTS bp_social_ad_creatives_owner_update ON public.buildpulse_social_ad_creatives;
CREATE POLICY bp_social_ad_creatives_owner_update ON public.buildpulse_social_ad_creatives
FOR UPDATE TO authenticated
USING (
  moderation_status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.buildpulse_social_ad_campaigns c
    WHERE c.id = campaign_id
      AND c.advertiser_user_id = (SELECT auth.uid())
      AND c.status IN ('draft','submitted')
  )
)
WITH CHECK (moderation_status = 'pending');

-- Per-user cryptographic devices; system crypto inventory remains server-only.
ALTER TABLE public.buildpulse_social_crypto_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buildpulse_social_crypto_devices FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buildpulse_social_crypto_devices TO authenticated;

DROP POLICY IF EXISTS bp_social_crypto_devices_own ON public.buildpulse_social_crypto_devices;
CREATE POLICY bp_social_crypto_devices_own ON public.buildpulse_social_crypto_devices
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

ALTER TABLE public.buildpulse_crypto_inventory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buildpulse_crypto_inventory FROM anon, authenticated;
GRANT ALL ON public.buildpulse_crypto_inventory TO service_role;

-- Explicitly keep server-only control-plane tables server-only.
REVOKE ALL ON public.buildpulse_agents, public.buildpulse_agent_runs, public.buildpulse_agent_approvals,
  public.buildpulse_workforce_profiles, public.buildpulse_workforce_audit_log,
  public.buildpulse_accounting_entities, public.buildpulse_tax_registrations,
  public.buildpulse_ledger_accounts, public.buildpulse_journal_entries,
  public.buildpulse_journal_lines, public.buildpulse_accounting_periods,
  public.buildpulse_story_localizations
FROM anon, authenticated;

-- Cover the hottest new foreign keys.
CREATE INDEX IF NOT EXISTS idx_bp_agent_runs_agent ON public.buildpulse_agent_runs(agent_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_agent_runs_triggered_by ON public.buildpulse_agent_runs(triggered_by) WHERE triggered_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bp_agent_approvals_decided_by ON public.buildpulse_agent_approvals(decided_by) WHERE decided_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bp_social_follows_following ON public.buildpulse_social_follows(following_id,follower_id);
CREATE INDEX IF NOT EXISTS idx_bp_social_posts_author_created ON public.buildpulse_social_posts(author_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_social_members_user ON public.buildpulse_social_members(user_id,conversation_id);
CREATE INDEX IF NOT EXISTS idx_bp_social_messages_conversation_created ON public.buildpulse_social_messages(conversation_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_social_conversations_creator ON public.buildpulse_social_conversations(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bp_social_crypto_devices_user ON public.buildpulse_social_crypto_devices(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_social_ad_campaigns_owner ON public.buildpulse_social_ad_campaigns(advertiser_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_social_ad_creatives_campaign ON public.buildpulse_social_ad_creatives(campaign_id,created_at DESC);
