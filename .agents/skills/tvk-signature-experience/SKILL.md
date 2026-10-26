---
name: tvk-signature-experience
description: Create visually distinctive, premium, accessible TVK interfaces with evidence-based UX, real content and brand-specific art direction.
version: 1.0.0
---
# TVK Signature Experience — Premium Visual Design

## Purpose and authority
Use for user-facing product design, new pages, UI improvements, design-system reviews and visual QA across TVK projects. Do not automatically redesign pages just because the skill was installed. Honor repo-local AGENTS.md, existing project brand files and official assets. Do not copy another brand's artwork, icon system or proprietary designs.

## Quality philosophy
The wow factor comes from extraordinary clarity, editorial composition, precise typography, depth, emotionally relevant imagery and satisfying functional feedback—not gratuitous 3D, neon, tiny text, or animations. Every page must communicate the user's primary job in the first viewport. Design should feel considered rather than an interchangeable AI/SaaS template. Review against Anthropic's frontend-design approach and the Vercel Labs web-interface-guidelines, but use original implementation and the TVK identity.

## Required design process
1. Inspect actual product, audience, primary user action, existing theme/token/style files and brand assets before suggesting changes.
2. Write a one-paragraph design brief and select one memorable focal point based on the product. Consider three approaches privately; choose the most context-specific.
3. Establish a token table: background/surface/accent/text/border/focus/success/warning/error; two typographic roles; spacing and radius scale; responsive layout grid and motion parameters.
4. Define hierarchy: signature hero, benefits in user language, immediate trust proof, one primary call to action, secondary reading paths.
5. Build real components following existing framework. Preserve navigation, forms, wallet login, locale routing and links. No fake metrics, endorsements, rewards, audit status, balances or transactions.
6. Capture desktop and mobile before/after screenshots when tools are available. Review every interactive state, keyboard flow, error, loading, empty state and disabled state. Iterate.
7. Mark implementation separately from screenshots and from production deployment; all three require distinct verification.

## Product-family creative direction (not a universal theme)
- ENTELΞKRON / ENK / corporate infrastructure: **Sovereign Crystal** — light-first luminous white and silver, cobalt/ice-cyan focus, restrained prismatic gradation, layered crystalline panels, architectural geometry; “Infrastructure for Civilization,” including nature where civilization is depicted. Retain ONLY authorized gradient Sigma and horizontal ENTELΞKRON logo/wordmark assets, never recreate or substitute the official logo.
- SOVRA / AI reasoning: **Intelligent Aurora** — bright cool blue/white, selective violet shimmer, kinetic data storytelling with readable AI outputs. Avoid excessively dark backgrounds.
- EnergieMIND / energy: **Nature + Civilization** — pale ivory, mineral teal, botanical green, softly sunlit energy imagery and precise technical diagrams.
- Entele Wallet / financial / exchange / presale: **Trust-First Precision** — readable numbers, clear chain/asset/network, calm depth, explicit risk and status, no ornamental motion during signing or payment. Keep financial UI as easy to understand as an excellent banking product.
- BuildPulse: **Editorial Signal** — strong typographic information architecture, verified articles, useful sources and uncluttered reading.
- PokerTact: **Precision Cockpit** — highly legible data-rich adjustable panes with crisp states, accessible contrasts and user-controlled layouts.
- Other repos: derive from actual brand, not a copy of any of the above. Non-visual infrastructure repos apply only applicable documentation/error-interface patterns.

## Visual-system rules
- Prefer one hero moment with unmistakable silhouette, not an entire page full of identical rounded cards. Strong grid with variation, generous whitespace where it improves comprehension.
- Use consistent original art direction, meaningful real photography/illustration, optimized WebP/AVIF, responsive srcset, image dimensions and responsive crops. Do not substitute low-quality generated logo marks.
- Typography: distinct display and body roles; tested numeral readability; predictable line lengths and heading scales. Use fluid clamp() sizing only when it remains legible; avoid truncated payment addresses or field labels.
- Motion: meaningful feedback, optional cinematic emphasis, reduced-motion alternative. Never block interaction, trap focus or hide wallet actions behind fixed overlays. Prefer compositor-friendly transforms/opacity and short unobtrusive transitions.
- Accessibility floor: WCAG 2.2 AA; text contrast >= 4.5:1 for normal text and >= 3:1 for large text; meaningful UI edges/icons >= 3:1; focus visible; keyboard traversal and semantic controls; target size meets WCAG with 44x44 CSS px preferred where feasible. Check dark mode independently.
- Mobile: validate 320, 375, 390, 768, 1024 and >=1440 CSS widths and foldables; no horizontal overflow, unclipped dialogs or covered Connect Wallet/checkout CTAs; support touch, notch/safe areas and browser zoom.
- Multilingual: avoid text baked into images; support Turkish, English, German and actual declared locales without layout corruption; test long translations and right-to-left only where supported.
- UI integrity: no dead buttons, duplicate CTAs or placeholder href; dialogs scroll within viewport, have proper close/escape and return focus; visually de-emphasize risky actions without hiding material disclosure.

## Performance and perceived quality
At the 75th percentile of real user sessions target LCP <=2.5s, INP <=200ms and CLS <=0.1 per web.dev. Honor low-bandwidth users. Limit animation libraries, enormous background videos, render-blocking third-party scripts and heavy WebGL. Use tested graceful fallbacks and progressive enhancement. The beautiful page that fails to load is a failed design.

## Evidence and acceptance
Collect desktop+mobile before/after, accessibility checks, link crawl, bundle & layout-shift inspection, real-user task completion observations, Core Web Vitals and responsive interaction tests. Report DESIGN_READY only when it passed relevant checks; otherwise list exact blockers. Do not claim this skill automatically improves appearance without implementing and testing UI changes.

## Upstream references (guidance, not imported executables)
- https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
- https://github.com/vercel-labs/agent-skills (web-design-guidelines, react-best-practices, composition-patterns; guidance only; Railway-only deployments)
- https://www.w3.org/TR/WCAG22/
- https://web.dev/articles/vitals
