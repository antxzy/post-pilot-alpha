# ChainPulse — an independent on-chain market terminal

A new, original open-source **GMGN-style market intelligence demo**, built with Next.js, React, TypeScript and public on-chain APIs. This is not a GMGN product, not an authorized clone, and it does **not** impersonate GMGN or connect to real wallets.

## Features that actually work

- Live **trending pools** and **new pools** from GeckoTerminal on Solana, Ethereum, Base and BNB Chain.
- **Boosted tokens** and search by token symbol/name/contract via DEX Screener (boosts are paid promotional placements, not an endorsement).
- Sortable tables, market stats, chain filters, liquidity/volume filters, gainers-only toggle.
- Interactive historical **OHLCV candlestick charts**, using real GeckoTerminal pool candles at 5m / 15m / 1h / 4h / 1d intervals. No made-up price histories.
- Local browser-persistent watchlist, price alerts (checked while tab open), and paper trading.
- **$10,000 virtual paper wallet**, buy/sell simulation, holdings, trade history, estimated P&L; model assumes 0.5% slippage and 0.5% fees for each trade.
- Live position price refreshes where DEX Screener quotes are available. Last known price is used if a fresh quote cannot be retrieved.
- Direct provider links, copy contract address, responsive layout, errors and loading states.

## Quick start

Requires Node.js 20.9+ (Node 22 recommended).

```bash
npm install
npm run dev
```

Open http://localhost:3000. For a production build:

```bash
npm run typecheck
npm run build
npm start
```

No API keys or `.env` files are required. The application makes public read-only API requests through Next.js route handlers.

## API and data provenance

- [GeckoTerminal public API](https://api.geckoterminal.com/docs/index.html): trending/new pools and OHLCV.
- [DEX Screener API](https://docs.dexscreener.com/api/reference): boosts, search and current quotes.

The server proxies API requests to avoid depending on browser CORS and caches responses. Public endpoints have varying rate limits. Market scans are refreshed every 60 seconds; free sources can be temporarily unavailable or return no candles for new pools. Empty/error states are shown instead of fake values.

### Important limitations

- This is a **research and paper-trading prototype**. It does **not** execute real swaps, connect wallets, request seed phrases, scan holders, assert honeypot safety, or provide verified smart-money signals. The absence of a security warning is NOT evidence a token is safe.
- Market data may be incomplete, illiquid, inaccurate, stale or manipulated. GeckoTerminal may show FDV when true market cap is unavailable; this is labeled `Market cap / FDV`.
- Paper P&L estimates omit MEV, taxes, real gas, token transfer fees, market impact and route failures. Do not use paper results to infer real tradeability.
- Alerts fire only when the page is open and the token's quote is refreshed. They are not push notifications or scheduled server jobs.
- The watchlist view shows starred tokens appearing in the current discovery feed. It is not a cross-chain historical database of every watched asset.
- Browser localStorage contains paper positions, saved token IDs, and alerts. No user accounts or cloud database are used.

## Project layout

```
app/
  api/market/route.ts      live discovery and token search
  api/candles/route.ts     historical GeckoTerminal OHLCV
  api/quotes/route.ts      fresh token prices for paper positions
  globals.css              dark trading terminal design
  layout.tsx
  page.tsx
components/
  Terminal.tsx             discovery, filters, details, portfolio, alerts
  CandleChart.tsx          interactive SVG candles
lib/
  providers.ts             public API normalization, cache, validation
  paper.ts                 simulated trading and P&L engine
  types.ts                 shared types
  format.ts                currency and duration helpers
  useLocal.ts              persisted client-side state
```

## Deploy

Import the folder as a Next.js app in Vercel, set the root directory to this project, use `npm run build`, and deploy. Most free hosting tiers can run the API routes but provider limits remain in effect.

## Attribution

- Market data provided by [GeckoTerminal](https://www.geckoterminal.com/) and [DEX Screener](https://dexscreener.com/), under their respective terms.
- Independent project inspired by the **concept** of a GMGN-style on-chain terminal. No GMGN branding, source code, private APIs or proprietary graphics are used.

## Safety

Never paste seed phrases or private keys into a prototype. This app does not ask for any. Nothing in the app is investment advice.
