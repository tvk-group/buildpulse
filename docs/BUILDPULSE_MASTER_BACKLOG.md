# BuildPulse Master Execution Backlog

**Scope:** BuildPulse only. Accidental references to ENTELΞKRON, SOVRA or other projects are excluded unless explicitly re-authorized.
**Rule:** This file is the durable execution ledger. Update status and evidence with every implementation batch. Never mark DONE without deployed/verified evidence where deployment is required.

## P0 — Production release health
- [x] Restore Next.js/Vercel production build to READY — fixed malformed/unclosed Arts contribute component; production deployment dpl_HbuDava2HYUqrrLkrNmE8WHkgZc6 READY at c1cecddd70fa3792b778d02f8cb60bed37e414a8.
- [ ] Verify buildpulse.news serves current production SHA and complete browser/mobile route QA. Live browser smoke QA confirms the homepage and /blog render, exactly one SOVRA guide launcher is present, Cookie settings is on the opposite side without overlap, and Subscriptions/Build with AI are distinct destinations. Full authenticated/mobile viewport coverage remains open.
- [ ] Verify mobile navigation, PWA install control and visible update flow on production. Live production browser QA confirms the Install BuildPulse app control is rendered on homepage and /blog; Android/mobile viewport navigation and service-worker update UX remain open. SOVRA voice input is now production-enabled by same-origin microphone policy; final speech recognition submits a conversational turn and the guide expands/animates during browser TTS speech.
- [x] Repair secure scheduled ingestion without fail-open — Vercel cron authentication now passes but its runtime lacks Supabase admin access; a service-authenticated Supabase pg_cron + pg_net → Edge fallback is ACTIVE hourly and production ingestion completed successfully on 2026-10-03.
- [ ] Run production route, security, accessibility, performance, SEO and PWA checks. Production HTTP QA now confirms homepage, World, Local, Social, BuildPulse AI, manifest, service worker, robots, sitemap, news sitemap and RSS return 200. Baseline security headers, private-route crawler exclusions and private-route PWA cache exclusions are live; browser accessibility/Core Web Vitals and full mobile visual QA remain open. Submission workflows are excluded from the public sitemap and crawler access.

## P0 — Identity, workforce and control plane
- [x] Workforce RBAC schema: founder/admin/engineering/editorial/finance/advertising/moderation/support/analyst/contractor.
- [x] Workforce profiles, expiry/revocation, MFA/passkey requirements and audit schema.
- [x] Role-scoped /workforce portal and server authorization helper.
- [x] Initial /workforce/control operations command center.
- [x] Enforce Supabase AAL2 MFA assurance before sensitive workforce actions; passkey requirement remains policy metadata until provider/runtime enforcement is completed.
- [x] Add workforce device/session management and periodic access reviews — periodic review records and founder/admin retain/revoke controls are implemented; the workforce security surface reports provider-backed current-session assurance/factors and can revoke all other active sessions behind workforce+AAL2 authorization. BuildPulse intentionally does not maintain a shadow session-token/device database; provider-wide other-session revocation is the supported session-management boundary.
- [x] Add secure workforce invitation/onboarding and offboarding with hashed expiring invite tokens, scoped roles, contractor expiry, MFA redirect and audit logging.
- [x] Add unified authenticated client portal at /account for subscriptions, accounting documents, Social identity, contributor/art activity and advertiser access; production deployment dpl_EXva3NG8kQSjsKeBFjji1HJdW39q READY.
- [ ] Expand control plane: editorial, Social, ads, subscriptions, finance/tax, localization, moderation, infrastructure, incidents, analytics, approvals, audit explorer and notifications.

