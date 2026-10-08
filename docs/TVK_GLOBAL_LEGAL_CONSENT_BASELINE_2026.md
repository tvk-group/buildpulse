# TVK Group — Legal, Privacy, Consent and Accessibility Package
**Version:** 2026-10-08 · **Status:** shared reusable policy/engineering standard; not a statement of current product deployment or legal certification.

## Responsible entity and publication requirements
Each product MUST identify its actual legal operator/controller, registration details, address, privacy contact, customer service contact and applicable product licences. Do not copy the TVK Labs identity unless it is truly the controller. Corporate TVK Labs exemplar: https://www.tvklabs.com/legal.html . An internal Preflight technical assessment is not an independent certification. Do not suggest a bank/payment/custody authorisation without verified public evidence.

## Legal Notice (mandatory scope)
Publish operator identity, governing entities, contact and service-provider disclosures, regulatory status, IP rights, linked external services, permitted use, accessibility contact, jurisdiction-specific mandatory law caveat, and a link to product-specific terms.

## Privacy Notice (mandatory scope)
Publish collection categories and sources, actual processing purposes mapped to Article 6 lawful bases where GDPR applies, special-category Article 9 basis if relevant, consequences of not supplying mandatory data, processor/recipient categories, actual third-country transfer mechanisms, detailed retention and legal hold criteria, security and breaches, profiling/automated decisions, right to contest qualifying decisions, privacy contact, DSAR method and competent authority. Do not claim dormant products collect biometrics. Product-specific Sumsub obligations: present Sumsub-required data processing and biometric disclosures BEFORE any applicant identity data transfer. If processing relies on explicit biometric consent, collect it separately with timestamp, version, applicant association and secure audit evidence. A cookie banner cannot substitute for KYC or biometric consent.
Official Sumsub: https://docs.sumsub.com/docs/applicant-privacy-disclosures-and-consent-requirements .

## Terms of Use (mandatory scope)
State permitted use, applicable service agreements, intellectual property, termination/suspension, informational content and third parties, governing law with mandatory consumer rights preserved, security conduct, complaint routes, liability within non-excludable law, service changes, and separate payment/token terms where relevant.

## Cookies and Consent (mandatory scope)
List actual active necessary and optional trackers, purpose/provider/duration; default optional categories OFF when affirmative consent is required. Offer equally accessible Accept, Reject and Save choices, withdrawal/reopen method, consent version and timestamp, geographic applicability without blindly inferring residence from IP or language, and Global Privacy Control/opt-out handling when applicable. Scripts must be technically GATED; a displayed banner without enforcement is insufficient. Never load nonessential SDK tags before required consent.

## Accessibility (mandatory scope)
Target WCAG 2.2 AA where relevant without claiming certification; validate keyboard operation, semantic headings, 320px reflow, readable contrast, screen-reader labels, accessible consent modals, focus visibility and reduced motion. List feedback email and alternate format route.

## Geographic supplements and language
Map applicable countries to actual operations, not merely website visitors: UK GDPR; EU/EEA GDPR and national rules (DE, FR, IT, ES, PT, NL, BE, AT, IE, PL, SE, DK, FI, NO, CZ, RO, HU, GR, BG); Switzerland FADP; Türkiye KVKK; Ukraine; US CCPA/CPRA and relevant state law; Canadian federal/provincial law; Brazil LGPD; China PIPL; Japan APPI; South Korea PIPA; India DPDP provisions as commenced; UAE federal/DIFC/ADGM; Saudi PDPL; Australia APPs; New Zealand Privacy Act; Singapore PDPA; South Africa POPIA. Localise a legally sufficient actual notice when required, not just a summary. Country selector is a visitor override, not geolocation-based proof of applicable law.

## Mandatory integration sign-off
1. Check actual operator and data-flow inventory.
2. Generate and mount five navigable, screen-reader-accessible legal pages at each public product site.
3. Implement real consent enforcement server/client-side, not only UI state.
4. Block KYC transfers until required notices and separate consent are accepted, recorded and conveyed to provider if needed.
5. Conduct real deployment/build tests, mobile/keyboard checks, consent-negative tests and verification of audit logs.
6. Perform counsel review for jurisdiction and regulated-status claims.
**This file is a reproducible baseline only. Its presence does not prove the project's live policies, consent controls or data processing are implemented.**
