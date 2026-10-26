---
name: tvk-defensive-security-operations
description: Safe security test methodology with scope and evidence
---
# Authorized Defensive Security
Reference video: 77565.mp4; HexStrike AI shown as a security tooling orchestrator, not an endorsement.
- Obtain and record written scope, owner, systems, test accounts, rate limits, exclusions, and stop conditions before active testing.
- Prefer local dependency/source scanning and controlled test fixtures; no mass internet enumeration, brute force, production fuzzing or exploitation without explicit permission.
- Use OWASP ASVS and WSTG coverage; test IDOR, admin rights, API abuse, tenant boundaries, webhooks, uploads, secrets and logging.
- Verify tools and versions, isolate privileges, redact all keys and personal data, and preserve reproducible test evidence.
- Report PASS only with evidence; untested controls remain NOT_TESTED.
