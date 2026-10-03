-- BuildPulse production performance and RLS cleanup.

DROP POLICY IF EXISTS "customer reads own accounting profile" ON public.buildpulse_accounting_customers;
CREATE POLICY "customer reads own accounting profile"
ON public.buildpulse_accounting_customers
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "customer reads own accounting documents" ON public.buildpulse_accounting_documents;
CREATE POLICY "customer reads own accounting documents"
ON public.buildpulse_accounting_documents
FOR SELECT TO authenticated
USING (
  customer_id IN (
    SELECT id FROM public.buildpulse_accounting_customers
    WHERE user_id = (SELECT auth.uid())
  )
);

-- Consolidate Connections SELECT policies; keep write ownership explicit.
DROP POLICY IF EXISTS bp_connections_own ON public.buildpulse_connections_profiles;
DROP POLICY IF EXISTS bp_connections_members ON public.buildpulse_connections_profiles;

CREATE POLICY bp_connections_select ON public.buildpulse_connections_profiles
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR visibility IN ('members','public'));

CREATE POLICY bp_connections_insert ON public.buildpulse_connections_profiles
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY bp_connections_update ON public.buildpulse_connections_profiles
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY bp_connections_delete ON public.buildpulse_connections_profiles
FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Foreign-key covering indexes reported by production advisors.
CREATE INDEX IF NOT EXISTS idx_bp_accounting_customers_user ON public.buildpulse_accounting_customers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bp_accounting_documents_customer ON public.buildpulse_accounting_documents(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bp_accounting_documents_entity ON public.buildpulse_accounting_documents(entity_id);
CREATE INDEX IF NOT EXISTS idx_bp_affiliate_clicks_link ON public.buildpulse_affiliate_clicks(affiliate_link_id,clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_art_submissions_user ON public.buildpulse_art_submissions(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_contributor_submissions_user ON public.buildpulse_contributor_submissions(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_intel_subscriptions_plan ON public.buildpulse_intelligence_subscriptions(plan_code,status);
CREATE INDEX IF NOT EXISTS idx_bp_intel_subscriptions_user ON public.buildpulse_intelligence_subscriptions(user_id,created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bp_journal_lines_account ON public.buildpulse_journal_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_bp_journal_lines_entry ON public.buildpulse_journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_bp_marketplace_listings_seller ON public.buildpulse_marketplace_listings(seller_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_marketplace_orders_buyer ON public.buildpulse_marketplace_orders(buyer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_marketplace_orders_listing ON public.buildpulse_marketplace_orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_bp_marketplace_orders_seller ON public.buildpulse_marketplace_orders(seller_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_social_agent_permissions_controller ON public.buildpulse_social_agent_permissions(controller_user_id);
CREATE INDEX IF NOT EXISTS idx_bp_social_messages_sender ON public.buildpulse_social_messages(sender_id,created_at DESC) WHERE sender_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bp_social_profiles_controller ON public.buildpulse_social_profiles(controller_user_id) WHERE controller_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bp_story_localizations_reviewer ON public.buildpulse_story_localizations(reviewed_by) WHERE reviewed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bp_safety_actions_target ON public.buildpulse_user_safety_actions(target_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_workforce_audit_actor ON public.buildpulse_workforce_audit_log(actor_user_id,created_at DESC) WHERE actor_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_role_assignments_granted_by ON public.role_assignments(granted_by) WHERE granted_by IS NOT NULL;