## P0 — AI/automation platform
- [x] Governed agent registry, run ledger and approval queue.
- [x] Seed News Desk, Localization, Social Ops, Finance Reconciliation, Platform Ops and Moderation agents.
- [x] Implement provider-neutral AI gateway with OpenAI, NVIDIA NIM and local/self-hosted adapters.
- [x] Store provider secrets only in managed secrets/environment; never Git — repository scan found no committed concrete Stripe/OpenAI/NVIDIA/Resend/Supabase service secrets; `.env.example` contains placeholders only and `.gitignore` excludes real `.env*` files. Missing production credentials remain fail-closed rather than substituted.
- [x] Add model routing by task/cost/latency/privacy, budgets, rate limits, retries, fallback and observability — task policies now filter providers by privacy boundary plus configured relative cost/latency classes before ordered fallback; finance reconciliation defaults local-only, moderation/ops prefer local, empty eligibility fails closed, and the Control Plane exposes effective routing policy alongside budgets, retries and usage/evaluation telemetry.
- [x] Implement durable agent schedules, governed runtime, usage budgets/retries, authenticated execution API and hourly secured scheduler coverage with atomic schedule claiming.
- [ ] Automate low-risk ingestion, dedupe, scoring, drafts, SEO, approved-content scheduling, reconciliation, anomaly detection and reports. Ingestion already performs deterministic URL/content-hash dedupe plus bounded editorial scoring; verified-story localization drafts are automated into review; agent schedules are atomic. Control Plane now reports failed/stale automation and ingestion metrics, and generic execute_low_risk AI output is observational-only unless a separately coded/audited action exists; high-risk language is escalated to approval. Remaining: concrete approved-content scheduling executor, reconciliation executor, broader SEO automation and durable incident/report workflows.
- [x] Add auditable human approval inbox/API for agent proposals; generic approval does not execute arbitrary AI text. Technology long-form drafting is now source-grounded and autonomous-to-review; remaining domains are incomplete.
- [x] Keep approval gates for unverified factual publication, tax/legal filing, money movement, destructive operations, permanent sanctions, role/security changes — agent runtime now escalates high-risk action language to a high-risk approval even for execute_low_risk agents; generic AI output cannot directly execute arbitrary actions.
- [ ] Add prompt/version registry, evaluation datasets, hallucination/source-grounding checks and agent quality metrics. Server-only versioned prompt and evaluation registries are live; AI usage telemetry records prompt key/version, and Technology Editorial is fail-closed on the approved active prompt with an unsupported-claims evaluation fixture. MFA-gated automated evaluation execution, durable pass/fail evidence and Control Plane quality metrics are now implemented; broader evaluation datasets remain open. A protected scheduled regression route and dedicated scheduler secret were implemented, but the production test correctly returned 503 because the Vercel runtime lacks Supabase admin credentials; the recurring cron was removed rather than left broken. Scheduled regression remains externally gated on that managed runtime configuration.

