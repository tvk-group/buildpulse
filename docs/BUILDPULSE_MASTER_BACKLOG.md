# BuildPulse Master Execution Backlog

**Scope:** BuildPulse only. Accidental references to ENTELΞKRON, SOVRA or other projects are excluded unless explicitly re-authorized.
**Rule:** This file is the durable execution ledger. Update status and evidence with every implementation batch. Never mark DONE without deployed/verified evidence where deployment is required.

## P0 — Production release health
- [x] Restore Next.js/Vercel production build to READY — fixed malformed/unclosed Arts contribute component; production deployment dpl_HbuDava2HYUqrrLkrNmE8WHkgZc6 READY at c1cecddd70fa3792b778d02f8cb60bed37e414a8.
- [ ] Verify buildpulse.news serves current production SHA and complete browser/mobile route QA.
- [ ] Verify mobile navigation, PWA install control and visible update flow on production.
- [x] Repair secure scheduled ingestion without fail-open — Vercel cron authentication now passes but its runtime lacks Supabase admin access; a service-authenticated Supabase pg_cron + pg_net → Edge fallback is ACTIVE hourly and production ingestion completed successfully on 2026-10-03.
- [ ] Run production route, security, accessibility, performance, SEO and PWA checks.

## P0 — Identity, workforce and control plane
- [x] Workforce RBAC schema: founder/admin/engineering/editorial/finance/advertising/moderation/support/analyst/contractor.
- [x] Workforce profiles, expiry/revocation, MFA/passkey requirements and audit schema.
- [x] Role-scoped /workforce portal and server authorization helper.
- [x] Initial /workforce/control operations command center.
- [x] Enforce Supabase AAL2 MFA assurance before sensitive workforce actions; passkey requirement remains policy metadata until provider/runtime enforcement is completed.
- [ ] Add workforce device/session management and periodic access reviews. Periodic access-review records and founder/admin retain/revoke controls are implemented; the workforce security surface reports current Supabase Auth assurance/factors and can revoke all other active sessions behind workforce+AAL2 authorization. Per-device session inventory remains incomplete.
- [x] Add secure workforce invitation/onboarding and offboarding with hashed expiring invite tokens, scoped roles, contractor expiry, MFA redirect and audit logging.
- [x] Add unified authenticated client portal at /account for subscriptions, accounting documents, Social identity, contributor/art activity and advertiser access; production deployment dpl_EXva3NG8kQSjsKeBFjji1HJdW39q READY.
- [ ] Expand control plane: editorial, Social, ads, subscriptions, finance/tax, localization, moderation, infrastructure, incidents, analytics, approvals, audit explorer and notifications.

## P0 — AI/automation platform
- [x] Governed agent registry, run ledger and approval queue.
- [x] Seed News Desk, Localization, Social Ops, Finance Reconciliation, Platform Ops and Moderation agents.
- [x] Implement provider-neutral AI gateway with OpenAI, NVIDIA NIM and local/self-hosted adapters.
- [ ] Store provider secrets only in managed secrets/environment; never Git.
- [ ] Add model routing by task/cost/latency/privacy, budgets, rate limits, retries, fallback and observability.
- [x] Implement durable agent schedules, governed runtime, usage budgets/retries, authenticated execution API and hourly secured scheduler coverage with atomic schedule claiming.
- [ ] Automate low-risk ingestion, dedupe, scoring, drafts, SEO, approved-content scheduling, reconciliation, anomaly detection and reports.
- [x] Add auditable human approval inbox/API for agent proposals; generic approval does not execute arbitrary AI text. Technology long-form drafting is now source-grounded and autonomous-to-review; remaining domains are incomplete.
- [ ] Keep approval gates for unverified factual publication, tax/legal filing, money movement, destructive operations, permanent sanctions, role/security changes.
- [ ] Add prompt/version registry, evaluation datasets, hallucination/source-grounding checks and agent quality metrics.

