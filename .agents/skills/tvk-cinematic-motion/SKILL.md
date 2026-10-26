---
name: tvk-cinematic-motion
version: 1.0.0
description: Premium brand-specific web motion, interactive depth, cinematic storytelling, performant accessible transitions and real-world responsive quality.
---
# TVK Cinematic Motion and Living Interfaces

Use for user-facing visual experiences, not for payment execution, smart contract logic, background services or high-stakes data presentation. This skill is design guidance: it never certifies a deploy or automatically rewrites an app.

## Brand/art direction
- ENTELΞKRON: luminous silver-white, restrained prismatic cyan/violet reflections, architectural layers, civilization and nature together. Only official approved logo/wordmark assets; do not recreate symbols.
- TVK Group: elevated bright blue, pearl-glass surfaces, editorial industrial photography, kinetic infrastructure networks.
- SOVRA: cool intelligent aurora, flowing signals and responsive AI states that do not pretend to be real AI outputs.
- EnergieMIND: mineral/organic motion, moving energy lines, sunlight and botanical forms.
- Entele Wallet, ENK presale, exchange, banking: motion conveys verification/status only; no distracting animations during payments, no false success, no obscuring balances/terms.
- BuildPulse: editorial reading motion and tasteful transitions that preserve performance.
- PokerTact: fast precise low-distraction real-time transitions, user-controlled cockpit layout and density.

## Motion language
1. Compose one signature hero animation: layered depth, micro-reflection or diagram reveal, 700–1300ms entrance, modest stagger of 60–110ms. Defer to actual visual quality over fixed timings.
2. Scroll chapters: progressively reveal content and connect sections through authentic visual metaphors; do not animate every card identically. No autoplay sound.
3. Microinteractions: keyboard and touch equivalents of hover, clear button press/hold/loading/retry, focus rings and menu confirmation.
4. Cursor/pointer effects ONLY on fine-hover devices; throttle through requestAnimationFrame; update CSS custom properties; make effects decorative and non-interactive.
5. For parallax use transform/opacity only, bounded travel, passive listeners or IntersectionObserver and visibility pause. Avoid expensive filter/box-shadow animation and high-cost backdrop-filter layers on mobile.
6. For scroll progress use a slim accessible indicator only for long-form reading, not intrusive global decoration.
7. Prefer CSS transitions, keyframes and native Web Animations API. Use GSAP or Motion (Framer Motion) only when there is a measured benefit and framework compatibility, with license and bundle review. Avoid random npm packages or remote effect scripts.
8. Interactive 3D only if progressive enhancement with static/poster fallback, memory/thermal budget, context-loss handling and keyboard-equivalent controls.
9. Match motion to each product family and actual content. No cloned generic dark neon dashboards, no fake data or made-up award logos.
10. Account for touchscreens, battery-saver, low memory, slow network, prefers-reduced-motion, prefers-contrast and transparency preferences.

## Engineering quality
- Measure Core Web Vitals (LCP <=2.5s, INP <=200ms, CLS <=0.1 at p75 where measurable), bundle budgets, long tasks and image decode costs. No hard-coded invented result.
- Set explicit media dimensions/aspect ratios; lazy-load off-screen art; eager-load appropriate LCP hero only. Offer SVG/AVIF/WebP fallback; avoid autoplay heavy background video on metered data.
- Animation must not block wallet connection, modal close, terms, navigation or accessibility; never trap focus, interfere with scrolling or overlays.
- WCAG 2.2 AA aim: robust contrast, visible focus, semantic controls, accessible motion stops, no flashing over 3 times per second. For user-triggered motion, reduced-motion must disable essential travel or use opacity-only substitutions.
- Brand constraints: light-first readable content, bright/metallic/glass, no dark unreadable controls, preserve approved logos.

## Delivery gate
Before touching code capture architecture, test/build commands, existing styles and brand files. Make changes on the correct connected Railway source branch. Apply scoped changes, run static checks and relevant automated tests, capture 320/375/390/768/1024/1440px screenshots in light/dark as supported, test tap/keyboard/zoom and reduced-motion; compare BEFORE/AFTER screenshots when possible.
Report VERIFIED only for observed checks, not guessed. Require Railway deployment terminal SUCCESS and fetch the production page/asset after deploy; production browser QA is a separate verification step. A commit never equals a deployment.
