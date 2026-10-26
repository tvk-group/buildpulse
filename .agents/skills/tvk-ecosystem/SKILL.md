---
name: tvk-ecosystem
version: 1.1.0
description: Canonical TVK / ENTELΞKRON standards for safe UI, security, SEO, Web3 payment validation and deployments, informed by six 2026-10-26 reference videos.
---
# TVK Ecosystem Universal Skills v1.0 (2026-10-26)

## Scope
Apply only relevant standards to the repository’s actual role. A repo-local skill does NOT change runtime functionality or certify security. Review existing files, deployment settings, and tests first. Archived repositories are read-only.

## 1 Search, editorial SEO and Google Preferred Sources (77564)
Ensure 200 responses, canonical URL, HTTPS, indexability, relevant titles, XML sitemaps, reciprocal hreflang, truthful editorial provenance and Article structured data on real news posts. For eligible publications such as BuildPulse, Google Preferred Sources can help *individual users who choose the publication* find it in Top Stories and Search AI experiences. It is not a general SEO ranking shortcut. Verify inclusion in Google’s source preference tool before placing its official button. https://developers.google.com/search/docs/appearance/preferred-sources

## 2 Scoped security operations (77565)
Use OWASP ASVS 5.0 and WSTG to frame threat modeling, review secrets, dependency exposure, authentication, IDOR/BOLA, injections, storage, sessions and admin authorization. HexStrike AI is an optional high-privilege connector to many security tools; never install or run unsupervised active scans, credential attacks or tests on systems without explicit authorization. Start with static analysis and isolated test fixtures. Record tested evidence, owners, severity and remediations.

## 3 Accessible authentication forms (77567)
Use permanent labels, associated errors, keyboard focus, visible primary CTA, scrollable responsive modals, sufficient touch targets, clear success/denied/retry/loading. On ENK sale only: wallet-first login, no unapproved Google/password sign-in; signed one-use server nonce and domain-bound challenge; distinguish Solana signer identity from independently proved EVM/ERC-20 token recipient. Preserve reviewed KYC/TGE sequence and applicable compliance obligations.

## 4 Conversion and product cards (77569)
Prioritize truthful title, real amount/price and risk context before decoration. Use one primary accent, consistent spacing, corners, accessible contrast, restrained depth and reduced-motion animation. Test on phones and desktops; every visible card action must have a working target. For finance avoid fabricated balance, bonus, audit or confirmation status.

## 5 Release-readiness 20 controls (77571)
19 controls visible in source: 1 secrets; 2 RLS; 3 IDOR; 4 git secret scan; 5 admin routes; 6 tenant isolation; 7 API rate limits; 8 storage buckets; 9 inputs; 10 auth-only routes; 11 SQL injection; 12 sensitive logs; 13 field tampering; 14 uploads; 15 server business logic; 16 minimal API responses; 17 session security; 18 dependency scanning; 19 record access. **#20 is a TVK addition, not visible in the video:** chain/payment/ledger/claim integrity with idempotency, finality and reconciliation. Report each control as PASS, FAIL, NOT_TESTED, or NOT_APPLICABLE, with proof.

## 6 Six interaction laws (77573)
Fitts: reachable sizable CTA. Hick: prioritize decisions. Chunking: meaningful stages. Doherty: prompt feedback and progress for async work, never fake completion. Proximity: labels and errors next to the associated control. Von Restorff: use restrained visual emphasis for the main action without hiding material costs. Test rather than assume 2x speed or fixed latency outcomes.

## 7 Web3 payments, dashboards and legal integrity
Keep wallet auth, payment wallet/chain/asset, quote, tx verification, allocations and claims distinct. Only provide authoritative server-configured payment routes, not unverified marketing addresses. Require network/memo/hash validation, unique transaction credit, immutable ledger, negative tests and admin server authorization. Label internal audits as internal; only claim independent completed audits with evidence. Test 404s, connected wallet ownership challenges, account dashboards and mobile flows before release.

## 8 Ecosystem delivery governance
Correct project mappings and official ENTELΞKRON assets. Never overwrite existing agent instructions without review. Keep modifications purpose-specific; group fixes to minimize costly Railway builds. Railway is the sole deployment platform. Never create Vercel deployments. Docs-only changes may still auto-deploy to Railway; configure service Watch Paths and verify the source branch. Do not assume [skip ci] stops Railway. No GitHub Actions/TinyFish by default. Commit != deployed != verified. Report evidence and unresolved blockers.

## Acceptance
P0/P1 account, money, admin/data integrity failures block the feature. Security scans are authorization-gated. Cosmetic improvements must not delay high-risk bug fixes. Always record actual checks, not implied success.
