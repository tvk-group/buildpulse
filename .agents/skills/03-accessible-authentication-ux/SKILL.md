---
name: tvk-accessible-authentication-ux
description: Six-part auth UI, wallet onboarding and accessibility quality skill
---
# Auth UX: 77567.mp4
- Hierarchy: single clearly dominant sign-in/connect action and subordinate alternatives.
- Spacing: consistent 8px layout rhythm, accessible 44px+ target where applicable; form must fit screen and scroll on mobile.
- Labels: permanent accessible labels, adjacent helper/errors; never placeholder-only.
- Focus: visible keyboard focus and sufficient text/button contrast.
- Depth: subtle shadows/radii, no clipping/offscreen wallet modal/covered connect button.
- Motion: fast explicit loading/success/retry/denial feedback, respect reduced motion.
- ENK policy: no unsolicited Google/password authentication; EVM and Solana signers are not the same as verified token-recipient addresses.
- Server verifies unique short-lived signed nonce, origin/domain, expiry and one-time consumption. Test wallet reconnect, deep linking, mobile and dashboard redirects.