## P0 — Editorial/news publication\n- [x] Add governed Technology Editorial Agent rotating TVK ecosystem, ENTELΞKRON, Sovereign AI, EnergieMIND and presale technology; generated articles remain review-gated and source-provenance checked.
- [x] Source ingestion/orchestration, story verification state and review provenance foundations.
- [x] Edition generation/review/scheduling/delivery foundations and immutable sent artifacts.
- [x] Make World/current news dynamic; remove stale hard-coded stories — /world now renders only verified runtime stories with canonical source provenance.
- [x] Implement source-grounded daily News of Day selection — homepage selects the highest-scored recent verified story; runtime requires verification timestamp, reviewer and canonical source provenance and fails empty rather than fabricating filler.
- [x] Complete newsroom control-plane workflows, corrections, complaints and takedowns — public case intake, rate limiting, editorial review, corrected/withheld/restored publication controls and workforce audit logging are implemented.
- [x] Require sourced verification before factual publication; maintain provenance — PostgreSQL now rejects verified stories without verifier/timestamp/HTTPS canonical source and rejects active/corrected publication without that verified provenance; existing production inventory validated with zero violations.
- [ ] Complete daily/weekly automated editions with human approval where required. Supabase pg_cron now invokes the production edition scheduler daily at 05:15 UTC; the 2026-10-03 run completed and generated an eight-story draft, then correctly failed closed at the non-core-lead quality gate with no dispatch. Application selection now requires a core digital-intelligence lead. Controlled same-day regeneration preserved the edition ID/audit trail, incremented revision 1→2, selected a core economy/defence-aerospace lead, reset approval, and returned the edition to review/pending with no campaign dispatch. The scheduler now uses a dedicated edition secret and fails closed with `no_core_verified_lead` instead of falling back to a general/political lead. Monday-weekly generation and end-to-end human-approved delivery remain required before completion.

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
- [ ] Monthly close package, VAT/GST/sales-tax reports, annual balance/P&L/trial balance and accountant export. MFA/finance-role close-control surface is implemented with fail-closed FX/tax/crypto-tax blockers. A protected founder/admin/finance CSV export now emits posted journal-line evidence for bounded accounting periods; statutory VAT/GST/sales-tax reports remain incomplete and must stay gated on authoritative registrations/tax evidence.
- [x] Complete core subscription entitlement lifecycle — six verified live Stripe subscription links are exposed; signed checkout/subscription/invoice webhooks activate, pause/cancel and mark past-due entitlements; authenticated accounts safely claim matching unbound entitlements; and the live Stripe Customer Portal supports billing identity/payment-method updates, invoice history and cancel-at-period-end. Plan switching remains intentionally disabled pending explicit proration policy.
- [x] Persist signed Stripe invoice paid/payment-failed events into accounting customer/document records; Stripe webhook Edge Function v6 ACTIVE and posts paid base-currency invoices to balanced journals.
- [ ] Daily/weekly subscriber preferences, watchlists, delivery, unsubscribe and service-email controls. Signed subscriber preferences now persist cadence, topics, locale and validated IANA delivery time zone; subscription Intelligence preferences separately persist bounded topics/watchlists, delivery time zone, service-email consent and marketing consent. Signed unsubscribe creates suppression evidence. Actual outbound delivery remains fail-closed until the company mail domain is verified, and recipient-time-zone-aware campaign segmentation/scheduling remains open.
- [x] Refactor payment function to lazy per-rail environment loading — rail configuration now resolves lazily and fails closed when required server-side settings are absent.
- [ ] Complete secure verifiers for SOL/BNB/POL/TRX/ADA/SUI/AVAX and verify USDT Base contract authoritatively.
- [x] Never accept tx hash alone as proof of payment — enabled crypto rails verify chain destination, amount/token transfer, quote window and required confirmations before atomic settlement.
- [ ] Activate production crypto checkout across paid surfaces. Advertising has verified ETH (Ethereum/Base), BTC, USDC (Ethereum/Base), USDT (Ethereum) and XRP verifier paths and reports missing rail configuration explicitly. Contributor $149 now has production submission-bound quote/event storage, service-role-only atomic settlement, v12 Edge quote/chain verification and capability-driven quote/hash-verification UI. Intelligence subscriptions now have fixed-term crypto quote/verification, service-role-only atomic month/year entitlement extension, subscription-page controls and account-visible prepaid term history. Confirmed contributor/subscription settlements persist service-level accounting evidence and fail visibly if that evidence cannot persist. All crypto surfaces remain fail-closed until the shared BuildPulse Edge destination secrets are installed.

