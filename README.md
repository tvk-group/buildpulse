# BuildPulse

Global Technology & Digital Intelligence.

Canonical website: `https://www.buildpulse.news`

Production repository: `tvk-group/buildpulse`

Deployment: Railway service `buildpulse` in the `BUILDPULSE` project. AWS is the planned migration target; production remains on Railway until cutover.

BuildPulse is maintained as a standalone application. Its publication pipeline includes primary-source ingestion, editorial verification, edition generation, founder review, immutable archival output, controlled delivery, advertising operations, and scheduler observability.

## Domain deployment

The production custom domain is `buildpulse.news`. Confirm the active Railway deployment SHA and HTTPS domain status during every release review.


## Advertising payments

BuildPulse advertising settlement supports Stripe/card, ETH, BTC, USDC on Base, USDT on Ethereum and XRP on XRPL. Checkout preparation and crypto verification run in authenticated Supabase Edge Functions. Stripe uses live Payment Links with the BuildPulse order UUID carried as `client_reference_id`; signed Stripe settlement, refund and dispute events terminate at the server-side Supabase webhook. Successful payment advances a campaign only to review and never bypasses creative/editorial approval.

Invoices are issued by TVK LABS & TECHNOLOGIES LTD (Company No. 16481808). Payment destinations and settlement evidence are controlled server-side; transaction hashes are single-use across BuildPulse orders.
