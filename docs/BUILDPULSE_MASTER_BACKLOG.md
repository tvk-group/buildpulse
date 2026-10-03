# BuildPulse Master Execution Backlog

**Scope:** BuildPulse only. Accidental references to ENTELΞKRON, SOVRA or other projects are excluded unless explicitly re-authorized.
**Rule:** This file is the durable execution ledger. Update status and evidence with every implementation batch. Never mark DONE without deployed/verified evidence where deployment is required.

## P0 — Production release health
- [x] Restore Next.js/Vercel production build to READY — fixed malformed/unclosed Arts contribute component; production deployment dpl_HbuDava2HYUqrrLkrNmE8WHkgZc6 READY at c1cecddd70fa3792b778d02f8cb60bed37e414a8.
- [ ] Verify buildpulse.news serves current production SHA and complete browser/mobile route QA.
- [ ] Verify mobile navigation, PWA install control and visible update flow on production.
- [ ] Repair secure cron authentication for /api/cron/buildpulse-ingest; never fail-open.
- [ ] Run production route, security, accessibility, performance, SEO and PWA checks.

## P0 — Identity, workforce and control plane
- [x] Workforce RBAC schema: founder/admin/engineering/editorial/finance/advertising/moderation/support/analyst/contractor.
- [x] Workforce profiles, expiry/revocation, MFA/passkey requirements and audit schema.
- [x] Role-scoped /workforce portal and server authorization helper.
- [x] Initial /workforce/control operations command center.
- [ ] Enforce actual MFA/passkey authentication assurance before sensitive actions.
- [ ] Add workforce invitation/onboarding, device/session management, access reviews and offboarding.
- [ ] Build client portal separately for subscribers/advertisers/contributors/creators/marketplace users.
- [ ] Expand control plane: editorial, Social, ads, subscriptions, finance/tax, localization, moderation, infrastructure, incidents, analytics, approvals, audit explorer and notifications.

## P0 — AI/automation platform
- [x] Governed agent registry, run ledger and approval queue.
- [x] Seed News Desk, Localization, Social Ops, Finance Reconciliation, Platform Ops and Moderation agents.
- [ ] Implement provider-neutral AI gateway with OpenAI, NVIDIA NIM and local/self-hosted adapters.
- [ ] Store provider secrets only in managed secrets/environment; never Git.
- [ ] Add model routing by task/cost/latency/privacy, budgets, rate limits, retries, fallback and observability.
- [ ] Implement agent scheduler/event triggers and idempotent execution.
- [ ] Automate low-risk ingestion, dedupe, scoring, drafts, localization drafts, SEO, approved-content scheduling, reconciliation, anomaly detection and reports.
- [ ] Keep approval gates for unverified factual publication, tax/legal filing, money movement, destructive operations, permanent sanctions, role/security changes.
- [ ] Add prompt/version registry, evaluation datasets, hallucination/source-grounding checks and agent quality metrics.

## P0 — Editorial/news publication
- [x] Source ingestion/orchestration, story verification state and review provenance foundations.
- [x] Edition generation/review/scheduling/delivery foundations and immutable sent artifacts.
- [ ] Make World/current news dynamic; remove stale hard-coded stories.
- [ ] Implement source-grounded daily News of Day selection.
- [ ] Complete newsroom control-plane workflows, corrections, complaints and takedowns.
- [ ] Require sourced verification before factual publication; maintain provenance.
- [ ] Complete daily/weekly automated editions with human approval where required.

## P0 — Payments, subscriptions, invoicing and accounting
- [x] Stripe Intelligence products/prices/payment links created.
- [x] Safe subscription checkout success route.
- [x] Stripe subscription webhook foundations.
- [x] Accounting entity/customer/tax evidence/invoice/credit-note/receipt schema.
- [x] Double-entry journal, chart of accounts, periods, monthly/annual summaries and trial balance.
- [x] TVK Labs & Technologies LTD, company no. 16481808, default GBP accounting entity.
- [ ] Confirm/store real VAT registrations only; never invent VAT numbers.
- [ ] Enable/configure Stripe Tax against actual registrations and verified product tax codes.
- [ ] Capture billing address, customer B2B/B2C status, tax ID validation and location evidence.
- [ ] Automatic sequential invoices/PDF/email after verified purchase.
- [ ] Automatic credit notes/refunds/disputes and journal entries.
- [ ] Journal Stripe fees, deferred subscription revenue and revenue recognition.
- [ ] Add equivalent accounting/tax evidence for crypto/off-Stripe payments.
- [ ] Monthly close package, VAT/GST/sales-tax reports, annual balance/P&L/trial balance and accountant export.
- [ ] Complete subscription entitlement lifecycle before exposing all checkout buttons.
- [ ] Daily/weekly subscriber preferences, watchlists, delivery, unsubscribe and service-email controls.
- [ ] Refactor payment function to lazy per-rail environment loading.
- [ ] Complete secure verifiers for SOL/BNB/POL/TRX/ADA/SUI/AVAX and verify USDT Base contract authoritatively.
- [ ] Never accept tx hash alone as proof of payment.

