# BuildPulse advertiser creative FileShield gate

**Status:** source change prepared on branch `fileshield/creative-upload-gate-2026-11-05`; not merged or deployed.  
**Route:** `POST /api/buildpulse/advertiser/creative`

## Behavior

The authenticated server route now submits each PNG/JPEG/WebP creative to the isolated FileShield scanner before any storage upload or metadata insert. It accepts only a versioned `tvk.fileshield.api.v1` result whose SHA-256 and byte length match the exact buffer received from the browser. Only `ALLOW` proceeds to the existing image-dimension validation and private Supabase storage. `BLOCK` or `REVIEW` returns a rejected-upload response. Missing secrets, scanner outage, malformed verdicts, or mismatched digest/length return an unavailable/error response; no creative is stored or queued.

The order ownership check remains before scanning. The existing private storage bucket and pending-review state remain in effect. No file is attached to email by this route.

## Required Railway variables

Configure these server-side variables on the BuildPulse Railway service before merging/deploying:

- `TVK_FILESHIELD_SCANNER_URL`: HTTPS root URL of the isolated scanner.
- `TVK_FILESHIELD_API_TOKEN`: same 32+ character bearer token configured on that scanner.

Do not expose either variable to browser code or log its value. If they are absent, creative uploads will fail closed with HTTP 503. Do not add placeholder or weak values.

## Compatibility limits

This gate intentionally matches the current scanner's support: one PNG/JPEG/WebP file up to 5 MiB per request. It does not implement image re-encoding or sanitization. The stored original stays private and remains subject to the existing human review process.

## Release evidence still required

- Confirm Railway variables are set without displaying their values.
- Run controlled tests in a non-production environment: clean image accepted, EICAR embedded in a supported image blocked, unsupported/malformed image rejected, scanner unavailable fails closed, digest/size mismatch rejected, and no storage object or metadata row is created for any rejected case.
- Confirm a clean creative is private and remains pending human review.
- Confirm the production API behavior only after a coordinated release.

Passing the preflight is not a zero-malware guarantee. Do not advertise uploads as risk-free.