## P0 — Social network
- [x] Social profiles, follows, posts/blogs, reactions, conversations, ciphertext-only messages and safety schema.
- [x] Agent/robot account permissions and advertising schema.
- [ ] Complete auth/account onboarding with email/phone and unique handles. Authenticated unique-handle Social profile onboarding is now implemented; phone onboarding remains incomplete.
- [x] Complete production feed, profiles, follow/reaction/comment APIs — public feed, authenticated profile/post/blog publishing, server-mediated follow/reaction/comment actions, and interactive Social controls are implemented; production deployment verification remains part of release QA.
- [x] Blogs publishing workflow — /blog now renders live public long-form Social posts and provides authenticated profile-gated blog publishing through the existing rate-limited Social API; automated authors remain disclosed.
- [ ] Direct chat, groups and channels. Governed direct/group/channel creation, handle-based membership, recipient direct-message privacy checks, owner/moderator rules, member caps/rate limits, account management UI and ciphertext-only message APIs are implemented. Privileged membership checks now live behind private-schema authorization helpers to avoid recursive RLS and exposed SECURITY DEFINER RPCs. Plaintext chat/message UX remains intentionally disabled until a mature audited E2EE client protocol is selected and integrated.
- [ ] Select and implement mature audited E2EE protocol; no custom crypto.
- [ ] Device/session/key recovery, export/deletion and metadata minimization. Workforce can revoke all other Supabase Auth sessions. Authenticated own-session inventory is live through a private-schema privileged lookup/public invoker wrapper. Account export now covers Social, Marketplace, contributor, Arts, advertising, Intelligence subscriptions/crypto payments, accounting customer/documents and Connections, and fails closed with explicit failed-query diagnostics rather than silently returning a partial archive. A reversible 7-day account-deletion request/cancellation lifecycle is live. The hourly service-role-only due processor removes disposable Social/Connections state, anonymizes/suppresses retained user-facing content, withdraws Marketplace exposure, disables Intelligence delivery/marketing, revokes sessions and bans login while retaining financial/audit evidence. E2EE key recovery and full per-device key lifecycle remain incomplete.
- [ ] Creator tools and monetization.
- [x] Contextual/consent-based Sponsored advertising; no hidden surveillance targeting — runtime selection is placement-context only (homepage/archive/edition/newsletter) and records only coarse anti-fraud event fingerprints; it does not profile users or use hidden behavioral targeting.
- [ ] Media upload/storage/transcoding, malware scanning and quotas.
- [ ] Notifications/push.
- [x] Add abuse-rate controls and appeals — posts, messages, conversations, interactions, reports and appeals are bounded; rate-check database failures now fail closed, duplicate appeals/reports are suppressed, and profile mutations are throttled.
- [x] Add block/mute/report controls, per-reader feed filtering, report review state, moderator hide/dismiss/review actions and Control Plane moderation queue.
- [ ] Cloud/storage subscriptions and premium names/features.
- [x] AI agents/robots visibly non-human with controller attribution and scoped permissions — automated Social identities require disclosed automation/controller permission to publish; public feed labels them non-human and resolves only the controller’s public Social display identity.

## P0 — Security/PQC
- [x] PQC policy and crypto-agility/device-key schema.
- [x] Expand cryptographic inventory with evidence-based current/target/PQ state across Social messaging, TLS, database, auth, webhook MAC, secrets and backups; exposed in Control Plane.
- [ ] Hybrid classical + ML-KEM key establishment where mature audited runtime supports it.
- [ ] Hybrid classical + ML-DSA signatures where appropriate.
- [ ] Verify TLS/CDN hybrid-PQ capability.
- [ ] Admin passkeys/MFA, secret rotation, SBOM/dependency review and backup/storage encryption. Workforce sensitive actions enforce AAL2 MFA; weekly Dependabot and CodeQL configuration are committed, with major dependency upgrades held for compatibility review. Supply-chain CI now runs locked dependency installation, high-severity npm audit and pinned CycloneDX SBOM generation with 30-day artifact evidence on main/PR/weekly runs. Passkey runtime enforcement, secret-rotation evidence and backup/storage encryption verification remain open; SBOM workflow execution evidence must be green before that sub-gate is considered verified.
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
- [ ] Complete offline/cache strategy and PWA QA. Service worker now excludes private/submission routes, refuses private/no-store/Set-Cookie responses, and checks for updates when the installed app returns to foreground; physical Android/offline QA remains open.

## P1 — Advertising/affiliate
- [x] Advertising catalog and Stripe links foundations.
- [x] Resolve duplicate newsletter placement/product ambiguity — unused duplicate NEWSLETTER_SPONSOR was deactivated after confirming zero orders; NEWSLETTER_PRIMARY is the single active $750/day newsletter sponsor SKU.
- [x] Full advertiser self-service campaign workflow and review — advertiser portal supports account/profile, live inventory, server-priced campaign drafts, creative upload, Stripe/crypto payment initiation and verification, invoices and campaign metrics; paid campaigns remain gated by the role-protected advertising review/scheduling queue.
- [x] Clearly label Sponsored placements — runtime ad slots use an explicit Advertisement label and rel=sponsored; newsletter/edition commercial blocks render ADVERTISEMENT, affiliate blocks render AFFILIATE DISCLOSURE, and first-party ecosystem promotions are visibly labeled Sponsored with separation disclosure.
- [x] Contextual/consent targeting only — active-ad lookup is based on the requested page placement and campaign schedule, not reader identity or behavioral profile; optional analytics/marketing storage remains consent-gated separately.
- [ ] Affiliate account/referral code/attribution/commission/fraud/payout/tax/KYC system.
- [ ] Activate only real approved affiliate destinations.
- [ ] Sports/betting/casino advertising only with age/jurisdiction controls, disclosures and responsible-gambling safeguards.