## P0 — Social network
- [x] Social profiles, follows, posts/blogs, reactions, conversations, ciphertext-only messages and safety schema.
- [x] Agent/robot account permissions and advertising schema.
- [ ] Auth/account onboarding with email/phone and unique handles.
- [ ] Production feed, profiles, follow/reaction/comment APIs.
- [ ] Blogs publishing workflow.
- [ ] Direct chat, groups and channels.
- [ ] Select and implement mature audited E2EE protocol; no custom crypto.
- [ ] Device/session/key recovery, export/deletion and metadata minimization.
- [ ] Creator tools and monetization.
- [ ] Contextual/consent-based Sponsored advertising; no hidden surveillance targeting.
- [ ] Media upload/storage/transcoding, malware scanning and quotas.
- [ ] Notifications/push.
- [ ] Moderation, block/report/mute, abuse/rate controls and appeals.
- [ ] Cloud/storage subscriptions and premium names/features.
- [ ] AI agents/robots visibly non-human with controller attribution and scoped permissions.

## P0 — Security/PQC
- [x] PQC policy and crypto-agility/device-key schema.
- [ ] Expand cryptographic inventory.
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
- [ ] Localize SEO metadata, transactional email, notifications and legally appropriate invoice text.
- [ ] Local currency/date/time/number formatting and time-zone aware scheduling.
- [ ] Localize Social/Blogs/Marketplace/Connections/Workforce surfaces.
- [x] Compact masthead navigation into editorial dropdown groups while preserving BuildPulse design.
- [x] Add Local news source geography model, localized-story storage, verified Local API and /local edition page.
- [ ] Populate country/region/city source registry and automate localized-source ingestion at scale.
- [ ] Keep billing/tax jurisdiction independent from browser language/time zone.

## P1 — Mobile/PWA
- [x] Responsive mobile navigation source fix.
- [x] Install control + Android fallback guidance.
- [x] User-visible service-worker update flow.
- [ ] Verify all three on production Android/mobile after build is green.
- [ ] Complete offline/cache strategy and PWA QA.

## P1 — Advertising/affiliate
- [x] Advertising catalog and Stripe links foundations.
- [ ] Resolve duplicate newsletter placement/product ambiguity.
- [ ] Full advertiser self-service campaign workflow and review.
- [ ] Clearly label Sponsored placements.
- [ ] Contextual/consent targeting only.
- [ ] Affiliate account/referral code/attribution/commission/fraud/payout/tax/KYC system.
- [ ] Activate only real approved affiliate destinations.
- [ ] Sports/betting/casino advertising only with age/jurisdiction controls, disclosures and responsible-gambling safeguards.

## P1 — Contributor and Arts
- [x] Contributor and art submission database foundations/pages.
- [ ] Authenticated submission forms and uploads.
- [ ] Tie contributor fee to submission ID and verified webhook.
- [ ] Human review/publishing, labels, corrections, complaints/takedowns.
- [ ] Arts showcase, rights evidence and admin review.

## P1 — Marketplace and Connections
- [x] Core database/page foundations.
- [ ] Complete listing/sell/search/contact transaction workflows.
- [ ] Trust/safety, reporting, moderation and anti-fraud.
- [ ] Connections discovery/messaging/privacy workflows.

## P1 — Markets/Intelligence
- [x] Crypto and FX ticker foundations.
- [ ] Licensed/verified indices, metals and global exchange feeds; never fabricate.
- [ ] Align ticker behavior consistently across BuildPulse pages.
- [ ] Intelligence subscriber dashboard/watchlists.
- [ ] Public/licensed-data-only analysis; never sell MNPI/leaked/confidential information.
- [ ] Forecast methodology, provenance, timestamps and uncertainty.

## P1 — Email/delivery
- [x] Brevo bulk/newsletter foundation.
- [ ] Proton/company-domain transactional mail adapter.
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
