# Bonding Dashboard

A read-only signal dashboard for [Polymarket](https://polymarket.com) prediction markets. It surfaces markets where one outcome is near certainty (configurable threshold) and closing soon — potential "bonding" opportunities.

Built for the **YFM course** where students learn to vibecode and trade on Polymarket.

## What it does

- Fetches active markets from the Polymarket Gamma API
- Filters to markets above a probability threshold (90%, 95%, 99%) closing within a time horizon (24h, 48h, 7d)
- Verifies real liquidity on each market via the Polymarket CLOB order book API
- Displays results in a sortable table or card view with auto-refresh
- Search and tag filtering (Crypto, Politics, Sports)

This is a **signal/filter dashboard only** — no trading, no wallet connection, no order placement.

## Setup

### Prerequisites

- **Node.js** version 18 or higher
- **npm** (comes with Node.js)

To check if Node.js is installed, run:

```
node --version
```

If not installed, download from https://nodejs.org (use the LTS version).

### Install and run

```
cd bonding-dashboard
npm install
npm run dev
```

The dashboard will be available at `http://localhost:5173` in your browser.

### If something goes wrong

**`npm install` fails with native binding errors:**
```
rm -rf node_modules package-lock.json
npm install
```

**Port 5173 is already in use:**
```
npm run dev -- --port 3000
```

**CORS errors in the browser console:**
This only happens if you are not using `npm run dev`. The Vite dev server includes proxy configuration that handles CORS for both the Gamma API and CLOB API. Production deployments need a server-side proxy or CORS-enabled API gateway.

## Project structure

```
src/
  App.tsx              — Main app component, state management, layout
  types.ts             — TypeScript type definitions
  index.css            — Custom animations and styles (Tailwind v4)
  lib/
    polymarket.ts      — All API fetching, filtering, and CLOB verification
  components/
    FilterBar.tsx      — Threshold, horizon, sort, view mode, tag controls
    SearchBar.tsx       — Market search with keyboard shortcut (press /)
    MarketGrid.tsx      — Table/card view switcher and empty state
    MarketTable.tsx     — Sortable table view
    MarketCard.tsx      — Card view
    YfmLogo.tsx         — SVG logo component (also used as loading spinner)
vite.config.ts         — Dev server config with API proxies
public/
  favicon.svg          — Browser tab icon
```

## API proxies

The dev server proxies two external APIs to avoid CORS issues:

| Local path    | Proxied to                          |
|---------------|-------------------------------------|
| `/api/gamma`  | `https://gamma-api.polymarket.com`  |
| `/api/clob`   | `https://clob.polymarket.com`       |

Both are public, read-only APIs. No API keys or authentication required.

## Tech stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
