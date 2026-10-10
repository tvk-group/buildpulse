# TVK Labs Dev Team — security audit integration

Owner: **TVK Labs Dev Team**.

## Cloudflare security-audit skill

Upstream: https://github.com/cloudflare/security-audit-skill
Reviewed upstream revision: `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8` (2026-09-14).
License: MIT. Preserve upstream license and attribution.

Install the skill in an authorized coding-agent environment using the official CLI:

```sh
npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit
```

This file is an **integration and rollout specification**, not evidence that the skill has been installed or an audit performed. Verify the upstream revision and review installation scripts before execution.

## Required defensive review

1. Map trust boundaries, authentication, authorization, admin overrides, session expiry, CSRF, CORS, rate limits, and API validation.
2. Check supply-chain dependencies, lockfiles, CI permissions, secrets, environment configuration, logging, and sensitive-data exposure.
3. Audit all financial operations for idempotency, exact decimal handling, quote expiry, custody address validation, on-chain confirmation, reconciliation, and fail-closed compliance controls.
4. Test Supabase RLS, service-role isolation, tenant separation, audit log integrity, and unauthorized dashboard access.
5. Assess post-quantum migration readiness: cryptographic inventory, key lifecycle, standards-based hybrid deployment where supported, protocol interoperability, and fallback risks. Do not describe conventional wallet signing as quantum-resistant without evidence.
6. Produce source-backed findings with severity, reproducible evidence, remediation, and independent verification. Keep vulnerability details in access-controlled reports.

## Public-facing attribution and naming

Use **TVK Labs Dev Team** for TVK-authored interface labels and project-maintainer credits. Preserve accurate upstream licenses, provider identifiers, SDK imports, API contracts, model-provider names, historical audit trails, and required third-party notices. Never globally replace package strings or falsify code authorship.

## Release gates

Do not label a release secure or production-ready solely because the skill is present. Require passing CI, reviewed findings, environment verification, authenticated role tests, and end-to-end transaction tests when applicable.