## P0 — Editorial/news publication\n- [x] Add governed Technology Editorial Agent rotating TVK ecosystem, ENTELΞKRON, Sovereign AI, EnergieMIND and presale technology; generated articles remain review-gated and source-provenance checked.
- [x] Source ingestion/orchestration, story verification state and review provenance foundations.
- [x] Edition generation/review/scheduling/delivery foundations and immutable sent artifacts.
- [x] Make World/current news dynamic; remove stale hard-coded stories — /world now renders only verified runtime stories with canonical source provenance.
- [x] Implement source-grounded daily News of Day selection — homepage selects the highest-scored recent verified story; runtime requires verification timestamp, reviewer and canonical source provenance and fails empty rather than fabricating filler.
- [x] Complete newsroom control-plane workflows, corrections, complaints and takedowns — public case intake, rate limiting, editorial review, corrected/withheld/restored publication controls and workforce audit logging are implemented.
- [ ] Require sourced verification before factual publication; maintain provenance.
- [ ] Complete daily/weekly automated editions with human approval where required. Supabase pg_cron now invokes the production edition scheduler daily at 05:15 UTC; the 2026-10-03 run completed and generated an eight-story draft, then correctly failed closed at the non-core-lead quality gate with no dispatch. Application selection now requires a core digital-intelligence lead. Monday-weekly generation, founder approval/revision binding and no-delivery-before-approval remain in force; a successful core-lead review draft and end-to-end approved delivery are still required before completion.

## P0 — Payments, subscriptions, invoicing and accounting
- [x] Stripe Intelligence products/prices/payment links created.
- [x] Safe subscription checkout success route.
- [x] Stripe subscription webhook foundations.
- [x] Accounting entity/customer/tax evidence/invoice/credit-note/receipt schema.
- [x] Double-entry journal, chart of accounts, periods, monthly/annual summaries and trial balance.
- [x] TVK Labs & Technologies LTD, company no. 16481808, default GBP accounting entity.
- [ ] Confirm/store real VAT registrations only; never invent VAT numbers.
- [ ] Enable/configure Stripe Tax against actual registrations and verified product tax codes.
- [ ] Capture billing address, customer B2B/B2C status, tax ID validation and location evidence. Billing address/B2B-B2C/tax-ID capture is deployed; tax IDs remain explicitly unverified and authoritative validation/location evidence remain incomplete.
- [ ] Automatic invoice PDF/email after verified purchase.
- [x] Add concurrency-safe sequential accounting document numbering.
- [ ] Automatic credit notes/refunds/disputes and journal entries. Stripe refunds now create idempotent sequential CRN documents and update invoice/order state; dispute handling exists, while tax/FX-safe refund and dispute journal posting remains incomplete.
- [ ] Journal Stripe fees, deferred subscription revenue and revenue recognition after verified FX/reconciliation. Paid base-currency invoices now post balanced cash/tax/revenue journals automatically; foreign-currency invoices remain fail-closed pending FX.
- [x] Add equivalent settlement accounting evidence for crypto/off-Stripe payments — verified crypto settlements now atomically persist invoice/payment state plus immutable quote/rate/destination/tx/confirmation evidence; tax determination remains separately fail-closed.
- [ ] Monthly close package, VAT/GST/sales-tax reports, annual balance/P&L/trial balance and accountant export. MFA/finance-role close-control surface is implemented with fail-closed FX/tax/crypto-tax blockers; statutory tax reports and accountant export remain incomplete.
- [x] Complete core subscription entitlement lifecycle — six verified live Stripe subscription links are exposed; signed checkout/subscription/invoice webhooks activate, pause/cancel and mark past-due entitlements; authenticated accounts safely claim matching unbound entitlements; and the live Stripe Customer Portal supports billing identity/payment-method updates, invoice history and cancel-at-period-end. Plan switching remains intentionally disabled pending explicit proration policy.
- [x] Persist signed Stripe invoice paid/payment-failed events into accounting customer/document records; Stripe webhook Edge Function v6 ACTIVE and posts paid base-currency invoices to balanced journals.
- [ ] Daily/weekly subscriber preferences, watchlists, delivery, unsubscribe and service-email controls.
- [x] Refactor payment function to lazy per-rail environment loading — rail configuration now resolves lazily and fails closed when required server-side settings are absent.
- [ ] Complete secure verifiers for SOL/BNB/POL/TRX/ADA/SUI/AVAX and verify USDT Base contract authoritatively.
- [x] Never accept tx hash alone as proof of payment — enabled crypto rails verify chain destination, amount/token transfer, quote window and required confirmations before atomic settlement.

