---
name: tvk-railway-only-operations
description: Railway-exclusive environment, deploy, healthcheck, and rollback management
---
# Railway-only Deployment
- TVK now deploys EXCLUSIVELY to Railway. Never trigger or configure Vercel builds.
- Inventory each repo -> Railway project -> environment -> service -> branch -> public domain and healthcheck.
- Validate Docker/Nixpacks/build/start settings, root directory, environment secrets, watch paths, minimum privileges, staged migrations and rollback.
- **Watch Paths** can skip docs-only changes; absent paths can cause a deployment. `[skip ci]` is NOT reliable Railway suppression.
- Following the October 2026 Railway incident, inspect GitHub integration, token rotation, deployment failure history and current running image before application changes.
- A Git commit is NOT evidence of a healthy Railway deployment. Verify terminal SUCCESS and end-to-end application behavior.
Official docs: https://docs.railway.com/builds/build-configuration
