# BuildPulse live market and economic data integrations

## Recommended provider stack

1. TradingView — visualization/charting layer. Advanced Charts/Trading Platform do not supply market data themselves; connect them to a licensed BuildPulse datafeed.
2. Twelve Data — primary unified market feed for equities, FX, crypto, ETFs and time series/WebSocket streaming.
3. Finnhub — secondary/redundant real-time trades and market/fundamental feed; useful for cross-checks and failover.
4. FRED — authoritative macroeconomic series and release data from the Federal Reserve Bank of St. Louis.
5. Nasdaq Data Link — premium/global financial, economic, alternative and exchange data where licensing/coverage warrants it.

## Server-only environment variables

TRADINGVIEW_CLIENT_ID=
TRADINGVIEW_CLIENT_SECRET=
TWELVE_DATA_API_KEY=
FINNHUB_API_KEY=
FRED_API_KEY=
NASDAQ_DATA_LINK_API_KEY=

Never expose provider API keys in client bundles. BuildPulse adapters should normalize provider data server-side, cache according to licensing and freshness, record provider/timestamp/provenance, and expose only permitted fields to public pages.

## Data architecture

provider adapter -> normalized market/economic event -> provenance + freshness -> cache/database -> BuildPulse API -> market tape/charts/newsroom/SOVRA AI context

Use WebSockets only in a long-lived ingestion service where provider terms permit redistribution. Vercel request handlers should consume normalized/cache data rather than hold permanent WebSocket connections.

## Required controls

- explicit delayed vs real-time labels
- exchange/source and timestamp on every quote
- stale-data threshold and visible stale state
- provider rate-limit/backoff
- symbol mapping and currency normalization
- duplicate/conflict reconciliation
- licensed redistribution checks before public display
- no API keys in Git, browser JS, logs or error payloads
- historical snapshots for reproducible editorial claims