## P1 — Contributor and Arts
- [x] Contributor and art submission database foundations/pages.
- [ ] Authenticated submission forms and uploads. Authenticated contributor and Arts submission forms are implemented and account-bound; file uploads remain disabled until scanned media storage is available.
- [x] Tie contributor fee to submission ID and verified webhook — Stripe Checkout binds submission/user IDs in metadata and the signed webhook validates USD 149, ownership, state and idempotency before marking the submission paid.
- [x] Human review/publishing, labels, corrections, complaints/takedowns — founder/admin review supports approve/reject and contributor publication; publishing is fail-closed on human approval, verified paid status and contributor rights/accuracy/responsibility confirmations. Published contributor articles are explicitly labeled and link directly into the auditable newsroom corrections/complaints/takedown workflow with their exact BuildPulse URL prefilled.
- [x] Arts showcase, rights evidence and admin review — rights/original-work/release declarations and portfolio evidence are captured; founder/admin human review records approve/reject decisions; /arts/showcase renders only human-approved/published work and preserves AI-assistance disclosure.

## P1 — Marketplace and Connections
- [x] Core database/page foundations.
- [ ] Complete listing/sell/search/contact transaction workflows. Production now has active-listing search, authenticated seller moderation submission, rate-limited buyer inquiries and MFA-gated audited approve/reject publication; protected checkout/order settlement remains gated on a regulated marketplace payment provider.
- [ ] Trust/safety, reporting, moderation and anti-fraud. Active listings now have authenticated rate-limited reporting with bounded reason codes, duplicate suppression, RLS-protected report records and an MFA/role-gated workforce review API; action decisions pause listings for review and are audit logged. Broader transaction anti-fraud remains incomplete.
- [ ] Connections discovery/messaging/privacy workflows. Authenticated account-bound profile editing and intent discovery are now implemented for friends, activities, travel, professional and adult-confirmed dating; discovery returns only members/public profiles, never asks for exact/live location, and user-initiated block/report controls are RLS-backed. Reciprocal block suppression, Connections-specific messaging handoff, moderation review integration and broader anti-abuse controls remain open.

## P1 — Markets/Intelligence
- [x] Crypto and FX ticker foundations.
- [ ] Licensed/verified indices, metals and global exchange feeds; never fabricate. Twelve Data/Finnhub market adapters and TradingView visualization are integrated; quote API now exposes provider, observation time and real-time/reference status, while full licensed global indices/metals coverage remains incomplete.
- [x] Align ticker behavior consistently across BuildPulse pages — shared market tape consumes the normalized market endpoint and visibly labels source plus LIVE/REF freshness semantics.
- [x] Intelligence subscriber dashboard/watchlists — authenticated /account/intelligence claims eligible signed-Stripe entitlements, exposes active/past-due/paused plan state, and persists bounded topic/watchlist, IANA delivery-time-zone, service-email and separate marketing-consent preferences with an audit event trail.
- [x] Public/licensed-data-only analysis policy — the generation contract and public methodology restrict analytical inputs to public or properly licensed information and explicitly reject confidential, leaked, material non-public or unlawfully obtained information.
- [x] Forecast methodology, provenance, timestamps and uncertainty — /markets/methodology publishes the standard, and the editorial generation contract requires source provenance plus forecast as-of time, horizon, material assumptions and uncertainty while prohibiting scenarios from being presented as observed facts.

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