## P0 — Social network
- [x] Social profiles, follows, posts/blogs, reactions, conversations, ciphertext-only messages and safety schema.
- [x] Agent/robot account permissions and advertising schema.
- [ ] Complete auth/account onboarding with email/phone and unique handles. Authenticated unique-handle Social profile onboarding is now implemented; phone onboarding remains incomplete.
- [x] Complete production feed, profiles, follow/reaction/comment APIs — public feed, authenticated profile/post/blog publishing, server-mediated follow/reaction/comment actions, and interactive Social controls are implemented; production deployment verification remains part of release QA.
- [x] Blogs publishing workflow — /blog now renders live public long-form Social posts and provides authenticated profile-gated blog publishing through the existing rate-limited Social API; automated authors remain disclosed.
- [ ] Direct chat, groups and channels.
- [ ] Select and implement mature audited E2EE protocol; no custom crypto.
- [ ] Device/session/key recovery, export/deletion and metadata minimization.
- [ ] Creator tools and monetization.
- [ ] Contextual/consent-based Sponsored advertising; no hidden surveillance targeting.
- [ ] Media upload/storage/transcoding, malware scanning and quotas.
- [ ] Notifications/push.
- [ ] Add abuse-rate controls and appeals.
- [x] Add block/mute/report controls, per-reader feed filtering, report review state, moderator hide/dismiss/review actions and Control Plane moderation queue.
- [ ] Cloud/storage subscriptions and premium names/features.
- [ ] AI agents/robots visibly non-human with controller attribution and scoped permissions.

## P0 — Security/PQC
- [x] PQC policy and crypto-agility/device-key schema.
- [x] Expand cryptographic inventory with evidence-based current/target/PQ state across Social messaging, TLS, database, auth, webhook MAC, secrets and backups; exposed in Control Plane.
- [ ] Hybrid classical + ML-KEM key establishment where mature audited runtime supports it.
- [ ] Hybrid classical + ML-DSA signatures where appropriate.
- [ ] Verify TLS/CDN hybrid-PQ capability.
- [ ] Admin passkeys/MFA, secret rotation, SBOM/dependency review and backup/storage encryption.
- [ ] Downgrade protection, key rotation/recovery and independent security review.
- [ ] Do not market as quantum-secure until protocol and review gates are satisfied.

## P1 — Localization/local setup
- [x] Detect supported browser/device locale and IANA time zone.
- [x] Persist explicit language override and set document language/direction.
- [x] Capture subscriber locale/time zone.
- [ ] Move every UI string into locale dictionaries.
- [ ] Complete translations for all supported navigation languages; no fake translated UI.
- [x] Add source-grounded AI story-localization draft pipeline and audited approve/reject workflow.
- [ ] Localize SEO metadata, transactional email, notifications and legally appropriate invoice text.
- [ ] Local currency/date/time/number formatting and time-zone aware scheduling.
- [ ] Localize Social/Blogs/Marketplace/Connections/Workforce surfaces.
- [x] Compact masthead navigation into editorial dropdown groups while preserving BuildPulse design.
- [x] Add Local news source geography model, localized-story storage, verified Local API and /local edition page.
- [ ] Populate country/region/city source registry at global scale. Known source geography/language metadata is seeded; hourly budget-limited localization drafts and Control Plane translation review are implemented.
- [ ] Keep billing/tax jurisdiction independent from browser language/time zone.

## P1 — Mobile/PWA
- [x] Responsive mobile navigation source fix.
- [x] Install control + Android fallback guidance.
- [x] User-visible service-worker update flow.
- [ ] Verify all three on production Android/mobile after build is green.
- [ ] Complete offline/cache strategy and PWA QA.

## P1 — Advertising/affiliate
- [x] Advertising catalog and Stripe links foundations.
- [x] Resolve duplicate newsletter placement/product ambiguity — unused duplicate NEWSLETTER_SPONSOR was deactivated after confirming zero orders; NEWSLETTER_PRIMARY is the single active $750/day newsletter sponsor SKU.
- [ ] Full advertiser self-service campaign workflow and review.
- [ ] Clearly label Sponsored placements.
- [ ] Contextual/consent targeting only.
- [ ] Affiliate account/referral code/attribution/commission/fraud/payout/tax/KYC system.
- [ ] Activate only real approved affiliate destinations.
- [ ] Sports/betting/casino advertising only with age/jurisdiction controls, disclosures and responsible-gambling safeguards.

