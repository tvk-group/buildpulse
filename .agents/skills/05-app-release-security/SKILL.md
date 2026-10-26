---
name: tvk-app-release-security
description: Evidence-first 20-control release gate
---
# Security Release Gate: 77571.mp4
1. Hide API keys; 2. enforce tenant RLS; 3. test IDOR; 4. scan Git secrets;
5. lock admin routes server-side; 6. test tenant isolation; 7. rate-limit APIs;
8. restrict storage buckets; 9. validate all inputs; 10. block unauthenticated routes;
11. prevent SQL injection; 12. redact sensitive logs; 13. stop field tampering;
14. restrict uploaded file types/size/permissions; 15. enforce server business logic;
16. minimize API fields; 17. secure sessions; 18. dependency/supply-chain scan;
19. test role/object access.
20. TVK ADDITION (not legible in the source video): payment ledger and on-chain settlement idempotency, finality and reconciliation.
Mark each PASS/FAIL/NOT_TESTED/NOT_APPLICABLE, owner and reproducible evidence. Do not equate adding this document with passing the audit.
