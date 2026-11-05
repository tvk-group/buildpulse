# BuildPulse

Global Technology & Digital Intelligence.

Canonical website: `https://www.buildpulse.news`

Production repository: `tvk-group/buildpulse`

Deployment: Railway service `buildpulse` on the `TVK Ecosystem` project. The production Railway service has `buildpulse.news` and `www.buildpulse.news` domains attached.

BuildPulse is maintained as a standalone application. Its publication pipeline includes primary-source ingestion, editorial verification, edition generation, founder review, immutable archival output, controlled delivery, advertising operations, and scheduler observability.

## Domain deployment

The production custom domain is `buildpulse.news`; `www.buildpulse.news` also routes through Railway. Verify the active Railway deployment SHA and HTTPS domain status before release acceptance.


## Scheduled jobs

The legacy cron configuration has been removed. Railway currently has no verified scheduled runner for the market-learning endpoint (`12,42 * * * *`) or editorial-plan endpoint (`15 6 * * *`). These jobs must remain marked inactive until an AWS EventBridge or Railway schedule is configured and verified. Never re-enable a Vercel deployment.

## Advertising payments

BuildPulse advertising settlement supports Stripe/card, ETH, BTC, USDC on Base, USDT on Ethereum and XRP on XRPL. Checkout preparation and crypto verification run in authenticated Supabase Edge Functions. Stripe uses live Payment Links with the BuildPulse order UUID carried as `client_reference_id`; signed Stripe settlement, refund and dispute events terminate at the server-side Supabase webhook. Successful payment advances a campaign only to review and never bypasses creative/editorial approval.

Invoices are issued by TVK LABS & TECHNOLOGIES LTD (Company No. 16481808). Payment destinations and settlement evidence are controlled server-side; transaction hashes are single-use across BuildPulse orders.
