---
name: tvk-assurance-and-visual-qa
version: 1.0.0
description: Repo-by-repo security hardening, authorized passive pentest preparation, OWASP ASVS verification and exhaustive responsive visual QA discipline.
---
# TVK Security Assurance and Visual QA

## Safety and authorization
Only test systems administered by the owner with explicit scope. Start read-only: inventory application, headers, dependencies, public endpoints, routes, auth boundary, storage exposure and repo. Do NOT perform disruptive production scans, exploit attempts, brute force, credential stuffing, denial of service, or active penetration testing on unrelated third-party systems. For active tests obtain written target authorization, boundaries, rate limits, test users, data permissions, rollback, stop conditions. Prefer dedicated Railway staging environment with masked data. No proof of security from a single passing scan.

## Security release controls (evidence, not promises)
1. Identify and redact leaked credentials, rotate proven exposed keys, check Git history and CI artifacts.
2. Enforce authorization server-side for every admin/tenant/user record and storage object; test IDOR/BOLA with isolated fixtures.
3. Enforce RLS by authenticated identity, tenant and per-storage policy in Supabase; public keys are distinct from service secrets.
4. Validate input and output, parameterize SQL, guard SSRF, XSS, CSP, cross-origin and upload processing.
5. Define CSP based on an inventory of scripts/fonts/connect endpoints, preferring no 'unsafe-inline' once compatibility-validated; apply security headers at the actual Railway origin or app server.
6. Strengthen cookies, CSRF, sessions, MFA/privileged account protection, replay and rate limiting.
7. Web3: verify nonce/signer/domain/chain, Solana signer vs EVM recipient bindings, on-chain finality, correct network/asset/token, memo/tag, idempotent ledger and signed webhooks.
8. Audit payment and legal claims: stage, bonus, preflight/internal audit, external audit status, vesting and KYC must match evidence.
9. Check supply chain/lockfiles against real installed versions; never blanket major-version update on untested production dependencies.
10. Confirm error/log privacy and safe user-facing recovery behavior.

## Visual QA matrix
For every applicable public site and web app: desktop 1440/1920; laptop 1024; tablet 768; mobile 320/375/390/430; landscape and folding/zoom when relevant. Check main nav/menu, footer, links and 404, forms/auth/wallet connect/payment/dashboards, reduced-motion/high contrast, offscreen dialogs and focus, empty/loading/error/success, long locale strings, cookies/privacy and all viewport overlaps.
Run Playwright screenshots and interaction assertions with representative staging test accounts where safe; compare snapshots subject to stable fonts and rendering. Sample all page templates and risk-critical flows, not merely homepages.

## Verification record
For each service record repo, source branch, Railway project/service/environment, domain, commit, deployment ID/status, tested route/viewport, screenshot, test account type, environment, tool version, security control, severity, pass/fail/NOT_TESTED/N/A, owner, remediation, rollback readiness. P0/P1 blocks go-live. Store no credentials or personal data in reports. Never claim 'exhaustive', 'penetration tested' or 'secure' unless scope and results support it.