## P1 — Contributor and Arts
- [x] Contributor and art submission database foundations/pages.
- [ ] Authenticated submission forms and uploads. Authenticated contributor and Arts submission forms are implemented and account-bound; file uploads remain disabled until scanned media storage is available.
- [x] Tie contributor fee to submission ID and verified webhook — Stripe Checkout binds submission/user IDs in metadata and the signed webhook validates USD 149, ownership, state and idempotency before marking the submission paid.
- [ ] Human review/publishing, labels, corrections, complaints/takedowns.
- [ ] Arts showcase, rights evidence and admin review.

## P1 — Marketplace and Connections
- [x] Core database/page foundations.
- [ ] Complete listing/sell/search/contact transaction workflows.
- [ ] Trust/safety, reporting, moderation and anti-fraud.
- [ ] Connections discovery/messaging/privacy workflows.

## P1 — Markets/Intelligence
- [x] Crypto and FX ticker foundations.
- [ ] Licensed/verified indices, metals and global exchange feeds; never fabricate. Twelve Data/Finnhub market adapters and TradingView visualization are integrated; quote API now exposes provider, observation time and real-time/reference status, while full licensed global indices/metals coverage remains incomplete.
- [x] Align ticker behavior consistently across BuildPulse pages — shared market tape consumes the normalized market endpoint and visibly labels source plus LIVE/REF freshness semantics.
- [ ] Intelligence subscriber dashboard/watchlists.
- [ ] Public/licensed-data-only analysis; never sell MNPI/leaked/confidential information.
- [ ] Forecast methodology, provenance, timestamps and uncertainty.

## P1 — Email/delivery
- [x] Brevo bulk/newsletter foundation.
- [ ] Company-domain transactional mail adapter. buildpulse.news exists in Resend but verification is not started; live DNS inspection on 2026-10-03 confirmed required DKIM, send MX/SPF and rsend CNAME records are absent, so delivery remains fail-closed.
- [ ] Create/verify required company mailboxes before using them.
- [ ] Keep suppression/bounce/unsubscribe safety for bulk mail.
- [ ] Localized invoice, subscription, workforce and system emails.

## P1 — SEO, measurement, accessibility
- [x] NewsArticle schema, RSS, robots/sitemap/news sitemap, OG/X metadata and consent-gated measurement foundations.
- [ ] Production validation of canonical URLs, structured data and feeds.
- [ ] Accessibility audit and remediation.
- [ ] Performance/Core Web Vitals optimization.
- [ ] Consent/privacy validation for analytics and ads.

## P1 — Infrastructure/equipment
- [ ] Hybrid production architecture: cloud/CDN plus local AI/dev infrastructure.
- [ ] Dedicated ECC backend server, redundant NVMe, dual PSU.
- [ ] Backup/NAS 40–100 TB usable redundant storage plus encrypted off-site backup.
- [ ] AI/moderation server using available NVIDIA GPUs where suitable.
- [ ] Business firewall/router, managed 10GbE, UPS, redundant business internet.
- [ ] FIDO2 hardware keys for privileged workforce.
- [ ] CDN/DDoS/WAF, Redis/cache, object/media storage, queues, search, realtime, observability, secrets, DR.

## P2 — Ecosystem invitations and federation
- [ ] Optional BuildPulse invitations on eligible TVK ecosystem pages/emails only with explicit opt-in; never auto-subscribe and exclude sensitive flows.
- [ ] Maintain BuildPulse as standalone source of truth while exposing only evidence-backed integrations.

## Operating rules
- BuildPulse only unless scope is explicitly changed.
- Continue current/next/incomplete phases and report concrete progress.
- Repository backlog is canonical; update it as new instructions arrive.
- Do not claim production-live without verified deployment READY.
- Do not invent credentials, registrations, partners, data feeds, audits, translations, payments or legal/tax status.
- Public factual/news content requires source verification and provenance.
- Automation must be observable, auditable, reversible where practical and fail closed on high-risk uncertainty.
