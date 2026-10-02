# BuildPulse

Global Technology & Digital Intelligence.

Canonical website: `https://buildpulse.news`

Production repository: `tvk-group/buildpulse`

Deployment: Vercel project `buildpulse`.

BuildPulse is maintained as a standalone application. Its publication pipeline includes primary-source ingestion, editorial verification, edition generation, founder review, immutable archival output, controlled delivery, advertising operations, and scheduler observability.

## Domain deployment

The production custom domain is `buildpulse.news`. The Vercel project must own the custom-domain association before external DNS is pointed at Vercel. For an externally managed apex, use the DNS values shown by the Vercel project after attachment and verify HTTPS before cutover.


## Advertising payments

BuildPulse advertising settlement supports Stripe/card, ETH, BTC, USDC on Base, USDT on Ethereum and XRP on XRPL. Checkout preparation and crypto verification run in authenticated Supabase Edge Functions. Stripe uses live Payment Links with the BuildPulse order UUID carried as `client_reference_id`; signed Stripe settlement, refund and dispute events terminate at the server-side Supabase webhook. Successful payment advances a campaign only to review and never bypasses creative/editorial approval.

Invoices are issued by TVK LABS & TECHNOLOGIES LTD (Company No. 16481808). Payment destinations and settlement evidence are controlled server-side; transaction hashes are single-use across BuildPulse orders.
